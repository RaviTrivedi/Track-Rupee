const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'auth-test-access-only-not-for-production-123456789012345';
process.env.JWT_REFRESH_SECRET = 'auth-test-refresh-only-not-for-production-123456789012345';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/trackrupee_test';
const { prisma } = require('../dist/config/database');
const { app } = require('../dist/app');
const { authConfig } = require('../dist/config/auth');
const { registerSchema } = require('../dist/modules/auth/auth.validation');

/*
 * Stub only persistence. HTTP routing, Joi, bcrypt, JWT, and error handling are
 * exercised together without connecting to or modifying a developer's database.
 */
test('authentication lifecycle and security failures', async (t) => {
  const users = new Map();
  const sessions = new Map();
  t.mock.method(prisma.category, 'createMany', async ({ data, skipDuplicates }) => {
    assert.equal(skipDuplicates, true);
    assert.equal(data.length, 16);
    assert.ok(data.every((category) => category.isDefault && users.has(category.userId)));
    return { count: data.length };
  });
  const { hashRefreshToken } = require('../dist/utils/token-hash');
  // Serialize the in-memory transaction double; PostgreSQL locking is tested separately.
  let transactionQueue = Promise.resolve();
  t.mock.method(prisma, '$transaction', (fn) => {
    const run = transactionQueue.then(async () => {
      const before = structuredClone(sessions);
      try { return await fn(prisma); }
      catch (error) { sessions.clear(); for (const [key, value] of before) sessions.set(key, value); throw error; }
    });
    transactionQueue = run.catch(() => {});
    return run;
  });
  t.mock.method(prisma, '$queryRaw', async (_strings, id) => users.has(id) ? [{ id }] : []);
  t.mock.method(prisma.refreshToken, 'create', async ({ data }) => {
    const row = { ...data, revokedAt: null }; sessions.set(row.id, row); return row;
  });
  t.mock.method(prisma.refreshToken, 'findUnique', async ({ where }) => sessions.get(where.id) ?? null);
  t.mock.method(prisma.refreshToken, 'update', async ({ where, data }) => Object.assign(sessions.get(where.id), data));
  t.mock.method(prisma.refreshToken, 'updateMany', async ({ where, data }) => {
    let count = 0;
    for (const row of sessions.values()) {
      if (row.userId === where.userId && (!where.familyId || row.familyId === where.familyId) && row.revokedAt === null) {
        Object.assign(row, data); count += 1;
      }
    }
    return { count };
  });
  function select(user, fields) {
    return user ? Object.fromEntries(Object.keys(fields).map((key) => [key, user[key]])) : null;
  }
  t.mock.method(prisma.user, 'findFirst', async ({ where, select: fields }) => {
    const user = [...users.values()].find((value) => value.email.toLowerCase() === where.email.equals.toLowerCase());
    return select(user, fields);
  });
  t.mock.method(prisma.user, 'findUnique', async ({ where, select: fields }) => select(users.get(where.id), fields));
  t.mock.method(prisma.user, 'create', async ({ data, select: fields }) => {
    if (data.email === 'race@example.com') {
      throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    }
    const user = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() };
    users.set(user.id, user);
    return select(user, fields);
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  async function request(path, body, token, method = 'POST') {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}${path}`, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  const password = 'a long test passphrase';
  try {
    const bad = await request('/register', { name: 'Test', email: 'invalid', password: 'secret' });
    assert.equal(bad.status, 400);
    assert.ok(!JSON.stringify(bad.body).includes('secret'));
    const extra = await request('/register', { name: 'Test', email: 'a@example.com', password, role: 'admin' });
    assert.equal(extra.status, 400);

    const registered = await request('/register', { name: ' Test User ', email: ' Person@Example.com ', password });
    assert.equal(registered.status, 201);
    assert.equal(registered.headers.get('cache-control'), 'no-store');
    assert.equal(registered.body.data.user.name, 'Test User');
    assert.equal(registered.body.data.user.email, 'person@example.com');
    assert.equal(registered.body.data.user.passwordHash, undefined);
    const stored = users.get(registered.body.data.user.id);
    assert.notEqual(stored.passwordHash, password);
    assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
    const token = registered.body.data.accessToken;
    const claims = jwt.verify(token, authConfig.accessSecret, { algorithms: ['HS256'] });
    assert.equal(claims.sub, stored.id);
    assert.equal(claims.exp - claims.iat, 900);

    assert.equal((await request('/register', { name: 'Another', email: 'PERSON@example.com', password })).status, 409);
    assert.equal((await request('/register', { name: 'Race', email: 'race@example.com', password })).status, 409);
    const wrong = await request('/login', { email: 'person@example.com', password: 'wrong-password' });
    const absent = await request('/login', { email: 'absent@example.com', password });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, absent.body);
    const loggedIn = await request('/login', { email: 'PERSON@example.com', password });
    assert.equal(loggedIn.status, 200);
    assert.equal(loggedIn.body.data.user.passwordHash, undefined);
    assert.ok(loggedIn.body.data.accessToken);

    assert.equal((await request('/me', undefined, undefined, 'GET')).status, 401);
    const current = await request('/me', undefined, token, 'GET');
    assert.equal(current.status, 200);
    assert.equal(current.body.data.user.id, stored.id);
    assert.equal(current.body.data.user.passwordHash, undefined);
    assert.equal((await request('/me', undefined, `${token}tampered`, 'GET')).status, 401);
    const opts = { subject: stored.id, issuer: authConfig.issuer, audience: authConfig.audience };
    for (const options of [
      { ...opts, expiresIn: -1 },
      { ...opts, expiresIn: 900, audience: 'wrong' },
      { ...opts, expiresIn: 900, issuer: 'wrong' },
      { ...opts, expiresIn: 900, algorithm: 'HS384' },
      opts,
    ]) {
      const invalidToken = jwt.sign({}, authConfig.accessSecret, options);
      assert.equal((await request('/me', undefined, invalidToken, 'GET')).status, 401);
    }
    const originalRefresh = registered.body.data.refreshToken;
    const loginRefresh = loggedIn.body.data.refreshToken;
    const originalRow = [...sessions.values()].find((row) => row.tokenHash === hashRefreshToken(originalRefresh));
    assert.ok(originalRow);
    assert.notEqual(originalRow.tokenHash, originalRefresh);
    assert.equal((await request('/refresh-token', {})).status, 400);
    assert.equal((await request('/refresh-token', { refreshToken: token })).status, 401);
    assert.equal((await request('/me', undefined, originalRefresh, 'GET')).status, 401);
    const rotated = await request('/refresh-token', { refreshToken: originalRefresh });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.body.data.refreshToken, originalRefresh);
    const nextRow = [...sessions.values()].find((row) => row.tokenHash === hashRefreshToken(rotated.body.data.refreshToken));
    assert.equal(nextRow.expiresAt.getTime(), originalRow.expiresAt.getTime());
    assert.ok(originalRow.revokedAt);
    // Replay commits revocation of the successor, but leaves the other login intact.
    assert.equal((await request('/refresh-token', { refreshToken: originalRefresh })).status, 401);
    assert.equal((await request('/refresh-token', { refreshToken: rotated.body.data.refreshToken })).status, 401);
    const otherDevice = await request('/refresh-token', { refreshToken: loginRefresh });
    assert.equal(otherDevice.status, 200);
    assert.equal((await request('/logout')).status, 400);
    assert.equal((await request('/logout', { refreshToken: otherDevice.body.data.refreshToken })).status, 200);
    assert.equal((await request('/logout', { refreshToken: otherDevice.body.data.refreshToken })).status, 200);
    assert.equal((await request('/refresh-token', { refreshToken: otherDevice.body.data.refreshToken })).status, 401);
    assert.equal((await request('/logout-all')).status, 401);
    const device1 = await request('/login', { email: stored.email, password });
    const device2 = await request('/login', { email: stored.email, password });
    assert.equal((await request('/logout-all', undefined, token)).status, 200);
    for (const device of [device1, device2]) {
      assert.equal((await request('/refresh-token', { refreshToken: device.body.data.refreshToken })).status, 401);
    }
    // Refresh revocation does not revoke previously issued access tokens.
    assert.equal((await request('/me', undefined, token, 'GET')).status, 200);
    users.delete(stored.id);
    assert.equal((await request('/me', undefined, token, 'GET')).status, 401);
    users.set(stored.id, { ...stored, passwordHash: null });
    assert.equal((await request('/login', { email: stored.email, password })).status, 401);

    let limited;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      limited = await request('/login', {});
      if (limited.status === 429) break;
    }
    assert.equal(limited.status, 429);
    assert.equal(limited.body.success, false);
  } finally {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await prisma.$disconnect();
  }
});

test('password validation rejects bcrypt truncation and preserves whitespace', () => {
  const input = { name: 'Test', email: 'test@example.com', password: 'é'.repeat(37) };
  assert.ok(registerSchema.validate(input).error);
  assert.equal(registerSchema.validate({ ...input, password: 'é'.repeat(36) }).error, undefined);
  const spaced = '  my long passphrase  ';
  assert.equal(registerSchema.validate({ ...input, password: spaced }).value.password, spaced);
});
