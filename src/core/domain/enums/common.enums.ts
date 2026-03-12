export const Language = {
  ES: 'es',
  EN: 'en',
  PT: 'pt',
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

export const DateFormat = {
  DD_MM_YYYY: 'DD/MM/YYYY',
  MM_DD_YYYY: 'MM/DD/YYYY',
  YYYY_MM_DD: 'YYYY-MM-DD',
} as const;

export type DateFormat = (typeof DateFormat)[keyof typeof DateFormat];

export const StartOfWeek = {
  MONDAY: 'monday',
  SUNDAY: 'sunday',
} as const;

export type StartOfWeek = (typeof StartOfWeek)[keyof typeof StartOfWeek];
