import Joi from 'joi';
import { AccountType } from '../../generated/prisma/client';
import type { CreateAccountInput, UpdateAccountInput } from './account.types';

const name = Joi.string().trim().min(1).max(100).required().messages({
  'any.required': 'Account name is required.',
  'string.empty': 'Account name is required.',
  'string.base': 'Account name must be a string.',
  'string.max': 'Account name must not exceed 100 characters.',
});
const bodyMessages = {
  'any.required': 'A JSON request body is required.',
  'object.base': 'Request body must be a JSON object.',
};

export const createAccountSchema = Joi.object<CreateAccountInput>({
  name,
  type: Joi.string().valid(AccountType.CASH, AccountType.BANK, AccountType.WALLET).required().messages({
    'any.required': 'Account type is required.',
    'any.only': 'Account type must be CASH, BANK, or WALLET. CARD is not supported yet.',
  }),
  // Sixteen integer digits plus two fractional digits fit Decimal(18,2).
  // Signed balances are permitted; no floating-point conversion is performed.
  openingBalance: Joi.string().pattern(/^-?(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/).default('0.00').messages({
    'string.base': 'Opening balance must be a decimal string, such as "1250.00".',
    'string.empty': 'Opening balance must not be empty.',
    'string.pattern.base': 'Opening balance must have at most 16 integer digits and two decimal places, without commas or exponent notation.',
  }),
}).required().messages(bodyMessages);

export const updateAccountSchema = Joi.object<UpdateAccountInput>({ name, type: Joi.string().valid(AccountType.CASH, AccountType.BANK, AccountType.WALLET), openingBalance: Joi.string().pattern(/^-?(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/).messages({ 'string.base': 'Amount must be a decimal string.', 'string.pattern.base': 'Amount must have at most two decimal places.' }) }).required().messages(bodyMessages);
export const accountIdSchema = Joi.string().guid().required().messages({
  'string.guid': 'Account ID must be a valid UUID.',
  'any.required': 'Account ID is required.',
});
