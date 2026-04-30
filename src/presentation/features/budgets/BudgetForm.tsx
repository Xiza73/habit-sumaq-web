'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateBudget, useUpdateBudget } from '@/core/application/hooks/use-budgets';
import { type Budget } from '@/core/domain/entities/budget';
import { type Currency } from '@/core/domain/enums/account.enums';
import {
  type CreateBudgetInput,
  createBudgetSchema,
  type UpdateBudgetInput,
} from '@/core/domain/schemas/budget.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

interface BudgetFormProps {
  open: boolean;
  /** When provided, the form is in edit mode and only `amount` is editable. */
  budget?: Budget | null;
  /** Default currency for the create flow — usually the user's preferred. */
  defaultCurrency?: Currency;
  /**
   * Defaults for year/month in create mode. The user can leave them as-is
   * (current month) — the backend will fill them from the timezone header.
   */
  defaultYear?: number;
  defaultMonth?: number;
  onClose: () => void;
}

/**
 * Single modal that handles BOTH create and edit. In edit mode, year / month
 * / currency are disabled — the backend rejects changing them and the only
 * meaningful action is updating the budget amount.
 */
export function BudgetForm({
  open,
  budget,
  defaultCurrency = 'PEN',
  defaultYear,
  defaultMonth,
  onClose,
}: BudgetFormProps) {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const isEditing = !!budget;
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // We use the create schema as the form source of truth even in edit mode —
  // RHF needs a single schema, and `amount` is the only field whose value
  // actually feeds the mutation in edit mode (the rest stay disabled).
  const form = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      year: defaultYear,
      month: defaultMonth,
      currency: defaultCurrency,
      amount: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (budget) {
      form.reset({
        year: budget.year,
        month: budget.month,
        currency: budget.currency,
        amount: budget.amount,
      });
    } else {
      form.reset({
        year: defaultYear,
        month: defaultMonth,
        currency: defaultCurrency,
        amount: 0,
      });
    }
  }, [open, budget, defaultYear, defaultMonth, defaultCurrency, form]);

  function handleSubmit(values: CreateBudgetInput) {
    if (isEditing && budget) {
      const updateData: UpdateBudgetInput = { amount: values.amount };
      updateMutation.mutate(
        { id: budget.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('form.editSuccess'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t('form.createSuccess'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'BDGT_002') {
      toast.error(tErrors('BDGT_002'));
      return;
    }
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'BDGT_001')
        : tErrors('generic'),
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('form.editTitle') : t('form.createTitle')}
    >
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="budget-year" className="text-sm font-medium">
              {t('form.year')}
            </label>
            <Input
              id="budget-year"
              type="number"
              min="2000"
              max="2100"
              step="1"
              disabled={isEditing}
              {...form.register('year', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="budget-month" className="text-sm font-medium">
              {t('form.month')}
            </label>
            <Input
              id="budget-month"
              type="number"
              min="1"
              max="12"
              step="1"
              disabled={isEditing}
              {...form.register('month', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="budget-currency" className="text-sm font-medium">
            {t('form.currency')}
          </label>
          <Select id="budget-currency" {...form.register('currency')} disabled={isEditing}>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
          {isEditing && (
            <p className="text-[11px] text-muted-foreground">{t('form.currencyImmutableHint')}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="budget-amount" className="text-sm font-medium">
            {t('form.amount')}
          </label>
          <Input
            id="budget-amount"
            type="number"
            step="0.01"
            min="0.01"
            {...form.register('amount', { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground">{t('form.amountHint')}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? tCommon('save') : tCommon('create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
