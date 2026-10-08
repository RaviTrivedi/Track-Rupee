import type { Request } from 'express';
import type { ObjectSchema } from 'joi';
import { asyncHandler } from '../../utils/async-handler';
import { AppError } from '../../utils/app-error';
import { successResponse } from '../../utils/api-response';
import { categoryParamsSchema, categoryQuerySchema } from './category.validation';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.types';
import * as service from './category.service';

function owner(req: Request): string {
  if (!req.authUser) throw new AppError('Authentication required.', 401);
  return req.authUser.id;
}

/*
 * Express 5 query values are read-only. Validate into a local typed value rather
 * than assigning a normalized object back to req.query or casting unchecked input.
 */
function validate<T>(schema: ObjectSchema<T>, value: unknown): T {
  const result = schema.validate(value, { abortEarly: false, allowUnknown: false });
  if (result.error) {
    const messages = result.error.details.map((item) => item.type === 'object.unknown'
      ? 'Request contains an unsupported field.' : item.message);
    throw new AppError([...new Set(messages)].join(' '), 400);
  }
  return result.value;
}

export const create = asyncHandler(async (req, res) => {
  const category = await service.createCategory(owner(req), req.body as CreateCategoryInput);
  res.status(201).json(successResponse('Category created.', { category }));
});
export const list = asyncHandler(async (req, res) => {
  const categories = await service.listCategories(owner(req), validate(categoryQuerySchema, req.query));
  res.status(200).json(successResponse('Categories retrieved.', { categories }));
});
export const get = asyncHandler(async (req, res) => {
  const { id } = validate(categoryParamsSchema, req.params);
  res.status(200).json(successResponse('Category retrieved.', { category: await service.getCategory(owner(req), id) }));
});
export const update = asyncHandler(async (req, res) => {
  const { id } = validate(categoryParamsSchema, req.params);
  const category = await service.updateCategory(owner(req), id, req.body as UpdateCategoryInput);
  res.status(200).json(successResponse('Category updated.', { category }));
});
export const remove = asyncHandler(async (req, res) => {
  const { id } = validate(categoryParamsSchema, req.params);
  await service.deleteCategory(owner(req), id);
  res.status(200).json(successResponse('Category deleted.', null));
});
