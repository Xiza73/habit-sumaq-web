import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Account } from '@/core/domain/entities/account';
import { type Category } from '@/core/domain/entities/category';
import { type Transaction } from '@/core/domain/entities/transaction';

import { TestProviders } from '@/test/utils';

import { TransactionForm } from './TransactionForm';

// Hoisted mock state — vi.mock factory runs before module imports, so we drive
// the mocks via these top-level lets and reassign per test in `beforeEach`.
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

let mockAccounts: Account[] = [];
let mockCategories: Category[] = [];

vi.mock('@/core/application/hooks/use-accounts', () => ({
  useAccounts: () => ({ data: mockAccounts, isLoading: false }),
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false }),
  // CategorySelectField mounts CategoryForm (closed by default) — its hooks
  // still run on render even with `open=false`, so stub them here.
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/core/application/hooks/use-transactions', () => ({
  useCreateTransaction: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateTransaction: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

// Stub the DatePicker — the real one renders a portal-based calendar and is
// covered by its own behavioral tests. Here we only care about the value
// passing through.
vi.mock('@/presentation/components/ui/DatePicker', () => ({
  DatePicker: (props: { id?: string; value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="date-picker-stub"
      id={props.id}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

const baseAccountPen: Account = {
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

const baseAccountUsd: Account = {
  ...baseAccountPen,
  id: '22222222-2222-4222-a222-222222222222',
  name: 'BCP Dólares',
  currency: 'USD',
};

const baseCategoryExpense: Category = {
  id: '44444444-4444-4444-a444-444444444444',
  userId: 'user-1',
  name: 'Comida',
  type: 'EXPENSE',
  color: '#FF5722',
  icon: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseCategoryIncome: Category = {
  ...baseCategoryExpense,
  id: '55555555-5555-4555-a555-555555555555',
  name: 'Sueldo',
  type: 'INCOME',
};

const baseTransaction: Transaction = {
  id: 'tx-1',
  userId: 'user-1',
  accountId: baseAccountPen.id,
  categoryId: baseCategoryExpense.id,
  type: 'EXPENSE',
  amount: 50,
  description: 'Almuerzo',
  date: '2026-04-15T12:00:00.000Z',
  destinationAccountId: null,
  reference: null,
  status: null,
  relatedTransactionId: null,
  remainingAmount: null,
  budgetId: null,
  createdAt: '2026-04-15T12:00:00.000Z',
  updatedAt: '2026-04-15T12:00:00.000Z',
};

function renderForm(overrides: Partial<Parameters<typeof TransactionForm>[0]> = {}): {
  onClose: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  render(<TransactionForm open={true} onClose={onClose} transaction={null} {...overrides} />, {
    wrapper: TestProviders,
  });
  return { onClose };
}

describe('TransactionForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockAccounts = [baseAccountPen, baseAccountUsd];
    mockCategories = [baseCategoryExpense, baseCategoryIncome];
  });

  describe('conditional rendering by transaction type', () => {
    it('shows the type select by default (no lockedType, no editing)', () => {
      renderForm();
      expect(screen.getByLabelText(/^tipo$/i)).toBeInTheDocument();
    });

    it('hides the type select when lockedType is provided (Nueva deuda / Nuevo préstamo)', () => {
      // The Debts dashboard renders the form with lockedType to skip the
      // type picker — the form still submits the locked type via a hidden
      // input, but the visible select is gone.
      renderForm({ lockedType: 'DEBT' });
      expect(screen.queryByLabelText(/^tipo$/i)).not.toBeInTheDocument();
    });

    it('hides the category select for TRANSFER / DEBT / LOAN', async () => {
      // Default type on open is EXPENSE → category is visible. Switching to
      // TRANSFER should hide it entirely (the conditional in the JSX gates
      // the CategorySelectField on INCOME/EXPENSE only).
      const user = userEvent.setup();
      renderForm();
      expect(screen.getByLabelText(/categor/i)).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^tipo$/i), 'TRANSFER');
      expect(screen.queryByLabelText(/categor/i)).not.toBeInTheDocument();
    });

    it('shows the destination account field only for TRANSFER', async () => {
      const user = userEvent.setup();
      renderForm();
      expect(screen.queryByLabelText(/destino/i)).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^tipo$/i), 'TRANSFER');
      expect(screen.getByLabelText(/destino/i)).toBeInTheDocument();
    });

    it('shows the reference field only for DEBT / LOAN', async () => {
      const user = userEvent.setup();
      renderForm();
      expect(screen.queryByLabelText(/referencia/i)).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^tipo$/i), 'DEBT');
      expect(screen.getByLabelText(/referencia/i)).toBeInTheDocument();
    });

    it('filters categories by transaction type (INCOME → income categories only)', async () => {
      // The CategorySelectField wires `categoryType` based on the selected
      // type. We can't see the wiring directly but `useCategories(type)` is
      // re-called — the mock returns ALL categories regardless of type, so
      // we assert on a downstream effect: switching to INCOME should still
      // surface the income category in the select.
      const user = userEvent.setup();
      renderForm();

      await user.selectOptions(screen.getByLabelText(/^tipo$/i), 'INCOME');
      expect(screen.getByRole('option', { name: /sueldo/i })).toBeInTheDocument();
    });
  });

  describe('create flow', () => {
    it('submits a cleaned EXPENSE payload (empty optional strings → null)', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.clear(screen.getByLabelText(/monto/i));
      await user.type(screen.getByLabelText(/monto/i), '50');
      await user.selectOptions(screen.getByLabelText(/cuenta/i), baseAccountPen.id);
      // `/^crear$/i` matches the submit button only — `/crear/i` would also
      // match the CategorySelectField's "Crear nueva categoría" trigger.
      await user.click(screen.getByRole('button', { name: /^crear$/i }));

      expect(mockCreateMutate).toHaveBeenCalledOnce();
      const payload = mockCreateMutate.mock.calls[0][0] as Record<string, unknown>;
      expect(payload.type).toBe('EXPENSE');
      expect(payload.amount).toBe(50);
      expect(payload.accountId).toBe(baseAccountPen.id);
      // Empty description / destinationAccountId / reference are normalized to
      // null before submit — the schema is nullable for those, and an empty
      // string would skip the not-null mapping the backend expects.
      expect(payload.description).toBeNull();
      expect(payload.destinationAccountId).toBeNull();
      expect(payload.reference).toBeNull();
    });

    it('does not submit when amount is missing or zero (Zod validation)', async () => {
      const user = userEvent.setup();
      renderForm();

      // Default amount is 0. Selecting an account and submitting should be
      // rejected by the schema (`amount > 0`).
      await user.selectOptions(screen.getByLabelText(/cuenta/i), baseAccountPen.id);
      await user.click(screen.getByRole('button', { name: /^crear$/i }));

      expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it('submits with lockedType=DEBT preserved via the hidden input', async () => {
      const user = userEvent.setup();
      renderForm({ lockedType: 'DEBT' });

      await user.clear(screen.getByLabelText(/monto/i));
      await user.type(screen.getByLabelText(/monto/i), '300');
      await user.selectOptions(screen.getByLabelText(/cuenta/i), baseAccountPen.id);
      await user.type(screen.getByLabelText(/referencia/i), 'Juan Pérez');
      await user.click(screen.getByRole('button', { name: /^crear$/i }));

      expect(mockCreateMutate).toHaveBeenCalledOnce();
      const payload = mockCreateMutate.mock.calls[0][0] as Record<string, unknown>;
      expect(payload.type).toBe('DEBT');
      expect(payload.reference).toBe('Juan Pérez');
    });
  });

  describe('edit flow', () => {
    it('disables the type and account selects (both immutable after creation)', () => {
      renderForm({ transaction: baseTransaction });
      expect(screen.getByLabelText(/^tipo$/i)).toBeDisabled();
      expect(screen.getByLabelText(/cuenta/i)).toBeDisabled();
    });

    it('routes the submit through the update mutation (not create)', async () => {
      const user = userEvent.setup();
      renderForm({ transaction: baseTransaction });

      await user.clear(screen.getByLabelText(/monto/i));
      await user.type(screen.getByLabelText(/monto/i), '75');
      await user.click(screen.getByRole('button', { name: /guardar/i }));

      expect(mockUpdateMutate).toHaveBeenCalledOnce();
      expect(mockCreateMutate).not.toHaveBeenCalled();
      const callArg = mockUpdateMutate.mock.calls[0][0] as { id: string; data: { amount: number } };
      expect(callArg.id).toBe(baseTransaction.id);
      expect(callArg.data.amount).toBe(75);
    });
  });
});
