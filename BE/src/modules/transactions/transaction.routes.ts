import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate-body';
import { createTransactionSchema, updateTransactionSchema } from './transaction.validation';
import * as controller from './transaction.controller';

export const transactionRouter = Router();
transactionRouter.use(authenticate);
transactionRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
transactionRouter.post('/', validateBody(createTransactionSchema), controller.create);
transactionRouter.get('/', controller.list);
transactionRouter.get('/:id', controller.get);
transactionRouter.patch('/:id', validateBody(updateTransactionSchema), controller.update);
transactionRouter.delete('/:id', controller.remove);
