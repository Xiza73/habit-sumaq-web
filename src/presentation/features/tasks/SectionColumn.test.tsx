import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { TestProviders } from '@/test/utils';

import { SectionColumn } from './SectionColumn';

vi.mock('@/core/application/hooks/use-tasks', () => ({
  useReorderTasks: () => ({ mutate: vi.fn(), isPending: false }),
  // TaskItem (rendered inside SectionColumn) reads update/delete hooks; we
  // mock them so the mount doesn't blow up when tasks render.
  useUpdateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Spy on the toggle mutation so we can assert it fires with the right
// payload. Returning a no-op mutate is enough — the optimistic update lives
// in the hook itself, which we replace here.
const updateSectionMutate = vi.fn();
vi.mock('@/core/application/hooks/use-sections', () => ({
  useUpdateSection: () => ({ mutate: updateSectionMutate, isPending: false }),
}));

const baseSection: Section = {
  id: 'sec-1',
  userId: 'user-1',
  name: 'Trabajo',
  color: null,
  position: 1,
  isCollapsed: false,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tk-1',
    userId: 'user-1',
    sectionId: 'sec-1',
    title: 'Comprar pan',
    description: null,
    completed: false,
    completedAt: null,
    position: 1,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
    ...overrides,
  };
}

function renderColumn(
  overrides: {
    section?: Partial<Section>;
    pendingTasks?: Task[];
    completedTasks?: Task[];
    sortable?: boolean;
  } = {},
) {
  const section: Section = { ...baseSection, ...overrides.section };
  const props = {
    section,
    pendingTasks: overrides.pendingTasks ?? [],
    completedTasks: overrides.completedTasks ?? [],
    sortable: overrides.sortable ?? false,
    onAddTask: vi.fn(),
    onEditSection: vi.fn(),
    onDeleteSection: vi.fn(),
    onEditTask: vi.fn(),
  };

  // Sortable header needs a SortableContext ancestor — provide a minimal
  // one so useSortable doesn't warn.
  return {
    ...render(
      <DndContext>
        <SortableContext items={[section.id]} strategy={verticalListSortingStrategy}>
          <SectionColumn {...props} />
        </SortableContext>
      </DndContext>,
      { wrapper: TestProviders },
    ),
    props,
  };
}

describe('SectionColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section name and the counters', () => {
    renderColumn({
      pendingTasks: [makeTask({ id: 'a' }), makeTask({ id: 'b' })],
      completedTasks: [makeTask({ id: 'c', completed: true })],
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Trabajo' })).toBeInTheDocument();
    // Counter shows "2 · 1 ✓" — pending count first, completed after a
    // separator. We match the digits so the ✓ glyph doesn't trip locales.
    expect(screen.getByText(/2.*1/)).toBeInTheDocument();
  });

  it('starts expanded — pending tasks are visible by default', () => {
    renderColumn({
      pendingTasks: [makeTask({ id: 'a', title: 'Llamar al banco' })],
    });
    expect(screen.getByText('Llamar al banco')).toBeInTheDocument();
    // The header role=button should reflect aria-expanded=true.
    const header = screen.getByRole('button', { name: /trabajo/i });
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking the header fires the persist mutation with the toggled value', async () => {
    const user = userEvent.setup();
    renderColumn({
      pendingTasks: [makeTask({ id: 'a', title: 'Llamar al banco' })],
    });

    const header = screen.getByRole('button', { name: /trabajo/i });
    await user.click(header);

    // The mutation is fired with the toggled flag. Optimistic update lives
    // inside the hook (out of scope here) — once the cache is updated, the
    // section prop arrives with isCollapsed: true and the body hides.
    expect(updateSectionMutate).toHaveBeenCalledTimes(1);
    expect(updateSectionMutate).toHaveBeenCalledWith(
      { id: 'sec-1', data: { isCollapsed: true } },
      expect.objectContaining({ onError: expect.any(Function) as unknown }),
    );
  });

  it('renders collapsed when section.isCollapsed is true', () => {
    renderColumn({
      section: { isCollapsed: true },
      pendingTasks: [makeTask({ id: 'a', title: 'Llamar al banco' })],
    });

    // Body hidden — task not in the DOM.
    expect(screen.queryByText('Llamar al banco')).not.toBeInTheDocument();
    const header = screen.getByRole('button', { name: /trabajo/i });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    // Header counters STAY visible — collapsed but informative.
    expect(screen.getByRole('heading', { level: 2, name: 'Trabajo' })).toBeInTheDocument();
  });

  it('clicking a collapsed header sends isCollapsed: false', async () => {
    const user = userEvent.setup();
    renderColumn({ section: { isCollapsed: true } });
    await user.click(screen.getByRole('button', { name: /trabajo/i }));

    expect(updateSectionMutate).toHaveBeenCalledWith(
      { id: 'sec-1', data: { isCollapsed: false } },
      expect.anything(),
    );
  });

  it('clicking the "add task" button does NOT toggle collapse', async () => {
    const user = userEvent.setup();
    const { props } = renderColumn({
      pendingTasks: [makeTask({ id: 'a', title: 'Llamar al banco' })],
    });

    await user.click(screen.getByRole('button', { name: /nueva tarea/i }));

    // onAddTask fired …
    expect(props.onAddTask).toHaveBeenCalledWith('sec-1');
    // … and the section stayed expanded (task still on screen).
    expect(screen.getByText('Llamar al banco')).toBeInTheDocument();
  });

  it('applies the section color as left-border + tinted header background', () => {
    const { container } = renderColumn({ section: { color: '#FF6B35' } });

    // Outer card carries the border-left colour as inline style. We don't
    // assert the full computed class string; we verify the inline style
    // landed on the expected element.
    const card = container.firstChild as HTMLElement;
    expect(card.style.borderLeftColor).toBeTruthy();

    // Header gets the colour at ~12% alpha (#FF6B3520).
    const header = screen.getByRole('button', { name: /trabajo/i });
    expect(header.style.backgroundColor).toBeTruthy();
  });

  it('falls back to the primary accent border when section.color is null', () => {
    const { container } = renderColumn({ section: { color: null } });
    const card = container.firstChild as HTMLElement;

    // No inline border colour — Tailwind's `border-l-primary` class does
    // the colouring instead. We assert the class is present and that no
    // inline override exists.
    expect(card.style.borderLeftColor).toBe('');
    expect(card.className).toMatch(/border-l-primary/);
  });
});
