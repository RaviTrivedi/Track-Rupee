import Joi from 'joi';
import type { CreateBudgetInput, UpdateBudgetInput, BudgetQuery } from './budget.types';

const amount = Joi.string().pattern(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/)
  .custom((value: string, helpers) => /[1-9]/.test(value) ? value : helpers.error('any.invalid'))
  .required().messages({
    'any.required': 'Budget amount is required.',
    'string.base': 'Budget amount must be a positive decimal string, such as "5000.00".',
    'string.pattern.base': 'Budget amount must have at most 16 integer digits and two decimal places.',
    'any.invalid': 'Budget amount must be greater than zero.',
  });
const month = Joi.number().integer().min(1).max(12).messages({
  'number.min': 'Month must be between 1 and 12.', 'number.max': 'Month must be between 1 and 12.',
});
const year = Joi.number().integer().min(1970).max(9999).messages({
  'number.min': 'Year must be between 1970 and 9999.', 'number.max': 'Year must be between 1970 and 9999.',
});
export const createBudgetSchema = Joi.object<CreateBudgetInput>({
  categoryId: Joi.string().guid().required().messages({ 'string.guid': 'Category ID must be a valid UUID.' }),
  amount, month: month.required(), year: year.required(),
}).required();
export const updateBudgetSchema = Joi.object<UpdateBudgetInput>({ amount }).required();
export const budgetParamsSchema = Joi.object<{ id: string }>({ id: Joi.string().guid().required() });
export const budgetQuerySchema = Joi.object<BudgetQuery>({
  month, year, page: Joi.number().integer().min(1).max(1000000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
