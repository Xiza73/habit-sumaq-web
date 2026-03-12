'use client';

import { useTranslations } from 'next-intl';

import { X } from 'lucide-react';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useCategories } from '@/core/application/hooks/use-categories';
import { type TransactionFilters as Filters } from '@/core/domain/schemas/transaction.schema';

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
  const t = useTranslations('transactions');
  const { data: accounts } = useAccounts(false);
  const { data: categories } = useCategories();

  const hasFilters = Object.values(filters).some(Boolean);

  function updateFilter(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  function clearFilters() {
    onChange({});
  }

  const selectClass =
    'flex h-9 w-full rounded-md border border-border bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const inputClass = selectClass;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select
          value={filters.type ?? ''}
          onChange={(e) => updateFilter('type', e.target.value)}
          className={selectClass}
        >
          <option value="">{t('allTypes')}</option>
          <option value="INCOME">{t('types.INCOME')}</option>
          <option value="EXPENSE">{t('types.EXPENSE')}</option>
          <option value="TRANSFER">{t('types.TRANSFER')}</option>
          <option value="DEBT">{t('types.DEBT')}</option>
          <option value="LOAN">{t('types.LOAN')}</option>
        </select>

        <select
          value={filters.accountId ?? ''}
          onChange={(e) => updateFilter('accountId', e.target.value)}
          className={selectClass}
        >
          <option value="">{t('allAccounts')}</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <select
          value={filters.categoryId ?? ''}
          onChange={(e) => updateFilter('categoryId', e.target.value)}
          className={selectClass}
        >
          <option value="">{t('allCategories')}</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className={selectClass}
        >
          <option value="">{t('allStatuses')}</option>
          <option value="PENDING">{t('status.PENDING')}</option>
          <option value="SETTLED">{t('status.SETTLED')}</option>
        </select>

        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => updateFilter('dateFrom', e.target.value)}
          className={inputClass}
          placeholder={t('dateFrom')}
        />

        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => updateFilter('dateTo', e.target.value)}
          className={inputClass}
          placeholder={t('dateTo')}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
          {t('clearFilters')}
        </button>
      )}
    </div>
  );
}
