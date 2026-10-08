import type { CategoryType } from '../../generated/prisma/client';

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}
export type UpdateCategoryInput = Partial<CreateCategoryInput>;
export interface CategoryQuery { type?: CategoryType }
