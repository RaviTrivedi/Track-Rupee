import { CategoryType, type Prisma } from '../../generated/prisma/client';

// Lucide icon identifiers use the canonical kebab-case names, not component names.
export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: CategoryType.INCOME, icon: 'banknote', color: '#16A34A', isDefault: true },
  { name: 'Freelance', type: CategoryType.INCOME, icon: 'laptop', color: '#0D9488', isDefault: true },
  { name: 'Business', type: CategoryType.INCOME, icon: 'briefcase-business', color: '#2563EB', isDefault: true },
  { name: 'Investment', type: CategoryType.INCOME, icon: 'chart-no-axes-combined', color: '#7C3AED', isDefault: true },
  { name: 'Gift', type: CategoryType.INCOME, icon: 'gift', color: '#DB2777', isDefault: true },
  { name: 'Other Income', type: CategoryType.INCOME, icon: 'circle-plus', color: '#65A30D', isDefault: true },
  { name: 'Food', type: CategoryType.EXPENSE, icon: 'utensils', color: '#EA580C', isDefault: true },
  { name: 'Rent', type: CategoryType.EXPENSE, icon: 'house', color: '#4F46E5', isDefault: true },
  { name: 'Travel', type: CategoryType.EXPENSE, icon: 'plane', color: '#0284C7', isDefault: true },
  { name: 'Shopping', type: CategoryType.EXPENSE, icon: 'shopping-bag', color: '#C026D3', isDefault: true },
  { name: 'Bills', type: CategoryType.EXPENSE, icon: 'receipt-text', color: '#CA8A04', isDefault: true },
  { name: 'Health', type: CategoryType.EXPENSE, icon: 'heart-pulse', color: '#DC2626', isDefault: true },
  { name: 'Education', type: CategoryType.EXPENSE, icon: 'graduation-cap', color: '#0891B2', isDefault: true },
  { name: 'Entertainment', type: CategoryType.EXPENSE, icon: 'clapperboard', color: '#9333EA', isDefault: true },
  { name: 'EMI', type: CategoryType.EXPENSE, icon: 'credit-card', color: '#475569', isDefault: true },
  { name: 'Other Expense', type: CategoryType.EXPENSE, icon: 'circle-ellipsis', color: '#64748B', isDefault: true },
] as const;

/*
 * Reuse the caller's transaction so registration and its categories commit
 * together. ON CONFLICT DO NOTHING preserves existing customizations and uses
 * the database's case-insensitive uniqueness index even under concurrent runs.
 */
export async function createDefaultCategories(tx: Prisma.TransactionClient, userId: string) {
  return tx.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })),
    skipDuplicates: true,
  });
}
