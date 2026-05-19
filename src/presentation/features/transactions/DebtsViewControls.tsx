'use client';

import { useTranslations } from 'next-intl';

import { ArrowDown, ArrowUp } from 'lucide-react';

import { Select } from '@/presentation/components/ui/Select';

import { cn } from '@/lib/utils';

import { DEBTS_ORDER_BY_OPTIONS, type DebtsViewPrefs } from './debts-sort';

interface DebtsViewControlsProps {
  prefs: DebtsViewPrefs;
  onChange: (partial: Partial<DebtsViewPrefs>) => void;
}

/**
 * Compact controls mirroring the monthly-services view-controls shape:
 * an order-by dropdown + an asc/desc direction toggle. There's no
 * group-by because debts only need flat sorting today.
 *
 * State is local to the parent (`DebtsDashboard`) — not persisted in
 * user_settings — so changes here are session-scoped and don't hit the
 * network. If we ever want this to survive logout/refresh we'd promote
 * it to user_settings the same way servicios does.
 */
export function DebtsViewControls({ prefs, onChange }: DebtsViewControlsProps) {
  const t = useTranslations('transactions.debtsSummary.viewControls');

  function toggleDir() {
    onChange({ orderDir: prefs.orderDir === 'asc' ? 'desc' : 'asc' });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{t('orderLabel')}</span>
        <Select
          aria-label={t('orderLabel')}
          value={prefs.orderBy}
          onChange={(e) => onChange({ orderBy: e.target.value as typeof prefs.orderBy })}
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
