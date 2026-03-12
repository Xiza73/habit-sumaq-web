export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  INVESTMENT: 'investment',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const Currency = {
  PEN: 'PEN',
  USD: 'USD',
  EUR: 'EUR',
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];
