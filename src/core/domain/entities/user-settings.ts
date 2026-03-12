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
  createdAt: string;
  updatedAt: string;
}
