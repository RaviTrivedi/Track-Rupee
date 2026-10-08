const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');

process.env.JWT_ACCESS_SECRET = 'category-test-access-only-not-for-production-123456';
process.env.JWT_REFRESH_SECRET = 'category-test-refresh-only-not-for-production-123456';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/trackrupee_test';
const { prisma } = require('../dist/config/database');
const { app } = require('../dist/app');
const { createAccessToken } = require('../dist/modules/auth/auth.token');

test('category HTTP validation, ownership, CRUD, and database conflict mapping', async (t) => {
  const owner = randomUUID();
  const other = randomUUID();
  const rows = new Map();
  t.mock.method(prisma, '$transaction', async (work) => work(prisma));
  t.mock.method(prisma.transaction, 'count', async () => 0);
  t.mock.method(prisma.budget, 'count', async () => 0);
  const error = (code) => Object.assign(new Error('Database error'), { code });
  const find = ({ id, userId }) => {
    const row = rows.get(id);
    return row?.userId === userId ? row : null;
  };
  const checkUnique = (candidate) => {
    if ([...rows.values()].some((row) => row.id !== candidate.id && row.userId === candidate.userId
      && row.type === candidate.type && row.name.toLowerCase() === candidate.name.toLowerCase())) throw error('P2002');
  };
  t.mock.method(prisma.user, 'findUnique', async ({ where }) => ({ id: where.id, name: 'Test', email: 'test@example.com' }));
  t.mock.method(prisma.category, 'create', async ({ data }) => {
    const row = { id: randomUUID(), icon: null, color: null, isArchived: false, ...data };
    checkUnique(row); rows.set(row.id, row); return row;
  });
  t.mock.method(prisma.category, 'findUnique', async ({ where }) => find(where.id_userId));
  t.mock.method(prisma.category, 'findMany', async ({ where }) => [...rows.values()].filter((row) =>
    row.userId === where.userId && (!where.type || row.type === where.type)));
  t.mock.method(prisma.category, 'update', async ({ where, data }) => {
    const row = find(where.id_userId);
    if (!row) throw error('P2025');
    const updated = { ...row, ...data }; checkUnique(updated); rows.set(row.id, updated); return updated;
  });
  t.mock.method(prisma.category, 'delete', async ({ where }) => {
    const row = find(where.id_userId);
    if (!row) throw error('P2025');
    if (row.name === 'In use') throw error('P2003');
    rows.delete(row.id); return row;
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  async function request(method, path = '', body, userId = owner) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/categories${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${createAccessToken(userId)}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await request('GET', '', undefined, null)).status, 401);
    assert.equal((await request('POST', '', { name: 'Food', type: 'EXPENSE', userId: other })).status, 400);
    assert.equal((await request('POST', '', { name: ' ', type: 'INVALID', color: 'red' })).status, 400);
    const created = await request('POST', '', { name: ' Food ', type: 'EXPENSE', icon: 'utensils', color: '#22c55e' });
    assert.equal(created.status, 201);
    const id = created.body.data.category.id;
    assert.equal(created.body.data.category.name, 'Food');
    assert.equal(created.body.data.category.color, '#22C55E');
    assert.equal(created.body.data.category.userId, owner);
    assert.equal((await request('POST', '', { name: 'food', type: 'EXPENSE' })).status, 409);
    assert.equal((await request('POST', '', { name: 'Food', type: 'INCOME' })).status, 201);
    assert.equal((await request('POST', '', { name: 'Food', type: 'EXPENSE' }, other)).status, 201);
    assert.equal((await request('GET', '?type=EXPENSE')).body.data.categories.length, 1);
    assert.equal((await request('GET', '?type=INVALID')).status, 400);
    assert.equal((await request('GET', '?type=INCOME&type=EXPENSE')).status, 400);
    assert.equal((await request('GET', '/invalid-id')).status, 400);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      assert.equal((await request(method, `/${id}`, method === 'PATCH' ? { name: 'Stolen' } : undefined, other)).status, 404);
    }
    assert.equal((await request('PATCH', `/${id}`, {})).status, 400);
    assert.equal((await request('PATCH', `/${id}`, { type: 'INCOME' })).status, 409);
    const changed = await request('PATCH', `/${id}`, { name: 'Dining', icon: null, color: null });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.data.category.icon, null);
    assert.equal((await request('GET', `/${id}`)).body.data.category.name, 'Dining');
    assert.equal((await request('DELETE', `/${id}`)).status, 200);
    assert.equal((await request('GET', `/${id}`)).status, 404);
    const linked = await request('POST', '', { name: 'In use', type: 'EXPENSE' });
    assert.equal((await request('DELETE', `/${linked.body.data.category.id}`)).status, 409);
  } finally {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await prisma.$disconnect();
  }
});
