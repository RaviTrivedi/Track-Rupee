import { api } from '@/services/api';
import type { TransactionType } from './transaction.types';
export type Transaction = { id: string; userId: string; accountId: string; categoryId: string; type: TransactionType; amount: string; date: string; note: string | null; createdAt: string; updatedAt: string };
type Envelope<T> = { success: boolean; message: string; data: T };
type List = { transactions: Transaction[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export const transactionsApi = api.injectEndpoints({ endpoints: (build) => ({
  getTransactions: build.query<Envelope<List>, { type?: TransactionType } | void>({ query: (p) => p?.type ? '/transactions?type=' + p.type : '/transactions', providesTags: ['Transactions'] }),
  createTransaction: build.mutation<Envelope<{ transaction: Transaction }>, Omit<Transaction, 'id'|'userId'|'createdAt'|'updatedAt'>>({ query: (body) => ({ url: '/transactions', method: 'POST', body }), invalidatesTags: ['Transactions', 'Accounts'] }),
  updateTransaction: build.mutation<Envelope<{ transaction: Transaction }>, { id: string; data: Partial<Omit<Transaction, 'id'|'userId'|'createdAt'|'updatedAt'>> }>({ query: ({ id, data }) => ({ url: '/transactions/' + id, method: 'PATCH', body: data }), invalidatesTags: ['Transactions', 'Accounts'] }),
  deleteTransaction: build.mutation<Envelope<null>, string>({ query: (id) => ({ url: '/transactions/' + id, method: 'DELETE' }), invalidatesTags: ['Transactions', 'Accounts'] }),
}) });
export const { useGetTransactionsQuery, useCreateTransactionMutation, useUpdateTransactionMutation, useDeleteTransactionMutation } = transactionsApi;
