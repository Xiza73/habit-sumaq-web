import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { TestProviders } from '@/test/utils';

import { SectionPipView } from './SectionPipView';

const section = {
  id: 'sec-1',
  userId: 'u1',
  name: 'Habit Sumaq',
  color: '#22c55e',
  position: 0,
  isCollapsed: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} as unknown as Section;

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'tk-1',
    userId: 'u1',
    sectionId: 'sec-1',
    title: 'Una tarea',
    description: null,
    status: 'PENDING',
    completedAt: null,
    position: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

const tasks = [
  makeTask({ id: 'tk-1', title: 'Cerrar el barrido de voseo' }),
  makeTask({ id: 'tk-2', title: 'Revisar la ventana flotante', status: 'IN_REVIEW' }),
  makeTask({ id: 'tk-3', title: 'Cortar el release', status: 'DONE' }),
  // Belongs to another section: it must not leak into this window.
  makeTask({ id: 'tk-4', title: 'Cambiar el filtro', sectionId: 'sec-2' }),
];

// `vi.mock` replaces the module WHOLE, so every export the render path touches
// has to be here — `TaskItem` reaches for the two mutations itself.
vi.mock('@/core/application/hooks/use-tasks', () => ({
  tasksKeys: { all: ['tasks'] },
  useTasks: () => ({ data: tasks, isLoading: false }),
  useUpdateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/core/application/hooks/use-sections', () => ({
  sectionsKeys: { all: ['sections'] },
  useSections: () => ({ data: [section], isLoading: false }),
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

function renderPip(sectionId = 'sec-1') {
  return render(<SectionPipView sectionId={sectionId} />, { wrapper: TestProviders });
}

describe('SectionPipView', () => {
  it('names the window after the section', () => {
    // An undecorated window has no title bar, so five task rows on their own
    // would not say which section they came from.
    renderPip();

    expect(screen.getByText('Habit Sumaq')).toBeInTheDocument();
  });

  it('shows only the tasks of this section', () => {
    renderPip();

    expect(screen.getByText('Cerrar el barrido de voseo')).toBeInTheDocument();
    expect(screen.queryByText('Cambiar el filtro')).not.toBeInTheDocument();
  });

  it('keeps the board grouping instead of flattening it', () => {
    // A task in review and a finished one mean different things; losing that
    // distinction is losing the reason the state exists.
    renderPip();

    expect(screen.getByText('En validación')).toBeInTheDocument();
    expect(screen.getByText('Revisar la ventana flotante')).toBeInTheDocument();
    expect(screen.getByText('Cortar el release')).toBeInTheDocument();
  });

  it('renders no edit or delete control', () => {
    renderPip();

    expect(screen.queryByRole('button', { name: /editar tarea/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar tarea/i })).not.toBeInTheDocument();
  });

  it('says so when the section is gone', () => {
    renderPip('sec-missing');

    expect(screen.getByText(/no encontramos/i)).toBeInTheDocument();
  });
});
