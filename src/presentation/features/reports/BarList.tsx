import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface BarListItem {
  label: string;
  /** Trailing value rendered on the right (e.g. a formatted currency amount). */
  value: ReactNode;
  /** 0–100. Used to size the filled bar. */
  percentage: number;
  /** Optional dot color next to the label. Falls back to the theme accent. */
  color?: string | null;
}

interface BarListProps {
  items: BarListItem[];
  /**
   * Required so callers always supply localized copy — there's no sane
   * neutral default we can hardcode here without leaking Spanish.
   */
  emptyMessage: string;
}

export function BarList({ items, emptyMessage }: BarListProps) {
  if (items.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <li key={`${item.label}-${idx}`} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn('size-2 shrink-0 rounded-full', item.color ? '' : 'bg-primary')}
                style={item.color ? { backgroundColor: item.color } : undefined}
                aria-hidden="true"
              />
              <span className="truncate font-medium">{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{item.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${clamp(item.percentage, 0, 100)}%`,
                backgroundColor: item.color ?? 'var(--color-primary)',
              }}
              aria-hidden="true"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
