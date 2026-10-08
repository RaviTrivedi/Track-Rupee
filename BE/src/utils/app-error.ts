/*
 * Use AppError for expected client-facing failures. Unexpected exceptions are
 * handled separately so implementation details never appear in API responses.
 */
export class AppError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AppError';
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new RangeError('AppError statusCode must be between 400 and 599.');
    }
  }
}
