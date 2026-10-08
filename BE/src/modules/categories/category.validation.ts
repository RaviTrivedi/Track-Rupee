import Joi from 'joi';
import { CategoryType } from '../../generated/prisma/client';
import type { CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from './category.types';

const name = Joi.string().trim().min(1).max(100).messages({
  'any.required': 'Category name is required.',
  'string.empty': 'Category name is required.',
  'string.base': 'Category name must be a string.',
  'string.max': 'Category name must not exceed 100 characters.',
});
const type = Joi.string().valid(...Object.values(CategoryType)).messages({
  'any.required': 'Category type is required.',
  'any.only': 'Category type must be INCOME or EXPENSE.',
  'string.base': 'Category type must be INCOME or EXPENSE.',
});
const icon = Joi.string().trim().max(50).allow(null).messages({
  'string.base': 'Icon must be a string or null.',
  'string.empty': 'Icon must not be empty. Use null to clear it.',
  'string.max': 'Icon must not exceed 50 characters.',
});
const color = Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).uppercase().allow(null).messages({
  'string.base': 'Color must be a hex color such as #22C55E, or null.',
  'string.empty': 'Color must not be empty. Use null to clear it.',
  'string.pattern.base': 'Color must be a hex color such as #22C55E.',
});
const bodyMessages = {
  'any.required': 'A JSON request body is required.',
  'object.base': 'Request body must be a JSON object.',
  'object.min': 'Provide at least one category field to update.',
};
export const createCategorySchema = Joi.object<CreateCategoryInput>({
  name: name.required(), type: type.required(), icon, color,
}).required().messages(bodyMessages);
export const updateCategorySchema = Joi.object<UpdateCategoryInput>({ name, type, icon, color })
  .min(1).required().messages(bodyMessages);
export const categoryQuerySchema = Joi.object<CategoryQuery>({ type });
export const categoryParamsSchema = Joi.object<{ id: string }>({
  id: Joi.string().guid().required().messages({
    'string.guid': 'Category ID must be a valid UUID.',
    'any.required': 'Category ID is required.',
  }),
});
