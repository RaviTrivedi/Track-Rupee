import type { Request } from 'express';
import type { ObjectSchema } from 'joi';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import { transactionParamsSchema, transactionQuerySchema } from './transaction.validation';
import type { CreateTransactionInput, UpdateTransactionInput } from './transaction.types';
import * as service from './transaction.service';

function owner(req: Request): string {
  if (!req.authUser) throw new AppError('Authentication required.', 401);
  return req.authUser.id;
}
function validate<T>(schema: ObjectSchema<T>, input: unknown): T {
  const result = schema.validate(input, { abortEarly: false, allowUnknown: false });
  if (result.error) throw new AppError(result.error.details.map((item) =>
    item.type === 'object.unknown' ? 'Request contains an unsupported field.' : item.message).join(' '), 400);
  return result.value;
}
export const create = asyncHandler(async (req, res) => {
  const transaction = await service.createTransaction(owner(req), req.body as CreateTransactionInput);
  res.status(201).json(successResponse('Transaction created.', { transaction }));
});
export const list = asyncHandler(async (req, res) => {
  const result = await service.listTransactions(owner(req), validate(transactionQuerySchema, req.query));
  res.status(200).json(successResponse('Transactions retrieved.', result));
});
export const get = asyncHandler(async (req, res) => {
  const { id } = validate(transactionParamsSchema, req.params);
  res.status(200).json(successResponse('Transaction retrieved.', { transaction: await service.getTransaction(owner(req), id) }));
});
export const update = asyncHandler(async (req, res) => {
  const { id } = validate(transactionParamsSchema, req.params);
  const transaction = await service.updateTransaction(owner(req), id, req.body as UpdateTransactionInput);
  res.status(200).json(successResponse('Transaction updated.', { transaction }));
});
export const remove = asyncHandler(async (req, res) => {
  const { id } = validate(transactionParamsSchema, req.params);
  await service.deleteTransaction(owner(req), id);
  res.status(200).json(successResponse('Transaction deleted.', null));
});
