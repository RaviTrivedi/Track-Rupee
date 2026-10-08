import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/app-error';
import { errorResponse } from '../utils/api-response';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next): void => {
  /*
   * Once a response has begun, Express must finish handling the connection.
   * Sending another JSON response here would cause a headers-already-sent error.
   */
  if (res.headersSent) {
    next(error);
    return;
  }

  let status = 500;
  let message = 'Internal server error.';

  if (error instanceof AppError) {
    status = error.statusCode;
    if (status < 500) message = error.message;
  } else if (error instanceof Error && 'type' in error) {
    // Only recognized body-parser failures are safe to classify as client errors.
    switch (error.type) {
      case 'entity.parse.failed': status = 400; message = 'Invalid JSON body.'; break;
      case 'entity.too.large': status = 413; message = 'Request body is too large.'; break;
      case 'encoding.unsupported':
      case 'charset.unsupported': status = 415; message = 'Unsupported body encoding.'; break;
      case 'request.aborted':
      case 'request.size.invalid': status = 400; message = 'Invalid request body.'; break;
    }
  }

  if (status >= 500) {
    // Do not log request bodies, query strings, or arbitrary error payloads.
    console.error('Request failed with an internal server error.', error instanceof Error ? error.stack : error);
  }
  res.status(status).json(errorResponse(message));
};
