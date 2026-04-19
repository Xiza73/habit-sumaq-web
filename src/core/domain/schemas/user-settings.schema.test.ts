import { describe, expect, it } from 'vitest';

import { updateUserSettingsSchema } from './user-settings.schema';

describe('updateUserSettingsSchema', () => {
  const validInput = {
    language: 'es' as const,
    theme: 'dark' as const,
    defaultCurrency: 'PEN' as const,
    dateFormat: 'DD/MM/YYYY' as const,
    startOfWeek: 'monday' as const,
    timezone: 'America/Lima',
  };

  it('accepts valid input', () => {
    const result = updateUserSettingsSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts all valid languages', () => {
    const languages = ['es', 'en', 'pt'] as const;
    for (const language of languages) {
      const result = updateUserSettingsSchema.safeParse({ ...validInput, language });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid language', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, language: 'fr' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid themes', () => {
    const themes = ['light', 'dark', 'system'] as const;
    for (const theme of themes) {
      const result = updateUserSettingsSchema.safeParse({ ...validInput, theme });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid theme', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, theme: 'auto' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid currencies', () => {
    const currencies = ['PEN', 'USD', 'EUR'] as const;
    for (const defaultCurrency of currencies) {
      const result = updateUserSettingsSchema.safeParse({ ...validInput, defaultCurrency });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid currency', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, defaultCurrency: 'GBP' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid date formats', () => {
    const formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
    for (const dateFormat of formats) {
      const result = updateUserSettingsSchema.safeParse({ ...validInput, dateFormat });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid date format', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, dateFormat: 'DD-MM-YYYY' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid start of week options', () => {
    const options = ['monday', 'sunday'] as const;
    for (const startOfWeek of options) {
      const result = updateUserSettingsSchema.safeParse({ ...validInput, startOfWeek });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid start of week', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, startOfWeek: 'saturday' });
    expect(result.success).toBe(false);
  });

  it('accepts canonical IANA timezones', () => {
    const zones = ['UTC', 'America/Lima', 'Europe/Madrid', 'Asia/Tokyo'];
    for (const timezone of zones) {
      const result = updateUserSettingsSchema.safeParse({ ...validInput, timezone });
      expect(result.success).toBe(true);
    }
  });

  it('rejects garbage timezone strings', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, timezone: 'Not/A/Zone' });
    expect(result.success).toBe(false);
  });

  it('rejects empty timezone', () => {
    const result = updateUserSettingsSchema.safeParse({ ...validInput, timezone: '' });
    expect(result.success).toBe(false);
  });
});
