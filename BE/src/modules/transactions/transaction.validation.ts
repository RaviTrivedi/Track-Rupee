import Joi from 'joi';
import { TransactionType } from '../../generated/prisma/client';
import type { CreateTransactionInput, UpdateTransactionInput, TransactionQuery } from './transaction.types';

/*
 * Require an explicit timezone and reject impossible calendar dates rather than
 * letting Date silently normalize them. Millisecond precision matches the DB.
 */
const timestamp = Joi.string().custom((value: string, helpers) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);
  if (!match) return helpers.error('any.invalid');
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0)
    || /[+-]14:(?!00)/.test(value) || !Number.isFinite(Date.parse(value))) return helpers.error('any.invalid');
  return value;
}).messages({ 'any.invalid': 'Date must be a valid ISO 8601 timestamp with timezone, such as 2026-10-06T12:30:00+05:30.' });
const fields = {
  type: Joi.string().valid(...Object.values(TransactionType)).messages({ 'any.only': 'Transaction type must be INCOME or EXPENSE.' }),
  amount: Joi.string().pattern(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/).custom((value: string, helpers) =>
    /[1-9]/.test(value) ? value : helpers.error('any.invalid')).messages({
      'string.base': 'Amount must be a positive decimal string, such as "250.50".',
      'string.pattern.base': 'Amount must be positive with at most 16 integer digits and two decimal places.',
      'any.invalid': 'Amount must be greater than zero.',
    }),
  accountId: Joi.string().guid().messages({ 'string.guid': 'Account ID must be a valid UUID.' }),
  categoryId: Joi.string().guid().messages({ 'string.guid': 'Category ID must be a valid UUID.' }),
  date: timestamp,
  note: Joi.string().max(500).allow('', null),
};
export const createTransactionSchema = Joi.object<CreateTransactionInput>({
  ...fields, type: fields.type.required(), amount: fields.amount.required(),
  accountId: fields.accountId.required(), categoryId: fields.categoryId.required(), date: timestamp.required(),
}).required();
export const updateTransactionSchema = Joi.object<UpdateTransactionInput>(fields).min(1).required()
  .messages({ 'object.min': 'Provide at least one transaction field to update.' });
export const transactionParamsSchema = Joi.object<{ id: string }>({ id: Joi.string().guid().required() });
export const transactionQuerySchema = Joi.object<TransactionQuery>({
  page: Joi.number().integer().min(1).max(1000000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  accountId: fields.accountId, categoryId: fields.categoryId, type: fields.type,
  from: timestamp, to: timestamp,
}).custom((value: TransactionQuery, helpers) => {
  if (value.from && value.to && Date.parse(value.from) >= Date.parse(value.to)) return helpers.error('any.invalid');
  return value;
}).messages({ 'any.invalid': 'The from timestamp must be earlier than to.' });
