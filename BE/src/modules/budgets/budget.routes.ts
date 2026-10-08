import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate-body';
import { createBudgetSchema, updateBudgetSchema } from './budget.validation';
import * as controller from './budget.controller';

export const budgetRouter = Router();
budgetRouter.use(authenticate);
budgetRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
budgetRouter.post('/', validateBody(createBudgetSchema), controller.create);
budgetRouter.get('/', controller.list);
budgetRouter.get('/:id', controller.get);
budgetRouter.patch('/:id', validateBody(updateBudgetSchema), controller.update);
budgetRouter.delete('/:id', controller.remove);
