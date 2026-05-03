import { z } from 'zod/v4';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createSectionSchema = z.object({
  name: z.string().min(1, 'required').max(60, 'max_length'),
  color: z.string().regex(HEX_COLOR_REGEX, 'invalid_color').optional(),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z.object({
  name: z.string().min(1, 'required').max(60, 'max_length').optional(),
  // Allow `null` explicitly to clear the color.
  color: z.union([z.string().regex(HEX_COLOR_REGEX, 'invalid_color'), z.null()]).optional(),
  isCollapsed: z.boolean().optional(),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSectionsSchema = z.object({
  orderedIds: z.array(z.string().regex(UUID_REGEX, 'invalid_uuid')).min(1),
});
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
