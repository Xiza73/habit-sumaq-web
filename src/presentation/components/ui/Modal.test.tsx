import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Title">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('shows close button when title is provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    );
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    const overlay = document.querySelector('[aria-hidden="true"]')!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has dialog role with aria-modal', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Dialog">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'My Dialog');
  });
});
