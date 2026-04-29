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

export const MonthlyServicesGroupBy = {
  NONE: 'none',
  STATUS: 'status',
  FREQUENCY: 'frequency',
  CATEGORY: 'category',
} as const;

export type MonthlyServicesGroupBy =
  (typeof MonthlyServicesGroupBy)[keyof typeof MonthlyServicesGroupBy];

export const MONTHLY_SERVICES_GROUP_BY_OPTIONS = Object.values(MonthlyServicesGroupBy);

export const MonthlyServicesOrderBy = {
  NAME: 'name',
  DUE_DAY: 'dueDay',
  NEXT_DUE_PERIOD: 'nextDuePeriod',
  ESTIMATED_AMOUNT: 'estimatedAmount',
  CREATED_AT: 'createdAt',
} as const;

export type MonthlyServicesOrderBy =
  (typeof MonthlyServicesOrderBy)[keyof typeof MonthlyServicesOrderBy];

export const MONTHLY_SERVICES_ORDER_BY_OPTIONS = Object.values(MonthlyServicesOrderBy);

export const MonthlyServicesOrderDir = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type MonthlyServicesOrderDir =
  (typeof MonthlyServicesOrderDir)[keyof typeof MonthlyServicesOrderDir];
