import { Prisma, type Transaction, type TransactionType } from '../../generated/prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import { serializable } from '../../utils/serializable';
import type { CreateTransactionInput, UpdateTransactionInput, TransactionQuery } from './transaction.types';

function serialize(row: Transaction) {
  const { occurredAt, description, amount, ...rest } = row;
  return { ...rest, amount: amount.toFixed(2), date: occurredAt.toISOString(), note: description };
}
function effect(type: TransactionType, amount: Prisma.Decimal): Prisma.Decimal {
  return type === 'INCOME' ? amount : amount.negated();
}
async function owned(tx: Prisma.TransactionClient, userId: string, id: string) {
  const row = await tx.transaction.findFirst({ where: { id, userId } });
  if (!row) throw new AppError('Transaction not found.', 404);
  return row;
}
async function references(tx: Prisma.TransactionClient, userId: string, accountId: string, categoryId: string, type: TransactionType) {
  const account = await tx.account.findUnique({ where: { id_userId: { id: accountId, userId } } });
  if (!account) throw new AppError('Account not found.', 404);
  const category = await tx.category.findUnique({ where: { id_userId: { id: categoryId, userId } } });
  if (!category) throw new AppError('Category not found.', 404);
  if (account.currency !== 'INR') throw new AppError('Only INR accounts are supported.', 400);
  if (category.type !== type) throw new AppError('Category type must match transaction type.', 400);
}
async function adjust(tx: Prisma.TransactionClient, userId: string, id: string, delta: Prisma.Decimal) {
  // Atomic increment also supports negative deltas and negative account balances.
  await tx.account.update({ where: { id_userId: { id, userId } }, data: { balance: { increment: delta } } });
}
async function mutate<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try { return await serializable(work); }
  catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2025' || error.code === 'P2003') throw new AppError('Transaction or related record not found.', 404);
      if (error.code === 'P2020') throw new AppError('The resulting amount or balance exceeds the supported range.', 409);
    }
    throw error;
  }
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  return mutate(async (tx) => {
    await references(tx, userId, input.accountId, input.categoryId, input.type);
    const amount = new Prisma.Decimal(input.amount);
    await adjust(tx, userId, input.accountId, effect(input.type, amount));
    const row = await tx.transaction.create({ data: {
      userId, accountId: input.accountId, categoryId: input.categoryId, type: input.type,
      amount, occurredAt: new Date(input.date), description: input.note ?? null,
    } });
    return serialize(row);
  });
}
export async function updateTransaction(userId: string, id: string, input: UpdateTransactionInput) {
  return mutate(async (tx) => {
    const old = await owned(tx, userId, id);
    const accountId = input.accountId ?? old.accountId;
    const categoryId = input.categoryId ?? old.categoryId;
    const type = input.type ?? old.type;
    const amount = input.amount === undefined ? old.amount : new Prisma.Decimal(input.amount);
    await references(tx, userId, accountId, categoryId, type);
    const reversal = effect(old.type, old.amount).negated();
    const replacement = effect(type, amount);
    /*
     * Combine reversal and replacement on the same account to avoid an artificial
     * intermediate overflow. For moves, write accounts in stable ID order to
     * reduce deadlocks. Serializable retries always reread the latest old row.
     */
    const deltas = old.accountId === accountId
      ? [{ id: accountId, delta: reversal.plus(replacement) }]
      : [{ id: old.accountId, delta: reversal }, { id: accountId, delta: replacement }];
    deltas.sort((a, b) => a.id.localeCompare(b.id));
    for (const change of deltas) await adjust(tx, userId, change.id, change.delta);
    const row = await tx.transaction.update({ where: { id, userId }, data: {
      accountId, categoryId, type, amount,
      occurredAt: input.date === undefined ? old.occurredAt : new Date(input.date),
      description: input.note === undefined ? old.description : input.note,
    } });
    return serialize(row);
  });
}
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  await mutate(async (tx) => {
    const old = await owned(tx, userId, id);
    await adjust(tx, userId, old.accountId, effect(old.type, old.amount).negated());
    await tx.transaction.delete({ where: { id, userId } });
  });
}
export async function getTransaction(userId: string, id: string) {
  return serialize(await owned(prisma, userId, id));
}
export async function listTransactions(userId: string, query: TransactionQuery) {
  // One repeatable snapshot keeps count, ownership checks, and page data consistent.
  return prisma.$transaction(async (tx) => {
    if (query.accountId && !await tx.account.findUnique({ where: { id_userId: { id: query.accountId, userId } } })) {
      throw new AppError('Account not found.', 404);
    }
    if (query.categoryId && !await tx.category.findUnique({ where: { id_userId: { id: query.categoryId, userId } } })) {
      throw new AppError('Category not found.', 404);
    }
    const where: Prisma.TransactionWhereInput = {
      userId, ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.type ? { type: query.type } : {}),
      occurredAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(query.to) } : {}) },
    };
    const total = await tx.transaction.count({ where });
    const rows = await tx.transaction.findMany({ where, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit, take: query.limit });
    return { transactions: rows.map(serialize), pagination: {
      page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit),
      hasNextPage: query.page * query.limit < total,
    } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
