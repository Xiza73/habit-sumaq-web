import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Habit } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitForm } from './HabitForm';

vi.mock('@/core/application/hooks/use-habits', () => ({
  useCreateHabit: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateHabit: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

const mockHabit: Habit = {
  id: '1',
  userId: 'user-1',
  name: 'Meditar',
  description: '10 minutos de meditación',
  frequency: 'DAILY',
  targetCount: 1,
  color: '#9C27B0',
  icon: 'brain',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderForm(
  overrides: { open?: boolean; habit?: Habit | null; onClose?: () => void } = {},
) {
  const props = {
    open: true,
    habit: null as Habit | null,
    onClose: vi.fn(),
    ...overrides,
  };
  const result = render(<HabitForm {...props} />, { wrapper: TestProviders });
  return { ...result, ...props };
}

describe('HabitForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
  });

  it('does not render when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders create form when no habit provided', () => {
    renderForm();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows name input', () => {
    renderForm();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  });

  it('shows description input', () => {
    renderForm();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
  });

  it('shows frequency select', () => {
    renderForm();
    expect(screen.getByLabelText(/frecuencia/i)).toBeInTheDocument();
  });

  it('shows target count input', () => {
    renderForm();
    expect(screen.getByLabelText(/cantidad objetivo/i)).toBeInTheDocument();
  });

  it('shows cancel and submit buttons', () => {
    renderForm();
    expect(screen.getByText(/cancelar/i)).toBeInTheDocument();
    expect(screen.getByText(/crear/i)).toBeInTheDocument();
  });

  it('shows save button in edit mode', () => {
    renderForm({ habit: mockHabit });
    expect(screen.getByText(/guardar/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm();
    await user.click(screen.getByText(/cancelar/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('populates form fields when editing', () => {
    renderForm({ habit: mockHabit });
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Meditar');
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('10 minutos de meditación');
  });

  it('calls create mutation on valid submit', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/nombre/i), 'Nuevo hábito');
    await user.click(screen.getByText(/crear/i));

    expect(mockCreateMutate).toHaveBeenCalled();
  });

  it('calls update mutation when editing', async () => {
    const user = userEvent.setup();
    renderForm({ habit: mockHabit });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), 'Meditar actualizado');
    await user.click(screen.getByText(/guardar/i));

    expect(mockUpdateMutate).toHaveBeenCalled();
  });
});
