import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Category } from '@/core/domain/entities/category';

import { TestProviders } from '@/test/utils';

import { CategoryList } from './CategoryList';

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Comida',
    type: 'EXPENSE',
    color: '#ef4444',
    icon: null,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-2',
    userId: 'user-1',
    name: 'Transporte',
    type: 'EXPENSE',
    color: '#3b82f6',
    icon: null,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockUseCategories = vi.fn();

interface MockQueryResult {
  data: Category[] | undefined;
  isLoading: boolean;
}

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: (): MockQueryResult => mockUseCategories() as MockQueryResult,
  useDeleteCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderList() {
  return render(<CategoryList />, { wrapper: TestProviders });
}

describe('CategoryList', () => {
  beforeEach(() => {
    mockUseCategories.mockReset();
    // The view-mode toggle persists per-device; reset so each test starts on cards.
    window.localStorage.clear();
  });

  it('renders the page title and create CTA', () => {
    mockUseCategories.mockReturnValue({ data: mockCategories, isLoading: false });
    renderList();
    expect(screen.getByText(/categorías/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /nueva categoría/i }).length).toBeGreaterThan(0);
  });

  it('renders all categories as cards', () => {
    mockUseCategories.mockReturnValue({ data: mockCategories, isLoading: false });
    renderList();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('renders cards by default and switches to the table view when toggled', async () => {
    const user = userEvent.setup();
    mockUseCategories.mockReturnValue({ data: mockCategories, isLoading: false });
    renderList();

    // Default view = cards, so there is no table yet.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tabla/i }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('table edit action fires the same handler that opens the edit form', async () => {
    const user = userEvent.setup();
    mockUseCategories.mockReturnValue({ data: mockCategories, isLoading: false });
    renderList();

    await user.click(screen.getByRole('button', { name: /tabla/i }));
    await screen.findByRole('table');

    const editButtons = screen.getAllByRole('button', { name: /editar categoría/i });
    await user.click(editButtons[0]);

    // The edit form dialog opens, prefilled with the first category's name.
    expect(await screen.findByDisplayValue('Comida')).toBeInTheDocument();
  });
});
