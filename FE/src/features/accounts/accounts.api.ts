import { api } from '@/services/api';
import type { AccountType, LocalAccount } from './accounts.types';

type Envelope<T> = { success: boolean; message: string; data: T };
export type Account = LocalAccount & { openingBalance: string; currency: 'INR' };

export const accountsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAccounts: build.query<Envelope<{ accounts: Account[] }>, void>({
      query: () => '/accounts',
      providesTags: ['Accounts'],
    }),
    getAccount: build.query<Envelope<{ account: Account }>, string>({
      query: (id) => '/accounts/' + id,
      providesTags: (_result, _error, id) => [{ type: 'Accounts', id }],
    }),
    createAccount: build.mutation<Envelope<{ account: Account }>, { name: string; type: AccountType; openingBalance: string }>({
      query: (body) => ({ url: '/accounts', method: 'POST', body }),
      invalidatesTags: ['Accounts'],
    }),
    updateAccount: build.mutation<Envelope<{ account: Account }>, { id: string; name: string; type?: AccountType; openingBalance?: string }>({
      query: ({ id, name, type, openingBalance }) => ({ url: '/accounts/' + id, method: 'PATCH', body: { name, ...(type === undefined ? {} : { type }), ...(openingBalance === undefined ? {} : { openingBalance }) } }),
      invalidatesTags: (_result, _error, { id }) => ['Accounts', { type: 'Accounts', id }],
    }),
    deleteAccount: build.mutation<Envelope<null>, string>({
      query: (id) => ({ url: '/accounts/' + id, method: 'DELETE' }),
      invalidatesTags: ['Accounts'],
    }),
  }),
});

export const { useGetAccountsQuery, useCreateAccountMutation, useUpdateAccountMutation, useDeleteAccountMutation } = accountsApi;
