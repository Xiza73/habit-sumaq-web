'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { type HabitLog } from '@/core/domain/entities/habit';

import { cn } from '@/lib/utils';

const MIN_WEEKS = 10;
const MAX_WEEKS = 52;
const CELL_SIZE = 14;
const CELL_GAP = 3;
const DAY_LABEL_WIDTH = 24;
const PADDING = 48; // p-6 * 2

interface HabitHeatmapProps {
  logs: HabitLog[];
  targetCount: number;
  color: string | null;
}

function getLevel(count: number, target: number): number {
  if (count === 0) return 0;
  const ratio = count / target;
  if (ratio >= 1) return 4;
  if (ratio >= 0.67) return 3;
  if (ratio >= 0.34) return 2;
  return 1;
}

function getLevelOpacity(level: number): number {
  switch (level) {
    case 1:
      return 0.2;
    case 2:
      return 0.4;
    case 3:
      return 0.7;
    case 4:
      return 1;
    default:
      return 0;
  }
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calculateWeeks(containerWidth: number): number {
  const available = containerWidth - PADDING - DAY_LABEL_WIDTH - 4;
  const weeks = Math.floor((available + CELL_GAP) / (CELL_SIZE + CELL_GAP));
  return Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, weeks));
}

export function HabitHeatmap({ logs, targetCount, color }: HabitHeatmapProps) {
  const t = useTranslations('habits');
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(MIN_WEEKS);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    flippedDown: boolean;
  } | null>(null);

  const updateWeeks = useCallback(() => {
    if (containerRef.current) {
      setWeeks(calculateWeeks(containerRef.current.clientWidth));
    }
  }, []);

  useEffect(() => {
    updateWeeks();
    const observer = new ResizeObserver(updateWeeks);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWeeks]);

  const logMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    for (const log of logs) {
      map.set(log.date.slice(0, 10), log);
    }
    return map;
  }, [logs]);

  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDay();
    const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;

    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() + mondayOffset);

    const startDate = new Date(currentWeekMonday);
    startDate.setDate(currentWeekMonday.getDate() - (weeks - 1) * 7);

    const weeksArr: { date: Date; key: string; isToday: boolean; isFuture: boolean }[][] = [];
    const months: { label: string; col: number }[] = [];
    const todayKey = toDateKey(today);

    let lastMonth = -1;
    const cursor = new Date(startDate);

    for (let w = 0; w < weeks; w++) {
      const week: { date: Date; key: string; isToday: boolean; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(cursor);
        const key = toDateKey(cellDate);
        week.push({
          date: cellDate,
          key,
          isToday: key === todayKey,
          isFuture: cellDate > today,
        });

        if (d === 0 && cellDate.getMonth() !== lastMonth) {
          lastMonth = cellDate.getMonth();
          months.push({
            label: cellDate.toLocaleDateString(locale, { month: 'short' }),
            col: w,
          });
        }

        cursor.setDate(cursor.getDate() + 1);
      }
      weeksArr.push(week);
    }

    return { grid: weeksArr, monthLabels: months };
  }, [locale, weeks]);

  const baseColor = color ?? 'var(--primary)';

  const dayLabels = useMemo(() => {
    const days: string[] = [];
    const baseDate = new Date(2026, 0, 5);
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push(d.toLocaleDateString(locale, { weekday: 'narrow' }));
    }
    return days;
  }, [locale]);

  const gridWidth = weeks * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const gridHeight = 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const monthLabelHeight = 20;
  const svgWidth = DAY_LABEL_WIDTH + gridWidth + 4;
  const tooltipWidth = 100;
  const tooltipHeight = 22;

  function handleCellHover(
    e: React.MouseEvent<SVGRectElement>,
    dateKey: string,
    count: number,
    isFuture: boolean,
  ) {
    if (isFuture) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.closest('svg')!.getBoundingClientRect();
    const dateStr = new Date(dateKey + 'T12:00:00').toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
    });
    const rawX = rect.left - parentRect.left + CELL_SIZE / 2;
    const rawY = rect.top - parentRect.top;
    const clampedX = Math.max(tooltipWidth / 2, Math.min(rawX, svgWidth - tooltipWidth / 2));
    const flippedDown = rawY - tooltipHeight - 8 < 0;
    setTooltip({
      text: `${dateStr} · ${count}/${targetCount}`,
      x: clampedX,
      y: flippedDown ? rawY + CELL_SIZE + 8 + tooltipHeight : rawY - 8,
      flippedDown,
    });
  }

  return (
    <div ref={containerRef} className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{t('history')}</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t('less')}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn('size-3 rounded-sm', level === 0 && 'bg-muted')}
              style={
                level > 0
                  ? { backgroundColor: baseColor, opacity: getLevelOpacity(level) }
                  : undefined
              }
            />
          ))}
          <span>{t('more')}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={monthLabelHeight + gridHeight + 4}
          className="relative"
        >
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={DAY_LABEL_WIDTH + m.col * (CELL_SIZE + CELL_GAP)}
              y={12}
              className="fill-muted-foreground text-[10px]"
            >
              {m.label}
            </text>
          ))}

          {dayLabels.map((label, i) => {
            if (i % 2 === 1) return null;
            return (
              <text
                key={i}
                x={0}
                y={monthLabelHeight + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            );
          })}

          {grid.map((week, wIdx) =>
            week.map((cell, dIdx) => {
              const log = logMap.get(cell.key);
              const count = log?.count ?? 0;
              const level = cell.isFuture ? -1 : getLevel(count, targetCount);

              return (
                <rect
                  key={cell.key}
                  x={DAY_LABEL_WIDTH + wIdx * (CELL_SIZE + CELL_GAP)}
                  y={monthLabelHeight + dIdx * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={3}
                  className={cn(
                    'transition-opacity',
                    level === -1 && 'fill-transparent',
                    level === 0 && 'fill-muted',
                    cell.isToday && 'stroke-foreground/30',
                  )}
                  style={
                    level > 0 ? { fill: baseColor, opacity: getLevelOpacity(level) } : undefined
                  }
                  strokeWidth={cell.isToday ? 1.5 : 0}
                  onMouseEnter={(e) => handleCellHover(e, cell.key, count, cell.isFuture)}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            }),
          )}

          {tooltip && (
            <g>
              <rect
                x={tooltip.x - tooltipWidth / 2}
                y={tooltip.y - tooltipHeight}
                width={tooltipWidth}
                height={tooltipHeight}
                rx={6}
                className="fill-popover stroke-border"
                strokeWidth={1}
              />
              <text
                x={tooltip.x}
                y={tooltip.y - tooltipHeight / 2 + 4}
                textAnchor="middle"
                className="fill-popover-foreground text-[11px] font-medium"
              >
                {tooltip.text}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
