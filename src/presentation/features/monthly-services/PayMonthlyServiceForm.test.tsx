import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';

import { ApiError } from '@/infrastructure/api/api-error';

import { TestProviders } from '@/test/utils';

import { PayMonthlyServiceForm } from './PayMonthlyServiceForm';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockCreateMutate = vi.fn();

// v1.0.0 (Phase A6-W.2): payments go through the new
// `useCreateMonthlyServicePayment` hook. The legacy `usePayMonthlyService`
// (which hit `POST /monthly-services/:id/pay` and created a transaction)
// is dead — this form must NOT touch it.
vi.mock('@/core/application/hooks/use-monthly-service-payments', () => ({
  useCreateMonthlyServicePayment: () => ({ mutate: mockCreateMutate, isPending: false }),
}));

let mockParticipants: MonthlyServiceParticipant[] = [];
let mockParticipantsLoading = false;
vi.mock('@/core/application/hooks/use-monthly-service-participants', () => ({
  useServiceParticipants: () => ({
    data: mockParticipants,
    isLoading: mockParticipantsLoading,
  }),
}));

// Replace the DatePicker with a thin text input so the form can be filled
// out from a test without dragging in the calendar portal. Same stub
// shape we use in the budgets-form spec — we ALSO surface min/max as
// data-attrs so we can assert the period-month constraint.
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

const baseService: MonthlyService = {
  // Real UUID — `createMonthlyServicePaymentSchema` requires
  // `monthlyServiceId` to pass `z.string().uuid()` and the period must
  // match `^\d{4}-(0[1-9]|1[0-2])$`. Anything else silently fails submit.
  id: '77777777-7777-4777-a777-777777777777',
  userId: 'user-1',
  name: 'Netflix',
  categoryId: '00000000-0000-4000-8000-000000000001',
  currency: 'PEN',
  frequencyMonths: 1,
  estimatedAmount: 35,
  dueDay: 15,
  startPeriod: '2026-01',
  lastPaidPeriod: '2026-05',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nextDuePeriod: '2026-06',
  isOverdue: false,
  isPaidForCurrentMonth: false,
  paidAmountForCurrentMonth: 0,
  linkedDebts: [],
};

function renderForm(overrides: { service?: MonthlyService | null; open?: boolean } = {}) {
  const props = {
    open: true,
    service: baseService as MonthlyService | null,
    onClose: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<PayMonthlyServiceForm {...props} />, { wrapper: TestProviders }),
    ...props,
  };
}

describe('PayMonthlyServiceForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    mockParticipants = [];
    mockParticipantsLoading = false;
  });

  it('returns null when no service is provided', () => {
    const { container } = renderForm({ service: null });
    expect(container.firstChild).toBeNull();
  });

  it('does NOT render an account picker in v1.0.0 (debits the currency pool, not an account)', () => {
    renderForm();
    // The legacy form had a `<label>Pagar desde</label>` + `<select>` to
    // override the account. v1.0.0 has no per-account choice — payments
    // debit the currency pool.
    expect(screen.queryByLabelText(/pagar desde/i)).not.toBeInTheDocument();
  });

  it('does NOT render an editable period input — the period is fixed to service.nextDuePeriod', () => {
    renderForm();
    // The backend enforces sequential payment via `nextDuePeriod`. Exposing
    // an editable input would let the user pay Junio while Mayo is still
    // pending, contradicting the "Período: Mayo 2026" pill above. The only
    // way to advance the period is to pay or skip the current one (via the
    // service card's "Saltar" button).
    expect(screen.queryByLabelText(/período a pagar/i)).not.toBeInTheDocument();
  });

  it('pre-fills amount with service.estimatedAmount', () => {
    renderForm();
    expect(screen.getByLabelText(/monto/i)).toHaveValue(35);
  });

  it('does NOT pre-fill the details field with the service name (would be redundant)', () => {
    renderForm();
    // The "Detalles" field is OPTIONAL notes on top of the service name —
    // pre-filling with `service.name` would mirror the obvious back to the
    // user (e.g. "Sedapal" inside the form for a Sedapal payment).
    expect(screen.getByLabelText(/detalles/i)).toHaveValue('');
  });

  it('constrains the DatePicker to the period being paid (min = first day, max = last day)', () => {
    renderForm();
    // baseService.nextDuePeriod = '2026-06'. June has 30 days.
    const calls = datePickerProps.mock.calls;
    const lastProps = calls[calls.length - 1]?.[0];
    expect(lastProps).toBeDefined();
    expect(lastProps?.min).toBe('2026-06-01');
    expect(lastProps?.max).toBe('2026-06-30');
  });

  it('submits with period = service.nextDuePeriod, regardless of any form-state shenanigans', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(mockCreateMutate).toHaveBeenCalledOnce();
    const callArg = mockCreateMutate.mock.calls[0][0] as {
      monthlyServiceId: string;
      period: string;
      amount: number;
      date: string;
      description: string | null;
    };
    expect(callArg.monthlyServiceId).toBe(baseService.id);
    // Period comes off the service directly — NOT from form state.
    expect(callArg.period).toBe(baseService.nextDuePeriod);
    expect(callArg.amount).toBe(35);
    // Details/description is NULL when the user didn't type anything (the
    // empty input gets normalized to null before submit).
    expect(callArg.description).toBeNull();
    // dateInputToBackendIso pins the picker value to noon UTC.
    expect(callArg.date).toMatch(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/);
  });

  it('surfaces a mapped error toast when the create mutation rejects (MSP_010 split exceeds total)', async () => {
    mockCreateMutate.mockImplementation((_data, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Split exceeds total', 'MSP_010'));
    });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /la suma de los montos de los participantes supera el monto total del pago/i,
      ),
    );
  });

  it('falls back to the generic error toast for an unmapped error code', async () => {
    mockCreateMutate.mockImplementation((_data, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Boom', 'SOME_UNKNOWN_CODE'));
    });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(toast.error).toHaveBeenCalledOnce();
  });
});

const ana: MonthlyServiceParticipant = {
  id: 'p-ana',
  monthlyServiceId: baseService.id,
  userId: 'user-1',
  reference: 'Ana',
  defaultAmount: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const luis: MonthlyServiceParticipant = {
  id: 'p-luis',
  monthlyServiceId: baseService.id,
  userId: 'user-1',
  reference: 'Luis',
  defaultAmount: 8,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PayMonthlyServiceForm — shared service with participants', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockParticipants = [ana, luis];
  });

  it('renders one row per configured participant with the amount prefilled from defaultAmount', () => {
    renderForm();
    const anaAmountInput = screen.getByLabelText(/ana/i);
    const luisAmountInput = screen.getByLabelText(/luis/i);
    expect(anaAmountInput).toHaveValue(10);
    expect(luisAmountInput).toHaveValue(8);
  });

  it('lets the user edit a participant amount for this payment only', async () => {
    const user = userEvent.setup();
    renderForm();

    const anaAmountInput = screen.getByLabelText(/ana/i);
    await user.clear(anaAmountInput);
    await user.type(anaAmountInput, '15');
    expect(anaAmountInput).toHaveValue(15);
  });

  it('renders an "already paid" checkbox per participant, unchecked by default', () => {
    renderForm();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
  });

  it('submits participants[] with edited amounts and alreadyPaid flags', async () => {
    const user = userEvent.setup();
    renderForm();

    const anaAmountInput = screen.getByLabelText(/ana/i);
    await user.clear(anaAmountInput);
    await user.type(anaAmountInput, '15');

    const anaCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(anaCheckbox);

    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(mockCreateMutate).toHaveBeenCalledOnce();
    const callArg = mockCreateMutate.mock.calls[0][0] as {
      participants: { reference: string; amount: number; alreadyPaid?: boolean }[];
    };
    expect(callArg.participants).toEqual([
      { reference: 'Ana', amount: 15, alreadyPaid: true },
      { reference: 'Luis', amount: 8, alreadyPaid: false },
    ]);
  });

  it('holds the split section in a loading state until participants resolve (no early regular-payment assumption)', () => {
    mockParticipantsLoading = true;
    renderForm();
    // While loading we must NOT render the participant amount inputs (which
    // would imply "not shared"). A loading placeholder stands in instead.
    expect(screen.queryByLabelText(/ana/i)).not.toBeInTheDocument();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('does NOT include participants in the payload when the service has none configured (no regression)', async () => {
    mockParticipants = [];
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(mockCreateMutate).toHaveBeenCalledOnce();
    const callArg = mockCreateMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.participants).toBeUndefined();
  });
});
