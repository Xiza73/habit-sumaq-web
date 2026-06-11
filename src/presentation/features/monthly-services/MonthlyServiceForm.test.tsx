import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { TestProviders } from '@/test/utils';

import { MonthlyServiceForm } from './MonthlyServiceForm';

// Hoisted mock state — vi.mock factory runs before module imports, so we
// drive the mocks via top-level lets and reassign per test.
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

let mockCategories: Category[] = [];

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false }),
  // CategorySelectField mounts CategoryForm (closed by default) — its hooks
  // still run on render even with `open=false`, so stub them here.
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/core/application/hooks/use-monthly-services', () => ({
  useCreateMonthlyService: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateMonthlyService: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const categoryServicios: Category = {
  id: '44444444-4444-4444-a444-444444444444',
  userId: 'user-1',
  name: 'Servicios',
  type: 'EXPENSE',
  color: '#FF5722',
  icon: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseService: MonthlyService = {
  id: 'svc-1',
  userId: 'user-1',
  name: 'Netflix',
  categoryId: categoryServicios.id,
  currency: 'PEN',
  frequencyMonths: 1,
  estimatedAmount: 45,
  dueDay: 15,
  startPeriod: '2026-01',
  lastPaidPeriod: '2026-04',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-04-15T12:00:00.000Z',
  nextDuePeriod: '2026-05',
  isOverdue: false,
  isPaidForCurrentMonth: false,
  paidAmountForCurrentMonth: 0,
};

function renderForm(overrides: Partial<Parameters<typeof MonthlyServiceForm>[0]> = {}): {
  onClose: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  render(<MonthlyServiceForm open={true} onClose={onClose} service={null} {...overrides} />, {
    wrapper: TestProviders,
  });
  return { onClose };
}

describe('MonthlyServiceForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockCategories = [categoryServicios];
  });

  describe('create mode', () => {
    it('shows the startPeriod field when creating (immutable after creation)', () => {
      renderForm();
      expect(screen.getByLabelText(/mes de inicio/i)).toBeInTheDocument();
    });

    it('enables the frequency select when creating', () => {
      renderForm();
      expect(screen.getByLabelText(/cadencia/i)).toBeEnabled();
    });

    it('does NOT render an account picker in v1.0.0 (defaults debit the currency pool)', () => {
      renderForm();
      // Legacy form had a `<label>Cuenta por defecto</label>` + `<select>`.
      // Removed in A6-W.4 — services no longer carry an account.
      expect(screen.queryByLabelText(/cuenta por defecto/i)).not.toBeInTheDocument();
    });

    it('lets the user pick currency explicitly (no longer derived from an account)', async () => {
      const user = userEvent.setup();
      renderForm();

      const currencySelect = screen.getByLabelText(/^moneda$/i);
      // Pre-A6-W.4 this was disabled (currency followed the account pick).
      // Post-A6-W.4 it is user-editable.
      expect(currencySelect).toBeEnabled();
      await user.selectOptions(currencySelect, 'USD');
      expect(currencySelect).toHaveValue('USD');
    });

    it('submits a cleaned create payload', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/^nombre$/i), 'Netflix');
      await user.selectOptions(screen.getByLabelText(/categor/i), categoryServicios.id);
      await user.type(screen.getByLabelText(/monto estimado/i), '45');
      await user.type(screen.getByLabelText(/d[ií]a aproximado/i), '15');
      // `^crear$` so we don't catch the CategorySelectField's "Crear nueva"
      // affordance.
      await user.click(screen.getByRole('button', { name: /^crear$/i }));

      expect(mockCreateMutate).toHaveBeenCalledOnce();
      const payload = mockCreateMutate.mock.calls[0][0] as Record<string, unknown>;
      expect(payload.name).toBe('Netflix');
      expect(payload.categoryId).toBe(categoryServicios.id);
      expect(payload.currency).toBe('PEN');
      expect(payload.estimatedAmount).toBe(45);
      expect(payload.dueDay).toBe(15);
    });

    it('does not submit when required fields are empty', async () => {
      // Name is required by the schema. Without typing anything, submit
      // should be blocked client-side.
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: /^crear$/i }));
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('hides startPeriod and currency fields (immutable after creation)', () => {
      // These two live inside the `{!isEditing && ...}` block — once the
      // service exists the backend rejects changes, so the form just hides
      // them rather than rendering a disabled control.
      renderForm({ service: baseService });
      expect(screen.queryByLabelText(/mes de inicio/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^moneda$/i)).not.toBeInTheDocument();
    });

    it('disables the frequency select (cadence is immutable)', () => {
      renderForm({ service: baseService });
      expect(screen.getByLabelText(/cadencia/i)).toBeDisabled();
    });

    it('routes the submit through the update mutation (not create)', async () => {
      const user = userEvent.setup();
      renderForm({ service: baseService });

      // Tweak the estimated amount and submit. Edit submit goes through
      // updateMutation only.
      const amountInput = screen.getByLabelText(/monto estimado/i);
      await user.clear(amountInput);
      await user.type(amountInput, '60');
      await user.click(screen.getByRole('button', { name: /^guardar$/i }));

      expect(mockUpdateMutate).toHaveBeenCalledOnce();
      expect(mockCreateMutate).not.toHaveBeenCalled();
      const callArg = mockUpdateMutate.mock.calls[0][0] as {
        id: string;
        data: { estimatedAmount: number | null };
      };
      expect(callArg.id).toBe(baseService.id);
      expect(callArg.data.estimatedAmount).toBe(60);
    });

    it('preserves the service name as the initial value of the name field', () => {
      renderForm({ service: baseService });
      expect(screen.getByLabelText(/^nombre$/i)).toHaveValue(baseService.name);
    });
  });
});
