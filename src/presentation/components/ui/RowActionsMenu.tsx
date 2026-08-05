'use client';

import { type MouseEvent, useEffect, useRef, useState } from 'react';

import { type LucideIcon, MoreVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A single actionable entry in a {@link RowActionsMenu} / `TableRowActions`.
 * Labels are passed in already-translated (i18n-friendly), so the shared
 * components never reach for `useTranslations` themselves.
 */
export interface RowAction {
  /** Stable identifier — used as the React key. */
  id: string;
  /** Already-translated, human-readable label. Doubles as the a11y name. */
  label: string;
  /** Optional icon; shown inline (icon-only) and beside the label in the menu. */
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  /** Renders the action in the destructive color (e.g. delete). */
  destructive?: boolean;
}

interface RowActionsMenuProps {
  actions: RowAction[];
  /** Accessible label for the kebab trigger (e.g. the table's "Actions" copy). */
  triggerLabel: string;
  /** Which edge the dropdown aligns to. Defaults to `'right'`. */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * A kebab (`⋯`) trigger that opens a dropdown list of {@link RowAction}s.
 *
 * Generalizes the hand-rolled overflow menu from `MonthlyServiceCard` into a
 * shared primitive so every table collapses its row actions the same way.
 * Accessible: `aria-haspopup`/`aria-expanded` on the trigger, `role="menu"` +
 * `role="menuitem"` on the list, closes on Escape, on click-outside, and after
 * an item runs. All clicks `stopPropagation` so the menu can live inside a
 * clickable table row without triggering the row's own handler.
 */
export function RowActionsMenu({
  actions,
  triggerLabel,
  align = 'right',
  className,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // First menu item gets focus when the menu opens, so keyboard users land
  // inside the list instead of staying on the trigger.
  useEffect(() => {
    if (!open) return;
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [open]);

  function handleTriggerClick(e: MouseEvent) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  function runAction(e: MouseEvent, action: RowAction) {
    e.stopPropagation();
    setOpen(false);
    action.onClick();
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MoreVertical className="size-4" aria-hidden />
      </button>

      {open && (
        <>
          {/* Click-outside / Escape catcher. */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            role="presentation"
          />
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
            className={cn(
              'absolute top-full z-20 mt-1 min-w-44 rounded-lg border border-border bg-popover py-1 shadow-lg',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={(e) => runAction(e, action)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    action.destructive && 'text-destructive',
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
