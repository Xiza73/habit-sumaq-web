'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';

import { enUS, es, type Locale, ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { useDateFormat } from '@/core/application/hooks/use-user-settings';

import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import 'react-day-picker/dist/style.css';

/**
 * Drop-in replacement for `<Input type="date">` that respects the user's
 * `userSettings.dateFormat` preference for the displayed text. The native
 * HTML date input ignored that setting because it renders in the browser /
 * OS locale, which led to inconsistencies (e.g. a user with `DD/MM/YYYY`
 * preference seeing `MM/DD/YYYY` because Chrome was set to en-US).
 *
 * Wire format stays `YYYY-MM-DD` — same as before — so callers using
 * `react-hook-form` + Zod schemas don't have to change anything besides
 * wrapping with `<Controller>`.
 *
 * Calendar popover is rendered via `createPortal` so it's not clipped by
 * scrollable Modal containers. Click-outside + Escape close it.
 */

interface DatePickerProps {
  /** Current value as `YYYY-MM-DD`. Empty string means "no date selected". */
  value: string;
  /** Fires with `YYYY-MM-DD` on pick, or empty string on clear. */
  onChange: (value: string) => void;
  /** id for the trigger button — used by `<label htmlFor>`. */
  id?: string;
  /** Form name (rarely needed since RHF wires via `Controller`). */
  name?: string;
  /** Shown when value is empty. */
  placeholder?: string;
  /** Min selectable date as `YYYY-MM-DD`. Days before are disabled. */
  min?: string;
  /** Max selectable date as `YYYY-MM-DD`. Days after are disabled. */
  max?: string;
  /** Compact (h-9) instead of default (h-10). Matches `<Input compact>`. */
  compact?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** ARIA label for accessibility when there's no visible label. */
  'aria-label'?: string;
}

const LOCALE_MAP: Record<string, Locale> = {
  es,
  en: enUS,
  pt: ptBR,
};

function parseYmd(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  id,
  name,
  placeholder,
  min,
  max,
  compact,
  disabled,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const dateFormat = useDateFormat();

  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Compute popover position from the trigger's bounding rect on every open.
  // We reposition on scroll/resize so the popover follows the trigger if the
  // user scrolls a containing modal.
  //
  // The default placement is below the trigger, left-aligned with it. That
  // works fine when the trigger is on the left of the viewport, but on
  // mobile (or any narrow viewport) when the trigger sits on the right,
  // the popover would spill past the right edge and clip the last day
  // columns of the calendar. We clamp horizontally to keep the popover
  // fully inside the viewport, and flip vertically (render ABOVE the
  // trigger) when there's no room below.
  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Mobile-aware size estimate. react-day-picker's default desktop
      // layout is ~320×360 (7 cells × 44px + padding + nav). Below the
      // `640px` breakpoint, the @media-query overrides in globals.css
      // shrink day cells to 36px → calendar is roughly 260×320. Using the
      // matching estimate per breakpoint prevents the placement code from
      // over-shifting the popover when the actual rendered size is
      // smaller than the desktop estimate.
      const isMobile = window.innerWidth < 640;
      const POPOVER_WIDTH = isMobile ? 260 : 320;
      const POPOVER_HEIGHT = isMobile ? 320 : 360;
      const EDGE_PADDING = 8;

      // Default placement: 4px below the trigger, left edges aligned.
      let top = rect.bottom + window.scrollY + 4;
      let left = rect.left + window.scrollX;
      const triggerRight = rect.right + window.scrollX;

      // Horizontal overflow handling. The default left-align makes sense
      // when there's room to the right of the trigger. When the popover
      // would spill past the viewport edge, prefer aligning the popover's
      // RIGHT edge with the trigger's right edge — that preserves the
      // visual connection between the trigger and the popover (it looks
      // like the popover hangs off the right corner of the date input,
      // rather than being dumped somewhere in space). Fall back to
      // viewport-edge clamping only when even right-alignment would
      // overflow the LEFT edge (very narrow viewports where the popover
      // is wider than the space between the trigger.right and viewport.left).
      const viewportRight = window.scrollX + window.innerWidth - EDGE_PADDING;
      if (left + POPOVER_WIDTH > viewportRight) {
        const rightAlignedLeft = triggerRight - POPOVER_WIDTH;
        if (rightAlignedLeft >= window.scrollX + EDGE_PADDING) {
          left = rightAlignedLeft;
        } else {
          left = viewportRight - POPOVER_WIDTH;
        }
      }
      left = Math.max(window.scrollX + EDGE_PADDING, left);

      // Vertical flip: if "below" overflows the bottom edge, try rendering
      // above the trigger instead. Only flip when there's actually room
      // above; otherwise stay below and accept that the popover may need
      // to scroll internally (react-day-picker doesn't, but the user can
      // still see the upper rows).
      const viewportBottom = window.scrollY + window.innerHeight - EDGE_PADDING;
      if (top + POPOVER_HEIGHT > viewportBottom) {
        const aboveTop = rect.top + window.scrollY - POPOVER_HEIGHT - 4;
        if (aboveTop >= window.scrollY + EDGE_PADDING) {
          top = aboveTop;
        }
      }

      setPopoverPos({ top, left });
    }

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // Close on click-outside and Escape. Restores focus to the trigger so
  // keyboard users don't lose their place.
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const display = value ? formatDate(value, dateFormat) : '';
  const selected = parseYmd(value);
  const minDate = min ? parseYmd(min) : undefined;
  const maxDate = max ? parseYmd(max) : undefined;
  const dpLocale = LOCALE_MAP[locale] ?? enUS;

  function handleSelect(date: Date | undefined) {
    onChange(date ? formatYmd(date) : '');
    if (date) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
    triggerRef.current?.focus();
  }

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-border bg-background text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          compact ? 'h-9 px-2 py-1' : 'h-10 px-3 py-2',
          // Right-pad more when there's a clear button to avoid the X
          // overlapping the calendar icon.
          value && !disabled ? 'pr-16' : 'pr-9',
        )}
      >
        <span className={cn('truncate', !display && 'text-muted-foreground')}>
          {display || placeholder || ''}
        </span>
      </button>

      {/* Clear button — absolute so it sits on top of the trigger without
          violating the "button inside button" rule. Only appears when there
          is a value to clear. */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={tCommon('clear')}
          tabIndex={-1}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}

      <CalendarIcon
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50"
        aria-hidden="true"
      />

      {open &&
        popoverPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel ?? placeholder ?? 'date picker'}
            style={{
              position: 'absolute',
              top: popoverPos.top,
              left: popoverPos.left,
              // Safety net: even if the placement estimate is off, the
              // popover physically can't exceed the viewport width minus
              // the edge padding either side. Combined with the smart
              // placement above this catches any sizing surprise (custom
              // fonts, dropdown caption, etc.).
              maxWidth: 'calc(100vw - 16px)',
              zIndex: 60,
            }}
            className="rounded-md border border-border bg-popover p-3 shadow-lg"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected ?? new Date()}
              locale={dpLocale}
              disabled={
                minDate || maxDate
                  ? [
                      ...(minDate ? [{ before: minDate }] : []),
                      ...(maxDate ? [{ after: maxDate }] : []),
                    ]
                  : undefined
              }
              autoFocus
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
