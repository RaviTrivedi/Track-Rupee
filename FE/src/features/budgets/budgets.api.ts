import { api } from '@/services/api';
export type Budget = { id: string; userId: string; categoryId: string; amount: string; spent: string; remaining: string; percentageUsed: number; isOverBudget: boolean; month: number; year: number; currency: 'INR' };
type Envelope<T> = { success: boolean; message: string; data: T };
export const budgetsApi = api.injectEndpoints({ endpoints: (build) => ({
  getBudgets: build.query<Envelope<{ budgets: Budget[]; pagination: unknown }>, { month?: number; year?: number } | void>({ query: (p) => { const q = new URLSearchParams(); if (p?.month) q.set('month', String(p.month)); if (p?.year) q.set('year', String(p.year)); return '/budgets' + (q.toString() ? '?' + q : ''); }, providesTags: ['Budgets'] }),
  createBudget: build.mutation<Envelope<{ budget: Budget }>, { categoryId: string; amount: string; month: number; year: number }>({ query: (body) => ({ url: '/budgets', method: 'POST', body }), invalidatesTags: ['Budgets'] }),
  updateBudget: build.mutation<Envelope<{ budget: Budget }>, { id: string; amount: string }>({ query: ({ id, amount }) => ({ url: '/budgets/' + id, method: 'PATCH', body: { amount } }), invalidatesTags: ['Budgets'] }),
  deleteBudget: build.mutation<Envelope<null>, string>({ query: (id) => ({ url: '/budgets/' + id, method: 'DELETE' }), invalidatesTags: ['Budgets'] }),
}) });
export const { useGetBudgetsQuery, useCreateBudgetMutation, useUpdateBudgetMutation, useDeleteBudgetMutation } = budgetsApi;
