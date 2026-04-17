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
