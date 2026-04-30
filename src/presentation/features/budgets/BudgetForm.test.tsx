import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Budget } from '@/core/domain/entities/budget';

import { TestProviders } from '@/test/utils';

import { BudgetForm } from './BudgetForm';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-budgets', () => ({
  useCreateBudget: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateBudget: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const mockBudget: Budget = {
  id: 'b-1',
  userId: 'user-1',
  year: 2026,
  month: 4,
  currency: 'PEN',
  amount: 2000,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

function renderForm(
  overrides: {
    open?: boolean;
    budget?: Budget | null;
    defaultCurrency?: 'PEN' | 'USD' | 'EUR';
    defaultYear?: number;
    defaultMonth?: number;
  } = {},
) {
  const props = {
    open: true,
    budget: null as Budget | null,
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<BudgetForm {...props} />, { wrapper: TestProviders }), ...props };
}

describe('BudgetForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
  });

  it('does not render when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the create dialog and accepts year/month/currency input', () => {
    renderForm({ defaultYear: 2026, defaultMonth: 4, defaultCurrency: 'PEN' });
    expect(screen.getByLabelText(/año/i)).toHaveValue(2026);
    expect(screen.getByLabelText(/mes/i)).toHaveValue(4);
    expect(screen.getByLabelText(/moneda/i)).toHaveValue('PEN');
    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument();
  });

  it('disables year/month/currency in edit mode (immutable on backend)', () => {
    renderForm({ budget: mockBudget });
    expect(screen.getByLabelText(/año/i)).toBeDisabled();
    expect(screen.getByLabelText(/mes/i)).toBeDisabled();
    expect(screen.getByLabelText(/moneda/i)).toBeDisabled();
    // Only the amount is editable.
    expect(screen.getByLabelText(/monto/i)).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('does not call create when amount is missing or zero', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls create with the parsed numeric amount', async () => {
    const user = userEvent.setup();
    renderForm({ defaultYear: 2026, defaultMonth: 4, defaultCurrency: 'USD' });

    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '500.50');
    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500.5,
        currency: 'USD',
        year: 2026,
        month: 4,
      }),
      expect.any(Object),
    );
  });

  it('calls update with only the new amount when editing', async () => {
    const user = userEvent.setup();
    renderForm({ budget: mockBudget });

    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '2500');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockBudget.id,
        data: { amount: 2500 },
      }),
      expect.any(Object),
    );
  });
});
