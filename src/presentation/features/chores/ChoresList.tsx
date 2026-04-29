'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useArchiveChore,
  useChores,
  useDeleteChore,
  useSkipChoreCycle,
} from '@/core/application/hooks/use-chores';
import { type Chore } from '@/core/domain/entities/chore';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { cn } from '@/lib/utils';

import { ChoreCard } from './ChoreCard';
import { ChoreForm } from './ChoreForm';
import { ChoreLogsHistoryDialog } from './ChoreLogsHistoryDialog';
import { MarkChoreDoneForm } from './MarkChoreDoneForm';

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
      <div className="mt-4 h-9 rounded bg-muted" />
    </div>
  );
}

type Tab = 'active' | 'archived';

export function ChoresList() {
  const t = useTranslations('chores');
  const tErrors = useTranslations('errors');

  const [tab, setTab] = useState<Tab>('active');
  const showArchived = tab === 'archived';
  const [formOpen, setFormOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [doneTarget, setDoneTarget] = useState<Chore | null>(null);
  const [skipTarget, setSkipTarget] = useState<Chore | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chore | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Chore | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Always fetch BOTH lists in v1: the active list always renders, and the
  // archived list is loaded on demand when the user switches tabs. We keep
  // them as separate queries so the cache stays cheap and stable.
  const { data: chores, isLoading } = useChores(showArchived);
  const { data: allChoresForCategories } = useChores(true);

  const archiveMutation = useArchiveChore();
  const skipMutation = useSkipChoreCycle();
  const deleteMutation = useDeleteChore();

  // Categories already used by the user — feeds the form's `<datalist>`.
  // We pull from the "all" cache so categories used on archived chores still
  // show up as suggestions.
  const knownCategories = useMemo(() => {
    const set = new Set<string>();
    allChoresForCategories?.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allChoresForCategories]);

  const visibleChores = useMemo(() => {
    if (!chores) return [];
    return chores
      .filter((c) => (showArchived ? !c.isActive : c.isActive))
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, [chores, showArchived]);

  function handleOpenCreate() {
    setEditingChore(null);
    setFormOpen(true);
  }

  function handleEdit(chore: Chore) {
    setEditingChore(chore);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingChore(null);
  }

  function handleArchive(chore: Chore) {
    archiveMutation.mutate(chore.id, {
      onSuccess: (updated) => {
        toast.success(updated.isActive ? t('unarchived') : t('archived'));
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'CHRE_001')
            : tErrors('generic'),
        );
      },
    });
  }

  function handleSkipConfirm() {
    if (!skipTarget) return;
    skipMutation.mutate(skipTarget.id, {
      onSuccess: () => {
        toast.success(t('skipConfirm.success'));
        setSkipTarget(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'CHRE_001')
            : tErrors('generic'),
        );
        setSkipTarget(null);
      },
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast.success(t('actions.delete'));
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'CHRE_001') {
          setDeleteError(t('deleteConfirm.disabledReason'));
          return;
        }
        if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
          setDeleteError(tErrors(error.code as 'CHRE_001'));
          return;
        }
        setDeleteError(tErrors('generic'));
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t('createChore')}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(['active', 'archived'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              tab === value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : visibleChores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-xs text-muted-foreground">
            {showArchived ? t('emptyArchived') : t('empty')}
          </p>
          {!showArchived && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {t('createChore')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleChores.map((chore) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              onMarkDone={setDoneTarget}
              onSkip={setSkipTarget}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={setDeleteTarget}
              onViewHistory={setHistoryTarget}
            />
          ))}
        </div>
      )}

      <ChoreForm
        open={formOpen}
        chore={editingChore}
        knownCategories={knownCategories}
        onClose={handleCloseForm}
      />

      <MarkChoreDoneForm
        open={!!doneTarget}
        chore={doneTarget}
        onClose={() => setDoneTarget(null)}
      />

      <ChoreLogsHistoryDialog
        open={!!historyTarget}
        chore={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />

      <ConfirmDialog
        open={!!skipTarget}
        title={skipTarget ? t('skipConfirm.title') : ''}
        description={skipTarget ? t('skipConfirm.body', { nextDate: skipTarget.nextDueDate }) : ''}
        confirmLabel={t('skipConfirm.confirm')}
        loading={skipMutation.isPending}
        onConfirm={handleSkipConfirm}
        onCancel={() => setSkipTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget ? t('deleteConfirm.title', { name: deleteTarget.name }) : ''}
        description={deleteError ?? t('deleteConfirm.body')}
        variant="destructive"
        confirmLabel={t('deleteConfirm.confirm')}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
