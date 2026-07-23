'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateDebtLoan, useUpdateDebtLoan } from '@/core/application/hooks/use-debts-loans';
import { type DebtLoan, type DebtLoanType } from '@/core/domain/entities/debt-loan';
import { Currency } from '@/core/domain/enums/currency.enum';
import {
  type CreateDebtLoanInput,
  createDebtLoanSchema,
} from '@/core/domain/schemas/debt-loan.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

import { dateInputToBackendIso, getTodayLocaleDate } from '@/lib/format';

interface DebtLoanFormProps {
  open: boolean;
  /**
   * When set → EDIT mode. `type` and `currency` are immutable in edit mode
   * (the backend ignores them on PATCH).
   * When null → CREATE mode, with the initial `type` driven by `initialType`.
   */
  debtLoan: DebtLoan | null;
  initialType?: DebtLoanType;
  onClose: () => void;
  /**
   * Prior `reference` values across the user's debts/loans, offered as
   * autocomplete suggestions (soft — the field stays free-text). Same UX as
   * the Chores category field.
   */
  knownReferences?: string[];
}

export function DebtLoanForm({
  open,
  debtLoan,
  initialType = 'DEBT',
  onClose,
  knownReferences = [],
}: DebtLoanFormProps) {
  const t = useTranslations('debts.form');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const createMutation = useCreateDebtLoan();
  const updateMutation = useUpdateDebtLoan();

  const isEditing = !!debtLoan;

  const form = useForm<CreateDebtLoanInput>({
    resolver: zodResolver(createDebtLoanSchema),
    defaultValues: {
      type: initialType,
      currency: 'PEN',
      amount: 0,
      reference: '',
      description: null,
      date: getTodayLocaleDate(),
    },
  });

  useEffect(() => {
    if (!open) return;

    if (debtLoan) {
      form.reset({
        type: debtLoan.type,
        currency: debtLoan.currency,
        amount: debtLoan.amount,
        reference: debtLoan.reference,
        description: debtLoan.description,
        date: debtLoan.date.slice(0, 10),
      });
      return;
    }

    form.reset({
      type: initialType,
      currency: 'PEN',
      amount: 0,
      reference: '',
      description: null,
      date: getTodayLocaleDate(),
    });
  }, [open, debtLoan, initialType, form]);

  function handleSubmit(values: CreateDebtLoanInput) {
    const cleanedDescription =
      values.description === '' || values.description == null ? null : values.description;
    const cleanedDate = dateInputToBackendIso(values.date) ?? values.date;

    if (debtLoan) {
      updateMutation.mutate(
        {
          id: debtLoan.id,
          data: {
            amount: values.amount,
            reference: values.reference,
            description: cleanedDescription,
            date: cleanedDate,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('editSuccess'));
            onClose();
          },
          onError: handleError,
        },
      );
      return;
    }

    createMutation.mutate(
      {
        type: values.type,
        currency: values.currency,
        amount: values.amount,
        reference: values.reference,
        description: cleanedDescription,
        date: cleanedDate,
      },
      {
        onSuccess: () => {
          toast.success(t('createSuccess'));
          onClose();
        },
        onError: handleError,
      },
    );
  }

  function handleError(error: Error) {
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'DBL_001')
        : tErrors('generic'),
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const currentType = form.watch('type');

  const title = isEditing
    ? t('editTitle')
    : currentType === 'LOAN'
      ? t('createLoanTitle')
      : t('createDebtTitle');

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        {!isEditing && (
          <div className="space-y-2">
            <label htmlFor="dl-type" className="text-sm font-medium">
              {t('type')}
            </label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  id="dl-type"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value="DEBT">{t('typeDebt')}</option>
                  <option value="LOAN">{t('typeLoan')}</option>
                </Select>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="dl-amount" className="text-sm font-medium">
              {t('amount')}
            </label>
            <Input
              id="dl-amount"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dl-currency" className="text-sm font-medium">
              {t('currency')}
            </label>
            {isEditing ? (
              <Input id="dl-currency" type="text" value={form.getValues('currency')} disabled />
            ) : (
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select
                    id="dl-currency"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {Object.values(Currency).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                )}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="dl-reference" className="text-sm font-medium">
            {t('reference')}
          </label>
          <Input
            id="dl-reference"
            type="text"
            list="dl-reference-list"
            placeholder={t('referencePlaceholder')}
            {...form.register('reference')}
          />
          <datalist id="dl-reference-list">
            {knownReferences.map((ref) => (
              <option key={ref} value={ref} />
            ))}
          </datalist>
          {form.formState.errors.reference && (
            <p className="text-xs text-destructive">{form.formState.errors.reference.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dl-date" className="text-sm font-medium">
            {t('date')}
          </label>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <DatePicker id="dl-date" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          {form.formState.errors.date && (
            <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dl-description" className="text-sm font-medium">
            {t('description')}
          </label>
          <Input
            id="dl-description"
            type="text"
            placeholder={t('descriptionPlaceholder')}
            {...form.register('description')}
          />
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
            {isEditing ? t('editSubmit') : t('createSubmit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
