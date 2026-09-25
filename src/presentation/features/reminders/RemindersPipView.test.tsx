import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Reminder } from '@/core/domain/entities/reminder';

import { TestProviders } from '@/test/utils';

import { RemindersPipView } from './RemindersPipView';

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'r1',
    title: 'Llamar al dentista',
    notes: null,
    remindDate: null,
    remindTime: null,
    completed: false,
    completedAt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

// Deliberately out of order: the undated one comes first in the payload and has
// to end up last on screen.
const reminders = [
  makeReminder({ id: 'r1', title: 'Sin fecha' }),
  makeReminder({ id: 'r2', title: 'Vencido', remindDate: '2020-01-01' }),
];

const mockUpdate = vi.fn();
vi.mock('@/core/application/hooks/use-reminders', () => ({
  remindersKeys: { all: ['reminders'] },
  useReminders: () => ({ data: reminders, isLoading: false }),
  useUpdateReminder: () => ({ mutate: mockUpdate, isPending: false }),
}));
vi.mock('@/core/application/hooks/use-pip-window-sync', () => ({
  usePipWindowSync: () => undefined,
}));
// `ReminderItem` reads the date format from here; the real hook would go to the
// network for it.
vi.mock('@/core/application/hooks/use-user-settings', () => ({
  userSettingsKeys: { all: ['user-settings'] },
  useDateFormat: () => 'DD/MM/YYYY',
}));
// Tauri is not present in jsdom; these are the window calls the shell makes.
vi.mock('@/lib/pip-window', () => ({
  PIP_CHANGED_EVENT: 'pip:changed',
  closeSelfPip: vi.fn(),
  canUsePip: () => false,
}));

function renderPip() {
  return render(<RemindersPipView />, { wrapper: TestProviders });
}

describe('RemindersPipView', () => {
  it('orders the list the way the page does — overdue first', () => {
    renderPip();

    const titles = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(titles[0]).toContain('Vencido');
    expect(titles[1]).toContain('Sin fecha');
  });

  it('renders no edit or delete control', () => {
    // `onEdit`/`onDelete` are optional as a SET in `ReminderItem`: with neither
    // given the action cluster is not rendered at all. Editing or deleting from
    // a chrome-less always-on-top window is one misclick from destructive.
    renderPip();

    expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^eliminar$/i })).not.toBeInTheDocument();
  });

  it('ticks a reminder off, which is what the window is for', () => {
    renderPip();

    fireEvent.click(screen.getAllByLabelText('Marcar como hecho')[0]);

    expect(mockUpdate).toHaveBeenCalledWith({ id: 'r2', data: { completed: true } });
  });

  it('closes itself from the shell', () => {
    renderPip();

    expect(screen.getByRole('button', { name: /cerrar ventana flotante/i })).toBeInTheDocument();
  });
});
