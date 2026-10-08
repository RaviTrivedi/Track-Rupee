const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Explicit opt-in only: default tests never write to a configured development DB.
test('PostgreSQL refresh locking, replay, rollback, and user-scoped revocation', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_ACCESS_SECRET = 'integration-access-only-not-for-production-123456789';
  process.env.JWT_REFRESH_SECRET = 'integration-refresh-only-not-for-production-123456789';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  const { prisma } = require('../dist/config/database');
  const session = require('../dist/modules/auth/auth.session');
  const { hashRefreshToken } = require('../dist/utils/token-hash');
  const userIds = [];
  async function newUser() {
    const user = await prisma.user.create({ data: { email: `refresh-test-${randomUUID()}@example.com` } });
    userIds.push(user.id);
    return user;
  }
  async function issue(id) {
    return prisma.$transaction(async (tx) => {
      await session.lockSessionUser(tx, id);
      return session.issueSessionTokens(tx, id);
    });
  }
  try {
    const user = await newUser();
    const other = await newUser();
    const first = await issue(user.id);
    const independent = await issue(user.id);
    const otherUser = await issue(other.id);
    const results = await Promise.allSettled([
      session.refreshTokens(first.refreshToken), session.refreshTokens(first.refreshToken),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const success = results.find((result) => result.status === 'fulfilled').value;
    await assert.rejects(session.refreshTokens(success.refreshToken), { statusCode: 401 });
    assert.ok((await session.refreshTokens(independent.refreshToken)).refreshToken);
    // An unrelated user's session must survive logout-all.
    await session.logoutAllSessions(user.id);
    assert.equal(await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } }), 0);
    assert.ok((await session.refreshTokens(otherUser.refreshToken)).refreshToken);

    const concurrentLogout = await issue(user.id);
    await Promise.allSettled([
      session.refreshTokens(concurrentLogout.refreshToken), session.logoutAllSessions(user.id),
    ]);
    assert.equal(await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } }), 0);

    const rollbackToken = await issue(user.id);
    const before = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(rollbackToken.refreshToken) } });
    // A direct transaction failure verifies that revocation is rolled back by PostgreSQL.
    await assert.rejects(prisma.$transaction(async (tx) => {
      await session.lockSessionUser(tx, user.id);
      await tx.refreshToken.update({ where: { id: before.id }, data: { revokedAt: new Date() } });
      await tx.refreshToken.create({ data: { id: before.id, userId: user.id, familyId: before.familyId, tokenHash: before.tokenHash, expiresAt: before.expiresAt } });
    }));
    const after = await prisma.refreshToken.findUnique({ where: { id: before.id } });
    assert.equal(after.revokedAt, null);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
