'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { usePayMonthlyService } from '@/core/application/hooks/use-monthly-services';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import {
  type PayMonthlyServiceInput,
  payMonthlyServiceSchema,
} from '@/core/domain/schemas/monthly-service.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

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

export function PayMonthlyServiceForm({ open, service, onClose }: PayMonthlyServiceFormProps) {
  const t = useTranslations('monthlyServices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();

  const { data: accounts } = useAccounts(false);
  const payMutation = usePayMonthlyService();

  const form = useForm<PayMonthlyServiceInput>({
    resolver: zodResolver(payMonthlyServiceSchema),
    defaultValues: {
      amount: 0,
      date: getTodayLocaleDate(),
      description: null,
      accountIdOverride: undefined,
    },
  });

  useEffect(() => {
    if (!open || !service) return;
    // If the service has a dueDay, pre-fill the date to that day in the period
    // being paid (e.g. 15 of nextDuePeriod) — better default than today, since
    // the user typically pays around the due day, not when they remember to
    // open the form. Falls back to today when dueDay is null.
    const estimatedDate = getEstimatedPaymentDate(service.nextDuePeriod, service.dueDay);
    form.reset({
      amount: service.estimatedAmount ?? 0,
      date: estimatedDate ?? getTodayLocaleDate(),
      description: service.name,
      accountIdOverride: service.defaultAccountId,
    });
  }, [open, service, form]);

  if (!service) return null;

  function handleSubmit(values: PayMonthlyServiceInput) {
    if (!service) return;

    const cleaned: PayMonthlyServiceInput = {
      amount: values.amount,
      // Pin to 12:00 UTC so the backend reads the same calendar day across
      // every realistic timezone — sending the raw YYYY-MM-DD makes it
      // parse as UTC midnight which shifts to the previous day in negative
      // offsets (e.g. paying the 3rd in America/Lima ended up stored as
      // the 2nd, breaking the dueDay recompute).
      date: dateInputToBackendIso(values.date),
      description: values.description === '' ? null : (values.description ?? null),
      accountIdOverride: values.accountIdOverride || undefined,
    };

    payMutation.mutate(
      { id: service.id, data: cleaned },
      {
        onSuccess: () => {
          toast.success(t('paySuccess', { name: service.name }));
          onClose();
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.code && tErrors.has(error.code)
              ? tErrors(error.code as 'MSVC_001')
              : tErrors('generic'),
          );
        },
      },
    );
  }

  const accountOptions = accounts?.filter((a) => !a.isArchived && a.currency === service.currency);

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
                <DatePicker id="pay-date" value={field.value ?? ''} onChange={field.onChange} />
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="pay-account" className="text-sm font-medium">
            {t('payForm.account')}
          </label>
          <Select id="pay-account" {...form.register('accountIdOverride')}>
            {accountOptions?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="pay-description" className="text-sm font-medium">
            {t('payForm.description')}
          </label>
          <Input
            id="pay-description"
            type="text"
            {...form.register('description')}
            placeholder={t('payForm.description')}
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
            disabled={payMutation.isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {payMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('payForm.confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
