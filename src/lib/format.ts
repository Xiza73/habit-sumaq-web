import { type Currency } from '@/core/domain/enums/account.enums';
import { type DateFormat } from '@/core/domain/enums/common.enums';

const CURRENCY_CONFIG: Record<Currency, { locale: string; currency: string }> = {
  PEN: { locale: 'es-PE', currency: 'PEN' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
};

export function formatCurrency(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string, dateFormat: DateFormat): string {
  // Accept both 'YYYY-MM-DD' and ISO strings like 'YYYY-MM-DDTHH:mm:ss.sssZ'.
  // Without the slice, splitting an ISO string leaves the time glued to `day`
  // (e.g. '15T12:00:00.000Z').
  const [year, month, day] = dateStr.slice(0, 10).split('-');

  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
  }
}

export function getTodayLocaleDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getOnlyDateFromApi(apiDate: string): string {
  return new Date(apiDate.split('Z')[0]).toLocaleDateString();
}

const PERIOD_LOCALE: Record<string, string> = {
  es: 'es-PE',
  en: 'en-US',
  pt: 'pt-BR',
};

/**
 * Turns a `YYYY-MM` period string into a localized human-readable label.
 * Format is always `"{Month} {Year}"` — we strip the locale-specific "de" /
 * "of" connectors so all locales render consistently:
 *   es: `"2026-04"` → `"Abril 2026"` (not "abril de 2026")
 *   en: `"2026-04"` → `"April 2026"`
 *   pt: `"2026-04"` → `"Abril 2026"` (not "abril de 2026")
 * Falls back to the raw period if the input doesn't match the expected shape.
 */
export function formatPeriodLabel(period: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return period;

  const date = new Date(Date.UTC(year, month - 1, 1));
  // `formatToParts` lets us pluck the month + year parts explicitly and skip
  // any literals the locale adds ("de", "of", commas). Keeps the output shape
  // identical across `es` / `en` / `pt`.
  const parts = new Intl.DateTimeFormat(PERIOD_LOCALE[locale] ?? locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date);

  const monthName = parts.find((p) => p.type === 'month')?.value ?? '';
  const yearValue = parts.find((p) => p.type === 'year')?.value ?? String(year);
  // Capitalize the month (some locales return it lowercase).
  const capitalized = monthName.charAt(0).toLocaleUpperCase(locale) + monthName.slice(1);
  return `${capitalized} ${yearValue}`;
}

/**
 * Builds an estimated payment date in `YYYY-MM-DD` for a given period using
 * the service's `dueDay`. Used to pre-fill the "Pagar" form so the user gets
 * the date of the actual due day (e.g. 15 of the month being paid) instead
 * of today's date.
 *
 * - Returns null when `dueDay` is null — caller falls back to today.
 * - Clamps `dueDay` to the last valid day of the month (e.g. dueDay=31 in
 *   February → 28 or 29).
 * - Returns null when `period` is not a valid `YYYY-MM` string.
 */
export function getEstimatedPaymentDate(period: string, dueDay: number | null): string | null {
  if (dueDay == null) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]); // 1-indexed
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;

  // `new Date(year, month, 0)` gives the last day of `month` (because `month`
  // here is 0-indexed-as-month+1 trick: day 0 of next month = last day of this).
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(Math.max(dueDay, 1), lastDayOfMonth);

  return `${match[1]}-${match[2]}-${String(clampedDay).padStart(2, '0')}`;
}
