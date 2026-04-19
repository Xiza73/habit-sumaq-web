import { type Currency } from '@/core/domain/enums/account.enums';
import {
  type DateFormat,
  type Language,
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
  createdAt: string;
  updatedAt: string;
}
