import Joi from 'joi';
import type { LoginInput, RegisterInput } from './auth.types';

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).required().messages({
  'any.required': 'Email is required.',
  'string.empty': 'Email is required.',
  'string.base': 'Email must be a string.',
  'string.email': 'Enter a valid email address, such as name@example.com.',
  'string.max': 'Email must not exceed 254 characters.',
});

/*
 * bcrypt only processes 72 bytes. Reject longer UTF-8 input instead of silently
 * truncating it. Do not trim or normalize passwords: whitespace is meaningful.
 */
const password = Joi.string().max(72).custom((value: string, helpers) => {
  if (Buffer.byteLength(value, 'utf8') > 72) return helpers.error('any.invalid');
  return value;
}).required().messages({
  'any.required': 'Password is required.',
  'string.empty': 'Password is required.',
  'string.base': 'Password must be a string.',
  'string.min': 'Password must be at least 12 characters long.',
  'string.max': 'Password must not exceed 72 UTF-8 bytes.',
  'any.invalid': 'Password must not exceed 72 UTF-8 bytes.',
});

const bodyMessages = {
  'any.required': 'A JSON request body is required.',
  'object.base': 'Request body must be a JSON object.',
};

export const registerSchema = Joi.object<RegisterInput>({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Name is required.',
    'string.empty': 'Name is required.',
    'string.base': 'Name must be a string.',
    'string.min': 'Name is required.',
    'string.max': 'Name must not exceed 100 characters.',
  }),
  email,
  password: password.min(12),
}).required().messages(bodyMessages);

export const loginSchema = Joi.object<LoginInput>({ email, password }).required().messages(bodyMessages);

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().max(4096).pattern(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/).required().messages({
    'any.required': 'Refresh token is required.',
    'string.empty': 'Refresh token is required.',
    'string.base': 'Refresh token must be a string.',
    'string.max': 'Refresh token is too long.',
    'string.pattern.base': 'Refresh token must be a valid JWT string.',
  }),
}).required().messages(bodyMessages);
