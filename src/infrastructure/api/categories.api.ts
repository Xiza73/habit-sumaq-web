import { type Category } from '@/core/domain/entities/category';
import { type CategoryType } from '@/core/domain/enums/category.enums';
import {
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/core/domain/schemas/category.schema';

import { httpClient } from './http-client';

export const categoriesApi = {
  getAll(type?: CategoryType): Promise<Category[]> {
    const query = type ? `?type=${type}` : '';
    return httpClient.get<Category[]>(`/categories${query}`);
  },

  getById(id: string): Promise<Category> {
    return httpClient.get<Category>(`/categories/${id}`);
  },

  create(data: CreateCategoryInput): Promise<Category> {
    return httpClient.post<Category>('/categories', data);
  },

  update(id: string, data: UpdateCategoryInput): Promise<Category> {
    return httpClient.patch<Category>(`/categories/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/categories/${id}`);
  },
};
