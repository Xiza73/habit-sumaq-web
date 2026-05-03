'use client';

import { useTranslations } from 'next-intl';

import { X } from 'lucide-react';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useCategories } from '@/core/application/hooks/use-categories';
import { type TransactionFilters as Filters } from '@/core/domain/schemas/transaction.schema';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Select } from '@/presentation/components/ui/Select';

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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Select
          compact
          value={filters.type ?? ''}
          onChange={(e) => updateFilter('type', e.target.value)}
        >
          <option value="">{t('allTypes')}</option>
          <option value="INCOME">{t('types.INCOME')}</option>
          <option value="EXPENSE">{t('types.EXPENSE')}</option>
          <option value="TRANSFER">{t('types.TRANSFER')}</option>
          <option value="DEBT">{t('types.DEBT')}</option>
          <option value="LOAN">{t('types.LOAN')}</option>
        </Select>

        <Select
          compact
          value={filters.accountId ?? ''}
          onChange={(e) => updateFilter('accountId', e.target.value)}
        >
          <option value="">{t('allAccounts')}</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>

        <Select
          compact
          value={filters.categoryId ?? ''}
          onChange={(e) => updateFilter('categoryId', e.target.value)}
        >
          <option value="">{t('allCategories')}</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Select
          compact
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
        >
          <option value="">{t('allStatuses')}</option>
          <option value="PENDING">{t('status.PENDING')}</option>
          <option value="SETTLED">{t('status.SETTLED')}</option>
        </Select>

        <DatePicker
          compact
          value={filters.dateFrom ?? ''}
          onChange={(v) => updateFilter('dateFrom', v)}
          placeholder={t('dateFrom')}
          aria-label={t('dateFrom')}
        />

        <DatePicker
          compact
          value={filters.dateTo ?? ''}
          onChange={(v) => updateFilter('dateTo', v)}
          placeholder={t('dateTo')}
          aria-label={t('dateTo')}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
          {t('clearFilters')}
        </button>
      )}
    </div>
  );
}
