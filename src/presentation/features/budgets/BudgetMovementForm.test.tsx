import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Budget } from '@/core/domain/entities/budget';
import { type BudgetMovement } from '@/core/domain/entities/budget-movement';
import { type Category } from '@/core/domain/entities/category';

import { TestProviders } from '@/test/utils';

import { BudgetMovementForm } from './BudgetMovementForm';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

let mockCategories: Category[] = [];

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false }),
  // CategorySelectField mounts CategoryForm (closed by default) for the
  // inline "+ Crear nueva categoría" flow — its hooks still run on render
  // even with `open=false`, so stub them here.
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

// v1.0.0 (Phase A6-W.1): writes go through the new
// `useCreateBudgetMovement` / `useUpdateBudgetMovement` hooks. The legacy
// `useAddBudgetMovement` + `useUpdateTransaction` paths are dead.
vi.mock('@/core/application/hooks/use-budget-movements', () => ({
  useCreateBudgetMovement: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateBudgetMovement: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

// Mock the DatePicker so we can assert the form passes the right `min`/`max`
// for the budget month. The real DatePicker renders a button + portal-based
// calendar — too much to inspect for a behavioral assertion like "the bounds
// are correct". A thin stub that surfaces the props as data-attrs is enough.
const datePickerProps = vi.fn<(props: { min?: string; max?: string; value: string }) => void>();
vi.mock('@/presentation/components/ui/DatePicker', () => ({
  DatePicker: (props: {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    min?: string;
    max?: string;
  }) => {
    datePickerProps(props);
    return (
      <input
        data-testid="date-picker-stub"
        id={props.id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        data-min={props.min}
        data-max={props.max}
      />
    );
  },
}));

const baseBudget: Budget = {
  // Real UUID — the v1.0.0 `createBudgetMovementSchema` requires the
  // `budgetId` to pass `z.string().uuid()`. A non-UUID id silently fails
  // the submit and the mutation never fires.
  id: '99999999-9999-4999-a999-999999999999',
  userId: 'user-1',
  year: 2026,
  month: 4,
  currency: 'PEN',
  amount: 2000,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

const category: Category = {
  id: '44444444-4444-4444-a444-444444444444',
  userId: 'user-1',
  name: 'Comida',
  type: 'EXPENSE',
  color: '#FF5722',
  icon: 'restaurant',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseMovement: BudgetMovement = {
  id: '88888888-8888-4888-a888-888888888888',
  userId: 'user-1',
  budgetId: baseBudget.id,
  currency: 'PEN',
  amount: 42,
  description: 'Almuerzo',
  categoryId: category.id,
  date: '2026-04-12T12:00:00.000Z',
  createdAt: '2026-04-12T12:00:00.000Z',
  updatedAt: '2026-04-12T12:00:00.000Z',
};

function renderForm(
  overrides: {
    budget?: Budget | null;
    movement?: BudgetMovement | null;
    open?: boolean;
  } = {},
) {
  const props = {
    open: true,
    budget: baseBudget as Budget | null,
    movement: null as BudgetMovement | null,
    onClose: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<BudgetMovementForm {...props} />, { wrapper: TestProviders }),
    ...props,
  };
}

describe('BudgetMovementForm — create mode (default)', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockCategories = [];
  });

  it('returns null when no budget is provided', () => {
    const { container } = renderForm({ budget: null });
    expect(container.firstChild).toBeNull();
  });

  it('does NOT render an account picker in v1.0.0 (debits the currency pool, not an account)', () => {
    mockCategories = [category];
    renderForm();
    // The legacy form had a `<label>Cuenta</label>` + `<select>`. In
    // v1.0.0, budget movements debit the currency pool — there is no
    // per-account choice anymore.
    expect(screen.queryByLabelText(/cuenta/i)).not.toBeInTheDocument();
  });

  it('passes the budget-month bounds to the DatePicker as min/max', () => {
    mockCategories = [category];
    renderForm();

    // April 2026 — first day, last day. (April has 30 days.) Inspect the
    // last call to the stubbed DatePicker; that's the most recent render.
    const calls = datePickerProps.mock.calls;
    const lastProps = calls[calls.length - 1]?.[0];
    expect(lastProps).toBeDefined();
    expect(lastProps?.min).toBe('2026-04-01');
    expect(lastProps?.max).toBe('2026-04-30');
  });

  it('does not submit when amount is missing or zero', async () => {
    mockCategories = [category];
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /registrar movimiento/i }));

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('routes the submit through useCreateBudgetMovement with the new v1.0.0 payload shape', async () => {
    mockCategories = [category];
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '50');
    await user.selectOptions(screen.getByLabelText(/categoría/i), category.id);
    await user.click(screen.getByRole('button', { name: /registrar movimiento/i }));

    expect(mockCreateMutate).toHaveBeenCalledOnce();
    expect(mockUpdateMutate).not.toHaveBeenCalled();
    // Cast off the mock type to inspect the payload — same pattern as the
    // tasks tests (no-unsafe-member-access otherwise).
    const callArg = mockCreateMutate.mock.calls[0][0] as {
      budgetId: string;
      amount: number;
      categoryId: string;
      date: string;
      description: string | null;
    };
    expect(callArg.budgetId).toBe(baseBudget.id);
    expect(callArg.amount).toBe(50);
    expect(callArg.categoryId).toBe(category.id);
    // dateInputToBackendIso pins the picker value to noon UTC.
    expect(callArg.date).toMatch(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/);
  });
});

describe('BudgetMovementForm — edit mode (movement prop set)', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockCategories = [category];
  });

  it('switches the title to "Editar movimiento"', () => {
    renderForm({ movement: baseMovement });
    expect(screen.getByText(/editar movimiento/i)).toBeInTheDocument();
  });

  it('pre-populates amount / categoryId / description from the movement entity', () => {
    renderForm({ movement: baseMovement });
    expect(screen.getByLabelText(/monto/i)).toHaveValue(42);
    expect(screen.getByLabelText(/categoría/i)).toHaveValue(category.id);
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('Almuerzo');
  });

  it('routes the submit through useUpdateBudgetMovement with the v1.0.0 PATCH shape', async () => {
    const user = userEvent.setup();
    renderForm({ movement: baseMovement });

    // Bump the amount and submit. The update mutation should fire with the
    // movement id and a PATCH payload — no call to create.
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '75');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(mockUpdateMutate).toHaveBeenCalledOnce();
    expect(mockCreateMutate).not.toHaveBeenCalled();

    const callArg = mockUpdateMutate.mock.calls[0][0] as {
      id: string;
      data: { amount: number; categoryId: string | null; date: string; description: string | null };
    };
    expect(callArg.id).toBe(baseMovement.id);
    expect(callArg.data.amount).toBe(75);
    expect(callArg.data.categoryId).toBe(category.id);
    // budgetId and currency are immutable in v1.0.0 — they MUST NOT appear
    // in the PATCH payload.
    expect(callArg.data).not.toHaveProperty('budgetId');
    expect(callArg.data).not.toHaveProperty('currency');
  });
});
