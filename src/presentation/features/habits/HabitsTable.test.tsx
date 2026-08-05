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
  const onEdit = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <HabitsTable habits={habits} onCheckIn={onCheckIn} onEdit={onEdit} {...handlers} />
    </NextIntlClientProvider>,
  );
  return { onCheckIn, onEdit };
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
});
