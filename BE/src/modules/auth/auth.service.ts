import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../config/database';
import { authConfig } from '../../config/auth';
import { AppError } from '../../utils/app-error';
import { issueSessionTokens, lockSessionUser } from './auth.session';
export { refreshTokens, logoutSession, logoutAllSessions } from './auth.session';
import { publicUserSelect, type LoginInput, type RegisterInput } from './auth.types';
import { createDefaultCategories } from '../categories/category.defaults';
import { hashPassword } from '../../utils/password';

let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomBytes(32).toString('hex'), authConfig.bcryptRounds);
  return dummyHash;
}

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true },
  });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: input.name, email, passwordHash }, select: publicUserSelect,
      });
      await createDefaultCategories(tx, user.id);
      return { user, ...await issueSessionTokens(tx, user.id) };
    });
  } catch (error: unknown) {
    /*
     * The preliminary lookup helps normal requests; the unique database index
     * remains authoritative when simultaneous registrations race each other.
     */
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new AppError('An account with this email already exists.', 409);
    }
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: input.email.trim().toLowerCase(), mode: 'insensitive' } },
    select: { ...publicUserSelect, passwordHash: true },
  });

  // Run bcrypt even for missing or legacy passwordless users to reduce timing differences.
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? await getDummyHash());
  if (!user || !user.passwordHash || !valid) {
    throw new AppError('Invalid email or password.', 401);
  }
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return prisma.$transaction(async (tx) => {
    if (!await lockSessionUser(tx, user.id)) throw new AppError('Invalid email or password.', 401);
    return { user: publicUser, ...await issueSessionTokens(tx, user.id) };
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw new AppError('Invalid or expired access token.', 401);
  return user;
}
