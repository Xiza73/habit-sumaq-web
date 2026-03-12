import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

import { type CategoryType } from '@/core/domain/enums/category.enums';

export const CATEGORY_TYPE_ICONS: Record<CategoryType, LucideIcon> = {
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
};
