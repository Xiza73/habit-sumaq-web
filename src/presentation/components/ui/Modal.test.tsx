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

  describe('submit isolation (CategoryForm-inside-TransactionForm regression)', () => {
    it('does NOT bubble inner form submit to a parent form in the React tree', async () => {
      // Reproduces the QA bug: TransactionForm hosts CategoryForm via a portal.
      // Both wrap their content in <form>. Before the fix, submitting the
      // inner form bubbled the event through React's component tree (portals
      // preserve component-tree bubbling) and silently triggered the outer
      // form's submit. The Modal now stops submit at the dialog boundary.
      const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      const innerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <form onSubmit={outerSubmit} aria-label="outer">
          <Modal open={true} onClose={vi.fn()} title="Inner">
            <form onSubmit={innerSubmit} aria-label="inner">
              <button type="submit">Save</button>
            </form>
          </Modal>
        </form>,
      );

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(innerSubmit).toHaveBeenCalledTimes(1);
      expect(outerSubmit).not.toHaveBeenCalled();
    });
  });
});
