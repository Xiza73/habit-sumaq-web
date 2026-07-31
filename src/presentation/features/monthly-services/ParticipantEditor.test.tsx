import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';

import { ApiError } from '@/infrastructure/api/api-error';

import { TestProviders } from '@/test/utils';

import { ParticipantEditor } from './ParticipantEditor';

const mockAddMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockRemoveMutate = vi.fn();

let mockParticipants: MonthlyServiceParticipant[] = [];
let mockIsLoading = false;

vi.mock('@/core/application/hooks/use-monthly-service-participants', () => ({
  useServiceParticipants: () => ({ data: mockParticipants, isLoading: mockIsLoading }),
  useAddParticipant: () => ({ mutate: mockAddMutate, isPending: false }),
  useUpdateParticipant: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useRemoveParticipant: () => ({ mutate: mockRemoveMutate, isPending: false }),
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

function renderEditor(props: { knownReferences?: string[] } = {}) {
  return render(
    <ParticipantEditor
      monthlyServiceId={SERVICE_ID}
      knownReferences={props.knownReferences ?? []}
    />,
    { wrapper: TestProviders },
  );
}

describe('ParticipantEditor', () => {
  beforeEach(() => {
    mockAddMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockRemoveMutate.mockClear();
    mockParticipants = [];
    mockIsLoading = false;
  });

  it('renders existing participants with their reference and default amount', () => {
    mockParticipants = [ana];
    renderEditor();

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('adds a new participant via the form', async () => {
    const user = userEvent.setup();
    renderEditor({ knownReferences: ['Luis'] });

    await user.type(screen.getByLabelText(/referencia/i), 'Luis');
    await user.type(screen.getByLabelText(/monto por defecto/i), '80');
    await user.click(screen.getByRole('button', { name: /agregar participante/i }));

    expect(mockAddMutate).toHaveBeenCalledOnce();
    const payload = mockAddMutate.mock.calls[0][0] as { reference: string; defaultAmount: number };
    expect(payload.reference).toBe('Luis');
    expect(payload.defaultAmount).toBe(80);
  });

  it('feeds known references into the reference datalist (soft autocomplete)', () => {
    renderEditor({ knownReferences: ['Ana', 'Luis'] });

    const input = screen.getByLabelText(/referencia/i);
    expect(input).toHaveAttribute('list');
    const listId = input.getAttribute('list');
    const datalist = document.getElementById(listId ?? '');
    expect(datalist).not.toBeNull();
    const options = within(datalist as HTMLElement).getAllByRole('option', { hidden: true });
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['Ana', 'Luis']);
  });

  it('edits an existing participant default amount', async () => {
    mockParticipants = [ana];
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /editar/i }));
    // Two "Monto por defecto" fields exist while editing (the edit row +
    // the always-visible add-row) — the edit row's input carries a
    // participant-scoped id.
    const amountInput = document.getElementById(`participant-amount-${ana.id}`) as HTMLInputElement;
    expect(amountInput).not.toBeNull();
    await user.clear(amountInput);
    await user.type(amountInput, '120');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockUpdateMutate).toHaveBeenCalledOnce();
    const callArg = mockUpdateMutate.mock.calls[0][0] as {
      participantId: string;
      data: { defaultAmount: number };
    };
    expect(callArg.participantId).toBe(ana.id);
    expect(callArg.data.defaultAmount).toBe(120);
  });

  it('removes a participant', async () => {
    mockParticipants = [ana];
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /eliminar/i }));

    expect(mockRemoveMutate).toHaveBeenCalledWith(ana.id, expect.anything());
  });

  it('surfaces a duplicate-reference error from the backend on add', async () => {
    mockAddMutate.mockImplementation((_data, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Duplicate', 'MSP_PARTICIPANT_DUPLICATE_REFERENCE'));
    });
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText(/referencia/i), 'Ana');
    await user.type(screen.getByLabelText(/monto por defecto/i), '50');
    await user.click(screen.getByRole('button', { name: /agregar participante/i }));

    expect(
      await screen.findByText(/ya existe un participante con esa referencia/i),
    ).toBeInTheDocument();
  });

  it('surfaces a sum-exceeds-estimated error from the backend on add', async () => {
    mockAddMutate.mockImplementation((_data, { onError }: { onError: (e: Error) => void }) => {
      onError(new ApiError('Sum exceeds', 'MSP_PARTICIPANT_SUM_EXCEEDS_ESTIMATED'));
    });
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText(/referencia/i), 'Luis');
    await user.type(screen.getByLabelText(/monto por defecto/i), '500');
    await user.click(screen.getByRole('button', { name: /agregar participante/i }));

    expect(
      await screen.findByText(
        /la suma de los montos de los participantes supera el monto estimado/i,
      ),
    ).toBeInTheDocument();
  });
});
