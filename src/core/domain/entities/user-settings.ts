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
  /**
   * Nav keys the user switched OFF in Settings. Hidden from the sidebar and
   * mobile nav, from their slice of the reports dashboards, and from the
   * alerts popover. Empty (the default) means every module is on.
   *
   * Free-form strings like `favoriteKeys`, resolved through the same
   * `nav-registry`. Uncapped server-side: disabling everything is valid,
   * since Settings is never in this list.
   *
   * INVARIANT: a key here is never also in `favoriteKeys`. `ModulesSection`
   * drops a module from favorites in the same PATCH that disables it, so the
   * `MAX_FAVORITES` cap always counts favorites the user can actually reach.
   * Without it, a favorite pointing at a disabled module would occupy a slot
   * while rendering nothing — the same soft-lock the stale `favoriteKeys`
   * default used to cause.
   */
  disabledModules: string[];
  createdAt: string;
  updatedAt: string;
}
