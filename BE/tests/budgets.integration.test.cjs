const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('PostgreSQL budgets enforce ownership, uniqueness, expense categories and monthly spending', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { prisma } = require('../dist/config/database');
  const budgets = require('../dist/modules/budgets/budget.service');
  const categories = require('../dist/modules/categories/category.service');
  const transactions = require('../dist/modules/transactions/transaction.service');
  const users = [];
  try {
    async function fixture() {
      const user = await prisma.user.create({ data: { email: `budget-test-${randomUUID()}@example.com` } });
      users.push(user.id);
      const category = await prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE' } });
      const account = await prisma.account.create({ data: { userId: user.id, name: 'Cash', type: 'CASH' } });
      return { user, category, account };
    }
    const a = await fixture(); const b = await fixture();
    const secondAccount = await prisma.account.create({ data: { userId: a.user.id, name: 'Bank', type: 'BANK' } });
    const otherCategory = await prisma.category.create({ data: { userId: a.user.id, name: 'Travel', type: 'EXPENSE' } });
    const income = await prisma.category.create({ data: { userId: a.user.id, name: 'Salary', type: 'INCOME' } });
    async function expense(amount, date, accountId = a.account.id, categoryId = a.category.id, userId = a.user.id) {
      return transactions.createTransaction(userId, { amount, date, accountId, categoryId, type: 'EXPENSE' });
    }
    await expense('99', '2026-09-30T18:29:59.999Z'); // Before start: excluded.
    const firstExpense = await expense('10', '2026-09-30T18:30:00.000Z'); // Start: included.
    await expense('20', '2026-10-31T18:29:59.999Z'); // Last millisecond: included.
    await expense('99', '2026-10-31T18:30:00.000Z'); // Next month: excluded.
    await expense('15', '2026-10-10T00:00:00Z', secondAccount.id);
    await expense('500', '2026-10-10T00:00:00Z', a.account.id, otherCategory.id);
    await expense('1000', '2026-10-10T00:00:00Z', b.account.id, b.category.id, b.user.id);
    await transactions.createTransaction(a.user.id, { amount: '100', date: '2026-10-10T00:00:00Z', accountId: a.account.id, categoryId: income.id, type: 'INCOME' });
    async function financialSnapshot() {
      return {
        balances: (await prisma.account.findMany({ where: { userId: a.user.id }, orderBy: { id: 'asc' } })).map((x) => x.balance.toFixed(2)),
        transactions: await prisma.transaction.count({ where: { userId: a.user.id } }),
      };
    }
    const before = await financialSnapshot();
    const input = { categoryId: a.category.id, amount: '30.00', month: 10, year: 2026 };
    await assert.rejects(budgets.createBudget(a.user.id, { ...input, categoryId: b.category.id }), { statusCode: 404 });
    await assert.rejects(budgets.createBudget(a.user.id, { ...input, categoryId: income.id }), { statusCode: 400 });
    const created = await budgets.createBudget(a.user.id, input);
    assert.equal(created.spent, '45.00'); assert.equal(created.remaining, '-15.00');
    assert.equal(created.percentageUsed, '150.00'); assert.equal(created.isOverBudget, true);
    await assert.rejects(budgets.createBudget(a.user.id, input), { statusCode: 409 });
    for (const operation of [
      () => budgets.getBudget(b.user.id, created.id),
      () => budgets.updateBudget(b.user.id, created.id, { amount: '500' }),
      () => budgets.deleteBudget(b.user.id, created.id),
      () => budgets.getBudget(a.user.id, randomUUID()),
    ]) await assert.rejects(operation(), { statusCode: 404 });
    assert.equal((await budgets.listBudgets(b.user.id, { page: 1, limit: 20 })).pagination.total, 0);
    await assert.rejects(categories.deleteCategory(a.user.id, a.category.id), { statusCode: 409 });
    const cleanCategory = await prisma.category.create({ data: { userId: a.user.id, name: 'Budget only', type: 'EXPENSE' } });
    const empty = await budgets.createBudget(a.user.id, { ...input, categoryId: cleanCategory.id });
    assert.equal(empty.spent, '0.00');
    await assert.rejects(categories.deleteCategory(a.user.id, cleanCategory.id), { statusCode: 409 });
    await assert.rejects(categories.updateCategory(a.user.id, cleanCategory.id, { type: 'INCOME' }), { statusCode: 409 });
    const concurrent = await Promise.allSettled([
      budgets.createBudget(a.user.id, { ...input, month: 11 }), budgets.createBudget(a.user.id, { ...input, month: 11 }),
    ]);
    assert.equal(concurrent.filter((x) => x.status === 'fulfilled').length, 1);
    assert.equal(concurrent.find((x) => x.status === 'rejected').reason.statusCode, 409);
    const list = await budgets.listBudgets(a.user.id, { page: 1, limit: 1, month: 10, year: 2026 });
    assert.equal(list.pagination.total, 2); assert.equal(list.pagination.totalPages, 2);
    const changed = await budgets.updateBudget(a.user.id, created.id, { amount: '90.00' });
    assert.equal(changed.percentageUsed, '50.00'); assert.equal(changed.spent, '45.00');
    assert.deepEqual(await financialSnapshot(), before);
    // Over-budget expenses remain permitted, and transaction changes drive progress.
    await budgets.updateBudget(a.user.id, created.id, { amount: '1.00' });
    const extra = await expense('5', '2026-10-10T01:00:00Z');
    assert.equal((await budgets.getBudget(a.user.id, created.id)).spent, '50.00');
    await transactions.updateTransaction(a.user.id, firstExpense.id, { amount: '12' });
    assert.equal((await budgets.getBudget(a.user.id, created.id)).spent, '52.00');
    await transactions.deleteTransaction(a.user.id, extra.id);
    assert.equal((await budgets.getBudget(a.user.id, created.id)).spent, '47.00');
    const beforeDelete = await financialSnapshot();
    await budgets.deleteBudget(a.user.id, created.id);
    assert.deepEqual(await financialSnapshot(), beforeDelete);
    await assert.rejects(budgets.getBudget(a.user.id, created.id), { statusCode: 404 });
  } finally {
    await prisma.budget.deleteMany({ where: { userId: { in: users } } });
    await prisma.transaction.deleteMany({ where: { userId: { in: users } } });
    await prisma.account.deleteMany({ where: { userId: { in: users } } });
    await prisma.category.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
