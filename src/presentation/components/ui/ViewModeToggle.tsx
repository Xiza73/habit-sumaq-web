'use client';

import { useTranslations } from 'next-intl';

import { LayoutGrid, Table2 } from 'lucide-react';

import { type ViewMode } from '@/core/application/hooks/use-view-mode';

import { cn } from '@/lib/utils';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

interface ToggleOption {
  value: ViewMode;
  Icon: typeof LayoutGrid;
}

const OPTIONS: ToggleOption[] = [
  { value: 'cards', Icon: LayoutGrid },
  { value: 'table', Icon: Table2 },
];

/**
 * Small segmented control to switch a listing between "cards" and "table".
 *
 * Presentation-only: it does NOT own the mode — pass `mode` / `onChange`
 * (typically from `useViewMode`). Generic on purpose: WAVE 1 wires it into the
 * Debts/Loans dashboard, WAVE 2 reuses it as-is for Monthly Services, Chores,
 * Habits and Categories. Copy comes from the shared `viewMode` i18n namespace.
 */
export function ViewModeToggle({ mode, onChange, className }: ViewModeToggleProps) {
  const t = useTranslations('viewMode');

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={cn('inline-flex rounded-md border border-border p-0.5', className)}
    >
      {OPTIONS.map(({ value, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={t(value)}
            title={t(value)}
            onClick={() => {
              if (!active) onChange(value);
            }}
            className={cn(
              'inline-flex h-7 w-8 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
