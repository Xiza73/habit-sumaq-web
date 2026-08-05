import { NextIntlClientProvider } from 'next-intl';

import { TooltipProvider } from '@radix-ui/react-tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chore } from '@/core/domain/entities/chore';

import messages from '@/i18n/messages/es.json';

import { ChoresTable } from './ChoresTable';

const FIXED_TODAY = new Date('2026-04-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: FIXED_TODAY });
});

afterEach(() => {
  vi.useRealTimers();
});

vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useDateFormat: () => 'DD/MM/YYYY',
}));

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: 'chore-1',
    userId: 'user-1',
    name: 'Cortar el pelo',
    notes: null,
    category: 'Personal',
    intervalValue: 6,
    intervalUnit: 'weeks',
    startDate: '2026-01-01',
    lastDoneDate: '2026-03-01',
    nextDueDate: '2026-04-18',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOverdue: false,
    ...overrides,
  };
}

function renderTable(chores: Chore[], handlers: Partial<Parameters<typeof ChoresTable>[0]> = {}) {
  const onMarkDone = vi.fn();
  const onSkip = vi.fn();
  const onViewHistory = vi.fn();
  const onEdit = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TooltipProvider>
        <ChoresTable
          chores={chores}
          onMarkDone={onMarkDone}
          onSkip={onSkip}
          onViewHistory={onViewHistory}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          {...handlers}
        />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
  return { onMarkDone, onSkip, onViewHistory, onEdit, onArchive, onDelete };
}

describe('ChoresTable', () => {
  it('renders the localized column headers', () => {
    renderTable([makeChore()]);
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Categoría' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cadencia' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Próx. fecha' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Última vez' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('renders one row per chore with its name and cadence', () => {
    renderTable([makeChore({ name: 'Cortar el pelo' })]);
    expect(screen.getByText('Cortar el pelo')).toBeInTheDocument();
    expect(screen.getByText(/Cada 6 semanas/i)).toBeInTheDocument();
  });

  it('fires onMarkDone for the chore when its done action is clicked', async () => {
    const user = userEvent.setup();
    const chore = makeChore();
    const { onMarkDone } = renderTable([chore]);

    await user.click(screen.getByRole('button', { name: /^Hecho$/i }));

    expect(onMarkDone).toHaveBeenCalledWith(chore);
  });

  it('fires onSkip, onViewHistory, onEdit and onArchive from the row actions', async () => {
    const user = userEvent.setup();
    const chore = makeChore();
    const { onSkip, onViewHistory, onEdit, onArchive } = renderTable([chore]);

    await user.click(screen.getByRole('button', { name: /^Saltear$/i }));
    expect(onSkip).toHaveBeenCalledWith(chore);

    await user.click(screen.getByRole('button', { name: /ver historial/i }));
    expect(onViewHistory).toHaveBeenCalledWith(chore);

    await user.click(screen.getByRole('button', { name: /^Editar$/i }));
    expect(onEdit).toHaveBeenCalledWith(chore);

    await user.click(screen.getByRole('button', { name: /^Archivar$/i }));
    expect(onArchive).toHaveBeenCalledWith(chore);
  });

  it('fires onDelete with the chore from the row delete action', async () => {
    const user = userEvent.setup();
    const chore = makeChore();
    const { onDelete } = renderTable([chore]);

    await user.click(screen.getByRole('button', { name: /eliminar permanentemente/i }));
    expect(onDelete).toHaveBeenCalledWith(chore);
  });

  it('collapses the row actions into a dropdown that fires the right handlers', async () => {
    const user = userEvent.setup();
    const chore = makeChore();
    const { onMarkDone, onDelete } = renderTable([chore]);

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: /^Hecho$/i }));
    expect(onMarkDone).toHaveBeenCalledWith(chore);

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: /eliminar permanentemente/i }));
    expect(onDelete).toHaveBeenCalledWith(chore);
  });
});
