import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chore } from '@/core/domain/entities/chore';
import { type ChoreLog } from '@/core/domain/entities/chore-log';

import { ApiError } from '@/infrastructure/api/api-error';

import { TestProviders } from '@/test/utils';

import { ChoreLogsHistoryDialog } from './ChoreLogsHistoryDialog';

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}));

interface MockLogsResult {
  data: { data: ChoreLog[]; meta: { total: number } } | undefined;
  isLoading: boolean;
  isFetching: boolean;
}

const mockUseChoreLogs = vi.fn<() => MockLogsResult>();
const mockRevertMutate = vi.fn();

vi.mock('@/core/application/hooks/use-chores', () => ({
  useChoreLogs: (): MockLogsResult => mockUseChoreLogs(),
  useRevertLastChoreDone: () => ({ mutate: mockRevertMutate, isPending: false }),
}));

const chore: Chore = {
  id: 'chore-42',
  userId: 'user-1',
  name: 'Cortar el pelo',
  notes: null,
  category: null,
  intervalValue: 6,
  intervalUnit: 'weeks',
  startDate: '2026-01-01',
  lastDoneDate: '2026-03-01',
  nextDueDate: '2026-04-12',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  isOverdue: false,
};

function makeLog(overrides: Partial<ChoreLog> = {}): ChoreLog {
  return {
    id: 'log-1',
    choreId: chore.id,
    doneAt: '2026-03-01',
    note: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function withLogs(logs: ChoreLog[]) {
  mockUseChoreLogs.mockReturnValue({
    data: { data: logs, meta: { total: logs.length } },
    isLoading: false,
    isFetching: false,
  });
}

function renderDialog() {
  return render(<ChoreLogsHistoryDialog open chore={chore} onClose={vi.fn()} />, {
    wrapper: TestProviders,
  });
}

describe('ChoreLogsHistoryDialog — revert last done', () => {
  beforeEach(() => {
    mockUseChoreLogs.mockReset();
    mockRevertMutate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('shows the "Revertir último" button when there is at least one log', () => {
    withLogs([makeLog()]);
    renderDialog();
    expect(screen.getByRole('button', { name: /revertir último/i })).toBeInTheDocument();
  });

  it('does not show the button when there are no logs', () => {
    withLogs([]);
    renderDialog();
    expect(screen.queryByRole('button', { name: /revertir último/i })).not.toBeInTheDocument();
  });

  it('reverts the last completion for the current chore id on click', async () => {
    withLogs([makeLog()]);
    renderDialog();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revertir último/i }));

    expect(mockRevertMutate).toHaveBeenCalledTimes(1);
    expect(mockRevertMutate.mock.calls[0][0]).toBe('chore-42');
  });

  it('shows a success toast when the revert succeeds', async () => {
    withLogs([makeLog()]);
    mockRevertMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });
    renderDialog();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revertir último/i }));

    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('surfaces the localized CHRE_003 error when there is nothing to revert', async () => {
    withLogs([makeLog()]);
    mockRevertMutate.mockImplementation(
      (_id: string, opts: { onError: (error: unknown) => void }) => {
        opts.onError(new ApiError('no logs', 'CHRE_003'));
      },
    );
    renderDialog();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revertir último/i }));

    expect(toastError).toHaveBeenCalledWith('No hay eventos para revertir.');
  });
});
