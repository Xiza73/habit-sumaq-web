import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type QuickTask } from '@/core/domain/entities/quick-task';

import { TestProviders } from '@/test/utils';

import { QuickTaskForm } from './QuickTaskForm';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-quick-tasks', () => ({
  useCreateQuickTask: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateQuickTask: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const mockTask: QuickTask = {
  id: 'tk-1',
  title: 'Comprar leche',
  description: 'Fresca del mercado',
  completed: false,
  completedAt: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function renderForm(
  overrides: { open?: boolean; task?: QuickTask | null; onClose?: () => void } = {},
) {
  const props = {
    open: true,
    task: null as QuickTask | null,
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<QuickTaskForm {...props} />, { wrapper: TestProviders }), ...props };
}

describe('QuickTaskForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
  });

  it('does not render when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders create dialog when no task is provided', () => {
    renderForm();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument();
  });

  it('renders edit dialog and pre-fills fields when editing', () => {
    renderForm({ task: mockTask });
    expect(screen.getByLabelText(/título/i)).toHaveValue('Comprar leche');
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('Fresca del mercado');
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm();
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call create when submitting with an empty title', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: /crear/i }));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls create with trimmed title and null description when description is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/título/i), '  Llamar a Juan  ');
    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Llamar a Juan', description: null }),
      expect.any(Object),
    );
  });

  it('calls update when editing an existing task', async () => {
    const user = userEvent.setup();
    renderForm({ task: mockTask });

    await user.clear(screen.getByLabelText(/título/i));
    await user.type(screen.getByLabelText(/título/i), 'Comprar pan');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockTask.id,
        data: expect.objectContaining({ title: 'Comprar pan' }),
      }),
      expect.any(Object),
    );
  });

  it('toggles between edit and preview modes for the description', async () => {
    const user = userEvent.setup();
    renderForm({ task: { ...mockTask, description: 'This is **bold**' } });

    // Initially in edit mode: textarea is visible.
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();

    // Click the preview button — finds by its visible label.
    await user.click(screen.getByRole('button', { name: /vista previa/i }));

    // Textarea goes away; rendered markdown shows up. `<strong>bold</strong>`
    // from `**bold**` confirms the live preview is wired.
    expect(screen.queryByLabelText(/descripción/i)).not.toBeInTheDocument();
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });

  it('shows an empty hint in preview mode when description is blank', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /vista previa/i }));

    expect(screen.getByText(/sin descripción/i)).toBeInTheDocument();
  });
});
