import type { Request } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import { accountIdSchema } from './account.validation';
import type { CreateAccountInput, UpdateAccountInput } from './account.types';
import * as service from './account.service';

function owner(req: Request): string {
  if (!req.authUser) throw new AppError('Authentication required.', 401);
  return req.authUser.id;
}
function accountId(req: Request): string {
  const result = accountIdSchema.validate(req.params.id);
  if (result.error) throw new AppError('Account ID must be a valid UUID.', 400);
  return result.value as string;
}

export const create = asyncHandler(async (req, res) => {
  const account = await service.createAccount(owner(req), req.body as CreateAccountInput);
  res.status(201).json(successResponse('Account created.', { account }));
});
export const list = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse('Accounts retrieved.', { accounts: await service.listAccounts(owner(req)) }));
});
export const get = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse('Account retrieved.', { account: await service.getAccount(owner(req), accountId(req)) }));
});
export const update = asyncHandler(async (req, res) => {
  const account = await service.updateAccount(owner(req), accountId(req), req.body as UpdateAccountInput);
  res.status(200).json(successResponse('Account updated.', { account }));
});
export const remove = asyncHandler(async (req, res) => {
  await service.deleteAccount(owner(req), accountId(req));
  res.status(200).json(successResponse('Account deleted.', null));
});
