import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate-body';
import { createAccountSchema, updateAccountSchema } from './account.validation';
import * as controller from './account.controller';

export const accountRouter = Router();
accountRouter.use(authenticate);
accountRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
accountRouter.post('/', validateBody(createAccountSchema), controller.create);
accountRouter.get('/', controller.list);
accountRouter.get('/:id', controller.get);
accountRouter.patch('/:id', validateBody(updateAccountSchema), controller.update);
accountRouter.delete('/:id', controller.remove);
