import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate-body';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import * as controller from './category.controller';

export const categoryRouter = Router();
categoryRouter.use(authenticate);
categoryRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
categoryRouter.post('/', validateBody(createCategorySchema), controller.create);
categoryRouter.get('/', controller.list);
categoryRouter.get('/:id', controller.get);
categoryRouter.patch('/:id', validateBody(updateCategorySchema), controller.update);
categoryRouter.delete('/:id', controller.remove);
