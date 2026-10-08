const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/trackrupee_test';
const { createTransactionSchema, updateTransactionSchema, transactionQuerySchema } = require('../dist/modules/transactions/transaction.validation');
const { prisma } = require('../dist/config/database');
const { serializable } = require('../dist/utils/serializable');

test('transaction amount and calendar validation preserves exact strings', () => {
  const input = { type: 'EXPENSE', amount: '10.25', accountId: randomUUID(), categoryId: randomUUID(), date: '2026-10-06T12:30:00+05:30' };
  assert.equal(createTransactionSchema.validate(input).error, undefined);
  for (const amount of ['0', '0.00', '-1', '1.001', '1e2', '10000000000000000', 10.25]) {
    assert.ok(createTransactionSchema.validate({ ...input, amount }).error, String(amount));
  }
  assert.equal(createTransactionSchema.validate({ ...input, amount: '9999999999999999.99' }).value.amount, '9999999999999999.99');
  for (const date of ['2026-02-30T00:00:00Z', '2026-02-29T00:00:00Z', '2026-10-06', '2026-10-06T12:00:00', '2026-10-06T12:00:00+14:30']) {
    assert.ok(createTransactionSchema.validate({ ...input, date }).error, date);
  }
  assert.equal(createTransactionSchema.validate({ ...input, date: '2024-02-29T00:00:00Z' }).error, undefined);
  assert.ok(updateTransactionSchema.validate({}).error);
  assert.ok(updateTransactionSchema.validate({ userId: randomUUID() }).error);
  assert.equal(updateTransactionSchema.validate({ note: null }).error, undefined);
  assert.ok(transactionQuerySchema.validate({ from: input.date, to: input.date }).error);
  assert.ok(transactionQuerySchema.validate({ limit: '101' }).error);
  assert.deepEqual(transactionQuerySchema.validate({ page: '2', limit: '10' }).value, { page: 2, limit: 10 });
});

test('serializable retries are bounded and only retry confirmed conflicts', async (t) => {
  let calls = 0;
  let failures = 2;
  t.mock.method(prisma, '$transaction', async (work, options) => {
    calls++;
    assert.equal(options.isolationLevel, 'Serializable');
    if (failures-- > 0) throw Object.assign(new Error('Conflict'), { code: 'P2034' });
    return work({});
  });
  assert.equal(await serializable(async () => 'done'), 'done');
  assert.equal(calls, 3);
  failures = 10; calls = 0;
  await assert.rejects(serializable(async () => 'unreachable'), { statusCode: 409 });
  assert.equal(calls, 4);
  t.mock.method(prisma, '$transaction', async () => { throw Object.assign(new Error('Connection lost'), { code: 'P1001' }); });
  await assert.rejects(serializable(async () => 'unreachable'), { code: 'P1001' });
});
