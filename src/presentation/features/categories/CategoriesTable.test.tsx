import { NextIntlClientProvider } from 'next-intl';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type Category } from '@/core/domain/entities/category';

import messages from '@/i18n/messages/es.json';

import { CategoriesTable } from './CategoriesTable';

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Comida',
    type: 'EXPENSE',
    color: '#ef4444',
    icon: null,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderTable(
  categories: Category[],
  handlers: Partial<Parameters<typeof CategoriesTable>[0]> = {},
) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CategoriesTable categories={categories} onEdit={onEdit} onDelete={onDelete} {...handlers} />
    </NextIntlClientProvider>,
  );
  return { onEdit, onDelete };
}

describe('CategoriesTable', () => {
  it('renders the localized column headers', () => {
    renderTable([makeCategory()]);
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tipo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Color' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('renders one row per category with its name and type', () => {
    renderTable([makeCategory({ name: 'Comida', type: 'EXPENSE' })]);
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Gastos')).toBeInTheDocument();
  });

  it('fires onEdit for the category when its edit action is clicked', async () => {
    const user = userEvent.setup();
    const category = makeCategory();
    const { onEdit } = renderTable([category]);

    await user.click(screen.getByRole('button', { name: /editar categoría/i }));

    expect(onEdit).toHaveBeenCalledWith(category);
  });

  it('fires onDelete for the category when its delete action is clicked', async () => {
    const user = userEvent.setup();
    const category = makeCategory();
    const { onDelete } = renderTable([category]);

    await user.click(screen.getByRole('button', { name: /eliminar categoría/i }));

    expect(onDelete).toHaveBeenCalledWith(category);
  });

  it('hides the actions for a default category', () => {
    renderTable([makeCategory({ isDefault: true })]);
    expect(screen.queryByRole('button', { name: /editar categoría/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar categoría/i })).not.toBeInTheDocument();
  });
});
