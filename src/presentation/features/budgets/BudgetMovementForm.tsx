'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useAddBudgetMovement } from '@/core/application/hooks/use-budgets';
import { useUpdateTransaction } from '@/core/application/hooks/use-transactions';
import { type Budget } from '@/core/domain/entities/budget';
import { type Transaction } from '@/core/domain/entities/transaction';
import {
  type AddBudgetMovementInput,
  addBudgetMovementSchema,
} from '@/core/domain/schemas/budget.schema';
import { type UpdateTransactionInput } from '@/core/domain/schemas/transaction.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';
import { CategorySelectField } from '@/presentation/features/categories/CategorySelectField';

import { dateInputToBackendIso, getTodayLocaleDate } from '@/lib/format';

interface BudgetMovementFormProps {
  open: boolean;
  budget: Budget | null;
  /**
   * When set, the form opens in EDIT mode for that specific movement. The
   * account is shown but disabled (the backend's `UpdateTransactionInput`
   * doesn't accept `accountId`). Category, amount, date and description
   * remain editable.
   *
   * Leave `null` / `undefined` for the standard create flow.
   */
  movement?: Transaction | null;
  onClose: () => void;
}

/**
 * Modal that creates OR edits a budget movement. Validates 3 things on top
 * of the Zod schema:
 *  1. Account must be active and in the budget's currency. (Edit mode keeps
 *     the original account regardless — only `categoryId / amount / date /
 *     description` are sent on PATCH.)
 *  2. Category must exist (filtered by EXPENSE type — same convention as
 *     the transactions form).
 *  3. Date must fall in the budget's calendar month — we constrain the
 *     `<DatePicker>` `min`/`max` to enforce this client-side.
 *
 * The submit pins the date to noon UTC via `dateInputToBackendIso` so the
 * backend reads the same calendar day across every realistic timezone.
 */
export function BudgetMovementForm({ open, budget, movement, onClose }: BudgetMovementFormProps) {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const { data: accounts } = useAccounts(false);
  const addMovementMutation = useAddBudgetMovement();
  const updateTransactionMutation = useUpdateTransaction();

  const isEditing = !!movement;

  // Pre-pick the first eligible account in the budget's currency. The form is
  // disabled until at least one such account exists (banner inline below).
  // In edit mode we don't filter — the movement's account is locked, even
  // if the user has since archived it.
  const eligibleAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => !a.isArchived && budget != null && a.currency === budget.currency,
      ),
    [accounts, budget],
  );

  const form = useForm<AddBudgetMovementInput>({
    resolver: zodResolver(addBudgetMovementSchema),
    defaultValues: {
      amount: 0,
      accountId: '',
      categoryId: '',
      date: getTodayLocaleDate(),
      description: null,
    },
  });

  useEffect(() => {
    if (!open || !budget) return;

    if (movement) {
      // Edit mode — pre-populate from the existing movement. Date is sliced
      // back to YYYY-MM-DD because the entity stores the full ISO.
      form.reset({
        amount: movement.amount,
        accountId: movement.accountId,
        categoryId: movement.categoryId ?? '',
        date: movement.date.slice(0, 10),
        description: movement.description,
      });
      return;
    }

    // Create mode — default date is today if it falls in the budget's
    // month, otherwise the 1st of the budget's month. Keeps the picker
    // inside the allowed range from the first paint.
    const today = getTodayLocaleDate();
    const [yyyy, mm] = today.split('-');
    const inMonth = Number(yyyy) === budget.year && Number(mm) === budget.month;
    const fallback = `${budget.year}-${String(budget.month).padStart(2, '0')}-01`;

    form.reset({
      amount: 0,
      accountId: eligibleAccounts[0]?.id ?? '',
      categoryId: '',
      date: inMonth ? today : fallback,
      description: null,
    });
  }, [open, budget, eligibleAccounts, form, movement]);

  if (!budget) return null;

  // Constrain the date picker to the budget's calendar month. Backend also
  // validates with BDGT_003, but pinning the picker stops the typo at the UI.
  const monthFirst = `${budget.year}-${String(budget.month).padStart(2, '0')}-01`;
  const monthLast = lastDayOfMonth(budget.year, budget.month);

  function handleSubmit(values: AddBudgetMovementInput) {
    if (!budget) return;

    const cleanedDescription =
      values.description === '' || values.description == null ? null : values.description;
    const cleanedDate = dateInputToBackendIso(values.date) ?? values.date;

    if (movement) {
      // Edit flow — patch the existing transaction. Account isn't sent
      // because `UpdateTransactionInput` doesn't accept it (immutable
      // after creation per the backend contract). `reference` stays null
      // because a budget movement is always an EXPENSE.
      const updateData: UpdateTransactionInput = {
        categoryId: values.categoryId,
        amount: values.amount,
        description: cleanedDescription,
        date: cleanedDate,
        reference: null,
      };
      updateTransactionMutation.mutate(
        { id: movement.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('movements.editSuccess'));
            onClose();
          },
          onError: handleError,
        },
      );
      return;
    }

    const cleaned: AddBudgetMovementInput = {
      ...values,
      date: cleanedDate,
      description: cleanedDescription,
    };
    addMovementMutation.mutate(
      { id: budget.id, data: cleaned },
      {
        onSuccess: () => {
          toast.success(t('movements.addSuccess'));
          onClose();
        },
        onError: handleError,
      },
    );
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'BDGT_003') {
      form.setError('date', { message: tErrors('BDGT_003') });
      return;
    }
    if (error instanceof ApiError && error.code === 'VAL_002') {
      form.setError('accountId', { message: tErrors('VAL_002') });
      return;
    }
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'BDGT_001')
        : tErrors('generic'),
    );
  }

  const isPending = addMovementMutation.isPending || updateTransactionMutation.isPending;
  // Edit mode CAN submit even when there are no eligible accounts: the
  // movement already has its account locked in. Create needs at least one.
  const disableSubmit = isPending || (!isEditing && eligibleAccounts.length === 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('movements.editTitle') : t('movements.addTitle')}
    >
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t('movements.currencyHint', { currency: budget.currency })}
        </p>

        {!isEditing && eligibleAccounts.length === 0 ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {t('movements.noEligibleAccount', { currency: budget.currency })}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="mv-amount" className="text-sm font-medium">
              {t('movements.amount')}
            </label>
            <Input
              id="mv-amount"
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
            <label htmlFor="mv-date" className="text-sm font-medium">
              {t('movements.date')}
            </label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="mv-date"
                  min={monthFirst}
                  max={monthLast}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="mv-account" className="text-sm font-medium">
            {t('movements.account')}
          </label>
          <Select id="mv-account" {...form.register('accountId')} disabled={isEditing}>
            <option value="">—</option>
            {eligibleAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
            {/* Edit mode: the original account may not be in `eligibleAccounts`
                anymore (archived, currency-changed, etc.). Render it as a
                fallback option so the select still shows the right label. */}
            {isEditing &&
              movement &&
              !eligibleAccounts.some((a) => a.id === movement.accountId) && (
                <option value={movement.accountId}>
                  {accounts?.find((a) => a.id === movement.accountId)?.name ?? movement.accountId}
                </option>
              )}
          </Select>
          {isEditing && (
            <p className="text-[11px] text-muted-foreground">
              {t('movements.accountImmutableHint')}
            </p>
          )}
          {form.formState.errors.accountId && (
            <p className="text-xs text-destructive">{form.formState.errors.accountId.message}</p>
          )}
        </div>

        <CategorySelectField
          control={form.control}
          name="categoryId"
          categoryType="EXPENSE"
          id="mv-category"
          label={t('movements.category')}
          emptyOptionLabel="—"
          errorMessage={form.formState.errors.categoryId?.message}
        />

        <div className="space-y-2">
          <label htmlFor="mv-description" className="text-sm font-medium">
            {t('movements.description')}
          </label>
          <Input
            id="mv-description"
            type="text"
            {...form.register('description')}
            placeholder={t('movements.descriptionPlaceholder')}
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
            disabled={disableSubmit}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? t('movements.editSubmit') : t('movements.addSubmit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Last calendar day of `(year, month)` formatted as YYYY-MM-DD. */
function lastDayOfMonth(year: number, month: number): string {
  // Day 0 of next month = last day of current month.
  const last = new Date(Date.UTC(year, month, 0));
  return `${year}-${String(month).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`;
}
