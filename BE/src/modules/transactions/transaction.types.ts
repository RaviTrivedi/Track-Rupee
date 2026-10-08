import type { TransactionType } from '../../generated/prisma/client';

export interface CreateTransactionInput {
  type: TransactionType;
  amount: string;
  accountId: string;
  categoryId: string;
  date: string;
  note?: string | null;
}
export type UpdateTransactionInput = Partial<CreateTransactionInput>;
export interface TransactionQuery {
  page: number;
  limit: number;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
}
