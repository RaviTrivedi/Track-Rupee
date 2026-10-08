import { Prisma, type Account } from '../../generated/prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import type { CreateAccountInput, UpdateAccountInput } from './account.types';

function serialize(account: Account) {
  return { ...account, openingBalance: account.openingBalance.toFixed(2), balance: account.balance.toFixed(2) };
}

function accountError(error: unknown): never {
  if (error instanceof Error && 'code' in error) {
    if (error.code === 'P2025') throw new AppError('Account not found.', 404);
    if (error.code === 'P2003') throw new AppError('Accounts with linked transactions cannot be deleted.', 409);
  }
  throw error;
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  const openingBalance = new Prisma.Decimal(input.openingBalance ?? '0.00');
  const account = await prisma.account.create({ data: {
    userId, name: input.name, type: input.type, currency: 'INR', openingBalance, balance: openingBalance,
  } });
  return serialize(account);
}

export async function listAccounts(userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  return accounts.map(serialize);
}

export async function getAccount(userId: string, id: string) {
  const account = await prisma.account.findUnique({ where: { id_userId: { id, userId } } });
  if (!account) throw new AppError('Account not found.', 404);
  return serialize(account);
}

export async function updateAccount(userId: string, id: string, input: UpdateAccountInput) {
  try {
    const amount = input.openingBalance === undefined ? undefined : new Prisma.Decimal(input.openingBalance);
    return serialize(await prisma.account.update({
      where: { id_userId: { id, userId } }, data: { name: input.name, ...(input.type ? { type: input.type } : {}), ...(amount ? { openingBalance: amount, balance: amount } : {}) },
    }));
  } catch (error) { return accountError(error); }
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  try {
    /*
     * The restrictive Transaction foreign key is the authoritative check, including
     * concurrent inserts. Deleting by the owner key avoids a check-then-delete race;
     * PostgreSQL refuses deletion if any transaction references this account.
     */
    await prisma.account.delete({ where: { id_userId: { id, userId } } });
  } catch (error) { accountError(error); }
}
