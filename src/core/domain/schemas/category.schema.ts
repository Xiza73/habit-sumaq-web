import { z } from 'zod/v4';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
