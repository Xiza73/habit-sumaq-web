import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { TestProviders } from '@/test/utils';

import { MonthlyServiceCard } from './MonthlyServiceCard';

const mockSettleMutate = vi.fn();
vi.mock('@/core/application/hooks/use-debts-loans', () => ({
  useSettleDebtLoan: () => ({ mutate: mockSettleMutate, isPending: false }),
}));

const mockCategory: Category = {
  id: 'cat-1',
  userId: 'user-1',
  name: 'Servicios',
  type: 'EXPENSE',
  color: null,
  icon: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseService: MonthlyService = {
  id: 'svc-1',
  userId: 'user-1',
  name: 'Luz',
  categoryId: 'cat-1',
  currency: 'PEN',
  frequencyMonths: 1,
  estimatedAmount: 120,
  dueDay: 15,
  startPeriod: '2026-01',
  lastPaidPeriod: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nextDuePeriod: '2026-04',
  isOverdue: false,
  isPaidForCurrentMonth: false,
  paidAmountForCurrentMonth: 0,
  linkedDebts: [],
};

function renderCard(service: MonthlyService = baseService) {
  const handlers = {
    onPay: vi.fn(),
    onSkip: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<MonthlyServiceCard service={service} category={mockCategory} {...handlers} />, {
    wrapper: TestProviders,
  });
  return handlers;
}

describe('MonthlyServiceCard', () => {
  beforeEach(() => {
    mockSettleMutate.mockClear();
  });

  it('renders service name and currency badge', () => {
    renderCard();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    expect(screen.getByText('PEN')).toBeInTheDocument();
  });

  it('shows a short "pending" badge without the period when pending', () => {
    renderCard();
    // Deliberately does NOT include the period — the summary header already
    // shows the current month, so the chip stays compact.
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument();
    expect(screen.queryByText(/abril/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026-04/)).not.toBeInTheDocument();
  });

  it('shows paid status when isPaidForCurrentMonth is true', () => {
    renderCard({ ...baseService, isPaidForCurrentMonth: true });
    expect(screen.getByText(/al día/i)).toBeInTheDocument();
  });

  it('shows overdue status with the missed period (localized month name)', () => {
    renderCard({ ...baseService, isOverdue: true });
    // Overdue is the one case that surfaces the period — so the user sees
    // exactly which month they missed.
    expect(screen.getByText(/atrasado/i)).toBeInTheDocument();
    expect(screen.getByText(/abril/i)).toBeInTheDocument();
    expect(screen.queryByText(/2026-04/)).not.toBeInTheDocument();
  });

  it('shows pay and skip buttons when pending', () => {
    const handlers = renderCard();
    expect(screen.getByRole('button', { name: /^pagar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saltear mes/i })).toBeInTheDocument();
    expect(handlers.onPay).not.toHaveBeenCalled();
  });

  it('hides BOTH pay and skip buttons when the service is paid for the current month', () => {
    // Regression guard: originally only skip was hidden, but pay must also
    // disappear — otherwise clicking pay creates a second transaction and
    // silently skips a future month.
    renderCard({ ...baseService, isPaidForCurrentMonth: true });
    expect(screen.queryByRole('button', { name: /^pagar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /saltear mes/i })).not.toBeInTheDocument();
  });

  it('renders archived badge and unarchive button when service is archived', () => {
    renderCard({ ...baseService, isActive: false });
    expect(screen.getByText(/archivado/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pagar$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /desarchivar/i }).length).toBeGreaterThan(0);
  });

  it('fires onPay when the pay button is clicked', async () => {
    const handlers = renderCard();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^pagar$/i }));
    expect(handlers.onPay).toHaveBeenCalledWith(baseService);
  });

  it('renders em dash when estimatedAmount is null', () => {
    renderCard({ ...baseService, estimatedAmount: null });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('hides the cadence chip when frequencyMonths === 1 (monthly)', () => {
    renderCard();
    // Monthly is the default and adding a chip there would be visual noise.
    expect(screen.queryByText(/mensual/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trimestral/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anual/i)).not.toBeInTheDocument();
  });

  it('shows a localized cadence chip for non-monthly services', () => {
    renderCard({ ...baseService, frequencyMonths: 3 });
    expect(screen.getByText(/trimestral/i)).toBeInTheDocument();
  });

  it('renders the annual cadence too', () => {
    renderCard({ ...baseService, frequencyMonths: 12 });
    expect(screen.getByText(/anual/i)).toBeInTheDocument();
  });

  describe('linked debts', () => {
    const withLinkedDebts: MonthlyService = {
      ...baseService,
      linkedDebts: [
        { id: 'debt-ana', reference: 'Ana', remainingAmount: 40, status: 'PENDING' },
        { id: 'debt-luis', reference: 'Luis', remainingAmount: 60, status: 'PENDING' },
      ],
    };

    it('does NOT render a linked-debt badge when the service has none', () => {
      renderCard(baseService);
      expect(screen.queryByText(/pr[eé]stamo/i)).not.toBeInTheDocument();
    });

    it('shows a badge summarizing pending linked debts (count + total pending amount)', () => {
      renderCard(withLinkedDebts);
      // 2 pending loans, total 100 (40 + 60), PEN.
      expect(screen.getByText(/2 pr[eé]stamos pendientes/i)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('uses the singular badge copy (ICU `one` branch) with exactly one linked debt', () => {
      renderCard({
        ...baseService,
        linkedDebts: [{ id: 'debt-ana', reference: 'Ana', remainingAmount: 40, status: 'PENDING' }],
      });
      // Exactly ONE pending loan — singular, not "1 préstamos".
      expect(screen.getByText(/1 pr[eé]stamo pendiente/i)).toBeInTheDocument();
      expect(screen.queryByText(/pr[eé]stamos pendientes/i)).not.toBeInTheDocument();
    });

    it('exposes a stable aria-label per settle-trigger button (references the debt)', () => {
      renderCard(withLinkedDebts);
      // Query by the explicit aria-label instead of the concatenated
      // "reference · amount" display text, which is brittle.
      expect(screen.getByRole('button', { name: /liquidar ana/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /liquidar luis/i })).toBeInTheDocument();
    });

    it('opens a settle modal for a linked debt from the card', async () => {
      const user = userEvent.setup();
      renderCard(withLinkedDebts);

      await user.click(screen.getByRole('button', { name: /liquidar ana/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/liquidar ana/i)).toBeInTheDocument();
    });

    it('settling a linked debt goes through the shared useSettleDebtLoan mutation', async () => {
      const user = userEvent.setup();
      renderCard(withLinkedDebts);

      await user.click(screen.getByRole('button', { name: /liquidar ana/i }));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      expect(mockSettleMutate).toHaveBeenCalledOnce();
      const callArg = mockSettleMutate.mock.calls[0][0] as {
        id: string;
        data: { settledAmount: number; currency?: string };
      };
      expect(callArg.id).toBe('debt-ana');
      expect(callArg.data.settledAmount).toBe(40);
    });
  });
});
