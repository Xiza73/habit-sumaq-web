'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { useBudget, useDeleteBudget } from '@/core/application/hooks/use-budgets';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { AddMovementForm } from './AddMovementForm';
import { BudgetForm } from './BudgetForm';
import { BudgetKpiCard } from './BudgetKpiCard';
import { BudgetMovementList } from './BudgetMovementList';

interface BudgetDetailViewProps {
  id: string;
}

/**
 * Read-mostly view for an individual budget by id. The KPI card still works
 * for past months (`daysRemainingIncludingToday=0`, `dailyAllowance=null`).
 * Edit/Add movement modals are still wired so the user can keep tinkering
 * with closed-month plans, but the typical use is just to inspect history.
 */
export function BudgetDetailView({ id }: BudgetDetailViewProps) {
  const t = useTranslations('budgets');
  const tErrors = useTranslations('errors');
  const router = useRouter();

  const { data: budget, isLoading, isError } = useBudget(id);
  const deleteMutation = useDeleteBudget();

  const [editOpen, setEditOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleConfirmDelete() {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('delete.success'));
        router.push('/budgets');
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'BDGT_001')
            : tErrors('generic'),
        );
        setConfirmDelete(false);
      },
    });
  }

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  if (isError || !budget) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t('detail.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/budgets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('detail.backToList')}
      </Link>

      <BudgetKpiCard
        budget={budget}
        onAddMovement={() => setMovementOpen(true)}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setConfirmDelete(true)}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t('movements.title')}</h2>
        <BudgetMovementList movements={budget.movements} currency={budget.currency} />
      </div>

      <BudgetForm open={editOpen} budget={budget} onClose={() => setEditOpen(false)} />
      <AddMovementForm open={movementOpen} budget={budget} onClose={() => setMovementOpen(false)} />
      <ConfirmDialog
        open={confirmDelete}
        title={t('delete.title')}
        description={t('delete.description')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
