'use client';

import { type MouseEvent } from 'react';

import { cn } from '@/lib/utils';

import { type RowAction, RowActionsMenu } from './RowActionsMenu';

interface TableRowActionsProps {
  actions: RowAction[];
  /** Accessible label for the collapsed kebab trigger. */
  triggerLabel: string;
  className?: string;
}

/**
 * Responsive row-actions cell for table views.
 *
 * On wide screens (`xl` and up) it shows the actions INLINE as icon buttons;
 * below that breakpoint the whole set COLLAPSES into a single {@link RowActionsMenu}
 * kebab dropdown — so modules with many per-row actions stop looking cramped on
 * narrow widths. Both renditions are driven by the SAME `actions` list, so the
 * inline buttons and the dropdown items always stay in parity.
 *
 * Every click `stopPropagation`s, so this is safe to drop inside a clickable
 * `DataTable` row without triggering the row's own click handler.
 */
export function TableRowActions({ actions, triggerLabel, className }: TableRowActionsProps) {
  function run(e: MouseEvent, action: RowAction) {
    e.stopPropagation();
    action.onClick();
  }

  return (
    <>
      {/* Inline icon buttons — wide screens. */}
      <div className={cn('hidden items-center justify-end gap-1 xl:flex', className)}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={(e) => run(e, action)}
              disabled={action.disabled}
              aria-label={action.label}
              title={action.label}
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
                action.destructive
                  ? 'text-destructive'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon ? (
                <Icon className={cn('size-3.5', action.iconClassName)} aria-hidden />
              ) : (
                <span className="px-1 text-xs font-medium">{action.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapsed kebab dropdown — narrow screens. */}
      <div className="flex justify-end xl:hidden">
        <RowActionsMenu actions={actions} triggerLabel={triggerLabel} />
      </div>
    </>
  );
}
