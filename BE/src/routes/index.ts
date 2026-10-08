import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { categoryRouter } from '../modules/categories/category.routes';
import { accountRouter } from '../modules/accounts/account.routes';
import { transactionRouter } from '../modules/transactions/transaction.routes';
import { budgetRouter } from '../modules/budgets/budget.routes';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/accounts', accountRouter);
apiRouter.use('/transactions', transactionRouter);
apiRouter.use('/budgets', budgetRouter);
