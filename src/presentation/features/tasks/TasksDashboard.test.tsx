import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { TestProviders } from '@/test/utils';

import { TasksDashboard } from './TasksDashboard';

// Hoisted mock state — Vitest requires `vi.mock` factories to be self-contained
// and run BEFORE module imports, so we set the values via the variables at the
// top of each test instead of the closure trick.
let sectionsData: Section[] = [];
let tasksData: Task[] = [];

vi.mock('@/core/application/hooks/use-sections', () => ({
  useSections: () => ({ data: sectionsData, isLoading: false }),
  useCreateSection: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateSection: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderSections: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSection: () => ({ mutate: vi.fn(), isPending: false }),
}));

// SectionColumn (rendered by the dashboard) uses useReorderTasks; TaskItem
// (rendered inside SectionColumn) uses useUpdateTask and useDeleteTask;
// TaskForm uses useCreateTask. Mock all of them defensively so the
// component tree doesn't blow up regardless of which path the test exercises.
vi.mock('@/core/application/hooks/use-tasks', () => ({
  useTasks: () => ({ data: tasksData, isLoading: false }),
  useCreateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderTasks: () => ({ mutate: vi.fn(), isPending: false }),
}));

const sectionA: Section = {
  id: '11111111-1111-4111-a111-111111111111',
  userId: 'user-1',
  name: 'Trabajo',
  color: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tk-1',
    userId: 'user-1',
    sectionId: sectionA.id,
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

describe('TasksDashboard', () => {
  beforeEach(() => {
    sectionsData = [];
    tasksData = [];
  });

  it('renders the empty-state CTA when the user has no sections', () => {
    sectionsData = [];
    tasksData = [];
    render(<TasksDashboard />, { wrapper: TestProviders });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /empieza creando tu primera sección/i,
    );
    expect(screen.getByRole('button', { name: /crear primera sección/i })).toBeInTheDocument();
  });

  it('disables the "new task" header button when there are no sections', () => {
    sectionsData = [];
    render(<TasksDashboard />, { wrapper: TestProviders });

    // Header has 2 buttons: section + task. The task one is disabled until a
    // section exists. Match by aria-label OR title (the visible label hides
    // on small screens behind .hidden sm:inline).
    const taskButton = screen.getByTitle(/crea una sección primero/i);
    expect(taskButton).toBeDisabled();
  });

  it('renders the section name when there is at least one section', () => {
    sectionsData = [sectionA];
    tasksData = [];
    render(<TasksDashboard />, { wrapper: TestProviders });

    expect(screen.getByRole('heading', { level: 2, name: 'Trabajo' })).toBeInTheDocument();
  });

  it('renders both pending and completed tasks under the right section', () => {
    sectionsData = [sectionA];
    tasksData = [
      makeTask({ id: 'a', title: 'Llamar al banco', completed: false }),
      makeTask({
        id: 'b',
        title: 'Pagar luz',
        completed: true,
        completedAt: '2026-04-22T12:00:00.000Z',
      }),
    ];
    render(<TasksDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('Llamar al banco')).toBeInTheDocument();
    expect(screen.getByText('Pagar luz')).toBeInTheDocument();
  });

  it('shows the per-section "no tasks" hint when a section is empty', () => {
    sectionsData = [sectionA];
    tasksData = [];
    render(<TasksDashboard />, { wrapper: TestProviders });

    expect(screen.getByText(/sin tareas en esta sección/i)).toBeInTheDocument();
  });
});
