import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { PublicUser } from './auth.types';

type AuthState = {
  accessToken: string | null;
  user: PublicUser | null;
  status: 'starting' | 'signed-out' | 'signed-in' | 'retry';
  error: string | null;
};

const initialState: AuthState = {
  accessToken: null,
  user: null,
  status: 'starting',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ accessToken: string; user: PublicUser }>) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.status = 'signed-in';
      state.error = null;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    setRetry: (state, action: PayloadAction<string>) => {
      state.status = 'retry';
      state.error = action.payload;
    },
    clearSession: (state) => {
      state.accessToken = null;
      state.user = null;
      state.status = 'signed-out';
      state.error = null;
    },
  },
});

export const { setSession, setAccessToken, setRetry, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
