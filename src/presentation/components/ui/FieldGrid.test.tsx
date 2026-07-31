import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldGrid } from './FieldGrid';

describe('FieldGrid', () => {
  it('renders each field label wired to its control via htmlFor/id', () => {
    render(
      <FieldGrid columns={2}>
        <FieldGrid.Field label="Amount" htmlFor="amount">
          <input id="amount" />
        </FieldGrid.Field>
        <FieldGrid.Field label="Date" htmlFor="date">
          <input id="date" />
        </FieldGrid.Field>
      </FieldGrid>,
    );

    const amount = screen.getByLabelText('Amount');
    const date = screen.getByLabelText('Date');
    expect(amount).toHaveAttribute('id', 'amount');
    expect(date).toHaveAttribute('id', 'date');
  });

  it('renders the error message when provided', () => {
    render(
      <FieldGrid columns={2}>
        <FieldGrid.Field label="Amount" htmlFor="amount" error="Amount is required">
          <input id="amount" />
        </FieldGrid.Field>
      </FieldGrid>,
    );

    expect(screen.getByText('Amount is required')).toHaveClass('text-destructive');
  });

  it('does not render an error paragraph when error is falsy', () => {
    render(
      <FieldGrid columns={2}>
        <FieldGrid.Field label="Amount" htmlFor="amount" error={undefined}>
          <input id="amount" />
        </FieldGrid.Field>
      </FieldGrid>,
    );

    expect(document.querySelector('.text-destructive')).toBeNull();
  });

  it('renders a hint when provided', () => {
    render(
      <FieldGrid columns={2}>
        <FieldGrid.Field label="Due day" htmlFor="dueDay" hint="Between 1 and 31">
          <input id="dueDay" />
        </FieldGrid.Field>
      </FieldGrid>,
    );

    expect(screen.getByText('Between 1 and 31')).toHaveClass('text-muted-foreground');
  });

  it('renders a custom errorNode instead of the default error paragraph', () => {
    render(
      <FieldGrid columns={2}>
        <FieldGrid.Field
          label="Due day"
          htmlFor="dueDay"
          error="ignored"
          errorNode={<span data-testid="custom-error">Out of range</span>}
        >
          <input id="dueDay" />
        </FieldGrid.Field>
      </FieldGrid>,
    );

    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();
  });

  it('applies the subgrid span to each field wrapper', () => {
    const { container } = render(
      <FieldGrid columns={2}>
        <FieldGrid.Field label="Amount" htmlFor="amount">
          <input id="amount" />
        </FieldGrid.Field>
      </FieldGrid>,
    );

    const field = screen.getByLabelText('Amount').closest('.row-span-4');
    expect(field).not.toBeNull();
    expect(field).toHaveClass('grid-rows-subgrid');
    // The outer grid declares the responsive column count.
    expect(container.firstChild).toHaveClass('sm:grid-cols-2');
  });
});
