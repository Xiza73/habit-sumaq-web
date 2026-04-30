import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Account } from '@/core/domain/entities/account';
import { type Budget } from '@/core/domain/entities/budget';
import { type Category } from '@/core/domain/entities/category';

import { TestProviders } from '@/test/utils';

import { AddMovementForm } from './AddMovementForm';

const mockAddMovementMutate = vi.fn();

let mockAccounts: Account[] = [];
let mockCategories: Category[] = [];

vi.mock('@/core/application/hooks/use-accounts', () => ({
  useAccounts: () => ({ data: mockAccounts, isLoading: false }),
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false }),
}));

vi.mock('@/core/application/hooks/use-budgets', () => ({
  useAddBudgetMovement: () => ({ mutate: mockAddMovementMutate, isPending: false }),
}));

const baseBudget: Budget = {
  id: 'b-1',
  userId: 'user-1',
  year: 2026,
  month: 4,
  currency: 'PEN',
  amount: 2000,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

const accountPen: Account = {
  id: '11111111-1111-4111-a111-111111111111',
  userId: 'user-1',
  name: 'BCP Soles',
  type: 'checking',
  currency: 'PEN',
  balance: 1000,
  color: null,
  icon: null,
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const accountUsd: Account = {
  ...accountPen,
  id: '22222222-2222-4222-a222-222222222222',
  name: 'BCP Dólares',
  currency: 'USD',
};

const accountArchived: Account = {
  ...accountPen,
  id: '33333333-3333-4333-a333-333333333333',
  name: 'Cuenta vieja',
  isArchived: true,
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

function renderForm(overrides: { budget?: Budget | null; open?: boolean } = {}) {
  const props = {
    open: true,
    budget: baseBudget as Budget | null,
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<AddMovementForm {...props} />, { wrapper: TestProviders }), ...props };
}

describe('AddMovementForm', () => {
  beforeEach(() => {
    mockAddMovementMutate.mockClear();
    mockAccounts = [];
    mockCategories = [];
  });

  it('returns null when no budget is provided', () => {
    const { container } = renderForm({ budget: null });
    expect(container.firstChild).toBeNull();
  });

  it('shows the "no eligible account" banner when there are no accounts in the budget currency', () => {
    mockAccounts = [accountUsd, accountArchived]; // wrong currency + archived
    mockCategories = [category];
    renderForm();

    expect(screen.getByText(/no tienes cuentas activas en pen/i)).toBeInTheDocument();
    // Submit button must be disabled in this state to prevent invalid POSTs.
    expect(screen.getByRole('button', { name: /registrar movimiento/i })).toBeDisabled();
  });

  it('only lists accounts that match the budget currency in the account select', () => {
    mockAccounts = [accountPen, accountUsd, accountArchived];
    mockCategories = [category];
    renderForm();

    const accountSelect = screen.getByLabelText(/cuenta/i);
    // Options include the placeholder "—" plus the matching account. The
    // USD account and the archived one are filtered out of the dropdown.
    expect(accountSelect).toHaveValue(accountPen.id);
    expect(screen.getByRole('option', { name: /bcp soles/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /bcp dólares/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /cuenta vieja/i })).not.toBeInTheDocument();
  });

  it('constrains the date input to the budget month via min/max', () => {
    mockAccounts = [accountPen];
    mockCategories = [category];
    renderForm();

    const dateInput = screen.getByLabelText(/fecha/i);
    // April 2026 — first day, last day. (April has 30 days.)
    expect(dateInput).toHaveAttribute('min', '2026-04-01');
    expect(dateInput).toHaveAttribute('max', '2026-04-30');
  });

  it('does not submit when amount is missing or zero', async () => {
    mockAccounts = [accountPen];
    mockCategories = [category];
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /registrar movimiento/i }));

    expect(mockAddMovementMutate).not.toHaveBeenCalled();
  });

  it('submits the cleaned payload with the budget id when valid', async () => {
    mockAccounts = [accountPen];
    mockCategories = [category];
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '50');
    await user.selectOptions(screen.getByLabelText(/categoría/i), category.id);
    await user.click(screen.getByRole('button', { name: /registrar movimiento/i }));

    expect(mockAddMovementMutate).toHaveBeenCalledOnce();
    // Cast off the mock type to inspect the payload — same pattern as the
    // tasks tests (no-unsafe-member-access otherwise).
    const callArg = mockAddMovementMutate.mock.calls[0][0] as {
      id: string;
      data: { amount: number; accountId: string; categoryId: string; date: string };
    };
    expect(callArg.id).toBe(baseBudget.id);
    expect(callArg.data.amount).toBe(50);
    expect(callArg.data.accountId).toBe(accountPen.id);
    expect(callArg.data.categoryId).toBe(category.id);
    // dateInputToBackendIso pins the picker value to noon UTC.
    expect(callArg.data.date).toMatch(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/);
  });
});
