import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';

import { env } from '@/config/env';
import { authStorage } from '@/features/auth/auth.storage';
import { clearSession, setAccessToken } from '@/features/auth/auth.slice';
import type { RootState } from '@/store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  timeout: 15000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', 'Bearer ' + token);
    headers.set('content-type', 'application/json');
    return headers;
  },
});

const refreshMutex = new Mutex();
let sessionGeneration = 0;

const isSessionEndpoint = (args: string | FetchArgs) => {
  const url = typeof args === 'string' ? args : args.url;
  return ['/auth/login', '/auth/register', '/auth/refresh-token'].some((path) => url.endsWith(path));
};

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  apiContext,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, apiContext, extraOptions);
  if (result.error?.status !== 401 || isSessionEndpoint(args)) return result;

  const generationAtStart = sessionGeneration;
  await refreshMutex.waitForUnlock();
  if (generationAtStart !== sessionGeneration) {
    return rawBaseQuery(args, apiContext, extraOptions);
  }

  const release = await refreshMutex.acquire();
  try {
    if (generationAtStart !== sessionGeneration) {
      return rawBaseQuery(args, apiContext, extraOptions);
    }
    const refreshToken = await authStorage.getRefreshToken();
    if (!refreshToken) {
      apiContext.dispatch(clearSession());
      return result;
    }

    const refreshed = await rawBaseQuery(
      { url: '/auth/refresh-token', method: 'POST', body: { refreshToken } },
      apiContext,
      extraOptions,
    );
    if (refreshed.data) {
      const payload = refreshed.data as { data: { accessToken: string; refreshToken: string } };
      await authStorage.saveRefreshToken(payload.data.refreshToken);
      apiContext.dispatch(setAccessToken(payload.data.accessToken));
      sessionGeneration += 1;
      result = await rawBaseQuery(args, apiContext, extraOptions);
    } else {
      apiContext.dispatch(clearSession());
      await authStorage.clearRefreshToken();
    }
  } finally {
    release();
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Accounts', 'Categories', 'Transactions', 'Budgets'],
  endpoints: () => ({}),
});

export const invalidateSessionGeneration = () => {
  sessionGeneration += 1;
};
