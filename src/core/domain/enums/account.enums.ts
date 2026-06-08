/**
 * Account-feature-specific enums. The `Currency` enum that used to live here
 * was extracted to `./currency.enum.ts` in Phase A2 of the
 * `accounts-to-modular-finance` v1.0.0 refactor so it can outlive the
 * accounts feature (which gets deleted in A6-W).
 *
 * `AccountType` stays here and dies with the accounts feature.
 */
export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  INVESTMENT: 'investment',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];
