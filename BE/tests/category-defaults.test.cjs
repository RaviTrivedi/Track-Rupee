const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_CATEGORIES, createDefaultCategories } = require('../dist/modules/categories/category.defaults');

test('default categories have complete, unique metadata and preserve existing records on rerun', async () => {
  assert.equal(DEFAULT_CATEGORIES.filter((row) => row.type === 'INCOME').length, 6);
  assert.equal(DEFAULT_CATEGORIES.filter((row) => row.type === 'EXPENSE').length, 10);
  assert.equal(new Set(DEFAULT_CATEGORIES.map((row) => `${row.type}:${row.name}`)).size, 16);
  for (const row of DEFAULT_CATEGORIES) {
    assert.equal(row.isDefault, true);
    assert.match(row.color, /^#[A-F0-9]{6}$/);
    assert.match(row.icon, /^[a-z]+(?:-[a-z]+)*$/);
  }
  const existing = { userId: 'user-a', name: 'Food', type: 'EXPENSE', color: '#000000', icon: 'star', isDefault: false };
  const rows = [existing];
  const tx = { category: { createMany: async ({ data, skipDuplicates }) => {
    assert.equal(skipDuplicates, true);
    let count = 0;
    for (const row of data) {
      if (!rows.some((item) => item.userId === row.userId && item.name === row.name && item.type === row.type)) {
        rows.push(row); count++;
      }
    }
    return { count };
  } } };
  assert.equal((await createDefaultCategories(tx, 'user-a')).count, 15);
  assert.equal((await createDefaultCategories(tx, 'user-a')).count, 0);
  assert.equal(rows[0], existing);
  assert.equal(rows[0].color, '#000000');
  assert.equal(rows[0].isDefault, false);
  assert.equal((await createDefaultCategories(tx, 'user-b')).count, 16);
});
