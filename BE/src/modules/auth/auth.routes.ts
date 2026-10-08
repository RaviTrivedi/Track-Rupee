import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate-body';
import { errorResponse } from '../../utils/api-response';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.validation';
import * as controller from './auth.controller';

export const authRouter = Router();
authRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/*
 * Bound expensive password operations and basic credential guessing per IP.
 * This store is process-local; use a shared store when deploying multiple replicas.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse('Too many authentication attempts. Try again later.'));
  },
});

authRouter.post('/register', credentialLimiter, validateBody(registerSchema), controller.register);
authRouter.post('/login', credentialLimiter, validateBody(loginSchema), controller.login);
authRouter.get('/me', authenticate, controller.me);
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 100,
  standardHeaders: 'draft-8', legacyHeaders: false,
  handler: (_req, res) => { res.status(429).json(errorResponse('Too many session requests. Try again later.')); },
});
authRouter.post('/refresh-token', sessionLimiter, validateBody(refreshTokenSchema), controller.refresh);
authRouter.post('/logout', sessionLimiter, validateBody(refreshTokenSchema), controller.logout);
authRouter.post('/logout-all', sessionLimiter, authenticate, controller.logoutAll);
