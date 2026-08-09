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

  describe('escaping the table scroll container', () => {
    /**
     * Reproduces the layout that caused the bug: `DataTable` wraps its table in
     * `overflow-x-auto`. CSS forces the other axis to `auto` whenever one axis
     * is not `visible`, so that container scrolls VERTICALLY too — and an
     * absolutely-positioned menu on one of the last rows extended the scrollable
     * content and grew a scrollbar on the table itself.
     */
    function renderInsideScrollContainer(actions: RowAction[]) {
      return render(
        <div data-testid="scroll-container" className="overflow-x-auto">
          <RowActionsMenu actions={actions} triggerLabel="Acciones" />
        </div>,
      );
    }

    it('renders the open menu outside the scrolling ancestor', async () => {
      const user = userEvent.setup();
      renderInsideScrollContainer([{ id: 'edit', label: 'Editar', onClick: vi.fn() }]);

      await user.click(screen.getByRole('button', { name: 'Acciones' }));

      const menu = screen.getByRole('menu');
      const container = screen.getByTestId('scroll-container');
      // The whole fix: the menu must not be a descendant of the overflow box,
      // because anything inside it counts towards that box's scroll extent.
      expect(container.contains(menu)).toBe(false);
      expect(document.body.contains(menu)).toBe(true);
    });

    it('leaves the trigger where it was — only the dropdown is relocated', async () => {
      const user = userEvent.setup();
      renderInsideScrollContainer([{ id: 'edit', label: 'Editar', onClick: vi.fn() }]);

      const trigger = screen.getByRole('button', { name: 'Acciones' });
      expect(screen.getByTestId('scroll-container').contains(trigger)).toBe(true);

      await user.click(trigger);
      // Still in place after opening — the row keeps its kebab.
      expect(screen.getByTestId('scroll-container').contains(trigger)).toBe(true);
    });

    it('positions itself with fixed coordinates rather than flowing in the layout', async () => {
      const user = userEvent.setup();
      renderInsideScrollContainer([{ id: 'edit', label: 'Editar', onClick: vi.fn() }]);

      await user.click(screen.getByRole('button', { name: 'Acciones' }));

      // `fixed` is what takes it out of every scroll container at once,
      // including ones we don't control.
      expect(screen.getByRole('menu')).toHaveStyle({ position: 'fixed' });
    });

    it('still runs actions and still closes on Escape once portalled', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      renderInsideScrollContainer([{ id: 'edit', label: 'Editar', onClick: onEdit }]);

      await user.click(screen.getByRole('button', { name: 'Acciones' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Acciones' }));
      await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('removes the portalled menu from the DOM when it closes', async () => {
      const user = userEvent.setup();
      const { unmount } = renderInsideScrollContainer([
        { id: 'edit', label: 'Editar', onClick: vi.fn() },
      ]);

      await user.click(screen.getByRole('button', { name: 'Acciones' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Unmounting the row must not strand the menu on document.body.
      unmount();
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });
  });
});
