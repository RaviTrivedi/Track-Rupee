import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import { serializable } from '../../utils/serializable';
import { monthBounds, withProgress } from './budget.progress';
import type { CreateBudgetInput, UpdateBudgetInput, BudgetQuery } from './budget.types';

async function mutate<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  try { return await serializable(work); }
  catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2002') throw new AppError('A budget already exists for this category, month, and year.', 409);
      if (error.code === 'P2025' || error.code === 'P2003') throw new AppError('Budget or category not found.', 404);
    }
    throw error;
  }
}
export async function createBudget(userId: string, input: CreateBudgetInput) {
  return mutate(async (tx) => {
    const category = await tx.category.findUnique({ where: { id_userId: { id: input.categoryId, userId } } });
    if (!category) throw new AppError('Category not found.', 404);
    if (category.type !== 'EXPENSE') throw new AppError('Budgets require an EXPENSE category.', 400);
    const budget = await tx.budget.create({ data: {
      userId, categoryId: input.categoryId, amount: new Prisma.Decimal(input.amount), currency: 'INR',
      month: input.month, year: input.year, ...monthBounds(input.month, input.year),
    } });
    return (await withProgress(tx, userId, [budget]))[0]!;
  });
}
export async function updateBudget(userId: string, id: string, input: UpdateBudgetInput) {
  return mutate(async (tx) => {
    const budget = await tx.budget.update({ where: { id, userId }, data: { amount: new Prisma.Decimal(input.amount) } });
    return (await withProgress(tx, userId, [budget]))[0]!;
  });
}
export async function deleteBudget(userId: string, id: string): Promise<void> {
  await mutate(async (tx) => { await tx.budget.delete({ where: { id, userId } }); });
}
export async function getBudget(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const budget = await tx.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new AppError('Budget not found.', 404);
    return (await withProgress(tx, userId, [budget]))[0]!;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function listBudgets(userId: string, query: BudgetQuery) {
  return prisma.$transaction(async (tx) => {
    const where = { userId, ...(query.month === undefined ? {} : { month: query.month }), ...(query.year === undefined ? {} : { year: query.year }) };
    const total = await tx.budget.count({ where });
    const rows = await tx.budget.findMany({ where, orderBy: [{ year: 'desc' }, { month: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit, take: query.limit });
    return { budgets: await withProgress(tx, userId, rows), pagination: {
      page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit), hasNextPage: query.page * query.limit < total,
    } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
