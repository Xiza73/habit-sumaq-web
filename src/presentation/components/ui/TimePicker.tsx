'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { Clock, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Companion to {@link DatePicker} for a wall-clock time.
 *
 * Deliberately NOT a native `<input type="time">`: that renders in the
 * browser/OS locale and chrome, so next to our own DatePicker trigger it read
 * as a different control from a different app. This mirrors the DatePicker's
 * trigger, portalled popover, click-outside/Escape close and clear button, so
 * a date+time pair looks like one thing.
 *
 * Wire format is `HH:mm` (24h) — the same string the backend stores, so
 * callers wire it through `<Controller>` exactly like DatePicker.
 */
interface TimePickerProps {
  /** Current value as `HH:mm`. Empty string means "no time selected". */
  value: string;
  /** Fires with `HH:mm` on pick, or empty string on clear. */
  onChange: (value: string) => void;
  /** id for the trigger button — used by `<label htmlFor>`. */
  id?: string;
  /** Shown when value is empty. */
  placeholder?: string;
  /** Minutes between options. 15 keeps the list scannable; 5 for finer control. */
  step?: 5 | 10 | 15 | 30;
  /** Compact (h-9) instead of default (h-10). Matches `<Input compact>`. */
  compact?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

const EDGE_PADDING = 8;
const POPOVER_WIDTH = 168;
const POPOVER_HEIGHT = 260;

export function TimePicker({
  value,
  onChange,
  id,
  placeholder,
  step = 15,
  compact,
  disabled,
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const tCommon = useTranslations('common');

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // Same placement contract as DatePicker: below the trigger by default,
  // flipped above when there is no room, clamped inside the viewport, and
  // repositioned on scroll so it follows a trigger inside a scrolling Modal.
  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const height = popoverRef.current?.getBoundingClientRect().height ?? POPOVER_HEIGHT;
      const width = popoverRef.current?.getBoundingClientRect().width ?? POPOVER_WIDTH;

      const below = rect.bottom + window.scrollY + 4;
      const fitsBelow = rect.bottom + height + EDGE_PADDING <= window.innerHeight;
      const top = fitsBelow ? below : rect.top + window.scrollY - height - 4;

      const left = Math.max(
        EDGE_PADDING,
        Math.min(rect.left + window.scrollX, window.innerWidth - width - EDGE_PADDING),
      );

      setPos({ top, left });
    }

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // Bring the current selection into view when the list opens — with 96
  // options at 15-minute steps, opening at midnight every time is useless.
  useEffect(() => {
    if (open && pos) selectedRef.current?.scrollIntoView({ block: 'center' });
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
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

  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    options.push(`${h}:${m}`);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
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
          value && !disabled ? 'pr-16' : 'pr-9',
        )}
      >
        <span className={cn('truncate tabular-nums', !value && 'text-muted-foreground')}>
          {value || placeholder || ''}
        </span>
      </button>

      {/* Absolute, like DatePicker's — a button inside a button is invalid. */}
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={tCommon('clear')}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}

      <Clock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
            className="absolute z-50 max-h-[260px] overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
          >
            {options.map((option) => {
              const isSelected = option === value;
              return (
                <button
                  key={option}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center rounded px-2 py-1.5 text-sm tabular-nums transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
