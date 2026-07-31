'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDebtsLoansSummary } from '@/core/application/hooks/use-debts-loans';
import {
  useCreateMonthlyService,
  useUpdateMonthlyService,
} from '@/core/application/hooks/use-monthly-services';
import {
  MONTHLY_SERVICE_FREQUENCIES,
  MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS,
  type MonthlyService,
} from '@/core/domain/entities/monthly-service';
import { type Currency } from '@/core/domain/enums/currency.enum';
import {
  type CreateMonthlyServiceInput,
  createMonthlyServiceSchema,
  type UpdateMonthlyServiceInput,
} from '@/core/domain/schemas/monthly-service.schema';
import {
  type MonthlyServiceParticipantRowInput,
  replaceMonthlyServiceParticipantsSchema,
} from '@/core/domain/schemas/monthly-service-participant.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { FieldGrid } from '@/presentation/components/ui/FieldGrid';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';
import { CategorySelectField } from '@/presentation/features/categories/CategorySelectField';

import { ParticipantEditor } from './ParticipantEditor';

interface MonthlyServiceFormProps {
  open: boolean;
  service?: MonthlyService | null;
  onClose: () => void;
}

function emptyToUndefined<T extends string | number | null | undefined>(value: T): T | undefined {
  if (value === '' || value === null) return undefined;
  return value;
}

function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function MonthlyServiceForm({ open, service, onClose }: MonthlyServiceFormProps) {
  const t = useTranslations('monthlyServices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tParticipants = useTranslations('monthlyServices.participants');
  const isEditing = !!service;

  const createMutation = useCreateMonthlyService();
  const updateMutation = useUpdateMonthlyService();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Feed the participant reference field's soft autocomplete with prior
  // debts/loans references — same UX as `DebtLoanForm.knownReferences`.
  const { data: allDebtRows = [] } = useDebtsLoansSummary('all');
  const knownReferences = Array.from(
    new Set(allDebtRows.map((r) => r.displayName).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  // Create-mode participant rows are lifted here (controlled) — there's no
  // serviceId yet, so `ParticipantEditor` can't self-manage via
  // `useReplaceParticipants`. These ride the create-service payload
  // instead. Edit-mode's `ParticipantEditor` is self-managed and ignores
  // this state entirely.
  const [createRows, setCreateRows] = useState<MonthlyServiceParticipantRowInput[]>([]);
  // Inline error shown under the participants section for create-mode
  // rejections that aren't tied to a single form field — client-side
  // participant validation failures (blocked before submit) and server-side
  // `MSP_PARTICIPANT_*` errors alike. The `ParticipantEditor` also renders
  // per-row inline errors; this is the section-level summary + hint.
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  // Reset `createRows` the first render the modal is open for a NEW
  // service (not editing). Derived synchronously during render — like
  // `ParticipantEditor`'s own row-seeding — instead of inside the
  // `useEffect` below, so the reset lands in the same commit as
  // `form.reset()` without triggering a `setState`-in-effect cascade.
  // `rowsResetForOpen` tracks whether THIS open session already reset.
  const [rowsResetForOpen, setRowsResetForOpen] = useState(false);
  if (open && !service && !rowsResetForOpen) {
    setCreateRows([]);
    setRowsResetForOpen(true);
  } else if ((!open || service) && rowsResetForOpen) {
    setRowsResetForOpen(false);
  }

  const form = useForm<CreateMonthlyServiceInput>({
    resolver: zodResolver(createMonthlyServiceSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      currency: 'PEN',
      frequencyMonths: 1,
      estimatedAmount: null,
      dueDay: null,
      startPeriod: getCurrentPeriod(),
    },
  });
  // `useWatch` (not `form.watch()`) so the React Compiler can memoize this
  // subscription safely — feeds the create-mode ParticipantEditor's
  // currency-formatted amount display as the user picks a currency.
  const watchedCurrency = useWatch({ control: form.control, name: 'currency' });

  useEffect(() => {
    if (!open) return;

    if (service) {
      form.reset({
        name: service.name,
        categoryId: service.categoryId,
        currency: service.currency,
        frequencyMonths: service.frequencyMonths,
        estimatedAmount: service.estimatedAmount,
        dueDay: service.dueDay,
        startPeriod: service.startPeriod,
      });
    } else {
      form.reset({
        name: '',
        categoryId: '',
        currency: 'PEN',
        frequencyMonths: 1,
        estimatedAmount: null,
        dueDay: null,
        startPeriod: getCurrentPeriod(),
      });
    }
  }, [open, service, form]);

  function handleSubmit(values: CreateMonthlyServiceInput) {
    if (isEditing && service) {
      const updateData: UpdateMonthlyServiceInput = {
        name: values.name,
        categoryId: values.categoryId,
        estimatedAmount: emptyToUndefined(values.estimatedAmount) ?? null,
        dueDay: emptyToUndefined(values.dueDay) ?? null,
      };
      updateMutation.mutate(
        { id: service.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('editService'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      setParticipantsError(null);
      // Gate the participant rows through the same schema as the batch-
      // replace endpoint BEFORE the create write, so a blank reference or a
      // non-positive amount is caught client-side with an inline error
      // instead of a round-trip. The editor already renders per-row errors;
      // this block is the submit-time backstop.
      if (createRows.length > 0) {
        const parsed = replaceMonthlyServiceParticipantsSchema.safeParse({
          participants: createRows,
        });
        if (!parsed.success) {
          setParticipantsError(tParticipants('serverErrorHint'));
          return;
        }
      }
      const cleaned: CreateMonthlyServiceInput = {
        ...values,
        estimatedAmount: emptyToUndefined(values.estimatedAmount) ?? null,
        dueDay: emptyToUndefined(values.dueDay) ?? null,
        // Omit entirely (not `[]`) when no rows were added — keeps the
        // create payload byte-identical to pre-participants behavior for a
        // non-shared service, mirroring the schema's `.optional()`.
        ...(createRows.length > 0 ? { participants: createRows } : {}),
      };
      createMutation.mutate(cleaned, {
        onSuccess: () => {
          toast.success(t('createService'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'MSVC_003') {
      form.setError('name', { message: tErrors('MSVC_003') });
      return;
    }
    // Server-side participant validation (`MSP_PARTICIPANT_*`) — surface the
    // localized message inline under the participants section with a hint
    // pointing there, rather than only a generic toast. Per-row attribution
    // isn't attempted; the message + section hint is enough for the user to
    // find and fix the offending row.
    if (
      error instanceof ApiError &&
      error.code?.startsWith('MSP_PARTICIPANT_') &&
      tErrors.has(error.code)
    ) {
      setParticipantsError(tErrors(error.code as 'MSP_PARTICIPANT_DUPLICATE_REFERENCE'));
      return;
    }
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'MSVC_001')
        : tErrors('generic'),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t('editService') : t('createService')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="msvc-name" className="text-sm font-medium">
            {t('fields.name')}
          </label>
          <Input
            id="msvc-name"
            type="text"
            {...form.register('name')}
            placeholder={t('fields.name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <CategorySelectField
          control={form.control}
          name="categoryId"
          categoryType="EXPENSE"
          id="msvc-category"
          label={t('fields.category')}
          emptyOptionLabel="—"
          errorMessage={form.formState.errors.categoryId?.message}
        />

        {!isEditing && (
          <FieldGrid columns={2}>
            <FieldGrid.Field label={t('fields.currency')} htmlFor="msvc-currency">
              {/* v1.0.0 (A6-W.4): currency es ahora user-pickable.
                  Antes se derivaba automáticamente de la cuenta seleccionada
                  (que ya no existe). Inmutable post-creación — backend la
                  rechaza en updates. */}
              <Select id="msvc-currency" {...form.register('currency')}>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </FieldGrid.Field>
            <FieldGrid.Field
              label={t('fields.startPeriod')}
              htmlFor="msvc-start"
              error={form.formState.errors.startPeriod?.message}
            >
              <Input
                id="msvc-start"
                type="month"
                {...form.register('startPeriod')}
                placeholder="2026-01"
              />
            </FieldGrid.Field>
          </FieldGrid>
        )}

        <div className="space-y-2">
          <label htmlFor="msvc-frequency" className="text-sm font-medium">
            {t('fields.frequency')}
          </label>
          <Select
            id="msvc-frequency"
            {...form.register('frequencyMonths', { valueAsNumber: true })}
            // Cadence is immutable after creation (matches the backend
            // contract). We still render the value in edit mode so the user
            // sees what they have.
            disabled={isEditing}
          >
            {MONTHLY_SERVICE_FREQUENCIES.map((value) => (
              <option key={value} value={value}>
                {t(`frequency.${MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS[value]}`)}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {isEditing ? t('fields.frequencyHintEdit') : t('fields.frequencyHint')}
          </p>
        </div>

        <FieldGrid columns={2}>
          <FieldGrid.Field
            label={t('fields.estimatedAmount')}
            htmlFor="msvc-amount"
            hint={t('fields.estimatedAmountHint')}
          >
            <Input
              id="msvc-amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register('estimatedAmount', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </FieldGrid.Field>

          <FieldGrid.Field
            label={t('fields.dueDay')}
            htmlFor="msvc-dueDay"
            error={form.formState.errors.dueDay ? t('fields.dueDayOutOfRange') : undefined}
            hint={t('fields.dueDayHint')}
          >
            <Input
              id="msvc-dueDay"
              type="number"
              min="1"
              max="31"
              step="1"
              {...form.register('dueDay', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </FieldGrid.Field>
        </FieldGrid>

        <div className="border-t border-border pt-4">
          {isEditing && service ? (
            <ParticipantEditor
              mode="edit"
              monthlyServiceId={service.id}
              currency={service.currency}
              knownReferences={knownReferences}
            />
          ) : (
            <ParticipantEditor
              mode="create"
              currency={watchedCurrency as Currency}
              knownReferences={knownReferences}
              rows={createRows}
              onRowsChange={(rows) => {
                setParticipantsError(null);
                setCreateRows(rows);
              }}
            />
          )}
          {participantsError && (
            <p className="mt-2 text-xs text-destructive">{participantsError}</p>
          )}
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
