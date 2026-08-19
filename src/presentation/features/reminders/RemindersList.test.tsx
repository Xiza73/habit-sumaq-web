import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Reminder } from '@/core/domain/entities/reminder';

import { TestProviders } from '@/test/utils';

import { RemindersList } from './RemindersList';

const mockUpdate = vi.fn();
const mockDelete = vi.fn();
let mockReminders: Reminder[] = [];

vi.mock('@/core/application/hooks/use-reminders', () => ({
  useReminders: () => ({ data: mockReminders, isLoading: false }),
  useCreateReminder: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateReminder: () => ({ mutate: mockUpdate, isPending: false }),
  useDeleteReminder: () => ({ mutate: mockDelete, isPending: false }),
}));

function make(over: Partial<Reminder> & { id: string }): Reminder {
  return {
    title: 'Llamar al dentista',
    notes: null,
    remindDate: null,
    remindTime: null,
    completed: false,
    completedAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

describe('RemindersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-19T12:00:00'));
    mockReminders = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the empty state when there is nothing', () => {
    render(<RemindersList />, { wrapper: TestProviders });
    expect(screen.getByText(/No tenés recordatorios/i)).toBeInTheDocument();
  });

  it('labels an undated reminder as such rather than as overdue', () => {
    // A note with no date is not late — it is unscheduled.
    mockReminders = [make({ id: '1' })];
    render(<RemindersList />, { wrapper: TestProviders });

    expect(screen.getByText('Sin fecha')).toBeInTheDocument();
    expect(screen.queryByText('Atrasado')).not.toBeInTheDocument();
  });

  it('labels each dated reminder by its own status', () => {
    mockReminders = [
      make({ id: '1', title: 'Vieja', remindDate: '2026-05-10' }),
      make({ id: '2', title: 'De hoy', remindDate: '2026-05-19' }),
      make({ id: '3', title: 'Futura', remindDate: '2026-06-01' }),
    ];
    render(<RemindersList />, { wrapper: TestProviders });

    expect(screen.getByText('Atrasado')).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Próximo')).toBeInTheDocument();
  });

  it('orders by urgency, oldest overdue first and undated last', () => {
    mockReminders = [
      make({ id: '1', title: 'Sin fecha' }),
      make({ id: '2', title: 'Futura', remindDate: '2026-06-01' }),
      make({ id: '3', title: 'Atrasada reciente', remindDate: '2026-05-18' }),
      make({ id: '4', title: 'Atrasada vieja', remindDate: '2026-05-01' }),
      make({ id: '5', title: 'De hoy', remindDate: '2026-05-19' }),
    ];
    render(<RemindersList />, { wrapper: TestProviders });

    const titles = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(titles[0]).toContain('Atrasada vieja');
    expect(titles[1]).toContain('Atrasada reciente');
    expect(titles[2]).toContain('De hoy');
    expect(titles[3]).toContain('Futura');
    expect(titles[4]).toContain('Sin fecha');
  });

  it('renders the hour next to the date when there is one', () => {
    mockReminders = [make({ id: '1', remindDate: '2026-05-19', remindTime: '15:00' })];
    render(<RemindersList />, { wrapper: TestProviders });

    expect(screen.getByText(/15:00/)).toBeInTheDocument();
  });

  it('toggles completion through the checkbox', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockReminders = [make({ id: 'rem-1', remindDate: '2026-05-19' })];
    render(<RemindersList />, { wrapper: TestProviders });

    await user.click(screen.getByRole('checkbox'));

    expect(mockUpdate).toHaveBeenCalledWith({ id: 'rem-1', data: { completed: true } });
  });

  it('sinks completed reminders to the bottom whatever their date', () => {
    mockReminders = [
      make({ id: '1', title: 'Hecha pero vieja', remindDate: '2026-05-01', completed: true }),
      make({ id: '2', title: 'Pendiente futura', remindDate: '2026-12-01' }),
    ];
    render(<RemindersList />, { wrapper: TestProviders });

    const titles = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(titles[0]).toContain('Pendiente futura');
    expect(titles[1]).toContain('Hecha pero vieja');
  });
});
