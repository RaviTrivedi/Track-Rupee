import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../config/database';
import { authConfig } from '../../config/auth';
import { AppError } from '../../utils/app-error';
import { hashRefreshToken, matchesRefreshToken } from '../../utils/token-hash';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from './auth.token';

/*
 * Every session mutation locks the same user row. PostgreSQL serializes rotation,
 * login issuance, replay revocation and logout across processes. A rotation cannot
 * create a successor after a concurrent revocation has already closed its family.
 */
export async function lockSessionUser(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE
  `;
  return rows.length === 1;
}
export async function issueSessionTokens(
  tx: Prisma.TransactionClient, userId: string,
  familyId: string = randomUUID(),
  expiresAt = new Date((Math.floor(Date.now() / 1000) + authConfig.refreshTokenTtlSeconds) * 1000),
) {
  const id = randomUUID();
  const refreshToken = createRefreshToken(userId, id, expiresAt);
  await tx.refreshToken.create({ data: { id, userId, familyId, expiresAt, tokenHash: hashRefreshToken(refreshToken) } });
  return { accessToken: createAccessToken(userId), refreshToken };
}
export async function refreshTokens(token: string) {
  const claims = verifyRefreshToken(token);
  const tokens = await prisma.$transaction(async (tx) => {
    if (!await lockSessionUser(tx, claims.userId)) return null;
    const stored = await tx.refreshToken.findUnique({ where: { id: claims.id } });
    if (!stored || stored.userId !== claims.userId || !matchesRefreshToken(token, stored.tokenHash)) return null;
    const now = new Date();
    if (stored.revokedAt) {
      await tx.refreshToken.updateMany({
        where: { userId: claims.userId, familyId: stored.familyId, revokedAt: null }, data: { revokedAt: now },
      });
      // Return a sentinel: throwing inside this transaction would undo revocation.
      return null;
    }
    if (stored.expiresAt <= now) return null;
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: now } });
    // Rotation preserves the original session expiry instead of extending it forever.
    return issueSessionTokens(tx, claims.userId, stored.familyId, stored.expiresAt);
  });
  if (!tokens) throw new AppError('Invalid or expired refresh token.', 401);
  return tokens;
}
export async function logoutSession(token: string): Promise<void> {
  const claims = verifyRefreshToken(token);
  await prisma.$transaction(async (tx) => {
    if (!await lockSessionUser(tx, claims.userId)) return;
    const stored = await tx.refreshToken.findUnique({ where: { id: claims.id } });
    if (!stored || stored.userId !== claims.userId || !matchesRefreshToken(token, stored.tokenHash)) return;
    // Logging out with a signed ancestor closes the whole device session.
    await tx.refreshToken.updateMany({
      where: { userId: claims.userId, familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() },
    });
  });
}
export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (!await lockSessionUser(tx, userId)) return;
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
}
