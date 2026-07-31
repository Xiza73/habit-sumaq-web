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

vi.mock('@/core/application/hooks/use-monthly-service-participants', () => ({
  useServiceParticipants: () => ({ data: mockParticipants, isLoading: mockIsLoading }),
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
    mockIsPending = false;
    mockParticipants = [];
    mockIsLoading = false;
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
});
