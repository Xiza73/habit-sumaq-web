import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import { type MonthlyServiceParticipantRowInput } from '@/core/domain/schemas/monthly-service-participant.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { TestProviders } from '@/test/utils';

import { ParticipantEditor } from './ParticipantEditor';

const mockReplaceMutate = vi.fn();
let mockIsPending = false;

let mockParticipants: MonthlyServiceParticipant[] = [];
let mockIsLoading = false;
// `dataUpdatedAt` drives the edit-mode reseed: the editor re-seeds its local
// rows whenever this value changes (initial load + every post-save refetch).
let mockDataUpdatedAt = 1;

vi.mock('@/core/application/hooks/use-monthly-service-participants', () => ({
  useServiceParticipants: () => ({
    data: mockParticipants,
    isLoading: mockIsLoading,
    dataUpdatedAt: mockDataUpdatedAt,
  }),
  useReplaceParticipants: () => ({ mutate: mockReplaceMutate, isPending: mockIsPending }),
}));

const SERVICE_ID = '11111111-1111-4111-a111-111111111111';

const ana: MonthlyServiceParticipant = {
  id: 'p-1',
  monthlyServiceId: SERVICE_ID,
  userId: 'user-1',
  reference: 'Ana',
  defaultAmount: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const luis: MonthlyServiceParticipant = {
  id: 'p-2',
  monthlyServiceId: SERVICE_ID,
  userId: 'user-1',
  reference: 'Luis',
  defaultAmount: 50,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderEditModeEditor(
  props: { knownReferences?: string[]; currency?: 'PEN' | 'USD' | 'EUR' } = {},
) {
  return render(
    <ParticipantEditor
      mode="edit"
      monthlyServiceId={SERVICE_ID}
      currency={props.currency ?? 'PEN'}
      knownReferences={props.knownReferences ?? []}
    />,
    { wrapper: TestProviders },
  );
}

function renderCreateModeEditor(
  props: {
    knownReferences?: string[];
    currency?: 'PEN' | 'USD' | 'EUR';
    rows?: MonthlyServiceParticipantRowInput[];
    onRowsChange?: (rows: MonthlyServiceParticipantRowInput[]) => void;
  } = {},
) {
  const onRowsChange = props.onRowsChange ?? vi.fn();
  const utils = render(
    <ParticipantEditor
      mode="create"
      currency={props.currency ?? 'PEN'}
      knownReferences={props.knownReferences ?? []}
      rows={props.rows ?? []}
      onRowsChange={onRowsChange}
    />,
    { wrapper: TestProviders },
  );
  return { ...utils, onRowsChange };
}

describe('ParticipantEditor — edit mode', () => {
  beforeEach(() => {
    mockReplaceMutate.mockClear();
    mockReplaceMutate.mockReset();
    mockIsPending = false;
    mockParticipants = [];
    mockIsLoading = false;
    mockDataUpdatedAt = 1;
  });

  it('shows a loading state while participants are loading', () => {
    mockIsLoading = true;
    renderEditModeEditor();

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('seeds rows from the existing configured participants', () => {
    mockParticipants = [ana, luis];
    renderEditModeEditor();

    // Scoped to the combobox role (the reference input has a `list` attr,
    // which promotes its implicit ARIA role to combobox) — plain
    // `getAllByLabelText(/referencia/i)` would also match each row's
    // "Quitar fila de {reference}" remove button, since RTL's label
    // matching includes `aria-label`.
    expect(screen.getAllByRole('combobox', { name: /^referencia$/i })).toHaveLength(2);
    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Luis')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('shows the empty state (zero rows) when there are no configured participants', () => {
    mockParticipants = [];
    renderEditModeEditor();

    expect(screen.getByText(/sin participantes configurados/i)).toBeInTheDocument();
  });

  it('adds a new empty row locally without calling the API', async () => {
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /agregar fila/i }));

    expect(screen.getAllByRole('combobox', { name: /^referencia$/i })).toHaveLength(1);
    expect(mockReplaceMutate).not.toHaveBeenCalled();
  });

  it('removes a row locally without calling the API', async () => {
    mockParticipants = [ana, luis];
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /quitar fila de ana/i }));

    expect(screen.getAllByRole('combobox', { name: /^referencia$/i })).toHaveLength(1);
    expect(screen.queryByDisplayValue('Ana')).not.toBeInTheDocument();
    expect(mockReplaceMutate).not.toHaveBeenCalled();
  });

  it('feeds known references into each row reference datalist', () => {
    mockParticipants = [ana];
    renderEditModeEditor({ knownReferences: ['Ana', 'Luis'] });

    const input = screen.getByLabelText(/referencia/i);
    expect(input).toHaveAttribute('list');
    const listId = input.getAttribute('list');
    const datalist = document.getElementById(listId ?? '');
    expect(datalist).not.toBeNull();
    const options = within(datalist as HTMLElement).getAllByRole('option', { hidden: true });
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['Ana', 'Luis']);
  });

  it('has its own Save button that submits all current rows via the batch replace mutation', async () => {
    mockParticipants = [ana, luis];
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    expect(mockReplaceMutate).toHaveBeenCalledOnce();
    const payload = mockReplaceMutate.mock.calls[0][0] as MonthlyServiceParticipantRowInput[];
    expect(payload).toEqual([
      { reference: 'Ana', defaultAmount: 100 },
      { reference: 'Luis', defaultAmount: 50 },
    ]);
  });

  it('submits an empty list when all rows were removed (clears configured participants)', async () => {
    mockParticipants = [ana];
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /quitar fila de ana/i }));
    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    expect(mockReplaceMutate).toHaveBeenCalledOnce();
    const payload = mockReplaceMutate.mock.calls[0][0] as MonthlyServiceParticipantRowInput[];
    expect(payload).toEqual([]);
  });

  it('excludes a newly-added row from the payload when it is removed before saving', async () => {
    mockParticipants = [ana];
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /agregar fila/i }));
    // Two rows now: Ana (seeded) + the new empty row.
    const removeButtons = screen.getAllByRole('button', { name: /quitar fila/i });
    await user.click(removeButtons[removeButtons.length - 1]);
    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    const payload = mockReplaceMutate.mock.calls[0][0] as MonthlyServiceParticipantRowInput[];
    expect(payload).toEqual([{ reference: 'Ana', defaultAmount: 100 }]);
  });

  it('surfaces a duplicate-reference error from the backend on save', async () => {
    mockParticipants = [ana];
    mockReplaceMutate.mockImplementation((_rows, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Duplicate', 'MSP_PARTICIPANT_DUPLICATE_REFERENCE'));
    });
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    expect(
      await screen.findByText(/ya existe un participante con esa referencia/i),
    ).toBeInTheDocument();
  });

  it('surfaces a sum-exceeds-estimated error from the backend on save', async () => {
    mockParticipants = [ana];
    mockReplaceMutate.mockImplementation((_rows, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Sum exceeds', 'MSP_PARTICIPANT_SUM_EXCEEDS_ESTIMATED'));
    });
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    expect(
      await screen.findByText(
        /la suma de los montos de los participantes supera el monto estimado/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders existing amounts formatted as currency (display-only) before editing', () => {
    mockParticipants = [ana];
    renderEditModeEditor({ currency: 'PEN' });

    // The row's amount input carries the raw editable number...
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    // ...while the currency-formatted rendering appears as read-only display text.
    expect(screen.getByText(/S\/\s*100/)).toBeInTheDocument();
  });

  it('blocks Save and shows an inline error when a row has an empty reference', async () => {
    mockParticipants = [ana];
    const user = userEvent.setup();
    renderEditModeEditor();

    const references = screen.getAllByRole('combobox', { name: /^referencia$/i });
    await user.clear(references[0]);

    const saveButton = screen.getByRole('button', { name: /guardar participantes/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/la referencia es obligatoria/i)).toBeInTheDocument();
    expect(mockReplaceMutate).not.toHaveBeenCalled();
  });

  it('blocks Save and shows an inline error when a row amount is zero / empty', async () => {
    mockParticipants = [ana];
    const user = userEvent.setup();
    renderEditModeEditor();

    const amount = screen.getByDisplayValue('100');
    await user.clear(amount);

    const saveButton = screen.getByRole('button', { name: /guardar participantes/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/el monto debe ser mayor a 0/i)).toBeInTheDocument();
    expect(mockReplaceMutate).not.toHaveBeenCalled();
  });

  it('still saves a valid list (no inline errors) via the batch replace mutation', async () => {
    mockParticipants = [ana, luis];
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    expect(mockReplaceMutate).toHaveBeenCalledOnce();
    expect(screen.queryByText(/la referencia es obligatoria/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/el monto debe ser mayor a 0/i)).not.toBeInTheDocument();
  });

  it('surfaces an amount-not-positive error from the backend on save', async () => {
    mockParticipants = [ana];
    mockReplaceMutate.mockImplementation((_rows, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Not positive', 'MSP_PARTICIPANT_AMOUNT_NOT_POSITIVE'));
    });
    const user = userEvent.setup();
    renderEditModeEditor();

    await user.click(screen.getByRole('button', { name: /guardar participantes/i }));

    expect(await screen.findByText(/el monto por defecto debe ser mayor a 0/i)).toBeInTheDocument();
  });

  it('re-seeds rows from fresh server data after a save refetch (dataUpdatedAt changes)', () => {
    mockParticipants = [ana];
    const { rerender } = renderEditModeEditor();

    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Luis')).not.toBeInTheDocument();

    // Simulate a post-save refetch: the query returns a new list AND a new
    // `dataUpdatedAt`, which must trigger a re-seed of the local rows.
    mockParticipants = [ana, luis];
    mockDataUpdatedAt = 2;
    rerender(
      <ParticipantEditor
        mode="edit"
        monthlyServiceId={SERVICE_ID}
        currency="PEN"
        knownReferences={[]}
      />,
    );

    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Luis')).toBeInTheDocument();
  });
});

describe('ParticipantEditor — create mode', () => {
  beforeEach(() => {
    mockReplaceMutate.mockClear();
  });

  it('does not render its own Save button (the parent form persists atomically)', () => {
    renderCreateModeEditor();

    expect(
      screen.queryByRole('button', { name: /guardar participantes/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/se guardan junto con el servicio/i)).toBeInTheDocument();
  });

  it('starts empty when no rows are provided', () => {
    renderCreateModeEditor();
    expect(screen.queryByLabelText(/referencia/i)).not.toBeInTheDocument();
  });

  it('adds a row locally and reports it to the parent via onRowsChange', async () => {
    const user = userEvent.setup();
    const { onRowsChange } = renderCreateModeEditor();

    await user.click(screen.getByRole('button', { name: /agregar fila/i }));

    expect(onRowsChange).toHaveBeenLastCalledWith([{ reference: '', defaultAmount: 0 }]);
  });

  it('is controlled: renders whatever rows the parent passes in', () => {
    renderCreateModeEditor({
      rows: [
        { reference: 'Ana', defaultAmount: 20 },
        { reference: 'Luis', defaultAmount: 15 },
      ],
    });

    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Luis')).toBeInTheDocument();
  });

  it('reports edits to an existing row via onRowsChange', async () => {
    const user = userEvent.setup();
    const { onRowsChange } = renderCreateModeEditor({
      rows: [{ reference: 'Ana', defaultAmount: 20 }],
    });

    await user.type(screen.getByLabelText(/referencia/i), 'x');

    expect(onRowsChange).toHaveBeenLastCalledWith([{ reference: 'Anax', defaultAmount: 20 }]);
  });

  it('reports row removal via onRowsChange', async () => {
    const user = userEvent.setup();
    const { onRowsChange } = renderCreateModeEditor({
      rows: [
        { reference: 'Ana', defaultAmount: 20 },
        { reference: 'Luis', defaultAmount: 15 },
      ],
    });

    await user.click(screen.getByRole('button', { name: /quitar fila de ana/i }));

    expect(onRowsChange).toHaveBeenLastCalledWith([{ reference: 'Luis', defaultAmount: 15 }]);
  });

  it('shows an inline error for a row with an empty reference', () => {
    renderCreateModeEditor({ rows: [{ reference: '', defaultAmount: 20 }] });
    expect(screen.getByText(/la referencia es obligatoria/i)).toBeInTheDocument();
  });

  it('shows an inline error for a row with a non-positive amount', () => {
    renderCreateModeEditor({ rows: [{ reference: 'Ana', defaultAmount: 0 }] });
    expect(screen.getByText(/el monto debe ser mayor a 0/i)).toBeInTheDocument();
  });

  it('shows no inline errors for a valid row', () => {
    renderCreateModeEditor({ rows: [{ reference: 'Ana', defaultAmount: 20 }] });
    expect(screen.queryByText(/la referencia es obligatoria/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/el monto debe ser mayor a 0/i)).not.toBeInTheDocument();
  });
});
