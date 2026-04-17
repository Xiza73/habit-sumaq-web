import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type HabitLog } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitHeatmap } from './HabitHeatmap';

const FIXED_NOW = new Date('2026-04-17T12:00:00');

function buildLog(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: overrides.id ?? 'log-1',
    habitId: overrides.habitId ?? 'habit-1',
    date: overrides.date ?? '2026-04-15',
    count: overrides.count ?? 0,
    completed: overrides.completed ?? false,
    note: overrides.note ?? null,
    createdAt: overrides.createdAt ?? '2026-04-15T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-04-15T10:00:00.000Z',
  };
}

function renderHeatmap(logs: HabitLog[] = [], targetCount = 8, color: string | null = '#2196F3') {
  return render(<HabitHeatmap logs={logs} targetCount={targetCount} color={color} />, {
    wrapper: TestProviders,
  });
}

describe('HabitHeatmap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders history heading and legend labels', () => {
    renderHeatmap();
    expect(screen.getByText('Historial')).toBeInTheDocument();
    expect(screen.getByText('Menos')).toBeInTheDocument();
    expect(screen.getByText('Más')).toBeInTheDocument();
  });

  it('renders exactly 5 legend swatches', () => {
    const { container } = renderHeatmap();
    const swatches = container.querySelectorAll('.size-3.rounded-sm');
    expect(swatches).toHaveLength(5);
  });

  it('renders at least 70 rect elements (MIN_WEEKS * 7 days)', () => {
    const { container } = renderHeatmap();
    const rects = container.querySelectorAll('svg rect');
    // MIN_WEEKS=10 × 7 days = 70 grid cells. Stays at MIN_WEEKS because
    // the ResizeObserver stub never fires. No tooltip initially → no extra rect.
    expect(rects.length).toBeGreaterThanOrEqual(70);
  });

  it('applies habit color to cells with count > 0', () => {
    const logs = [buildLog({ date: '2026-04-15', count: 5 })];
    const { container } = renderHeatmap(logs, 8, '#FF0000');

    const filledRects = Array.from(container.querySelectorAll<SVGRectElement>('svg rect')).filter(
      (r) => r.getAttribute('style')?.includes('fill'),
    );
    expect(filledRects.length).toBeGreaterThan(0);

    const styleAttr = filledRects[0].getAttribute('style') ?? '';
    expect(styleAttr.toLowerCase()).toMatch(/#ff0000|rgb\(255,\s*0,\s*0\)/);
  });

  it('falls back to var(--primary) when color is null', () => {
    const logs = [buildLog({ date: '2026-04-15', count: 5 })];
    const { container } = renderHeatmap(logs, 8, null);

    const filledRects = Array.from(container.querySelectorAll<SVGRectElement>('svg rect')).filter(
      (r) => r.getAttribute('style')?.includes('fill'),
    );
    expect(filledRects.length).toBeGreaterThan(0);
    expect(filledRects[0].getAttribute('style') ?? '').toMatch(/var\(--primary\)/);
  });

  it('shows tooltip on cell hover with date and count', () => {
    const logs = [buildLog({ date: '2026-04-15', count: 3 })];
    const { container } = renderHeatmap(logs, 8);

    const filledRect = Array.from(container.querySelectorAll<SVGRectElement>('svg rect')).find(
      (r) => r.getAttribute('style')?.includes('fill'),
    );
    expect(filledRect).toBeDefined();

    fireEvent.mouseEnter(filledRect!);

    expect(screen.getByText(/·\s*3\/8$/)).toBeInTheDocument();
  });

  it('hides tooltip on mouseLeave', () => {
    const logs = [buildLog({ date: '2026-04-15', count: 3 })];
    const { container } = renderHeatmap(logs, 8);

    const filledRect = Array.from(container.querySelectorAll<SVGRectElement>('svg rect')).find(
      (r) => r.getAttribute('style')?.includes('fill'),
    );
    expect(filledRect).toBeDefined();

    fireEvent.mouseEnter(filledRect!);
    expect(screen.getByText(/·\s*3\/8$/)).toBeInTheDocument();

    fireEvent.mouseLeave(filledRect!);
    expect(screen.queryByText(/·\s*3\/8$/)).not.toBeInTheDocument();
  });

  it('does not show tooltip on future cells', () => {
    const { container } = renderHeatmap();

    const futureRect = Array.from(container.querySelectorAll<SVGRectElement>('svg rect')).find(
      (r) => r.getAttribute('class')?.includes('fill-transparent'),
    );
    expect(futureRect).toBeDefined();

    fireEvent.mouseEnter(futureRect!);

    // No tooltip text is rendered because handleCellHover returns early on isFuture
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('renders month labels', () => {
    const { container } = renderHeatmap();
    // Month labels and day labels are both <text className="fill-muted-foreground ...">.
    // Month labels have x >= DAY_LABEL_WIDTH (24); day labels have x === 0.
    const labels = Array.from(container.querySelectorAll<SVGTextElement>('svg text'));
    const monthLabels = labels.filter((t) => {
      const x = Number(t.getAttribute('x'));
      return x > 0;
    });
    expect(monthLabels.length).toBeGreaterThan(0);
  });

  it('renders day-of-week labels on even indices (4 labels)', () => {
    const { container } = renderHeatmap();
    const labels = Array.from(container.querySelectorAll<SVGTextElement>('svg text'));
    const dayLabels = labels.filter((t) => t.getAttribute('x') === '0');
    expect(dayLabels).toHaveLength(4);
  });
});
