/**
 * The set of currencies the app supports. Moved here from `account.enums.ts`
 * in Phase A2 of the `accounts-to-modular-finance` v1.0.0 refactor.
 *
 * Why split out: the accounts feature gets deleted entirely in A6-W (along
 * with `account.enums.ts` and the `AccountType` union). `Currency` survives
 * into v1.0.0 because budgets, monthly-services, debts-loans, and reports
 * still need it. Centralising here is the cheapest way to break the
 * `account` → everything coupling before A6-W lands.
 *
 * Per the project's TS convention (CLAUDE.md): no TS `enum`, use an `as const`
 * object + a derived type union.
 */
export const Currency = {
  PEN: 'PEN',
  USD: 'USD',
  EUR: 'EUR',
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];
