const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
process.env.JWT_ACCESS_SECRET = 'account-test-access-secret-not-for-production-12345';
process.env.JWT_REFRESH_SECRET = 'account-test-refresh-secret-not-for-production-12345';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/trackrupee_test';
const { prisma } = require('../dist/config/database');
const { app } = require('../dist/app');
const { createAccessToken } = require('../dist/modules/auth/auth.token');

test('account routes preserve decimals, scope ownership, restrict updates and protect history', async (t) => {
  const userId = randomUUID();
  const otherId = randomUUID();
  const rows = new Map();
  const dbError = (code) => Object.assign(new Error('DB failure'), { code });
  const scoped = ({ id, userId: owner }) => rows.get(id)?.userId === owner ? rows.get(id) : null;
  t.mock.method(prisma.user, 'findUnique', async ({ where }) => ({ id: where.id }));
  t.mock.method(prisma.account, 'create', async ({ data }) => {
    const row = { ...data, id: randomUUID(), isArchived: false }; rows.set(row.id, row); return row;
  });
  t.mock.method(prisma.account, 'findMany', async ({ where }) => [...rows.values()].filter((row) => row.userId === where.userId));
  t.mock.method(prisma.account, 'findUnique', async ({ where }) => scoped(where.id_userId));
  t.mock.method(prisma.account, 'update', async ({ where, data }) => {
    const row = scoped(where.id_userId); if (!row) throw dbError('P2025');
    assert.deepEqual(Object.keys(data), ['name']); return Object.assign(row, data);
  });
  t.mock.method(prisma.account, 'delete', async ({ where }) => {
    const row = scoped(where.id_userId); if (!row) throw dbError('P2025');
    if (row.name === 'Linked') throw dbError('P2003');
    rows.delete(row.id); return row;
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  async function request(method, path = '', body, owner = userId) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/accounts${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: `Bearer ${createAccessToken(owner)}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      assert.equal((await request(method, '', undefined, null)).status, 401);
    }
    for (const amount of [1.25, '1.001', '1e3', '10000000000000000', '1,000', ' 1 ', null]) {
      assert.equal((await request('POST', '', { name: 'Cash', type: 'CASH', openingBalance: amount })).status, 400);
    }
    assert.equal((await request('POST', '', { name: 'Card', type: 'CARD' })).status, 400);
    assert.equal((await request('POST', '', { name: 'Cash', type: 'CASH', userId: otherId })).status, 400);
    assert.equal((await request('POST', '', { name: 'Cash', type: 'CASH', currency: 'USD' })).status, 400);
    const created = await request('POST', '', { name: ' Bank ', type: 'BANK', openingBalance: '9999999999999999.99' });
    assert.equal(created.status, 201);
    const account = created.body.data.account;
    assert.equal(account.openingBalance, '9999999999999999.99');
    assert.equal(account.balance, account.openingBalance);
    assert.equal(account.currency, 'INR');
    assert.equal(account.name, 'Bank');
    const zero = await request('POST', '', { name: 'Wallet', type: 'WALLET' });
    assert.equal(zero.body.data.account.balance, '0.00');
    const negative = await request('POST', '', { name: 'Overdrawn', type: 'BANK', openingBalance: '-12.5' });
    assert.equal(negative.body.data.account.balance, '-12.50');
    assert.equal((await request('GET', '', undefined, otherId)).body.data.accounts.length, 0);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      assert.equal((await request(method, `/${account.id}`, method === 'PATCH' ? { name: 'Other' } : undefined, otherId)).status, 404);
    }
    for (const body of [{}, { balance: '1.00' }, { name: 'New', openingBalance: '1.00' }, { name: 'New', type: 'CASH' }]) {
      assert.equal((await request('PATCH', `/${account.id}`, body)).status, 400);
    }
    assert.equal((await request('GET', '/bad-id')).status, 400);
    const updated = await request('PATCH', `/${account.id}`, { name: 'Linked' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.account.balance, account.balance);
    assert.equal((await request('DELETE', `/${account.id}`)).status, 409);
    assert.equal((await request('DELETE', `/${zero.body.data.account.id}`)).status, 200);
    assert.equal((await request('GET', `/${zero.body.data.account.id}`)).status, 404);
  } finally {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await prisma.$disconnect();
  }
});
