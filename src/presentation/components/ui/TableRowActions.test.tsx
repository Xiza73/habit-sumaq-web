import { type ReactNode } from 'react';

import { TooltipProvider } from '@radix-ui/react-tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { type RowAction } from './RowActionsMenu';
import { TableRowActions } from './TableRowActions';

/**
 * Radix throws if a `Tooltip` renders without a `TooltipProvider` ancestor,
 * so every render goes through this wrapper.
 */
function renderActions(actions: RowAction[]) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <TooltipProvider>{children}</TooltipProvider>;
  }

  return render(<TableRowActions actions={actions} triggerLabel="Acciones" />, {
    wrapper: Wrapper,
  });
}

describe('TableRowActions', () => {
  it('renders the inline icon buttons with accessible names from their labels', () => {
    renderActions([
      { id: 'edit', label: 'Editar', icon: Pencil, onClick: vi.fn() },
      { id: 'delete', label: 'Eliminar', icon: Trash2, onClick: vi.fn(), destructive: true },
    ]);

    // Both the inline `xl` buttons and the collapsed kebab items share labels,
    // so each accessible name resolves to at least one button.
    expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Eliminar' }).length).toBeGreaterThan(0);
  });

  it('no longer sets the native title on the inline buttons (tooltip replaces it)', () => {
    renderActions([{ id: 'edit', label: 'Editar', icon: Pencil, onClick: vi.fn() }]);

    for (const button of screen.getAllByRole('button', { name: 'Editar' })) {
      expect(button).not.toHaveAttribute('title');
    }
  });

  it('fires the action when an inline button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderActions([{ id: 'edit', label: 'Editar', icon: Pencil, onClick: onEdit }]);

    // The inline rendition is the first matching button in DOM order.
    const [inlineButton] = screen.getAllByRole('button', { name: 'Editar' });
    await user.click(inlineButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('still collapses into a kebab dropdown for narrow screens', () => {
    renderActions([{ id: 'edit', label: 'Editar', icon: Pencil, onClick: vi.fn() }]);

    // The collapsed rendition keeps the kebab trigger available.
    expect(screen.getByRole('button', { name: 'Acciones' })).toBeInTheDocument();
  });
});
