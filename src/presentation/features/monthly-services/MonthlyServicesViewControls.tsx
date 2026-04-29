'use client';

import { useTranslations } from 'next-intl';

import { ArrowDown, ArrowUp } from 'lucide-react';

import { type MonthlyServicesViewPrefs } from '@/core/application/hooks/use-monthly-services-view-prefs';
import {
  MONTHLY_SERVICES_GROUP_BY_OPTIONS,
  MONTHLY_SERVICES_ORDER_BY_OPTIONS,
  MonthlyServicesOrderDir,
} from '@/core/domain/enums/common.enums';

import { Select } from '@/presentation/components/ui/Select';

import { cn } from '@/lib/utils';

interface MonthlyServicesViewControlsProps {
  prefs: MonthlyServicesViewPrefs;
  onChange: (partial: Partial<MonthlyServicesViewPrefs>) => void;
}

/**
 * Three controls in one compact group:
 *  - Group-by select  (none / status / frequency / category)
 *  - Order-by select  (name / dueDay / nextDuePeriod / estimatedAmount / createdAt)
 *  - Direction toggle (asc / desc)
 *
 * Each change calls `onChange` with the partial that changed — the parent
 * hook handles optimistic update, debounce, and PATCH to user_settings.
 */
export function MonthlyServicesViewControls({ prefs, onChange }: MonthlyServicesViewControlsProps) {
  const t = useTranslations('monthlyServices.viewControls');

  function toggleDir() {
    onChange({
      orderDir:
        prefs.orderDir === MonthlyServicesOrderDir.ASC
          ? MonthlyServicesOrderDir.DESC
          : MonthlyServicesOrderDir.ASC,
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{t('groupLabel')}</span>
        <Select
          aria-label={t('groupLabel')}
          value={prefs.groupBy}
          onChange={(e) => onChange({ groupBy: e.target.value as typeof prefs.groupBy })}
          className="h-8 px-2 py-0 text-xs"
        >
          {MONTHLY_SERVICES_GROUP_BY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`groupBy.${opt}`)}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{t('orderLabel')}</span>
        <Select
          aria-label={t('orderLabel')}
          value={prefs.orderBy}
          onChange={(e) => onChange({ orderBy: e.target.value as typeof prefs.orderBy })}
          className="h-8 px-2 py-0 text-xs"
        >
          {MONTHLY_SERVICES_ORDER_BY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`orderBy.${opt}`)}
            </option>
          ))}
        </Select>
      </label>

      <button
        type="button"
        onClick={toggleDir}
        aria-label={
          prefs.orderDir === MonthlyServicesOrderDir.ASC ? t('toggleToDesc') : t('toggleToAsc')
        }
        title={
          prefs.orderDir === MonthlyServicesOrderDir.ASC ? t('toggleToDesc') : t('toggleToAsc')
        }
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        )}
      >
        {prefs.orderDir === MonthlyServicesOrderDir.ASC ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        )}
      </button>
    </div>
  );
}
