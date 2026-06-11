'use client';

import { useTranslations } from 'next-intl';

import { ArrowDown, ArrowUp } from 'lucide-react';

import { Select } from '@/presentation/components/ui/Select';

import { cn } from '@/lib/utils';

import { DEBTS_ORDER_BY_OPTIONS, type DebtsOrderBy, type DebtsViewPrefs } from './debts-sort';

interface DebtsViewControlsProps {
  prefs: DebtsViewPrefs;
  onChange: (next: DebtsViewPrefs) => void;
}

/**
 * Order-by Select + a separate direction-toggle button. Visual + spacing
 * shape mirrors `MonthlyServicesViewControls` so the two listing pages
 * feel like the same product. Differences vs that one:
 *   - No group-by (debts has nothing to group by — already pre-grouped
 *     by the backend's `(reference, currency)` summary).
 *   - Direction is a separate icon button instead of being folded into
 *     the order select.
 */
export function DebtsViewControls({ prefs, onChange }: DebtsViewControlsProps) {
  const t = useTranslations('debts.view');

  function toggleDir() {
    onChange({ ...prefs, orderDir: prefs.orderDir === 'asc' ? 'desc' : 'asc' });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{t('sortBy')}</span>
        <Select
          aria-label={t('sortBy')}
          value={prefs.orderBy}
          onChange={(e) => onChange({ ...prefs, orderBy: e.target.value as DebtsOrderBy })}
          className="h-8 px-2 py-0 text-xs"
        >
          {DEBTS_ORDER_BY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`orderBy.${opt}`)}
            </option>
          ))}
        </Select>
      </label>

      <button
        type="button"
        onClick={toggleDir}
        aria-label={prefs.orderDir === 'asc' ? t('toggleToDesc') : t('toggleToAsc')}
        title={prefs.orderDir === 'asc' ? t('toggleToDesc') : t('toggleToAsc')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        )}
      >
        {prefs.orderDir === 'asc' ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        )}
      </button>
    </div>
  );
}
