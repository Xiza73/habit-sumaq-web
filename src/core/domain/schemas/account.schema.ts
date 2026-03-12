import { z } from 'zod/v4';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  type: z.enum(['checking', 'savings', 'cash', 'credit_card', 'investment']),
  currency: z.enum(['PEN', 'USD', 'EUR']),
  initialBalance: z.number().min(0),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
