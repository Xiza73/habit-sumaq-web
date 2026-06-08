import {
  type DateFormat,
  type Language,
  type MonthlyServicesGroupBy,
  type MonthlyServicesOrderBy,
  type MonthlyServicesOrderDir,
  type StartOfWeek,
  type Theme,
} from '@/core/domain/enums/common.enums';
import { type Currency } from '@/core/domain/enums/currency.enum';

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
  /**
   * User-picked keys (max 4) that drive the mobile bottom nav slots and
   * the ★ marker in the desktop sidebar. The canonical key→{href, icon,
   * labelKey} map lives in `src/lib/nav-registry.ts`. Backend stores them
   * as free-form strings and doesn't validate against a known set — see
   * `business-rules.md#favoritos-en-nav` for the rationale. Unknown keys
   * are silently skipped when consumed.
   */
  favoriteKeys: string[];
  createdAt: string;
  updatedAt: string;
}
