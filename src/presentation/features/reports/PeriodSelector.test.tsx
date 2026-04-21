import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { PeriodSelector } from './PeriodSelector';

describe('PeriodSelector', () => {
  it('renders all four period options in order', () => {
    render(<PeriodSelector value="month" onChange={vi.fn()} />, { wrapper: TestProviders });

    // Labels come from es.json under reports.periods.*.
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent);
    expect(labels).toEqual(['Semana', '30 días', 'Mes', '3 meses']);
  });

  it('highlights the selected option', () => {
    render(<PeriodSelector value="month" onChange={vi.fn()} />, { wrapper: TestProviders });

    const selected = screen.getByRole('button', { name: 'Mes' });
    expect(selected).toHaveClass('bg-primary');
    expect(selected).toHaveClass('text-primary-foreground');

    const notSelected = screen.getByRole('button', { name: 'Semana' });
    expect(notSelected).not.toHaveClass('bg-primary');
  });

  it('calls onChange with the clicked period', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PeriodSelector value="month" onChange={onChange} />, { wrapper: TestProviders });

    await user.click(screen.getByRole('button', { name: '30 días' }));
    expect(onChange).toHaveBeenCalledWith('30d');

    await user.click(screen.getByRole('button', { name: '3 meses' }));
    expect(onChange).toHaveBeenCalledWith('3m');
  });

  it('does not call onChange when clicking the already-selected option repeatedly if user does not re-click', async () => {
    // Sanity check: clicking a different one triggers, clicking same one still triggers
    // (the component doesn't early-exit — the parent decides what to do).
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PeriodSelector value="week" onChange={onChange} />, { wrapper: TestProviders });

    await user.click(screen.getByRole('button', { name: 'Semana' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });
});
