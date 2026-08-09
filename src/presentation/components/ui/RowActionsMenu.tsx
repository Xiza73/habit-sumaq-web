'use client';

import { type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type LucideIcon, MoreVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Gap between the trigger and the menu, in px. */
const MENU_OFFSET = 4;
/** Menu width, mirroring the `min-w-44` class, used for the flip math. */
const MENU_MIN_WIDTH = 176;
/** Rough menu height used to decide whether to open upwards. */
const ROW_HEIGHT = 36;
const MENU_PADDING = 8;

interface MenuPosition {
  top: number;
  left: number;
}

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
  /**
   * Optional Tailwind color class for the icon only (e.g. `'text-destructive'`
   * for a debt arrow, `'text-green-700'` for a loan). Preserves the card's
   * red/green iconography inside the shared table actions. `destructive` still
   * governs the label/hover color; this only tints the glyph.
   */
  iconClassName?: string;
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
 *
 * **The open menu is portalled to `document.body` and positioned `fixed`.**
 * It used to be `absolute`, nested in the row. `DataTable` wraps its table in
 * `overflow-x-auto`, and CSS computes the other axis to `auto` whenever one
 * axis is not `visible` — so that container scrolls vertically too, and a menu
 * opened on one of the last rows counted towards its scroll extent and grew a
 * scrollbar on the table. `fixed` + a portal takes the menu out of every
 * scrolling ancestor at once, including ones a caller might add later.
 */
export function RowActionsMenu({
  actions,
  triggerLabel,
  align = 'right',
  className,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Anchor the menu to the trigger in viewport coordinates. Flips above the
   * trigger when the estimated menu height would run past the bottom edge,
   * and clamps horizontally so it never hangs off either side.
   */
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = actions.length * ROW_HEIGHT + MENU_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    const top = openUpwards ? rect.top - estimatedHeight - MENU_OFFSET : rect.bottom + MENU_OFFSET;

    const rawLeft = align === 'right' ? rect.right - MENU_MIN_WIDTH : rect.left;
    const left = Math.max(
      MENU_PADDING,
      Math.min(rawLeft, window.innerWidth - MENU_MIN_WIDTH - MENU_PADDING),
    );

    setPosition({ top, left });
  }, [actions.length, align]);

  // Measure before paint so the menu never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  // Keep the menu glued to its trigger while anything scrolls or the window
  // resizes. `capture` catches scrolls on inner containers too, which do not
  // bubble.
  useEffect(() => {
    if (!open) return;
    const handle = () => reposition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open, reposition]);

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
        ref={triggerRef}
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

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Click-outside catcher. */}
            <div
              className="fixed inset-0 z-40"
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
              // Position comes from the trigger's viewport rect, not from the
              // layout — see the component docblock for why it cannot live in
              // the row. `visibility` keeps it measurable but unseen for the
              // one frame before the first measurement lands.
              style={{
                position: 'fixed',
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? 'visible' : 'hidden',
              }}
              className="z-50 min-w-44 rounded-lg border border-border bg-popover py-1 shadow-lg"
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
                    {Icon && (
                      <Icon className={cn('size-4 shrink-0', action.iconClassName)} aria-hidden />
                    )}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
