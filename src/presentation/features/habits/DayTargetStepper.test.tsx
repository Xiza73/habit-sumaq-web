import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { DayTargetStepper } from './DayTargetStepper';

function renderStepper(props: Partial<Parameters<typeof DayTargetStepper>[0]> = {}) {
  const onChange = vi.fn();
  render(<DayTargetStepper value={3} onChange={onChange} {...props} />, {
    wrapper: TestProviders,
  });
  return { onChange };
}

describe('DayTargetStepper', () => {
  it('renders the target as text when it is not editable', () => {
    renderStepper({ editable: false });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the target as a button when editable', () => {
    renderStepper();
    expect(screen.getByRole('button', { name: 'Objetivo del día' })).toHaveTextContent('3');
  });

  it('reveals the stepper controls on click', async () => {
    const user = userEvent.setup();
    renderStepper();

    await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));

    expect(screen.getByRole('button', { name: /aumentar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reducir/i })).toBeInTheDocument();
  });

  it('commits an increase immediately', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStepper();

    await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));
    await user.click(screen.getByRole('button', { name: /aumentar/i }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('commits a decrease immediately', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStepper();

    await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));
    await user.click(screen.getByRole('button', { name: /reducir/i }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('never lets the target drop below 1', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStepper({ value: 1 });

    await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));

    expect(screen.getByRole('button', { name: /reducir/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /reducir/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('collapses back to plain text when the target is clicked again', async () => {
    const user = userEvent.setup();
    renderStepper();

    const trigger = screen.getByRole('button', { name: 'Objetivo del día' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: /aumentar/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));
    expect(screen.queryByRole('button', { name: /aumentar/i })).not.toBeInTheDocument();
  });

  it('does not fire onChange while a commit is pending', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStepper({ pending: true });

    await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));
    await user.click(screen.getByRole('button', { name: /aumentar/i }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
