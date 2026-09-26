import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type QuickTask } from '@/core/domain/entities/quick-task';

import { TestProviders } from '@/test/utils';

import { QuickTasksPipView } from './QuickTasksPipView';

function makeTask(overrides: Partial<QuickTask>): QuickTask {
  return {
    id: 'q1',
    title: 'Pagar la luz',
    description: null,
    completed: false,
    completedAt: null,
    position: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

const tasks = [
  makeTask({ id: 'q1', title: 'Pagar la luz' }),
  makeTask({ id: 'q2', title: 'Sacar turno', completed: true, completedAt: '2026-01-02' }),
];

const mockUpdate = vi.fn();
const mockDelete = vi.fn();
// `vi.mock` replaces the module WHOLE, so every export the render path touches
// has to be here — `QuickTaskItem` reaches for the two mutations itself.
vi.mock('@/core/application/hooks/use-quick-tasks', () => ({
  quickTasksKeys: { all: ['quick-tasks'] },
  useQuickTasks: () => ({ data: tasks, isLoading: false }),
  useUpdateQuickTask: () => ({ mutate: mockUpdate, isPending: false }),
  useDeleteQuickTask: () => ({ mutate: mockDelete, isPending: false }),
}));
vi.mock('@/core/application/hooks/use-pip-window-sync', () => ({
  usePipWindowSync: () => undefined,
}));
// Tauri is not present in jsdom; these are the window calls the shell makes.
vi.mock('@/lib/pip-window', () => ({
  PIP_CHANGED_EVENT: 'pip:changed',
  closeSelfPip: vi.fn(),
  canUsePip: () => false,
}));

function renderPip() {
  return render(<QuickTasksPipView />, { wrapper: TestProviders });
}

describe('QuickTasksPipView', () => {
  it('shows the whole list, pending and completed alike', () => {
    renderPip();

    expect(screen.getByText('Pagar la luz')).toBeInTheDocument();
    expect(screen.getByText('Sacar turno')).toBeInTheDocument();
  });

  it('renders no edit or delete control', () => {
    // The point of `hideAdminActions`. Delete lives INSIDE `QuickTaskItem`
    // with its own mutation, so withholding a handler does not reach it — and
    // a destructive button in a chrome-less always-on-top window is one
    // misclick from gone.
    renderPip();

    expect(screen.queryByRole('button', { name: /editar tarea/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar tarea/i })).not.toBeInTheDocument();
  });

  it('ticks a priority off, which is what the window is for', () => {
    renderPip();

    fireEvent.click(screen.getByLabelText('Marcar como completada'));

    expect(mockUpdate).toHaveBeenCalledWith({ id: 'q1', data: { completed: true } });
  });

  it('cycles the dim levels and wraps around', () => {
    // Tauri has no window-opacity API, so this is CSS alpha over a window
    // created transparent. Covers `PipShell` for the three popups using it.
    const { container } = renderPip();
    const root = container.firstElementChild as HTMLElement;
    const button = screen.getByRole('button', { name: /opacidad/i });

    expect(root.style.opacity).toBe('1');
    fireEvent.click(button);
    expect(root.style.opacity).toBe('0.7');
    fireEvent.click(button);
    expect(root.style.opacity).toBe('0.4');
    fireEvent.click(button);
    expect(root.style.opacity).toBe('1');
  });

  it('keeps the chosen level with the pointer on it', () => {
    // It used to snap back to solid on hover, which made the button read as
    // dead: the pointer is on the window exactly when you click it, so the
    // level changed and nothing moved.
    const { container } = renderPip();
    const root = container.firstElementChild as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: /opacidad/i }));
    expect(root.style.opacity).toBe('0.7');

    fireEvent.mouseEnter(root);
    expect(root.style.opacity).toBe('0.7');
  });
});
