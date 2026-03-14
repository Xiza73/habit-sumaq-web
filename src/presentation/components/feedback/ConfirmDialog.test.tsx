import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { ConfirmDialog } from './ConfirmDialog';

const defaultProps = {
  open: true,
  title: 'Confirm Action',
  description: 'Are you sure?',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

function renderDialog(overrides = {}) {
  const props = { ...defaultProps, onConfirm: vi.fn(), onCancel: vi.fn(), ...overrides };
  const result = render(<ConfirmDialog {...props} />, { wrapper: TestProviders });
  return { ...result, ...props };
}

describe('ConfirmDialog', () => {
  it('renders title and description', () => {
    renderDialog();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons[buttons.length - 1];
    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows custom confirm label', () => {
    renderDialog({ confirmLabel: 'Delete it' });
    expect(screen.getByText('Delete it')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    renderDialog({ loading: true });
    const buttons = screen.getAllByRole('button');
    const cancelButton = buttons[0];
    const confirmButton = buttons[buttons.length - 1];
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });
});
