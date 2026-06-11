'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { BellOff } from 'lucide-react';

import { useDismissAllDismissable } from '@/core/application/hooks/use-alerts';
import { type Alert } from '@/core/domain/entities/alert';

import { AlertItem } from './AlertItem';

interface AlertsPopoverProps {
  open: boolean;
  onClose: () => void;
  /** Ref of the trigger button — used to anchor the popover + restore focus. */
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  alerts: Alert[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Portal-anchored alerts list. Mirrors the placement strategy in DatePicker
 * (smart horizontal clamping + vertical flip), but the popover content is
 * a static-height scroll container — much simpler than the calendar.
 *
 * Closes on click-outside and Escape. The TRIGGER is responsible for
 * calling `markSeen` when the popover opens (state lives in the parent
 * `AlertsBell` so the bell badge can update optimistically).
 */
export function AlertsPopover({
  open,
  onClose,
  anchorRef,
  alerts,
  isLoading,
  isError,
}: AlertsPopoverProps) {
  const t = useTranslations('alerts');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const dismissAll = useDismissAllDismissable();

  // Split the visible list into "user can close them" vs "user can't" so
  // the header button and the footer hint can render conditionally without
  // recomputing on every paint. `useMemo` is overkill for this size, but
  // it lines up with the codebase's preference (and keeps the deps array
  // explicit).
  const dismissableIds = useMemo(
    () => alerts.filter((a) => a.isDismissable).map((a) => a.id),
    [alerts],
  );
  const hasPersistent = useMemo(() => alerts.some((a) => !a.isDismissable), [alerts]);

  function handleDismissAll() {
    if (dismissableIds.length === 0 || dismissAll.isPending) return;
    dismissAll.mutate(dismissableIds);
  }

  // Position the popover relative to the trigger. We right-align by default
  // (bell sits in the top-right of the header), and reposition on
  // scroll/resize so it follows if the user scrolls.
  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const popoverRect = popoverRef.current?.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      const popoverWidth = popoverRect?.width ?? (isMobile ? 320 : 380);
      const popoverHeight = popoverRect?.height ?? 320;
      const EDGE = 8;

      let top = rect.bottom + window.scrollY + 6;
      // Right-align with the trigger's right edge — that's where users
      // expect a bell-popover to drop from.
      let left = rect.right + window.scrollX - popoverWidth;

      // Clamp horizontally so we never spill past the viewport.
      const viewportLeft = window.scrollX + EDGE;
      const viewportRight = window.scrollX + window.innerWidth - EDGE;
      if (left < viewportLeft) left = viewportLeft;
      if (left + popoverWidth > viewportRight) left = viewportRight - popoverWidth;

      // Vertical flip — only when there's actually room above.
      const viewportBottom = window.scrollY + window.innerHeight - EDGE;
      if (top + popoverHeight > viewportBottom) {
        const aboveTop = rect.top + window.scrollY - popoverHeight - 6;
        if (aboveTop >= window.scrollY + EDGE) top = aboveTop;
      }

      setPos((prev) => {
        if (prev && Math.abs(prev.top - top) < 1 && Math.abs(prev.left - left) < 1) return prev;
        return { top, left };
      });
    }

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, anchorRef]);

  // Click-outside + Escape.
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        anchorRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={t('popoverLabel')}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        maxWidth: 'calc(100vw - 16px)',
        zIndex: 60,
      }}
      className="w-80 rounded-md border border-border bg-popover shadow-lg sm:w-96"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
        {/* The "dismiss all" affordance only earns its space when there's >= 2
            per-day alerts to close. With 0 or 1, the individual X covers it
            and adding a second control would just be noise. */}
        {dismissableIds.length >= 2 && (
          <button
            type="button"
            onClick={handleDismissAll}
            disabled={dismissAll.isPending}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            {t('dismissAll')}
          </button>
        )}
      </header>

      <div className="max-h-96 overflow-y-auto p-3" role="list">
        {isLoading && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t('loading')}</p>
        )}

        {isError && !isLoading && (
          <p className="px-2 py-6 text-center text-sm text-destructive">{t('error')}</p>
        )}

        {!isLoading && !isError && alerts.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <BellOff className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          </div>
        )}

        {!isLoading && !isError && alerts.length > 0 && (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.id}>
                <AlertItem alert={a} onNavigate={onClose} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hint that surfaces only when there are persistent alerts staying put.
          The whole point of distinguishing per-day vs persistent is the
          user-facing promise that persistent goes away "when you fix it" —
          this footer says so out loud after a dismiss-all, so the leftover
          rows don't read like the button failed. */}
      {!isLoading && !isError && hasPersistent && (
        <footer className="border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">{t('persistentHint')}</p>
        </footer>
      )}
    </div>,
    document.body,
  );
}
