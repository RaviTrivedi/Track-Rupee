import type { RequestHandler } from 'express';
import type { ObjectSchema } from 'joi';
import { AppError } from '../utils/app-error';

export function validateBody<T>(schema: ObjectSchema<T>): RequestHandler {
  return (req, _res, next): void => {
    const result = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
    if (result.error) {
      /*
       * Schema messages explain each failed rule without exposing Joi's context,
       * which contains submitted values. Unknown keys are user-controlled too,
       * so report those without echoing the key itself.
       */
      const messages = result.error.details.map((detail) => detail.type === 'object.unknown'
        ? 'Request contains an unsupported field.'
        : detail.message);
      next(new AppError([...new Set(messages)].join(' '), 400));
      return;
    }
    req.body = result.value;
    next();
  };
}
