'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useCategories } from '@/core/application/hooks/use-categories';
import {
  useArchiveMonthlyService,
  useDeleteMonthlyService,
  useMonthlyServices,
  useSkipMonthlyServiceMonth,
} from '@/core/application/hooks/use-monthly-services';
import { useMonthlyServicesViewPrefs } from '@/core/application/hooks/use-monthly-services-view-prefs';
import { type Account } from '@/core/domain/entities/account';
import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { formatPeriodLabel } from '@/lib/format';
import { applyView } from '@/lib/monthly-services-view';
import { cn } from '@/lib/utils';

import { MonthlyServiceCard } from './MonthlyServiceCard';
import { MonthlyServiceForm } from './MonthlyServiceForm';
import { MonthlyServicesSummary } from './MonthlyServicesSummary';
import { MonthlyServicesViewControls } from './MonthlyServicesViewControls';
import { PayMonthlyServiceForm } from './PayMonthlyServiceForm';

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

/**
 * Resolves the human-readable label for a group header. Pulls from i18n for
 * status / frequency, and from the category lookup for `category` groups.
 * For uncategorised buckets it falls through to the dedicated i18n key.
 */
function renderGroupLabel(
  group: { key: string },
  groupBy: ReturnType<typeof useMonthlyServicesViewPrefs>['prefs']['groupBy'],
  categoriesById: Map<string, Category>,
  t: ReturnType<typeof useTranslations<'monthlyServices'>>,
): string {
  if (groupBy === 'status') {
    // Dedicated header keys — the per-card `status.*` keys carry a `{period}`
    // placeholder we don't need here.
    return t(`groupHeaders.status.${group.key as 'overdue' | 'pending' | 'paid' | 'archived'}`);
  }
  if (groupBy === 'frequency') {
    const labelMap: Record<string, 'monthly' | 'quarterly' | 'semiannual' | 'annual'> = {
      '1': 'monthly',
      '3': 'quarterly',
      '6': 'semiannual',
      '12': 'annual',
    };
    return t(`frequency.${labelMap[group.key] ?? 'monthly'}`);
  }
  if (groupBy === 'category') {
    if (group.key === 'null-category') return t('groupHeaders.noCategory');
    return categoriesById.get(group.key)?.name ?? t('groupHeaders.noCategory');
  }
  return '';
}

export function MonthlyServicesList() {
  const t = useTranslations('monthlyServices');
  const tErrors = useTranslations('errors');
  const locale = useLocale();

  const [tab, setTab] = useState<Tab>('active');
  const showArchived = tab === 'archived';
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<MonthlyService | null>(null);
  const [payingService, setPayingService] = useState<MonthlyService | null>(null);
  const [skippingService, setSkippingService] = useState<MonthlyService | null>(null);
  const [deletingService, setDeletingService] = useState<MonthlyService | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: services, isLoading } = useMonthlyServices(showArchived);
  const { data: accounts } = useAccounts(true);
  const { data: categories } = useCategories();
  const archiveMutation = useArchiveMonthlyService();
  const deleteMutation = useDeleteMonthlyService();
  const skipMutation = useSkipMonthlyServiceMonth();
  const { prefs, setPrefs } = useMonthlyServicesViewPrefs();

  const accountsById = useMemo(() => {
    const map = new Map<string, Account>();
    accounts?.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const visibleServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => (showArchived ? !s.isActive : s.isActive));
  }, [services, showArchived]);

  // Group + sort the visible list according to the persisted view prefs.
  // Helper is pure — see `src/lib/monthly-services-view.ts`.
  const groups = useMemo(
    () => applyView(visibleServices, prefs, categoriesById),
    [visibleServices, prefs, categoriesById],
  );

  function handleOpenCreate() {
    setEditingService(null);
    setFormOpen(true);
  }

  function handleEdit(service: MonthlyService) {
    setEditingService(service);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingService(null);
  }

  function handleArchive(service: MonthlyService) {
    archiveMutation.mutate(service.id, {
      onSuccess: (updated) => {
        toast.success(updated.isActive ? t('unarchived') : t('archived'));
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'MSVC_001')
            : tErrors('generic'),
        );
      },
    });
  }

  function handleSkipConfirm() {
    if (!skippingService) return;
    skipMutation.mutate(skippingService.id, {
      onSuccess: () => {
        toast.success(
          t('skipSuccess', {
            name: skippingService.name,
            period: formatPeriodLabel(skippingService.nextDuePeriod, locale),
          }),
        );
        setSkippingService(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'MSVC_002')
            : tErrors('generic'),
        );
        setSkippingService(null);
      },
    });
  }

  function handleDeleteConfirm() {
    if (!deletingService) return;
    setDeleteError(null);
    deleteMutation.mutate(deletingService.id, {
      onSuccess: () => {
        setDeletingService(null);
        toast.success(t('actions.delete'));
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'MSVC_001') {
          setDeleteError(t('deleteConfirm.disabledReason'));
          return;
        }
        if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
          setDeleteError(tErrors(error.code as 'MSVC_001'));
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
          {t('createService')}
        </button>
      </div>

      {/* Tabs + view controls. Stack on mobile, space-between on desktop. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <MonthlyServicesViewControls prefs={prefs} onChange={setPrefs} />
      </div>

      {!showArchived && services && services.length > 0 && (
        <MonthlyServicesSummary services={services} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : visibleServices.length === 0 ? (
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
              {t('createService')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} className="space-y-3">
              {/* Group header — only rendered when there's actual grouping
                  (groupBy !== 'none' produces a key other than 'all'). */}
              {group.key !== 'all' && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {renderGroupLabel(group, prefs.groupBy, categoriesById, t)}
                  <span className="ml-2 text-muted-foreground/70">({group.services.length})</span>
                </h2>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.services.map((service) => (
                  <MonthlyServiceCard
                    key={service.id}
                    service={service}
                    account={accountsById.get(service.defaultAccountId)}
                    category={categoriesById.get(service.categoryId)}
                    onPay={setPayingService}
                    onSkip={setSkippingService}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onDelete={setDeletingService}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MonthlyServiceForm open={formOpen} service={editingService} onClose={handleCloseForm} />

      <PayMonthlyServiceForm
        open={!!payingService}
        service={payingService}
        onClose={() => setPayingService(null)}
      />

      <ConfirmDialog
        open={!!skippingService}
        title={
          skippingService
            ? t('skipConfirm.title', {
                name: skippingService.name,
                period: formatPeriodLabel(skippingService.nextDuePeriod, locale),
              })
            : ''
        }
        description={t('skipConfirm.body')}
        confirmLabel={t('skipConfirm.confirm')}
        loading={skipMutation.isPending}
        onConfirm={handleSkipConfirm}
        onCancel={() => setSkippingService(null)}
      />

      <ConfirmDialog
        open={!!deletingService}
        title={deletingService ? t('deleteConfirm.title', { name: deletingService.name }) : ''}
        description={deleteError ?? t('deleteConfirm.body')}
        variant="destructive"
        confirmLabel={t('deleteConfirm.confirm')}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeletingService(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
