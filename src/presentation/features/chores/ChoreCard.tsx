'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  CalendarDays,
  Check,
  History,
  MoreVertical,
  Pencil,
  Repeat2,
  SkipForward,
  Tag,
  Trash2,
} from 'lucide-react';

import { type Chore } from '@/core/domain/entities/chore';

import { type ChoreStatus, getChoreStatus } from '@/lib/chore-status';
import { getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ChoreCardProps {
  chore: Chore;
  onMarkDone: (chore: Chore) => void;
  onSkip: (chore: Chore) => void;
  onEdit: (chore: Chore) => void;
  onArchive: (chore: Chore) => void;
  onDelete: (chore: Chore) => void;
  onViewHistory: (chore: Chore) => void;
}

const STATUS_CLASSES: Record<ChoreStatus, string> = {
  overdue: 'bg-destructive/15 text-destructive',
  upcoming: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  // Horizon stays very low contrast on purpose — those chores are not "due"
  // any time soon and shouldn't fight for attention with the upcoming ones.
  horizon: 'bg-muted text-muted-foreground',
};

export function ChoreCard({
  chore,
  onMarkDone,
  onSkip,
  onEdit,
  onArchive,
  onDelete,
  onViewHistory,
}: ChoreCardProps) {
  const t = useTranslations('chores');
  const [menuOpen, setMenuOpen] = useState(false);

  const isArchived = !chore.isActive;
  // Always compute the status client-side from `nextDueDate` vs today —
  // the backend `isOverdue` flag covers only the overdue case, but here
  // we need to surface "upcoming" / "horizon" as well.
  const status = getChoreStatus(chore.nextDueDate, getTodayLocaleDate());

  const intervalUnitLabel = t(`intervalUnit.${chore.intervalUnit}`, {
    value: chore.intervalValue,
  });

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md',
        isArchived && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Repeat2 className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{chore.name}</p>
            {chore.category && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Tag className="size-3" />
                {chore.category}
              </span>
            )}
          </div>

          <span
            className={cn(
              'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isArchived ? 'bg-muted text-muted-foreground' : STATUS_CLASSES[status],
            )}
          >
            {isArchived ? t('archived') : t(`status.${status}`)}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            aria-label="Chore actions"
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
                {/* Done + Skip surface in the menu only when the inline
                    footer buttons are hidden (status === 'horizon'). For
                    overdue / upcoming chores those actions already live in
                    the footer — duplicating them in the menu is noise. */}
                {!isArchived && status === 'horizon' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onMarkDone(chore);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <Check className="size-4" />
                      {t('actions.done')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onSkip(chore);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <SkipForward className="size-4" />
                      {t('actions.skip')}
                    </button>
                    <div className="my-1 h-px bg-border" aria-hidden />
                  </>
                )}
                {!isArchived && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(chore);
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
                    onViewHistory(chore);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <History className="size-4" />
                  {t('actions.viewHistory')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(chore);
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
                    onDelete(chore);
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

      <dl className="grid grid-cols-1 gap-x-3 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          <span className="text-foreground">
            {t('intervalLabel', {
              value: chore.intervalValue,
              unit: intervalUnitLabel,
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          <span className="text-foreground">{t('nextDue', { date: chore.nextDueDate })}</span>
        </div>
        <div className="col-span-full flex items-center gap-1.5">
          <Check className="size-3.5" />
          <span>
            {t('lastDone', {
              date: chore.lastDoneDate ?? t('lastDoneNever'),
            })}
          </span>
        </div>
        {chore.notes && (
          <p className="col-span-full line-clamp-2 text-muted-foreground/90">{chore.notes}</p>
        )}
      </dl>

      {isArchived ? (
        <button
          type="button"
          onClick={() => onArchive(chore)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t('actions.unarchive')}
        </button>
      ) : status !== 'horizon' ? (
        // Inline action footer is reserved for chores that need attention
        // soon (overdue or upcoming). When the chore is on the horizon, the
        // menu is the only entry point — keeps the card quiet for things
        // that aren't due yet.
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMarkDone(chore)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="size-4" />
            {t('actions.done')}
          </button>
          <button
            type="button"
            onClick={() => onSkip(chore)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <SkipForward className="size-4" />
            {t('actions.skip')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
