import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import { serializable } from '../../utils/serializable';
import type { CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from './category.types';

function categoryError(error: unknown): never {
  if (error instanceof Error && 'code' in error) {
    if (error.code === 'P2002') throw new AppError('A category with this name and type already exists.', 409);
    if (error.code === 'P2025') throw new AppError('Category not found.', 404);
    if (error.code === 'P2003') throw new AppError('This category is in use and cannot be deleted.', 409);
  }
  throw error;
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  try {
    return await prisma.category.create({ data: { ...input, name: input.name.trim(), userId } });
  } catch (error) { return categoryError(error); }
}

export async function listCategories(userId: string, query: CategoryQuery) {
  return prisma.category.findMany({
    where: { userId, ...(query.type ? { type: query.type } : {}) },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
}

export async function getCategory(userId: string, id: string) {
  const category = await prisma.category.findUnique({ where: { id_userId: { id, userId } } });
  if (!category) throw new AppError('Category not found.', 404);
  return category;
}

/*
 * Scope the mutation itself by the composite owner key. A separate ownership
 * lookup alone would leave a race between checking and writing. Missing records
 * and another user's records deliberately share the same 404 response.
 */
export async function updateCategory(userId: string, id: string, input: UpdateCategoryInput) {
  try {
    return await serializable(async (tx) => {
      const current = await tx.category.findUnique({ where: { id_userId: { id, userId } } });
      if (!current) throw new AppError('Category not found.', 404);
      // Prevent a concurrent category edit from invalidating transaction types.
      if (input.type && input.type !== current.type
        && await tx.transaction.count({ where: { userId, categoryId: id } }) > 0) {
        throw new AppError('Cannot change the type of a category with linked transactions.', 409);
      }
      if (input.type && input.type !== current.type
        && await tx.budget.count({ where: { userId, categoryId: id } }) > 0) {
        throw new AppError('Cannot change the type of a category with linked budgets.', 409);
      }
      return tx.category.update({
        where: { id_userId: { id, userId } },
        data: { ...input, ...(input.name !== undefined ? { name: input.name.trim() } : {}) },
      });
    });
  } catch (error) { return categoryError(error); }
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  try {
    // Restrictive foreign keys protect both transactions and budgets from cascades.
    await prisma.category.delete({ where: { id_userId: { id, userId } } });
  } catch (error) { categoryError(error); }
}
