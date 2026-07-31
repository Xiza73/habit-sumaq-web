import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { TestProviders } from '@/test/utils';

import { MonthlyServicesSpendKpi } from './MonthlyServicesSpendKpi';

const CURRENT_PERIOD = '2026-05';

function makeService(overrides: Partial<MonthlyService> = {}): MonthlyService {
  return {
    id: overrides.id ?? 'svc',
    userId: 'user-1',
    name: 'Service',
    categoryId: 'cat-1',
    currency: 'PEN',
    frequencyMonths: 1,
    estimatedAmount: 50,
    dueDay: 15,
    startPeriod: '2026-01',
    lastPaidPeriod: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextDuePeriod: CURRENT_PERIOD,
    isOverdue: false,
    isPaidForCurrentMonth: false,
    paidAmountForCurrentMonth: 0,
    linkedDebts: [],
    ...overrides,
  };
}

function renderKpi(services: MonthlyService[]) {
  return render(<MonthlyServicesSpendKpi services={services} currentPeriod={CURRENT_PERIOD} />, {
    wrapper: TestProviders,
  });
}

describe('MonthlyServicesSpendKpi', () => {
  it('renders nothing when no service is in scope for the current month', () => {
    // Active service whose `nextDuePeriod` is a future month (quarterly) and
    // hasn't been paid this month. Nothing to render — the component
    // collapses to null so the page doesn't show an empty card.
    const future = makeService({
      nextDuePeriod: '2026-07',
      isPaidForCurrentMonth: false,
    });

    const { container } = renderKpi([future]);
    expect(container.firstChild).toBeNull();
  });

  it('renders one card per currency, sorted by currency code', () => {
    const services = [
      makeService({
        id: 'usd-1',
        currency: 'USD',
        estimatedAmount: 10,
        paidAmountForCurrentMonth: 10,
      }),
      makeService({
        id: 'pen-1',
        currency: 'PEN',
        estimatedAmount: 50,
        paidAmountForCurrentMonth: 50,
      }),
    ];

    renderKpi(services);

    const cards = screen.getAllByText(/^(PEN|USD)$/);
    // Alphabetical sort: PEN before USD.
    expect(cards.map((c) => c.textContent)).toEqual(['PEN', 'USD']);
  });

  it('shows the paid amount as the headline number', () => {
    const services = [makeService({ id: 'a', estimatedAmount: 50, paidAmountForCurrentMonth: 35 })];

    renderKpi(services);

    // formatCurrency for PEN returns something containing "35" — the exact
    // glyphs (S/, S/.) vary by locale, hence the loose regex.
    expect(screen.getByText(/35/)).toBeInTheDocument();
  });

  it('renders a progressbar with the paid/estimated ratio when both are set', () => {
    const services = [
      makeService({ id: 'a', estimatedAmount: 100, paidAmountForCurrentMonth: 25 }),
    ];

    renderKpi(services);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '25');
  });

  it('clamps the progressbar at 100 when the user paid more than the estimate', () => {
    // Real-world case: estimated S/.50 but the bill came at S/.75. The bar
    // shouldn't overflow the track visually — capped at 100.
    const services = [makeService({ id: 'a', estimatedAmount: 50, paidAmountForCurrentMonth: 75 })];

    renderKpi(services);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('hides the progressbar when the bucket has no estimated total', () => {
    // Service with null estimate but a real paid amount. Bar would have
    // nothing to compare against — render just the paid figure.
    const services = [
      makeService({ id: 'a', estimatedAmount: null, paidAmountForCurrentMonth: 30 }),
    ];

    renderKpi(services);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('surfaces a "+ N sin estimado" hint when some services in the bucket lack an estimate', () => {
    const services = [
      makeService({ id: 'a', estimatedAmount: 50, paidAmountForCurrentMonth: 50 }),
      makeService({ id: 'b', estimatedAmount: null, paidAmountForCurrentMonth: 0 }),
      makeService({ id: 'c', estimatedAmount: null, paidAmountForCurrentMonth: 0 }),
    ];

    renderKpi(services);
    // Plural form for `count > 1` — matches i18n key `missingEstimate`.
    expect(screen.getByText(/2 servicios sin estimado/i)).toBeInTheDocument();
  });

  it('does not show the missing-estimate hint when every service in the bucket has an estimate', () => {
    const services = [
      makeService({ id: 'a', estimatedAmount: 50, paidAmountForCurrentMonth: 50 }),
      makeService({ id: 'b', estimatedAmount: 80, paidAmountForCurrentMonth: 0 }),
    ];

    renderKpi(services);
    expect(screen.queryByText(/sin estimado/i)).not.toBeInTheDocument();
  });
});
