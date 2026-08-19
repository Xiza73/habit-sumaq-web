import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type BudgetWithKpi } from '@/core/domain/entities/budget';
import { type BudgetMovement } from '@/core/domain/entities/budget-movement';

import { TestProviders } from '@/test/utils';

import { BudgetKpiCard } from './BudgetKpiCard';

function makeMovement(date: string, amount: number, id = `mv-${date}-${amount}`): BudgetMovement {
  return {
    id,
    userId: 'user-1',
    budgetId: 'b-1',
    currency: 'PEN',
    categoryId: 'cat-1',
    amount,
    description: null,
    date: `${date}T12:00:00.000Z`,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

// April 15, day 15 of 30 → 16 days remaining including today.
const activeBudget: BudgetWithKpi = {
  id: 'b-1',
  userId: 'user-1',
  year: 2026,
  month: 4,
  currency: 'PEN',
  amount: 2000,
  spent: 0,
  remaining: 2000,
  daysRemainingIncludingToday: 16,
  // 2000 / 16 = 125. Backend ships this; the new card recomputes locally
  // to support the locked-day model.
  dailyAllowance: 125,
  initialDailyAllowance: 66.67,
  recovery: { zeroSpendDays: 0, halfSpendDays: 0, recoverable: true },
  currentDate: '2026-04-15',
  movements: [],
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

function renderCard(overrides: Partial<BudgetWithKpi> = {}) {
  const budget: BudgetWithKpi = { ...activeBudget, ...overrides };
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

describe('BudgetKpiCard — header (shared by both layouts)', () => {
  it('renders the period label and the currency', () => {
    renderCard();
    expect(screen.getByText(/abril 2026 · pen/i)).toBeInTheDocument();
  });

  it('fires the action callbacks when the header buttons are clicked', async () => {
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

describe('BudgetKpiCard — active layout (current month, locked-day model)', () => {
  it('headlines "Disponible hoy" with the locked daily allowance when nothing was spent today', () => {
    renderCard();
    // 2000 / 16 = 125.00 → with no movements today, available today equals
    // the full locked allowance. The same number ALSO shows in the
    // "planeados hoy" hint and the "~al día" tile, so we resolve the
    // headline by traversing from its label rather than matching text
    // globally.
    const label = screen.getByText(/disponible hoy/i);
    const headline = label.nextElementSibling as HTMLElement;
    expect(headline.textContent).toMatch(/125[.,]00/);
  });

  it('keeps the locked daily allowance FROZEN when the user spends today (the load-bearing UX)', () => {
    // Spend S/40 today out of S/125 allowance → available today = 85, but
    // "Resto del mes" must still be (2000 - 125) = 1875 (NOT 1875 minus the
    // 40 we spent — that's the whole point of the locked-day model).
    renderCard({
      spent: 40,
      remaining: 1960,
      movements: [makeMovement('2026-04-15', 40)],
    });

    // Available today = 125 - 40 = 85.
    expect(screen.getByText(/85[.,]00/)).toBeInTheDocument();
    // "Resto del mes" tile stays at 1875 — proof the projection didn't shift.
    expect(screen.getByText(/1[.,]875[.,]00/)).toBeInTheDocument();
  });

  it("renders the over-today amount in destructive color when the user blew past today's allowance", () => {
    // S/200 spent today, allowance 125 → -75 available. The headline goes
    // red, but again the future tile must stay at 1875.
    renderCard({
      spent: 200,
      remaining: 1800,
      movements: [makeMovement('2026-04-15', 200)],
    });

    const label = screen.getByText(/disponible hoy/i);
    const headline = label.nextElementSibling as HTMLElement;
    expect(headline.textContent).toMatch(/-?75[.,]00|−75[.,]00/);
    expect(headline.className).toMatch(/text-destructive/);
    // 2000 - 125 = 1875 still — the future plan is intact.
    expect(screen.getByText(/1[.,]875[.,]00/)).toBeInTheDocument();
  });

  it('uses past-day spend as the start-of-today baseline (16 days, S/300 already spent → 1700/16)', () => {
    // Pretend the user is on April 15 with movements from earlier days
    // totaling 300. Start-of-today remaining = 1700, A = 1700/16 = 106.25.
    renderCard({
      spent: 300,
      remaining: 1700,
      movements: [makeMovement('2026-04-05', 100), makeMovement('2026-04-10', 200)],
    });

    // Available today (no spend yet today) = 106.25. Same value appears in
    // the planned-hint and ~al-día tile too, so target the headline by label.
    const label = screen.getByText(/disponible hoy/i);
    const headline = label.nextElementSibling as HTMLElement;
    expect(headline.textContent).toMatch(/106[.,]25/);
  });

  it('shows the breakdown toggle collapsed by default and expands on click', async () => {
    const user = userEvent.setup();
    renderCard({
      spent: 300,
      remaining: 1700,
      movements: [makeMovement('2026-04-10', 300)],
    });

    const toggle = screen.getByRole('button', { name: /ver desglose/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/promedio diario real/i)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/promedio diario real/i)).toBeInTheDocument();
    // "Tu mes hasta ahora" header is visible.
    expect(screen.getByText(/tu mes hasta ahora/i)).toBeInTheDocument();
  });

  it('renders the daily history rows inside the breakdown (one per day in the window)', async () => {
    // April 15, default window 7 → April 9..15 (within the budget month).
    const user = userEvent.setup();
    renderCard({
      spent: 50,
      remaining: 1950,
      movements: [makeMovement('2026-04-13', 50)],
    });
    await user.click(screen.getByRole('button', { name: /ver desglose/i }));

    const history = screen.getByRole('list');
    const rows = within(history).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
  });
});

describe('BudgetKpiCard — simple layout (closed and future-month budgets)', () => {
  it('falls back to the "Disponible" headline + dailyAllowance="—" when the month is closed', () => {
    renderCard({
      daysRemainingIncludingToday: 0,
      dailyAllowance: null,
      currentDate: '2026-05-10', // we're in May, the budget is for April
      spent: 1800,
      remaining: 200,
    });

    // No "Disponible hoy" — closed month uses the simple layout.
    expect(screen.queryByText(/disponible hoy/i)).not.toBeInTheDocument();
    // Headline reverts to "Disponible" with `remaining` (= 200).
    expect(screen.getByText(/200[.,]00/)).toBeInTheDocument();
    // Daily allowance tile renders the placeholder.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('uses the simple layout for a future-month budget (no "today" inside the month)', () => {
    // Budget is for May 2026, but today is still April. There's no concept
    // of "today" inside the budget month — fall back to the simple plan.
    renderCard({
      year: 2026,
      month: 5,
      currentDate: '2026-04-20',
      daysRemainingIncludingToday: 31,
    });

    expect(screen.queryByText(/disponible hoy/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^disponible$/i)).toBeInTheDocument();
  });
});

describe('BudgetKpiCard — recovery plan', () => {
  it('says nothing when there is nothing to recover', () => {
    renderCard({ recovery: { zeroSpendDays: 0, halfSpendDays: 0, recoverable: true } });
    expect(screen.queryByText(/recuperar/i)).not.toBeInTheDocument();
  });

  it('states the zero-spend and half-spend days', () => {
    renderCard({ recovery: { zeroSpendDays: 6, halfSpendDays: 12, recoverable: true } });

    expect(screen.getByText(/6 días sin gastar/i)).toBeInTheDocument();
    expect(screen.getByText(/12 días gastando la mitad/i)).toBeInTheDocument();
  });

  it('uses the singular for a single day', () => {
    renderCard({ recovery: { zeroSpendDays: 1, halfSpendDays: 2, recoverable: true } });

    expect(screen.getByText(/1 día sin gastar/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 días/i)).not.toBeInTheDocument();
  });

  it('says the month is unrecoverable instead of showing a count you cannot act on', () => {
    // The backend sends a count even here, and rendering it would tell the
    // user to hold out for more days than the month has left.
    renderCard({ recovery: { zeroSpendDays: 21, halfSpendDays: 42, recoverable: false } });

    expect(screen.getByText(/no se recupera este mes/i)).toBeInTheDocument();
    expect(screen.queryByText(/21 días/i)).not.toBeInTheDocument();
  });

  it('renders nothing for a closed month', () => {
    renderCard({ recovery: null, daysRemainingIncludingToday: 0 });
    expect(screen.queryByText(/recuperar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no se recupera/i)).not.toBeInTheDocument();
  });
});
