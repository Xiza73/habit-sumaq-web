import { TooltipProvider } from '@radix-ui/react-tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tooltip } from './Tooltip';

function renderTooltip() {
  return render(
    <TooltipProvider>
      <Tooltip label="Foo">
        <button type="button">bar</button>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe('Tooltip', () => {
  it('renders its trigger children and keeps their accessible name', () => {
    renderTooltip();

    const trigger = screen.getByRole('button', { name: 'bar' });
    expect(trigger).toBeInTheDocument();
    // Radix wires the trigger state onto the merged child (asChild).
    expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  it('reveals the label as an accessible tooltip when the trigger is focused', async () => {
    const user = userEvent.setup();
    renderTooltip();

    const trigger = screen.getByRole('button', { name: 'bar' });
    await user.tab();
    expect(trigger).toHaveFocus();

    // Portaled content escapes the surrounding overflow container.
    const tooltip = await screen.findByRole('tooltip', { name: 'Foo' });
    expect(tooltip).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
  });
});
