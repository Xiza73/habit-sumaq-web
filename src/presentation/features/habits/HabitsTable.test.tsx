import { NextIntlClientProvider } from 'next-intl';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import messages from '@/i18n/messages/es.json';

import { HabitsTable } from './HabitsTable';

function makeHabit(overrides: Partial<HabitWithStats> = {}): HabitWithStats {
  return {
    id: 'habit-1',
    userId: 'user-1',
    name: 'Leer',
    description: null,
    frequency: 'DAILY',
    targetCount: 3,
    color: '#22c55e',
    icon: null,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentStreak: 4,
    longestStreak: 10,
    completionRate: 0.8,
    todayLog: null,
    periodCount: 1,
    periodCompleted: false,
    ...overrides,
  };
}

function renderTable(
  habits: HabitWithStats[],
  handlers: Partial<Parameters<typeof HabitsTable>[0]> = {},
) {
  const onCheckIn = vi.fn();
  const onUndo = vi.fn();
  const onEdit = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <HabitsTable
        habits={habits}
        onCheckIn={onCheckIn}
        onUndo={onUndo}
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        {...handlers}
      />
    </NextIntlClientProvider>,
  );
  return { onCheckIn, onUndo, onEdit, onArchive, onDelete };
}

describe('HabitsTable', () => {
  it('renders the localized column headers', () => {
    renderTable([makeHabit()]);
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Frecuencia' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Objetivo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Progreso de hoy' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('renders one row per habit with its name, frequency and progress', () => {
    renderTable([makeHabit({ name: 'Leer', periodCount: 1, targetCount: 3 })]);
    expect(screen.getByText('Leer')).toBeInTheDocument();
    expect(screen.getByText('Diario')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('fires onCheckIn for the habit when its register action is clicked', async () => {
    const user = userEvent.setup();
    const habit = makeHabit();
    const { onCheckIn } = renderTable([habit]);

    await user.click(screen.getByRole('button', { name: /registrar/i }));

    expect(onCheckIn).toHaveBeenCalledWith(habit);
  });

  it('fires onEdit for the habit when its edit action is clicked', async () => {
    const user = userEvent.setup();
    const habit = makeHabit();
    const { onEdit } = renderTable([habit]);

    await user.click(screen.getByRole('button', { name: /editar hábito/i }));

    expect(onEdit).toHaveBeenCalledWith(habit);
  });

  it('disables the register action when the period is already completed', () => {
    renderTable([makeHabit({ periodCompleted: true, periodCount: 3, targetCount: 3 })]);
    expect(screen.getByRole('button', { name: /registrar/i })).toBeDisabled();
  });

  it('links to the habit detail page (same target as the card)', () => {
    renderTable([makeHabit({ id: 'habit-42' })]);
    const link = screen.getByRole('link', { name: /ver hábito/i });
    expect(link).toHaveAttribute('href', '/habits/habit-42');
  });

  it('fires onEdit, onArchive and onDelete with the habit from the row actions', async () => {
    const user = userEvent.setup();
    const habit = makeHabit();
    const { onEdit, onArchive, onDelete } = renderTable([habit]);

    await user.click(screen.getByRole('button', { name: /editar hábito/i }));
    expect(onEdit).toHaveBeenCalledWith(habit);

    await user.click(screen.getByRole('button', { name: /^archivar$/i }));
    expect(onArchive).toHaveBeenCalledWith(habit);

    await user.click(screen.getByRole('button', { name: /eliminar hábito/i }));
    expect(onDelete).toHaveBeenCalledWith(habit);
  });

  it('shows the undo action only when today has at least one log, and fires onUndo', async () => {
    const user = userEvent.setup();
    const habit = makeHabit({
      todayLog: {
        id: 'log-1',
        habitId: 'habit-1',
        date: '2026-01-01',
        count: 2,
        completed: false,
        note: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    const { onUndo } = renderTable([habit]);

    await user.click(screen.getByRole('button', { name: /deshacer registro/i }));
    expect(onUndo).toHaveBeenCalledWith(habit);
  });

  it('hides the undo action when today has no logs', () => {
    renderTable([makeHabit({ todayLog: null, periodCount: 0 })]);
    expect(screen.queryByRole('button', { name: /deshacer registro/i })).not.toBeInTheDocument();
  });

  it('offers unarchive (not archive) for an archived habit', () => {
    renderTable([makeHabit({ isArchived: true })]);
    expect(screen.getByRole('button', { name: /^desarchivar$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar/i })).not.toBeInTheDocument();
  });
});
