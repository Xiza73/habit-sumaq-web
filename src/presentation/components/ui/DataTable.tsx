'use client';

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ColumnAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  /** Stable identifier for the column (used as the React key). */
  key: string;
  /** Header cell content (already-translated node). */
  header: ReactNode;
  /** Cell renderer for a given row. */
  render: (row: T) => ReactNode;
  /** Extra classes for the body cell. */
  className?: string;
  /** Extra classes for the header cell. */
  headerClassName?: string;
  /** Text alignment for both header and body cells. Defaults to `'left'`. */
  align?: ColumnAlign;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Stable React key for a row. */
  getRowKey: (row: T) => string;
  /** Optional whole-row click handler (renders rows as interactive). */
  onRowClick?: (row: T) => void;
  /** Shown in place of the body when `rows` is empty. */
  emptyMessage?: ReactNode;
  /** Keep the header visible while the body scrolls vertically. */
  stickyHeader?: boolean;
  className?: string;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Config-driven, theme-aware table primitive.
 *
 * The shared building block every module's table view is built on. It only
 * knows about `columns` + `rows` + `getRowKey` — all module-specific rendering
 * (formatting, colors, action buttons) lives in the column `render` functions,
 * so the same component serves Debts/Loans today and Monthly Services, Chores,
 * Habits and Categories in WAVE 2.
 *
 * Layout guarantees:
 *   - Wrapped in an `overflow-x-auto` container so wide tables scroll
 *     horizontally on narrow screens instead of breaking the page layout.
 *   - "Chubby" comfortable padding, zebra striping and row hover, all via
 *     Tailwind design tokens (works in light and dark).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage,
  stickyHeader = false,
  className,
}: DataTableProps<T>) {
  const interactive = Boolean(onRowClick);

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-medium',
                  ALIGN_CLASS[col.align ?? 'left'],
                  stickyHeader && 'sticky top-0 z-10 bg-muted/95 backdrop-blur',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                tabIndex={interactive ? 0 : undefined}
                onClick={interactive ? () => onRowClick?.(row) : undefined}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick?.(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-border last:border-b-0 even:bg-muted/30 hover:bg-muted/60',
                  interactive &&
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      ALIGN_CLASS[col.align ?? 'left'],
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
