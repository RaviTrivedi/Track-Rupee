import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/*
 * Express 5 already supports async handlers. This optional wrapper provides
 * an explicit convention and forwards synchronous throws and rejections alike.
 */
export function asyncHandler(controller: AsyncController): RequestHandler {
  return (req, res, next): void => {
    void Promise.resolve().then(() => controller(req, res, next)).catch(next);
  };
}
