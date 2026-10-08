const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Prisma } = require('../dist/generated/prisma/client');
const { monthBounds, budgetProgress, withProgress } = require('../dist/modules/budgets/budget.progress');
const { createBudgetSchema, updateBudgetSchema, budgetQuerySchema } = require('../dist/modules/budgets/budget.validation');

test('Kolkata month boundaries include leap years and December rollover', () => {
  const october = monthBounds(10, 2026);
  assert.equal(october.startsAt.toISOString(), '2026-09-30T18:30:00.000Z');
  assert.equal(october.endsAt.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.equal(monthBounds(2, 2024).endsAt.toISOString(), '2024-02-29T18:30:00.000Z');
  assert.equal(monthBounds(2, 2025).endsAt.toISOString(), '2025-02-28T18:30:00.000Z');
  assert.equal(monthBounds(12, 2026).endsAt.toISOString(), '2026-12-31T18:30:00.000Z');
});

test('budget validation restricts positive decimal amounts and immutable identity', () => {
  const input = { categoryId: randomUUID(), month: 10, year: 2026, amount: '30.00' };
  assert.equal(createBudgetSchema.validate(input).error, undefined);
  for (const amount of [0, 20, '0.00', '-1', '1.001', '1e3', '10000000000000000']) {
    assert.ok(createBudgetSchema.validate({ ...input, amount }).error);
  }
  assert.ok(createBudgetSchema.validate({ ...input, month: 13 }).error);
  assert.ok(createBudgetSchema.validate({ ...input, year: 1969 }).error);
  assert.ok(createBudgetSchema.validate({ ...input, categoryId: undefined }).error);
  assert.ok(updateBudgetSchema.validate({ amount: '10', month: 11 }).error);
  assert.ok(updateBudgetSchema.validate({}).error);
  assert.ok(budgetQuerySchema.validate({ limit: 101 }).error);
  assert.deepEqual(budgetQuerySchema.validate({ month: '10', year: '2026' }).value, { month: 10, year: 2026, page: 1, limit: 20 });
});

test('decimal progress remains unclamped and list aggregation uses one query', async () => {
  const a = { id: randomUUID(), amount: new Prisma.Decimal('30.00') };
  const over = budgetProgress(a, '45.00');
  assert.equal(over.limit, '30.00'); assert.equal(over.spent, '45.00');
  assert.equal(over.remaining, '-15.00'); assert.equal(over.percentageUsed, '150.00');
  assert.equal(over.isOverBudget, true);
  assert.equal(budgetProgress(a, '30.00').isOverBudget, false);
  assert.equal(budgetProgress(a, '0').percentageUsed, '0.00');
  const precise = budgetProgress({ ...a, amount: new Prisma.Decimal('9999999999999999.99') }, '10000000000000000.00');
  assert.equal(precise.remaining, '-0.01');
  let queries = 0;
  const tx = { $queryRaw: async () => { queries++; return [{ id: a.id, spent: '45.00' }]; } };
  const rows = await withProgress(tx, randomUUID(), [a, { ...a, id: randomUUID() }]);
  assert.equal(queries, 1); assert.equal(rows[1].spent, '0.00');
  assert.deepEqual(await withProgress(tx, randomUUID(), []), []);
  assert.equal(queries, 1);
});
