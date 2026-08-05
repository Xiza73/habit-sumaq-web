import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { type RowAction, RowActionsMenu } from './RowActionsMenu';

function renderMenu(actions: RowAction[]) {
  render(<RowActionsMenu actions={actions} triggerLabel="Acciones" />);
}

describe('RowActionsMenu', () => {
  it('keeps the menu items out of the DOM until the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderMenu([{ id: 'edit', label: 'Editar', icon: Pencil, onClick: vi.fn() }]);

    // Closed by default: only the trigger is present, no menu items.
    expect(screen.getByRole('button', { name: 'Acciones' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Acciones' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
  });

  it('fires the clicked action and closes the menu', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderMenu([
      { id: 'edit', label: 'Editar', icon: Pencil, onClick: onEdit },
      { id: 'delete', label: 'Eliminar', icon: Trash2, onClick: onDelete, destructive: true },
    ]);

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    // Menu closes after an item runs.
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('does not fire a disabled action', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderMenu([{ id: 'edit', label: 'Editar', icon: Pencil, onClick: onEdit, disabled: true }]);

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderMenu([{ id: 'edit', label: 'Editar', icon: Pencil, onClick: vi.fn() }]);

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
