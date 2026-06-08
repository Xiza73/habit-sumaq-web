import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import { type Currency } from '@/core/domain/enums/currency.enum';

/**
 * Per-currency totals for the "Pagado / Estimado" KPI on the services
 * dashboard. The user can own services in multiple currencies (PEN, USD,
 * EUR…) — summing across them would be nonsense (no FX), so we always
 * bucket by currency and render one card per non-empty bucket.
 *
 * - `paid` — Σ `paidAmountForCurrentMonth` over services this month. Comes
 *   from the backend aggregate (real transaction amounts), not from
 *   `estimatedAmount`.
 * - `estimated` — Σ `estimatedAmount` over services that are due/paid this
 *   month AND have an estimate set. Services with `estimatedAmount=null`
 *   are excluded from the sum but counted in `servicesWithoutEstimate` so
 *   the UI can render an honest "+N sin estimado" hint.
 * - `servicesInScope` — total count of services that count toward this
 *   currency's bucket (paid this month OR due this month). Excludes
 *   archived services and overdue-from-past-months.
 * - `servicesWithoutEstimate` — subset of `servicesInScope` that have no
 *   `estimatedAmount` — the "Estimado" total is missing their contribution.
 */
export interface MonthlyServicesCurrencyKpi {
  currency: Currency;
  paid: number;
  estimated: number;
  servicesInScope: number;
  servicesWithoutEstimate: number;
}

/**
 * Whether a service counts toward the current-month KPI:
 *   - Due this month (`nextDuePeriod === currentPeriod`), OR
 *   - **Actually** paid this month (real spend, not skip): `isPaidForCurrentMonth`
 *     AND `paidAmountForCurrentMonth > 0`.
 *
 * The `paidAmountForCurrentMonth > 0` guard is what excludes **skipped**
 * services. "Saltear este mes" advances `lastPaidPeriod` (so the service
 * shows as "Al día") WITHOUT generating a transaction — so the paid sum
 * for that service is 0. Including skipped services would inflate the
 * `Estimado` bucket with bills that will never happen, making the
 * "Pagado / Estimado" ratio meaningless. A service freshly created with
 * a future `startPeriod` lives in the same bucket and is also excluded
 * by this rule, which is what we want — it isn't billable yet either.
 *
 * Overdue-from-past-months services are intentionally **out** — they're
 * conceptually deuda heredada and have their own banner / counter. Lumping
 * them into "este mes" would inflate the KPI with months the user already
 * lived through.
 *
 * Inactive services are out too — they aren't being billed.
 *
 * Edge case: a "free month" with a real `S/0` transaction would also fail
 * the `> 0` guard and be excluded. We accept that — distinguishing
 * `skipped` from `free` requires data the API doesn't expose today
 * (skipped doesn't create a transaction at all, so `paidAmountForCurrentMonth`
 * is the most reliable signal we have).
 */
function isInScope(service: MonthlyService, currentPeriod: string): boolean {
  if (!service.isActive) return false;
  if (service.nextDuePeriod === currentPeriod) return true;
  return service.isPaidForCurrentMonth && service.paidAmountForCurrentMonth > 0;
}

/**
 * Builds one `MonthlyServicesCurrencyKpi` per currency the user has
 * services in. The result is sorted by currency code (alphabetical) so the
 * render order is stable across re-fetches.
 *
 * `currentPeriod` is expected as `YYYY-MM` in the user's timezone — same
 * shape the backend uses for `nextDuePeriod` and to compute
 * `isPaidForCurrentMonth`, so equality checks match the backend's
 * truth.
 */
export function buildMonthlyServicesKpis(
  services: MonthlyService[],
  currentPeriod: string,
): MonthlyServicesCurrencyKpi[] {
  const byCurrency = new Map<Currency, MonthlyServicesCurrencyKpi>();

  services.forEach((service) => {
    if (!isInScope(service, currentPeriod)) return;

    const currency = service.currency;
    let bucket = byCurrency.get(currency);
    if (!bucket) {
      bucket = {
        currency,
        paid: 0,
        estimated: 0,
        servicesInScope: 0,
        servicesWithoutEstimate: 0,
      };
      byCurrency.set(currency, bucket);
    }

    bucket.paid += service.paidAmountForCurrentMonth;
    bucket.servicesInScope += 1;
    if (service.estimatedAmount === null) {
      bucket.servicesWithoutEstimate += 1;
    } else {
      bucket.estimated += service.estimatedAmount;
    }
  });

  return Array.from(byCurrency.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Progress 0..1 for the bar — capped at 1 because users sometimes pay
 * more than the estimate (price hike, retroactive adjustment), and a
 * bar that overflows the track is jarring. Falls back to `0` when
 * `estimated === 0` to avoid divide-by-zero (caller should hide the
 * bar in that case anyway).
 */
export function getKpiProgress(
  kpi: Pick<MonthlyServicesCurrencyKpi, 'paid' | 'estimated'>,
): number {
  if (kpi.estimated <= 0) return 0;
  return Math.min(1, kpi.paid / kpi.estimated);
}
