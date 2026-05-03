'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';

import { enUS, es, type Locale, ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { useUserSettings } from '@/core/application/hooks/use-user-settings';

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
  const { data: settings } = useUserSettings();
  const dateFormat = settings?.dateFormat ?? 'YYYY-MM-DD';

  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Compute popover position from the trigger's bounding rect on every open.
  // We reposition on scroll/resize so the popover follows the trigger if the
  // user scrolls a containing modal.
  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPopoverPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
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
              zIndex: 60,
            }}
            className="rounded-md border border-border bg-popover p-2 shadow-lg"
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
