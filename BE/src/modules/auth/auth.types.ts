import type { Prisma } from '../../generated/prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { name: string }

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: PublicUser;
  }
}
