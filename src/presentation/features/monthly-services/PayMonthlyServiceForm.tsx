'use client';

import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useServiceParticipants } from '@/core/application/hooks/use-monthly-service-participants';
import { useCreateMonthlyServicePayment } from '@/core/application/hooks/use-monthly-service-payments';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import {
  type CreateMonthlyServicePaymentInput,
  createMonthlyServicePaymentSchema,
} from '@/core/domain/schemas/monthly-service-payment.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';

import {
  dateInputToBackendIso,
  formatPeriodLabel,
  getEstimatedPaymentDate,
  getTodayLocaleDate,
} from '@/lib/format';

interface PayMonthlyServiceFormProps {
  open: boolean;
  service: MonthlyService | null;
  onClose: () => void;
}

/**
 * Modal that registers a payment for a monthly service.
 *
 * v1.0.0 (Phase A6-W.2 — accounts-to-modular-finance refactor):
 *   - Writes go to `POST /monthly-service-payments` (the new v1.0.0
 *     module) instead of the legacy `POST /monthly-services/:id/pay`.
 *   - The "Cuenta" picker is REMOVED — payments debit the user's
 *     currency pool. The currency is inherited from the service.
 *   - `period` (YYYY-MM) is NOT user-editable. The backend enforces
 *     sequential payment via `service.nextDuePeriod`; exposing an
 *     input would let the user skip "Mayo" and pay "Junio" out of
 *     order, contradicting the "Período: Mayo 2026" pill above. The
 *     period is included in the POST payload as `service.nextDuePeriod`
 *     so the schema validates, but the only way to advance the period
 *     is to pay or skip the current one.
 *   - The date picker is constrained to the period's calendar month —
 *     same pattern as `BudgetMovementForm`. The user records WHEN they
 *     paid the bill within that month, not which bill they're paying.
 */
export function PayMonthlyServiceForm({ open, service, onClose }: PayMonthlyServiceFormProps) {
  const t = useTranslations('monthlyServices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();

  const createMutation = useCreateMonthlyServicePayment();
  // Only fetch config when the modal is actually open for a real service —
  // avoids a stray request while `service` is null between opens.
  const { data: configuredParticipants = [] } = useServiceParticipants(
    open ? service?.id : undefined,
  );
  const isShared = configuredParticipants.length > 0;

  const form = useForm<CreateMonthlyServicePaymentInput>({
    resolver: zodResolver(createMonthlyServicePaymentSchema),
    defaultValues: {
      monthlyServiceId: '',
      period: '',
      amount: 0,
      date: getTodayLocaleDate(),
      description: null,
      participants: [],
    },
  });

  const { fields: participantFields } = useFieldArray({
    control: form.control,
    name: 'participants',
  });

  useEffect(() => {
    if (!open || !service) return;
    // If the service has a dueDay, pre-fill the date to that day in the period
    // being paid (e.g. 15 of nextDuePeriod) — better default than today, since
    // the user typically pays around the due day, not when they remember to
    // open the form. Falls back to today when dueDay is null.
    const estimatedDate = getEstimatedPaymentDate(service.nextDuePeriod, service.dueDay);
    form.reset({
      monthlyServiceId: service.id,
      period: service.nextDuePeriod,
      amount: service.estimatedAmount ?? 0,
      date: estimatedDate ?? getTodayLocaleDate(),
      // Notes start EMPTY by design — the service name (e.g. "Sedapal")
      // already identifies the payment. Pre-filling here would mirror the
      // service name back to the user as if it were custom input. The field
      // is optional; users add real value only when there's something to
      // say (e.g. "incluye recargo" or "pago en efectivo").
      description: null,
      // Splits default from config (`defaultAmount`), editable per payment.
      // `[]` when the service has no participants — pays exactly like a
      // normal (non-shared) payment, no regression.
      participants: configuredParticipants.map((p) => ({
        reference: p.reference,
        amount: p.defaultAmount,
        alreadyPaid: false,
      })),
    });
  }, [open, service, configuredParticipants, form]);

  if (!service) return null;

  // Constrain the date picker to the period being paid. Same pattern as
  // `BudgetMovementForm` — pinning min/max stops a user from picking a
  // date that doesn't match the period they're recording.
  const monthFirst = `${service.nextDuePeriod}-01`;
  const monthLast = lastDayOfPeriod(service.nextDuePeriod);

  function handleSubmit(values: CreateMonthlyServicePaymentInput) {
    if (!service) return;

    const cleaned: CreateMonthlyServicePaymentInput = {
      monthlyServiceId: service.id,
      // Period is NOT user-editable — always the service's nextDuePeriod.
      // The schema requires it, so we read it off the service directly
      // (not from form state) so even a stale form value can't override it.
      period: service.nextDuePeriod,
      amount: values.amount,
      // Pin to 12:00 UTC so the backend reads the same calendar day across
      // every realistic timezone — sending the raw YYYY-MM-DD makes it
      // parse as UTC midnight which shifts to the previous day in negative
      // offsets (e.g. paying the 3rd in America/Lima ended up stored as
      // the 2nd, breaking the dueDay recompute).
      date: dateInputToBackendIso(values.date ?? '') ?? values.date,
      description: values.description === '' ? null : (values.description ?? null),
      // Omit entirely (not `[]`) when the service isn't shared — mirrors
      // the schema's `.optional()` and keeps a non-shared payment's
      // payload byte-identical to pre-slice-4 behavior.
      ...(values.participants && values.participants.length > 0
        ? { participants: values.participants }
        : {}),
    };

    createMutation.mutate(cleaned, {
      onSuccess: () => {
        toast.success(t('paySuccess', { name: service.name }));
        onClose();
      },
      onError: (error) => {
        // MSP_003 = already-paid-for-period (UQ_msp_service_period_active).
        // Attach to the `period` field so the user can pick another month
        // instead of being kicked back to a global toast.
        if (error instanceof ApiError && error.code === 'MSP_003') {
          form.setError('period', { message: tErrors('MSP_003') });
          return;
        }
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'MSP_001')
            : tErrors('generic'),
        );
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t('payForm.title', { name: service.name })}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t('payForm.period', { period: formatPeriodLabel(service.nextDuePeriod, locale) })}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="pay-amount" className="text-sm font-medium">
              {t('payForm.amount')}
            </label>
            <Input
              id="pay-amount"
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
            <label htmlFor="pay-date" className="text-sm font-medium">
              {t('payForm.date')}
            </label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="pay-date"
                  min={monthFirst}
                  max={monthLast}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        {isShared && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div>
              <h3 className="text-sm font-medium">{t('payForm.participants.title')}</h3>
              <p className="text-[11px] text-muted-foreground">{t('payForm.participants.hint')}</p>
            </div>
            <ul className="space-y-2">
              {participantFields.map((field, index) => (
                <li key={field.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{field.reference}</span>
                  <div className="w-24">
                    <label htmlFor={`participant-payment-amount-${index}`} className="sr-only">
                      {field.reference}
                    </label>
                    <Input
                      id={`participant-payment-amount-${index}`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      compact
                      {...form.register(`participants.${index}.amount`, { valueAsNumber: true })}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      {...form.register(`participants.${index}.alreadyPaid`)}
                    />
                    {t('payForm.participants.alreadyPaid')}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="pay-details" className="text-sm font-medium">
            {t('payForm.details')}
          </label>
          {/* "Detalles" intentionally renamed from "Descripción" — the
              payment is already named by the service (e.g. "Sedapal"), so
              this field is now strictly OPTIONAL notes on top of that
              (recargos, partial payments, boleta refs, etc.). */}
          <Input
            id="pay-details"
            type="text"
            {...form.register('description')}
            placeholder={t('payForm.detailsPlaceholder')}
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
            disabled={createMutation.isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('payForm.confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Last calendar day of a period (`YYYY-MM`) formatted as `YYYY-MM-DD`.
 * Day 0 of the next month = last day of the current. Same trick the
 * budgets form uses.
 */
function lastDayOfPeriod(period: string): string {
  const [yyyy, mm] = period.split('-').map(Number);
  const last = new Date(Date.UTC(yyyy, mm, 0));
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`;
}
