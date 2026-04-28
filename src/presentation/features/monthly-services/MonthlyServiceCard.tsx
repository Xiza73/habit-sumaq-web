'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CreditCard,
  FolderTree,
  MoreVertical,
  Pencil,
  Receipt,
  SkipForward,
  Trash2,
  Wallet,
} from 'lucide-react';

import { type Account } from '@/core/domain/entities/account';
import { type Category } from '@/core/domain/entities/category';
import {
  MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS,
  type MonthlyService,
} from '@/core/domain/entities/monthly-service';

import { formatCurrency, formatPeriodLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MonthlyServiceCardProps {
  service: MonthlyService;
  account?: Account;
  category?: Category;
  onPay: (service: MonthlyService) => void;
  onSkip: (service: MonthlyService) => void;
  onEdit: (service: MonthlyService) => void;
  onArchive: (service: MonthlyService) => void;
  onDelete: (service: MonthlyService) => void;
}

type StatusTone = 'paid' | 'pending' | 'overdue';

function resolveStatus(service: MonthlyService): StatusTone {
  if (service.isOverdue) return 'overdue';
  if (service.isPaidForCurrentMonth) return 'paid';
  return 'pending';
}

const STATUS_CLASSES: Record<StatusTone, string> = {
  paid: 'bg-income/15 text-income',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  overdue: 'bg-destructive/15 text-destructive',
};

export function MonthlyServiceCard({
  service,
  account,
  category,
  onPay,
  onSkip,
  onEdit,
  onArchive,
  onDelete,
}: MonthlyServiceCardProps) {
  const t = useTranslations('monthlyServices');
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  const status = resolveStatus(service);
  const isArchived = !service.isActive;
  // Hide both actions when the service is already up-to-date for the current
  // month — allowing "Pagar" here would create a second transaction and skip
  // a future month silently (bug reported by user).
  const canPay = !isArchived && status !== 'paid';
  const canSkip = canPay;
  const periodLabel = formatPeriodLabel(service.nextDuePeriod, locale);

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md',
        isArchived && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Receipt className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{service.name}</p>
            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {service.currency}
            </span>
            {service.frequencyMonths !== 1 && (
              // Cadence chip — only shown for non-monthly services because
              // monthly is the default and adding a chip there would be noise.
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                {t(`frequency.${MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS[service.frequencyMonths]}`)}
              </span>
            )}
          </div>
          <span
            className={cn(
              'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isArchived ? 'bg-muted text-muted-foreground' : STATUS_CLASSES[status],
            )}
          >
            {isArchived
              ? t('archived')
              : status === 'paid'
                ? t('status.paid')
                : status === 'pending'
                  ? // Normal pending (nextDuePeriod === current month) keeps it
                    // short — the month is already shown in the summary header.
                    t('status.pending')
                  : // Overdue surfaces the period the user missed.
                    t('status.overdue', { period: periodLabel })}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            aria-label="Service actions"
          >
            <MoreVertical className="size-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuOpen(false);
                }}
                role="button"
                tabIndex={0}
                aria-label="Close menu"
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-popover py-1 shadow-lg">
                {!isArchived && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(service);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Pencil className="size-4" />
                    {t('actions.edit')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(service);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore className="size-4" />
                      {t('actions.unarchive')}
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" />
                      {t('actions.archive')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(service);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                  {t('actions.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Wallet className="size-3.5" />
          <span className="tabular-nums text-foreground">
            {service.estimatedAmount != null
              ? formatCurrency(service.estimatedAmount, service.currency)
              : '—'}
          </span>
        </div>
        {service.dueDay != null && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            <span>~{service.dueDay}</span>
          </div>
        )}
        {account && (
          <div className="flex items-center gap-1.5">
            <CreditCard className="size-3.5" />
            <span className="truncate">{account.name}</span>
          </div>
        )}
        {category && (
          <div className="flex items-center gap-1.5">
            <FolderTree className="size-3.5" />
            <span className="truncate">{category.name}</span>
          </div>
        )}
      </dl>

      {isArchived ? (
        <button
          type="button"
          onClick={() => onArchive(service)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t('actions.unarchive')}
        </button>
      ) : canPay ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPay(service)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Receipt className="size-4" />
            {t('actions.pay')}
          </button>
          {canSkip && (
            <button
              type="button"
              onClick={() => onSkip(service)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <SkipForward className="size-4" />
              {t('actions.skip')}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
