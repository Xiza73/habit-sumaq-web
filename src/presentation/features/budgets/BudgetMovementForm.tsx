'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  useCreateBudgetMovement,
  useUpdateBudgetMovement,
} from '@/core/application/hooks/use-budget-movements';
import { type Budget } from '@/core/domain/entities/budget';
import { type BudgetMovement } from '@/core/domain/entities/budget-movement';
import {
  type CreateBudgetMovementInput,
  createBudgetMovementSchema,
} from '@/core/domain/schemas/budget-movement.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { CategorySelectField } from '@/presentation/features/categories/CategorySelectField';

import { dateInputToBackendIso, getTodayLocaleDate } from '@/lib/format';

interface BudgetMovementFormProps {
  open: boolean;
  budget: Budget | null;
  /**
   * When set, the form opens in EDIT mode for that specific movement.
   * `budgetId` and `currency` are immutable in v1.0.0 — only `amount`,
   * `date`, `description`, and `categoryId` are sent on PATCH.
   *
   * Leave `null` / `undefined` for the standard create flow.
   */
  movement?: BudgetMovement | null;
  onClose: () => void;
}

/**
 * Modal that creates OR edits a budget movement.
 *
 * v1.0.0 (Phase A6-W.1 — accounts-to-modular-finance refactor):
 *   - Writes go to `POST/PATCH /budget-movements` (the new v1.0.0 module)
 *     instead of the legacy `/transactions` endpoints.
 *   - The "Cuenta" picker is REMOVED — budget movements debit the user's
 *     currency pool (per-user, per-currency aggregate balance), not a
 *     specific account. The currency is inherited from the budget.
 *
 * Client-side validation:
 *   1. Category (filtered by EXPENSE type) — same convention as the
 *      legacy form.
 *   2. Date must fall in the budget's calendar month — we constrain the
 *      `<DatePicker>` `min`/`max` to enforce it client-side (the backend
 *      double-checks with BMV_003).
 *
 * The submit pins the date to noon UTC via `dateInputToBackendIso` so the
 * backend reads the same calendar day across every realistic timezone.
 */
export function BudgetMovementForm({ open, budget, movement, onClose }: BudgetMovementFormProps) {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const createMutation = useCreateBudgetMovement();
  const updateMutation = useUpdateBudgetMovement();

  const isEditing = !!movement;

  // Form shape matches the create payload. In edit mode we ignore
  // `budgetId` at submit time (it's immutable per the v1.0.0 contract).
  const form = useForm<CreateBudgetMovementInput>({
    resolver: zodResolver(createBudgetMovementSchema),
    defaultValues: {
      budgetId: '',
      amount: 0,
      categoryId: undefined,
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
        budgetId: movement.budgetId,
        amount: movement.amount,
        categoryId: movement.categoryId ?? undefined,
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
      budgetId: budget.id,
      amount: 0,
      categoryId: undefined,
      date: inMonth ? today : fallback,
      description: null,
    });
  }, [open, budget, form, movement]);

  if (!budget) return null;

  // Constrain the date picker to the budget's calendar month. Backend also
  // validates with BMV_003, but pinning the picker stops the typo at the UI.
  const monthFirst = `${budget.year}-${String(budget.month).padStart(2, '0')}-01`;
  const monthLast = lastDayOfMonth(budget.year, budget.month);

  function handleSubmit(values: CreateBudgetMovementInput) {
    if (!budget) return;

    const cleanedDescription =
      values.description === '' || values.description == null ? null : values.description;
    const cleanedDate = dateInputToBackendIso(values.date) ?? values.date;
    const cleanedCategoryId =
      values.categoryId === '' || values.categoryId == null ? undefined : values.categoryId;

    if (movement) {
      // Edit flow — PATCH the existing movement. `budgetId` and `currency`
      // are immutable in v1.0.0; categoryId can be cleared (nullable on
      // the update DTO).
      updateMutation.mutate(
        {
          id: movement.id,
          data: {
            amount: values.amount,
            description: cleanedDescription,
            date: cleanedDate,
            categoryId: cleanedCategoryId ?? null,
          },
        },
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

    createMutation.mutate(
      {
        budgetId: budget.id,
        amount: values.amount,
        description: cleanedDescription,
        date: cleanedDate,
        categoryId: cleanedCategoryId,
      },
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
    // BMV_003 = date out of budget range. Same UX as the legacy BDGT_003
    // path: attach the message to the `date` field instead of a global toast.
    if (error instanceof ApiError && error.code === 'BMV_003') {
      form.setError('date', { message: tErrors('BMV_003') });
      return;
    }
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'BMV_001')
        : tErrors('generic'),
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

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
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>
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
            disabled={isPending}
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
