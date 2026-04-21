import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TestProviders } from '@/test/utils';

import { DailyFlowChart } from './DailyFlowChart';

// Note: Recharts does not render its SVG inside jsdom (ResponsiveContainer
// needs real layout/width). We scope these tests to what we CAN verify
// deterministically in the DOM — the conditional empty-state branch and
// the presence of the chart wrapper. Visual correctness of the chart is
// covered by manual smoke testing of the Vercel preview.

describe('DailyFlowChart', () => {
  it('renders the empty state when there are no points', () => {
    render(<DailyFlowChart currency="PEN" points={[]} />, { wrapper: TestProviders });
    // Copy from es.json reports.finances.dailyFlow.empty
    expect(screen.getByText(/sin movimientos para graficar/i)).toBeInTheDocument();
  });

  it('does not render the empty-state copy when points are provided', () => {
    render(
      <DailyFlowChart
        currency="PEN"
        points={[
          { date: '2026-04-19', income: 100, expense: 50 },
          { date: '2026-04-20', income: 80, expense: 90 },
        ]}
      />,
      { wrapper: TestProviders },
    );
    // If we're on the chart branch, the empty copy must be absent.
    expect(screen.queryByText(/sin movimientos para graficar/i)).not.toBeInTheDocument();
  });

  it('wraps the chart in a fixed-height container', () => {
    const { container } = render(
      <DailyFlowChart currency="PEN" points={[{ date: '2026-04-19', income: 100, expense: 50 }]} />,
      { wrapper: TestProviders },
    );
    // Defensive: guarantee the chart area has the h-64 class so the user
    // always gets a consistent chart slot even before Recharts paints.
    expect(container.querySelector('.h-64')).toBeInTheDocument();
  });
});
