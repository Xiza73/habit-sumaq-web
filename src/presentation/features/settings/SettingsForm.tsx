'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { useUpdateUserSettings, useUserSettings } from '@/core/application/hooks/use-user-settings';
import {
  type UpdateUserSettingsInput,
  updateUserSettingsSchema,
} from '@/core/domain/schemas/user-settings.schema';

export function SettingsForm() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { setTheme } = useTheme();

  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const form = useForm<UpdateUserSettingsInput>({
    resolver: zodResolver(updateUserSettingsSchema),
    defaultValues: {
      language: 'es',
      theme: 'system',
      defaultCurrency: 'PEN',
      dateFormat: 'DD/MM/YYYY',
      startOfWeek: 'monday',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        language: settings.language,
        theme: settings.theme,
        defaultCurrency: settings.defaultCurrency,
        dateFormat: settings.dateFormat,
        startOfWeek: settings.startOfWeek,
      });
    }
  }, [settings, form]);

  function handleSubmit(values: UpdateUserSettingsInput) {
    updateSettings.mutate(values, {
      onSuccess: (updated) => {
        setTheme(updated.theme);

        if (updated.language !== locale) {
          document.cookie = `NEXT_LOCALE=${updated.language};path=/;max-age=31536000`;
          window.location.reload();
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="max-w-lg space-y-6">
      <div className="space-y-2">
        <label htmlFor="language" className="text-sm font-medium">
          {t('language')}
        </label>
        <select
          id="language"
          {...form.register('language')}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="theme" className="text-sm font-medium">
          {t('theme')}
        </label>
        <select
          id="theme"
          {...form.register('theme')}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="light">{t('themes.light')}</option>
          <option value="dark">{t('themes.dark')}</option>
          <option value="system">{t('themes.system')}</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="defaultCurrency" className="text-sm font-medium">
          {t('defaultCurrency')}
        </label>
        <select
          id="defaultCurrency"
          {...form.register('defaultCurrency')}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="PEN">Sol peruano (PEN)</option>
          <option value="USD">US Dollar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="dateFormat" className="text-sm font-medium">
          {t('dateFormat')}
        </label>
        <select
          id="dateFormat"
          {...form.register('dateFormat')}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY (15/03/2026)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY (03/15/2026)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (2026-03-15)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="startOfWeek" className="text-sm font-medium">
          {t('startOfWeek')}
        </label>
        <select
          id="startOfWeek"
          {...form.register('startOfWeek')}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="monday">{t('days.monday')}</option>
          <option value="sunday">{t('days.sunday')}</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={updateSettings.isPending || !form.formState.isDirty}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {updateSettings.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {tCommon('save')}
      </button>

      {updateSettings.isSuccess && (
        <p className="text-sm text-success">{t('saved', { defaultValue: '✓' })}</p>
      )}
    </form>
  );
}
