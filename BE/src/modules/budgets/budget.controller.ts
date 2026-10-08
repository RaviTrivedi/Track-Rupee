import type { Request } from 'express';
import type { ObjectSchema } from 'joi';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import { budgetParamsSchema, budgetQuerySchema } from './budget.validation';
import type { CreateBudgetInput, UpdateBudgetInput } from './budget.types';
import * as service from './budget.service';

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
  const budget = await service.createBudget(owner(req), req.body as CreateBudgetInput);
  res.status(201).json(successResponse('Budget created.', { budget }));
});
export const list = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse('Budgets retrieved.', await service.listBudgets(owner(req), validate(budgetQuerySchema, req.query))));
});
export const get = asyncHandler(async (req, res) => {
  const { id } = validate(budgetParamsSchema, req.params);
  res.status(200).json(successResponse('Budget retrieved.', { budget: await service.getBudget(owner(req), id) }));
});
export const update = asyncHandler(async (req, res) => {
  const { id } = validate(budgetParamsSchema, req.params);
  const budget = await service.updateBudget(owner(req), id, req.body as UpdateBudgetInput);
  res.status(200).json(successResponse('Budget updated.', { budget }));
});
export const remove = asyncHandler(async (req, res) => {
  const { id } = validate(budgetParamsSchema, req.params);
  await service.deleteBudget(owner(req), id);
  res.status(200).json(successResponse('Budget deleted.', null));
});
