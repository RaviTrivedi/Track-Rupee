import { api } from '@/services/api';
import type { CategoryType } from '@/features/home/home.types';

export type Category = { id: string; userId: string; name: string; type: CategoryType; icon: string | null; color: string | null; isDefault: boolean; createdAt: string; updatedAt: string };
type Envelope<T> = { success: boolean; message: string; data: T };

export const categoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Envelope<{ categories: Category[] }>, CategoryType | void>({
      query: (type) => type ? '/categories?type=' + type : '/categories',
      providesTags: ['Categories'],
    }),
    createCategory: build.mutation<Envelope<{ category: Category }>, { name: string; type: CategoryType; icon: string; color: string }>({
      query: (body) => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: ['Categories'],
    }),
    updateCategory: build.mutation<Envelope<{ category: Category }>, { id: string; name?: string; icon?: string | null; color?: string | null }>({
      query: ({ id, ...body }) => ({ url: '/categories/' + id, method: 'PATCH', body }),
      invalidatesTags: ['Categories'],
    }),
    deleteCategory: build.mutation<Envelope<null>, string>({
      query: (id) => ({ url: '/categories/' + id, method: 'DELETE' }),
      invalidatesTags: ['Categories'],
    }),
  }),
});
export const { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } = categoriesApi;
