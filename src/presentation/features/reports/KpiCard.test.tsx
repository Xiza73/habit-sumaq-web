import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Balance" value="$1,000" />);
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<KpiCard label="Balance" value="$1,000" subtitle="3 cuentas" />);
    expect(screen.getByText('3 cuentas')).toBeInTheDocument();
  });

  it('omits subtitle when not provided', () => {
    const { container } = render(<KpiCard label="Balance" value="$1,000" />);
    // Only one small muted span should exist (the label); no subtitle leak.
    const mutedSpans = container.querySelectorAll('.text-muted-foreground');
    // label uses text-muted-foreground too; subtitle would add a second one.
    // Expect 1 (the label); if subtitle were rendered it'd be 2.
    expect(mutedSpans).toHaveLength(1);
  });

  it('applies custom valueClassName to the value span', () => {
    render(<KpiCard label="Net" value="$500" valueClassName="text-emerald-500" />);
    expect(screen.getByText('$500')).toHaveClass('text-emerald-500');
  });

  it('renders a footer slot when provided', () => {
    render(
      <KpiCard
        label="Rate"
        value="80%"
        footer={<div data-testid="footer-progress">progress bar</div>}
      />,
    );
    expect(screen.getByTestId('footer-progress')).toBeInTheDocument();
  });

  it('accepts ReactNode values (not just strings)', () => {
    render(
      <KpiCard
        label="Custom"
        value={
          <span>
            <strong>Bold</strong> text
          </span>
        }
      />,
    );
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('Bold').tagName).toBe('STRONG');
  });
});
