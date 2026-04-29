import { type Currency } from '@/core/domain/enums/account.enums';
import {
  type DateFormat,
  type Language,
  type MonthlyServicesGroupBy,
  type MonthlyServicesOrderBy,
  type MonthlyServicesOrderDir,
  type StartOfWeek,
  type Theme,
} from '@/core/domain/enums/common.enums';

export interface UserSettings {
  id: string;
  language: Language;
  theme: Theme;
  defaultCurrency: Currency;
  dateFormat: DateFormat;
  startOfWeek: StartOfWeek;
  /** IANA timezone identifier. Defaults to 'UTC' server-side until the client sets it. */
  timezone: string;
  // Monthly-services list view preferences. Persisted server-side so the
  // group/order choice is consistent across devices.
  monthlyServicesGroupBy: MonthlyServicesGroupBy;
  monthlyServicesOrderBy: MonthlyServicesOrderBy;
  monthlyServicesOrderDir: MonthlyServicesOrderDir;
  createdAt: string;
  updatedAt: string;
}
