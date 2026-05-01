import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarList } from './BarList';

// `emptyMessage` is required on BarList — for tests that render items, the
// empty path never renders so the value is irrelevant; we still pass a
// placeholder so TypeScript stays happy.
const NO_EMPTY = 'unused-in-this-test';

describe('BarList', () => {
  it('renders the empty message when items is empty', () => {
    render(<BarList items={[]} emptyMessage="Nada aún" />);
    expect(screen.getByText('Nada aún')).toBeInTheDocument();
  });

  it('renders one list item per entry with label and value', () => {
    render(
      <BarList
        items={[
          { label: 'Comida', value: '$300', percentage: 60 },
          { label: 'Transporte', value: '$200', percentage: 40 },
        ]}
        emptyMessage={NO_EMPTY}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('$300')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
  });

  it('applies the custom color to the dot and fill when provided', () => {
    const { container } = render(
      <BarList
        items={[{ label: 'Food', value: '$100', percentage: 50, color: '#FF0000' }]}
        emptyMessage={NO_EMPTY}
      />,
    );
    const coloredElements = container.querySelectorAll('[style*="background"]');
    // Two — the dot and the filled bar — both use the custom color inline.
    expect(coloredElements.length).toBeGreaterThanOrEqual(2);
    for (const el of coloredElements) {
      expect((el as HTMLElement).style.backgroundColor).toMatch(/rgb\(255, 0, 0\)|#ff0000/i);
    }
  });

  it('applies the primary theme class when no color is provided', () => {
    const { container } = render(
      <BarList
        items={[{ label: 'Food', value: '$100', percentage: 50 }]}
        emptyMessage={NO_EMPTY}
      />,
    );
    // Dot has the `bg-primary` class when color is null.
    expect(container.querySelector('.bg-primary')).toBeInTheDocument();
  });

  it('clamps percentage width between 0 and 100', () => {
    const { container, rerender } = render(
      <BarList items={[{ label: 'A', value: '$', percentage: 200 }]} emptyMessage={NO_EMPTY} />,
    );
    // The fill is the `<div aria-hidden>` inside the bar track. The dot is a
    // `<span aria-hidden>`, not a div, so `div[aria-hidden]` matches exactly one.
    const fill = () => container.querySelector('div[aria-hidden="true"]') as HTMLElement;
    expect(fill().style.width).toBe('100%');

    rerender(
      <BarList items={[{ label: 'A', value: '$', percentage: -50 }]} emptyMessage={NO_EMPTY} />,
    );
    expect(fill().style.width).toBe('0%');
  });
});
