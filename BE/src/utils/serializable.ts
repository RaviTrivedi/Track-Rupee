import { setTimeout } from 'node:timers/promises';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { AppError } from './app-error';

/*
 * Retry the entire unit of work, including reads, only after a database-confirmed
 * rollback. Never retry ambiguous connection failures or perform external side
 * effects in the callback. Four attempts bound contention and deadlock recovery.
 */
export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 2000, timeout: 5000,
      });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'P2034')) throw error;
      if (attempt === 3) throw new AppError('Concurrent changes prevented this operation. Please retry.', 409);
      await setTimeout(20 * 2 ** attempt + Math.floor(Math.random() * 20));
    }
  }
  throw new AppError('Unable to complete this operation.', 409);
}
