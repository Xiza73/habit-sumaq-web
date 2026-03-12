import { type CategoryType } from '@/core/domain/enums/category.enums';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
