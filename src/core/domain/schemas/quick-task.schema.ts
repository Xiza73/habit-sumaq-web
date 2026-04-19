import { z } from 'zod/v4';

const titleField = z.string().trim().min(1, 'required').max(120, 'max_length');
const descriptionField = z.string().max(5000, 'max_length').nullable();

export const createQuickTaskSchema = z.object({
  title: titleField,
  description: descriptionField.optional(),
});

export type CreateQuickTaskInput = z.infer<typeof createQuickTaskSchema>;

export const updateQuickTaskSchema = z.object({
  title: titleField.optional(),
  description: descriptionField.optional(),
  completed: z.boolean().optional(),
});

export type UpdateQuickTaskInput = z.infer<typeof updateQuickTaskSchema>;

export const reorderQuickTasksSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export type ReorderQuickTasksInput = z.infer<typeof reorderQuickTasksSchema>;
