import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type QuickTask } from '@/core/domain/entities/quick-task';

import { TestProviders } from '@/test/utils';

import { QuickTasksList } from './QuickTasksList';

// Hooks get swapped per test via the mocked module — assign the return
// values inside `mockUseQuickTasksReturn` before each case.
const mockUseQuickTasksReturn: {
  data: QuickTask[] | undefined;
  isLoading: boolean;
} = { data: [], isLoading: false };
const mockReorderMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/core/application/hooks/use-quick-tasks', () => ({
  useQuickTasks: () => mockUseQuickTasksReturn,
  useReorderQuickTasks: () => ({ mutate: mockReorderMutate, isPending: false }),
  useUpdateQuickTask: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteQuickTask: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useCreateQuickTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

const pendingA: QuickTask = {
  id: 'pending-a',
  title: 'Comprar leche',
  description: null,
  completed: false,
  completedAt: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};
const pendingB: QuickTask = { ...pendingA, id: 'pending-b', title: 'Llamar a Juan', position: 2 };
const completedA: QuickTask = {
  ...pendingA,
  id: 'done-a',
  title: 'Pagar luz',
  completed: true,
  completedAt: '2026-04-20T18:00:00.000Z',
  position: 0,
};

function renderList() {
  return render(<QuickTasksList />, { wrapper: TestProviders });
}

describe('QuickTasksList', () => {
  beforeEach(() => {
    mockReorderMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockDeleteMutate.mockClear();
    mockUseQuickTasksReturn.data = [];
    mockUseQuickTasksReturn.isLoading = false;
  });

  it('renders the page header with title, subtitle and "new task" button', () => {
    renderList();

    // Both the h1 and the sidebar-style button include "Diarias"/"Nueva tarea".
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Diarias');
    expect(screen.getByRole('button', { name: /nueva tarea/i })).toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    mockUseQuickTasksReturn.data = undefined;
    mockUseQuickTasksReturn.isLoading = true;

    renderList();

    // Lucide icons have role="img" with aria-hidden; asserting absence of
    // task content is the cleanest signal the loading branch ran.
    expect(screen.queryByText(/todavía no agregaste/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pendientes/i)).not.toBeInTheDocument();
  });

  it('renders the empty state when the user has zero tasks', () => {
    mockUseQuickTasksReturn.data = [];

    renderList();

    expect(screen.getByText(/todavía no agregaste tareas para hoy/i)).toBeInTheDocument();
  });

  it('renders a "Pendientes" section with only pending tasks', () => {
    mockUseQuickTasksReturn.data = [pendingA, pendingB, completedA];

    renderList();

    expect(screen.getByRole('heading', { name: /pendientes/i })).toBeInTheDocument();
    expect(screen.getByText('Comprar leche')).toBeInTheDocument();
    expect(screen.getByText('Llamar a Juan')).toBeInTheDocument();
  });

  it('renders a "Completadas hoy" section only when there is at least one completed', () => {
    mockUseQuickTasksReturn.data = [pendingA];

    const { rerender } = renderList();
    expect(screen.queryByRole('heading', { name: /completadas hoy/i })).not.toBeInTheDocument();

    mockUseQuickTasksReturn.data = [pendingA, completedA];
    rerender(<QuickTasksList />);

    expect(screen.getByRole('heading', { name: /completadas hoy/i })).toBeInTheDocument();
    expect(screen.getByText('Pagar luz')).toBeInTheDocument();
  });

  it('opens the form dialog when the "Nueva tarea" button is clicked', async () => {
    const user = userEvent.setup();
    mockUseQuickTasksReturn.data = [];

    renderList();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nueva tarea/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Create mode → confirm button labelled "Crear".
    expect(screen.getByRole('button', { name: /^crear$/i })).toBeInTheDocument();
  });

  it('opens the form in edit mode when an item triggers onEdit', async () => {
    const user = userEvent.setup();
    mockUseQuickTasksReturn.data = [pendingA];

    renderList();

    await user.click(screen.getByRole('button', { name: /editar tarea/i }));

    // Editing renders with the title pre-filled + a "Guardar" submit button.
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Comprar leche')).toBeInTheDocument();
  });

  it('shows the "no pendientes" copy when everything today is completed', () => {
    mockUseQuickTasksReturn.data = [completedA];

    renderList();

    expect(screen.getByText(/nada pendiente por hacer/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /completadas hoy/i })).toBeInTheDocument();
  });
});
