import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { healthRouter } from './modules/health/health.routes';
import { apiRouter } from './routes';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());

/*
 * Log before parsing so malformed requests are recorded too. Query strings,
 * bodies, and authorization headers are deliberately excluded from access logs.
 */
morgan.token('pathname', (req) => (req.url ?? '/').split('?')[0] ?? '/');
app.use(morgan(':method :pathname :status :res[content-length] - :response-time ms'));
app.use(cors({
  origin: [...config.corsOrigins],
  credentials: false,
}));
app.use(express.json({ limit: '100kb' }));
app.use('/health', healthRouter);
app.use('/api', apiRouter);

// Keep the fallback and four-argument error middleware after all application routes.
app.use(notFound);
app.use(errorHandler);
