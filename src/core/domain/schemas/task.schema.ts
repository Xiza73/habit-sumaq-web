import { z } from 'zod/v4';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createTaskSchema = z.object({
  sectionId: z.string().regex(UUID_REGEX, 'invalid_uuid'),
  title: z.string().min(1, 'required').max(120, 'max_length'),
  description: z.string().max(5000, 'max_length').nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'required').max(120, 'max_length').optional(),
  description: z.string().max(5000, 'max_length').nullable().optional(),
  completed: z.boolean().optional(),
  /** Cross-section move — backend reassigns `position` to end of target. */
  sectionId: z.string().regex(UUID_REGEX, 'invalid_uuid').optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const reorderTasksSchema = z.object({
  sectionId: z.string().regex(UUID_REGEX, 'invalid_uuid'),
  orderedIds: z.array(z.string().regex(UUID_REGEX, 'invalid_uuid')).min(1),
});
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
