import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type BudgetWithKpi } from '@/core/domain/entities/budget';

import { TestProviders } from '@/test/utils';

import { BudgetKpiCard } from './BudgetKpiCard';

const baseBudget: BudgetWithKpi = {
  id: 'b-1',
  userId: 'user-1',
  year: 2026,
  month: 4,
  currency: 'PEN',
  amount: 2000,
  spent: 600,
  remaining: 1400,
  daysRemainingIncludingToday: 16,
  dailyAllowance: 87.5,
  currentDate: '2026-04-15',
  movements: [],
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

function renderCard(overrides: Partial<BudgetWithKpi> = {}) {
  const budget: BudgetWithKpi = { ...baseBudget, ...overrides };
  const onAddMovement = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  return {
    ...render(
      <BudgetKpiCard
        budget={budget}
        onAddMovement={onAddMovement}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
      { wrapper: TestProviders },
    ),
    onAddMovement,
    onEdit,
    onDelete,
  };
}

describe('BudgetKpiCard', () => {
  it('renders the period label and the currency', () => {
    renderCard();
    // formatPeriodLabel('2026-04', 'es') → "Abril 2026" — see lib/format tests.
    expect(screen.getByText(/abril 2026 · pen/i)).toBeInTheDocument();
  });

  it('renders the remaining amount as the headline', () => {
    renderCard();
    // PEN 1,400.00 — Intl format. We match the digits + currency rather than
    // the exact thousand separator (locale-dependent).
    const headline = screen.getByText(/1[.,]400[.,]00/);
    expect(headline).toBeInTheDocument();
  });

  it('switches to destructive color when remaining is negative (overspend)', () => {
    renderCard({ amount: 500, spent: 800, remaining: -300, dailyAllowance: -18.75 });
    const headline = screen.getByText(/-?300[.,]00|−300[.,]00/);
    expect(headline.className).toMatch(/text-destructive/);
  });

  it('renders "—" for daily allowance when the month is closed (null)', () => {
    renderCard({ daysRemainingIncludingToday: 0, dailyAllowance: null });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the days remaining counter', () => {
    renderCard({ daysRemainingIncludingToday: 16 });
    expect(screen.getByText('16')).toBeInTheDocument();
  });

  it('fires onAddMovement / onEdit / onDelete when the buttons are clicked', async () => {
    const user = userEvent.setup();
    const { onAddMovement, onEdit, onDelete } = renderCard();

    await user.click(screen.getByRole('button', { name: /agregar gasto/i }));
    expect(onAddMovement).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /editar monto/i }));
    expect(onEdit).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
