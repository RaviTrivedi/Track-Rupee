const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('PostgreSQL transaction ownership, balances, rollback, pagination and concurrent mutations', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { prisma } = require('../dist/config/database');
  const service = require('../dist/modules/transactions/transaction.service');
  const categories = require('../dist/modules/categories/category.service');
  const users = [];
  const date = '2026-10-06T10:00:00Z';
  async function makeUser() {
    const user = await prisma.user.create({ data: { email: `transaction-test-${randomUUID()}@example.com` } });
    users.push(user.id); return user.id;
  }
  async function makeAccount(userId, balance = '100.00') {
    return prisma.account.create({ data: { userId, name: 'Test', type: 'CASH', openingBalance: balance, balance } });
  }
  async function balance(account) {
    return (await prisma.account.findUniqueOrThrow({ where: { id: account.id } })).balance.toFixed(2);
  }
  try {
    const userId = await makeUser(); const outsider = await makeUser();
    const a = await makeAccount(userId); const b = await makeAccount(userId);
    const foreign = await makeAccount(outsider);
    const income = await prisma.category.create({ data: { userId, name: 'Income', type: 'INCOME' } });
    const expense = await prisma.category.create({ data: { userId, name: 'Expense', type: 'EXPENSE' } });
    const foreignCategory = await prisma.category.create({ data: { userId: outsider, name: 'Foreign', type: 'INCOME' } });
    const input = { type: 'INCOME', amount: '10.25', accountId: a.id, categoryId: income.id, date };
    await assert.rejects(service.createTransaction(userId, { ...input, accountId: foreign.id }), { statusCode: 404 });
    await assert.rejects(service.createTransaction(userId, { ...input, categoryId: foreignCategory.id }), { statusCode: 404 });
    await assert.rejects(service.createTransaction(userId, { ...input, categoryId: expense.id }), { statusCode: 400 });
    assert.equal(await balance(a), '100.00');
    let row = await service.createTransaction(userId, input);
    assert.equal(row.amount, '10.25'); assert.equal(await balance(a), '110.25');
    for (const operation of [
      () => service.getTransaction(outsider, row.id),
      () => service.updateTransaction(outsider, row.id, { amount: '100.00' }),
      () => service.deleteTransaction(outsider, row.id),
    ]) await assert.rejects(operation(), { statusCode: 404 });
    await assert.rejects(service.listTransactions(outsider, { page: 1, limit: 20, accountId: a.id }), { statusCode: 404 });
    assert.equal((await service.listTransactions(outsider, { page: 1, limit: 20 })).pagination.total, 0);
    await assert.rejects(service.updateTransaction(userId, row.id, { type: 'EXPENSE' }), { statusCode: 400 });
    assert.equal(await balance(a), '110.25');
    row = await service.updateTransaction(userId, row.id, { type: 'EXPENSE', categoryId: expense.id, amount: '150.50', accountId: b.id });
    assert.equal(await balance(a), '100.00'); assert.equal(await balance(b), '-50.50');
    await assert.rejects(categories.updateCategory(userId, expense.id, { type: 'INCOME' }), { statusCode: 409 });
    await service.deleteTransaction(userId, row.id);
    assert.equal(await balance(b), '100.00');
    await assert.rejects(service.deleteTransaction(userId, row.id), { statusCode: 404 });

    // A database insert failure occurs after the balance increment and rolls it back.
    await assert.rejects(service.createTransaction(userId, { ...input, note: 'x'.repeat(501) }));
    assert.equal(await balance(a), '100.00');
    assert.equal(await prisma.transaction.count({ where: { userId } }), 0);

    // Failure on the destination update must undo a reversal already applied to the source.
    const full = await makeAccount(userId, '9999999999999999.99');
    row = await service.createTransaction(userId, input);
    await assert.rejects(service.updateTransaction(userId, row.id, { accountId: full.id }));
    assert.equal(await balance(a), '110.25');
    assert.equal(await balance(full), '9999999999999999.99');
    assert.equal((await service.getTransaction(userId, row.id)).accountId, a.id);

    await Promise.all([
      service.updateTransaction(userId, row.id, { amount: '20.00' }),
      service.updateTransaction(userId, row.id, { amount: '30.00' }),
    ]);
    const final = await prisma.transaction.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(await balance(a), final.amount.plus('100').toFixed(2));
    const deleted = await Promise.allSettled([
      service.deleteTransaction(userId, row.id), service.deleteTransaction(userId, row.id),
    ]);
    assert.equal(deleted.filter((x) => x.status === 'fulfilled').length, 1);
    assert.equal(deleted.find((x) => x.status === 'rejected').reason.statusCode, 404);
    assert.equal(await balance(a), '100.00');

    row = await service.createTransaction(userId, input);
    const editDelete = await Promise.allSettled([
      service.updateTransaction(userId, row.id, { amount: '50.00' }), service.deleteTransaction(userId, row.id),
    ]);
    assert.equal(editDelete[1].status, 'fulfilled');
    assert.equal(await balance(a), '100.00');
    assert.equal(await prisma.transaction.count({ where: { id: row.id, userId } }), 0);

    const created = await Promise.all([service.createTransaction(userId, input), service.createTransaction(userId, input)]);
    assert.equal(await balance(a), '120.50');
    const listed = await service.listTransactions(userId, { page: 1, limit: 1, from: date, to: '2026-10-06T10:00:01Z', type: 'INCOME', categoryId: income.id });
    assert.equal(listed.pagination.total, 2); assert.equal(listed.pagination.totalPages, 2);
    assert.equal(listed.transactions[0].id, created.map((x) => x.id).sort().reverse()[0]);
    assert.equal((await service.listTransactions(userId, { page: 1, limit: 20, to: date })).pagination.total, 0);
  } finally {
    // Delete only fixtures owned by the IDs created by this test.
    await prisma.transaction.deleteMany({ where: { userId: { in: users } } });
    await prisma.account.deleteMany({ where: { userId: { in: users } } });
    await prisma.category.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
