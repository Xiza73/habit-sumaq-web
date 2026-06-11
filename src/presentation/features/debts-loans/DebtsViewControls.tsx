'use client';

import { useTranslations } from 'next-intl';

import { ArrowDownUp } from 'lucide-react';

import { Select } from '@/presentation/components/ui/Select';

import {
  DEBTS_ORDER_BY_OPTIONS,
  DEBTS_ORDER_DIR_OPTIONS,
  type DebtsOrderBy,
  type DebtsOrderDir,
  type DebtsViewPrefs,
} from './debts-sort';

interface DebtsViewControlsProps {
  prefs: DebtsViewPrefs;
  onChange: (next: DebtsViewPrefs) => void;
}

export function DebtsViewControls({ prefs, onChange }: DebtsViewControlsProps) {
  const t = useTranslations('debts.view');

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <ArrowDownUp className="size-3.5" aria-hidden />
        {t('sortBy')}
      </span>
      <Select
        compact
        value={prefs.orderBy}
        onChange={(e) => onChange({ ...prefs, orderBy: e.target.value as DebtsOrderBy })}
        aria-label={t('sortBy')}
      >
        {DEBTS_ORDER_BY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`orderBy.${opt}`)}
          </option>
        ))}
      </Select>
      <Select
        compact
        value={prefs.orderDir}
        onChange={(e) => onChange({ ...prefs, orderDir: e.target.value as DebtsOrderDir })}
        aria-label={t('direction')}
      >
        {DEBTS_ORDER_DIR_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`orderDir.${opt}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
