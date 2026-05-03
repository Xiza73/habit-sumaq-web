import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Category } from '@/core/domain/entities/category';
import { type Habit } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { TemplatesSection } from './TemplatesSection';

// Mock state — flipped per test via the variables below.
let existingHabits: Habit[] = [];
let existingCategories: Category[] = [];
const createHabitMock = vi.fn();
const createCategoryMock = vi.fn();

vi.mock('@/core/application/hooks/use-habits', () => ({
  useHabits: () => ({ data: existingHabits, isLoading: false }),
  useCreateHabit: () => ({
    mutateAsync: createHabitMock,
    isPending: false,
  }),
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: existingCategories, isLoading: false }),
  useCreateCategory: () => ({
    mutateAsync: createCategoryMock,
    isPending: false,
  }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => {
      toastSuccessMock(msg);
    },
    error: (msg: string) => {
      toastErrorMock(msg);
    },
  },
}));

describe('TemplatesSection', () => {
  beforeEach(() => {
    existingHabits = [];
    existingCategories = [];
    createHabitMock.mockReset();
    createHabitMock.mockResolvedValue(undefined);
    createCategoryMock.mockReset();
    createCategoryMock.mockResolvedValue(undefined);
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('renders the three template cards with their copy', () => {
    render(<TemplatesSection />, { wrapper: TestProviders });
    // Section header
    expect(screen.getByRole('heading', { level: 2, name: /plantillas/i })).toBeInTheDocument();
    // One card per template (h3 each)
    expect(screen.getByRole('heading', { level: 3, name: 'Estudiante' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Freelancer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Pareja' })).toBeInTheDocument();
  });

  it('opens the preview modal when clicking apply on a card', async () => {
    const user = userEvent.setup();
    render(<TemplatesSection />, { wrapper: TestProviders });

    const studentCard = screen
      .getByRole('heading', { level: 3, name: 'Estudiante' })
      .closest('div');
    expect(studentCard).not.toBeNull();
    const applyButton = studentCard!.querySelector('button')!;
    await user.click(applyButton);

    // Modal title carries "Estudiante"
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /estudiante/i })).toBeInTheDocument();
    });
    // Habits list inside the modal — Student template has 4 habits.
    expect(screen.getByText('Leer 30 minutos')).toBeInTheDocument();
    expect(screen.getByText('Estudiar')).toBeInTheDocument();
  });

  it('applying a template fires create mutations for each item and shows success toast', async () => {
    const user = userEvent.setup();
    render(<TemplatesSection />, { wrapper: TestProviders });

    // Open Student preview.
    const studentCard = screen
      .getByRole('heading', { level: 3, name: 'Estudiante' })
      .closest('div')!;
    await user.click(studentCard.querySelector('button')!);

    // Click "Aplicar" inside the modal.
    const dialog = await screen.findByRole('dialog', { name: /estudiante/i });
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aplicar',
    );
    expect(confirmBtn).toBeDefined();
    await user.click(confirmBtn!);

    // Student template: 4 habits + 6 categories = 10 mutations total.
    await waitFor(() => {
      expect(createHabitMock).toHaveBeenCalledTimes(4);
      expect(createCategoryMock).toHaveBeenCalledTimes(6);
    });

    // Success toast — no skipped items, so the "createdOnly" variant fires.
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringMatching(/10/));
  });

  it('skips habits that already exist by name (case-insensitive)', async () => {
    existingHabits = [
      {
        id: 'h-existing',
        userId: 'u1',
        name: 'estudiar', // lowercase to verify case-insensitive match
        description: null,
        frequency: 'DAILY',
        targetCount: 1,
        color: null,
        icon: null,
        isArchived: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const user = userEvent.setup();
    render(<TemplatesSection />, { wrapper: TestProviders });

    const studentCard = screen
      .getByRole('heading', { level: 3, name: 'Estudiante' })
      .closest('div')!;
    await user.click(studentCard.querySelector('button')!);

    const dialog = await screen.findByRole('dialog', { name: /estudiante/i });
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aplicar',
    );
    await user.click(confirmBtn!);

    await waitFor(() => {
      // 4 habits in template - 1 skipped = 3 mutations
      expect(createHabitMock).toHaveBeenCalledTimes(3);
    });
    // Toast announces partial application via the "withSkipped" variant.
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringMatching(/saltaron/i));
  });

  it('skips categories that already exist by name + type', async () => {
    existingCategories = [
      {
        id: 'c-existing',
        userId: 'u1',
        name: 'Comida',
        type: 'EXPENSE',
        color: null,
        icon: null,
        isDefault: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const user = userEvent.setup();
    render(<TemplatesSection />, { wrapper: TestProviders });

    const studentCard = screen
      .getByRole('heading', { level: 3, name: 'Estudiante' })
      .closest('div')!;
    await user.click(studentCard.querySelector('button')!);

    const dialog = await screen.findByRole('dialog', { name: /estudiante/i });
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aplicar',
    );
    await user.click(confirmBtn!);

    await waitFor(() => {
      // 6 categories in template - 1 skipped = 5 mutations
      expect(createCategoryMock).toHaveBeenCalledTimes(5);
    });
  });

  it('shows error toast when ALL items fail', async () => {
    createHabitMock.mockRejectedValue(new Error('boom'));
    createCategoryMock.mockRejectedValue(new Error('boom'));

    const user = userEvent.setup();
    render(<TemplatesSection />, { wrapper: TestProviders });

    const coupleCard = screen.getByRole('heading', { level: 3, name: 'Pareja' }).closest('div')!;
    await user.click(coupleCard.querySelector('button')!);

    const dialog = await screen.findByRole('dialog', { name: /pareja/i });
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aplicar',
    );
    await user.click(confirmBtn!);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
