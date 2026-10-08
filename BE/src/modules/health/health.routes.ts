import { Router } from 'express';
import { successResponse } from '../../utils/api-response';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.status(200).json(successResponse('TrackRupee API is healthy.', {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));
});
