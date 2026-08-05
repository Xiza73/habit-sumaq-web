import { NextIntlClientProvider } from 'next-intl';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type ViewMode } from '@/core/application/hooks/use-view-mode';

import messages from '@/i18n/messages/es.json';

import { ViewModeToggle } from './ViewModeToggle';

function renderToggle(mode: ViewMode, onChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ViewModeToggle mode={mode} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe('ViewModeToggle', () => {
  it('renders a cards and a table option', () => {
    renderToggle('cards');
    expect(screen.getByRole('button', { name: /tarjetas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tabla/i })).toBeInTheDocument();
  });

  it('marks the active mode with aria-pressed', () => {
    renderToggle('table');
    expect(screen.getByRole('button', { name: /tabla/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /tarjetas/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('calls onChange with the picked mode when the other option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = renderToggle('cards');

    await user.click(screen.getByRole('button', { name: /tabla/i }));

    expect(onChange).toHaveBeenCalledWith('table');
  });

  it('does not re-fire onChange for the already-active option', async () => {
    const user = userEvent.setup();
    const onChange = renderToggle('cards');

    await user.click(screen.getByRole('button', { name: /tarjetas/i }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
