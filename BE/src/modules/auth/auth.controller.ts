import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import * as authService from './auth.service';
import type { LoginInput, RegisterInput } from './auth.types';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body as RegisterInput);
  res.status(201).json(successResponse('Registration successful.', result));
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body as LoginInput);
  res.status(200).json(successResponse('Login successful.', result));
});

export const me = asyncHandler(async (req, res) => {
  if (!req.authUser) throw new AppError('Authentication required.', 401);
  res.status(200).json(successResponse('Current user retrieved.', { user: req.authUser }));
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  res.status(200).json(successResponse('Tokens refreshed.', await authService.refreshTokens(refreshToken)));
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  await authService.logoutSession(refreshToken);
  res.status(200).json(successResponse('Logout successful. Discard your tokens.', null));
});

export const logoutAll = asyncHandler(async (req, res) => {
  if (!req.authUser) throw new AppError('Authentication required.', 401);
  await authService.logoutAllSessions(req.authUser.id);
  res.status(200).json(successResponse('All sessions logged out. Discard your tokens.', null));
});
