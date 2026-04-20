import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type QuickTask } from '@/core/domain/entities/quick-task';

import { TestProviders } from '@/test/utils';

import { QuickTaskItem } from './QuickTaskItem';

const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/core/application/hooks/use-quick-tasks', () => ({
  useUpdateQuickTask: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteQuickTask: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

const baseTask: QuickTask = {
  id: 'tk-1',
  title: 'Comprar leche',
  description: null,
  completed: false,
  completedAt: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function renderItem(
  overrides: { task?: Partial<QuickTask>; sortable?: boolean; onEdit?: () => void } = {},
) {
  const task: QuickTask = { ...baseTask, ...overrides.task };
  const onEdit = overrides.onEdit ?? vi.fn();

  // Wrap in DndContext + SortableContext so the useSortable hook doesn't
  // warn in sortable tests. Passing a single item is enough to satisfy it.
  return {
    ...render(
      <DndContext>
        <SortableContext items={[task.id]} strategy={verticalListSortingStrategy}>
          <QuickTaskItem task={task} sortable={overrides.sortable} onEdit={onEdit} />
        </SortableContext>
      </DndContext>,
      { wrapper: TestProviders },
    ),
    task,
    onEdit,
  };
}

describe('QuickTaskItem', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
    mockDeleteMutate.mockClear();
  });

  it('renders the task title', () => {
    renderItem();
    expect(screen.getByText('Comprar leche')).toBeInTheDocument();
  });

  it('renders checkbox reflecting the completed state', () => {
    const { rerender } = renderItem();
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(
      <DndContext>
        <SortableContext items={['tk-1']} strategy={verticalListSortingStrategy}>
          <QuickTaskItem task={{ ...baseTask, completed: true }} onEdit={vi.fn()} />
        </SortableContext>
      </DndContext>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('toggles `completed` when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('checkbox'));

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'tk-1',
      data: { completed: true },
    });
  });

  it('un-completes a completed task when the checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderItem({ task: { completed: true } });

    await user.click(screen.getByRole('checkbox'));

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'tk-1',
      data: { completed: false },
    });
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

    // Confirm dialog surfaces a permanent-deletion warning.
    expect(screen.getByText(/definitiva/i)).toBeInTheDocument();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('fires the delete mutation only after the user confirms', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }));
    // Two "Eliminar" buttons exist now: the icon button (still accessible) and
    // the confirm action. Grab the confirm inside the dialog by its role + name.
    const confirm = screen
      .getAllByRole('button', { name: /^eliminar$/i })
      .find((button) => button.getAttribute('aria-label') === null);
    expect(confirm).toBeDefined();

    await user.click(confirm!);

    expect(mockDeleteMutate).toHaveBeenCalledWith('tk-1', expect.any(Object));
  });

  it('does not render the chevron affordance when the task has no description', () => {
    const { container } = renderItem();
    // Chevron is rendered as a `ChevronDown` lucide icon with `aria-hidden`.
    // When there's no description we don't render it at all.
    expect(container.querySelector('[aria-hidden="true"].rotate-180')).toBeNull();
  });

  it('expands and collapses the description on title click when description exists', async () => {
    const user = userEvent.setup();
    renderItem({ task: { description: 'Detalle **importante**' } });

    // Initially collapsed: the markdown isn't on screen.
    expect(screen.queryByText('importante')).not.toBeInTheDocument();

    // Click the title button (has aria-expanded=false).
    const titleButton = screen.getByRole('button', { expanded: false });
    await user.click(titleButton);

    // Expanded: markdown is rendered.
    const bold = screen.getByText('importante');
    expect(bold.tagName).toBe('STRONG');

    // Click again → collapses.
    await user.click(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('importante')).not.toBeInTheDocument();
  });

  it('shows a drag handle when sortable, hides it otherwise', () => {
    const { rerender } = renderItem({ sortable: true });
    expect(screen.getByRole('button', { name: /reordenar/i })).toBeInTheDocument();

    rerender(
      <DndContext>
        <SortableContext items={['tk-1']} strategy={verticalListSortingStrategy}>
          <QuickTaskItem task={baseTask} onEdit={vi.fn()} />
        </SortableContext>
      </DndContext>,
    );
    expect(screen.queryByRole('button', { name: /reordenar/i })).not.toBeInTheDocument();
  });
});
