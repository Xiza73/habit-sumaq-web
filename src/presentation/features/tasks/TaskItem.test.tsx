import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Task } from '@/core/domain/entities/task';

import { TestProviders } from '@/test/utils';

import { TaskItem } from './TaskItem';

const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/core/application/hooks/use-tasks', () => ({
  useUpdateTask: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteTask: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

const baseTask: Task = {
  id: 'tk-1',
  userId: 'user-1',
  sectionId: 'sec-1',
  title: 'Llamar al banco',
  description: null,
  completed: false,
  completedAt: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function renderItem(
  overrides: { task?: Partial<Task>; sortable?: boolean; onEdit?: () => void } = {},
) {
  const task: Task = { ...baseTask, ...overrides.task };
  const onEdit = overrides.onEdit ?? vi.fn();

  return {
    ...render(
      <DndContext>
        <SortableContext items={[task.id]} strategy={verticalListSortingStrategy}>
          <TaskItem task={task} sortable={overrides.sortable} onEdit={onEdit} />
        </SortableContext>
      </DndContext>,
      { wrapper: TestProviders },
    ),
    task,
    onEdit,
  };
}

describe('TaskItem', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
    mockDeleteMutate.mockClear();
  });

  it('renders the task title', () => {
    renderItem();
    expect(screen.getByText('Llamar al banco')).toBeInTheDocument();
  });

  it('renders checkbox reflecting the completed state', () => {
    const { rerender } = renderItem();
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(
      <DndContext>
        <SortableContext items={['tk-1']} strategy={verticalListSortingStrategy}>
          <TaskItem task={{ ...baseTask, completed: true }} onEdit={vi.fn()} />
        </SortableContext>
      </DndContext>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('toggles `completed` when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('checkbox'));

    expect(mockUpdateMutate).toHaveBeenCalledWith({ id: 'tk-1', data: { completed: true } });
  });

  it('un-completes a completed task when the checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderItem({ task: { completed: true } });

    await user.click(screen.getByRole('checkbox'));

    expect(mockUpdateMutate).toHaveBeenCalledWith({ id: 'tk-1', data: { completed: false } });
  });

  it('calls onEdit when the edit button is clicked', async () => {
    const user = userEvent.setup();
    const { task, onEdit } = renderItem();

    await user.click(screen.getByRole('button', { name: /editar tarea/i }));

    expect(onEdit).toHaveBeenCalledWith(task);
  });

  it('opens the confirm dialog when delete is clicked (does not delete yet)', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }));

    // Confirm dialog with the deleteConfirm message ("¿Eliminar esta tarea?").
    expect(screen.getByText(/eliminar esta tarea/i)).toBeInTheDocument();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('fires the delete mutation only after the user confirms', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }));
    // Two "Eliminar" exist now: the icon button (aria-labelled "Eliminar tarea")
    // and the confirm action (no aria-label). Find the one without aria-label.
    const confirm = screen
      .getAllByRole('button', { name: /^eliminar$/i })
      .find((b) => b.getAttribute('aria-label') === null);
    expect(confirm).toBeDefined();

    await user.click(confirm!);

    expect(mockDeleteMutate).toHaveBeenCalledWith('tk-1', expect.any(Object));
  });

  it('does not render the chevron affordance when the task has no description', () => {
    const { container } = renderItem();
    expect(container.querySelector('[aria-hidden="true"].rotate-180')).toBeNull();
  });

  it('expands and collapses the description on row click when description exists', async () => {
    const user = userEvent.setup();
    renderItem({ task: { description: 'Detalle **importante**' } });

    expect(screen.queryByText('importante')).not.toBeInTheDocument();

    const titleButton = screen.getByRole('button', { expanded: false });
    await user.click(titleButton);

    const bold = screen.getByText('importante');
    expect(bold.tagName).toBe('STRONG');

    await user.click(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('importante')).not.toBeInTheDocument();
  });

  it('shows a drag handle when sortable, hides it otherwise', () => {
    const { rerender } = renderItem({ sortable: true });
    expect(screen.getByRole('button', { name: /arrastrar tarea/i })).toBeInTheDocument();

    rerender(
      <DndContext>
        <SortableContext items={['tk-1']} strategy={verticalListSortingStrategy}>
          <TaskItem task={baseTask} onEdit={vi.fn()} />
        </SortableContext>
      </DndContext>,
    );
    expect(screen.queryByRole('button', { name: /arrastrar tarea/i })).not.toBeInTheDocument();
  });
});
