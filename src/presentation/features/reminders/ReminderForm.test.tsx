import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Reminder } from '@/core/domain/entities/reminder';

import { TestProviders } from '@/test/utils';

import { ReminderForm } from './ReminderForm';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/core/application/hooks/use-reminders', () => ({
  useCreateReminder: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateReminder: () => ({ mutate: mockUpdate, isPending: false }),
}));

function make(over: Partial<Reminder> = {}): Reminder {
  return {
    id: 'rem-1',
    title: 'Llamar al dentista',
    notes: null,
    remindDate: '2026-05-20',
    remindTime: '15:00',
    completed: false,
    completedAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

function renderForm(reminder: Reminder | null = null) {
  const onClose = vi.fn();
  render(<ReminderForm open reminder={reminder} onClose={onClose} />, { wrapper: TestProviders });
  return { onClose };
}

describe('ReminderForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('disables the time control until a date is picked', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /hora/i })).toBeDisabled();
  });

  it('enables the time control once the reminder has a date', () => {
    renderForm(make());
    expect(screen.getByRole('button', { name: /hora/i })).not.toBeDisabled();
  });

  it('shows the existing time when editing', () => {
    renderForm(make());
    expect(screen.getByRole('button', { name: /hora/i })).toHaveTextContent('15:00');
  });

  it('CLEARS the visible time when the date is cleared', async () => {
    // The reported bug. The submit mapping already dropped the orphaned time,
    // but the control kept displaying it — the form said one thing and saved
    // another, which is worse than either.
    const user = userEvent.setup();
    renderForm(make());

    const time = screen.getByRole('button', { name: /hora/i });
    expect(time).toHaveTextContent('15:00');

    // The DatePicker's own clear button.
    await user.click(screen.getAllByRole('button', { name: /limpiar/i })[0]);

    expect(screen.getByRole('button', { name: /hora/i })).not.toHaveTextContent('15:00');
    expect(screen.getByRole('button', { name: /hora/i })).toBeDisabled();
  });

  it('sends both as null when the date is cleared and saved', async () => {
    const user = userEvent.setup();
    renderForm(make());

    await user.click(screen.getAllByRole('button', { name: /limpiar/i })[0]);
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rem-1',
        data: expect.objectContaining({ remindDate: null, remindTime: null }),
      }),
      expect.anything(),
    );
  });

  it('creates an undated reminder with both fields null', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/qué hay que recordar/i), 'Comprar pilas');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Comprar pilas', remindDate: null, remindTime: null }),
      expect.anything(),
    );
  });
});
