import { z } from 'zod/v4';

export const updateUserSettingsSchema = z.object({
  language: z.enum(['es', 'en', 'pt']),
  theme: z.enum(['light', 'dark', 'system']),
  defaultCurrency: z.enum(['PEN', 'USD', 'EUR']),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  startOfWeek: z.enum(['monday', 'sunday']),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
