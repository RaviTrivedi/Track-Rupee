import { api } from '@/services/api';

import type { ApiEnvelope, AuthPayload, PublicUser } from './auth.types';

export type Credentials = { email: string; password: string };
export type Registration = Credentials & { name: string };

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<ApiEnvelope<AuthPayload>, Registration>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: build.mutation<ApiEnvelope<AuthPayload>, Credentials>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    me: build.query<ApiEnvelope<{ user: PublicUser }>, void>({
      query: () => '/auth/me',
    }),
    refreshToken: build.mutation<ApiEnvelope<{ accessToken: string; refreshToken: string }>, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh-token', method: 'POST', body }),
    }),
    logout: build.mutation<ApiEnvelope<null>, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),
    logoutAll: build.mutation<ApiEnvelope<null>, void>({
      query: () => ({ url: '/auth/logout-all', method: 'POST' }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLazyMeQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useLogoutAllMutation,
} = authApi;
