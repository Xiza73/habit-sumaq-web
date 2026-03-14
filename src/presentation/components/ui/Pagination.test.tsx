import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { Pagination } from './Pagination';

function renderPagination(meta = { page: 2, totalPages: 5, total: 50, limit: 10 }) {
  const onPageChange = vi.fn();
  const result = render(<Pagination meta={meta} onPageChange={onPageChange} />, {
    wrapper: TestProviders,
  });
  return { ...result, onPageChange };
}

describe('Pagination', () => {
  it('renders page info', () => {
    renderPagination();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('renders total count', () => {
    renderPagination();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('calls onPageChange with previous page', async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination();
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with next page', async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination();
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page', () => {
    renderPagination({ page: 1, totalPages: 5, total: 50, limit: 10 });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderPagination({ page: 5, totalPages: 5, total: 50, limit: 10 });
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeDisabled();
  });

  it('returns null when totalPages is 1', () => {
    const { container } = render(
      <Pagination meta={{ page: 1, totalPages: 1, total: 5, limit: 10 }} onPageChange={vi.fn()} />,
      { wrapper: TestProviders },
    );
    expect(container.firstChild).toBeNull();
  });
});
