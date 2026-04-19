'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUpdateUserSettings, useUserSettings } from '@/core/application/hooks/use-user-settings';
import {
  computeUtcOffset,
  isCuratedTimezone,
  TIMEZONE_REGIONS,
} from '@/core/domain/constants/timezones';
import {
  type UpdateUserSettingsInput,
  updateUserSettingsSchema,
} from '@/core/domain/schemas/user-settings.schema';

import { Select } from '@/presentation/components/ui/Select';

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
      timezone: 'UTC',
    },
  });

  // If the user's stored timezone isn't in the curated list, render a
  // dynamic option so their current value is selectable and visible.
  const currentTimezone = settings?.timezone ?? 'UTC';
  const customTimezone = useMemo(() => {
    if (isCuratedTimezone(currentTimezone)) return null;
    const offset = computeUtcOffset(currentTimezone);
    return { value: currentTimezone, label: `${currentTimezone} (${offset})` };
  }, [currentTimezone]);

  useEffect(() => {
    if (settings) {
      form.reset({
        language: settings.language,
        theme: settings.theme,
        defaultCurrency: settings.defaultCurrency,
        dateFormat: settings.dateFormat,
        startOfWeek: settings.startOfWeek,
        timezone: settings.timezone,
      });
    }
  }, [settings, form]);

  function handleSubmit(values: UpdateUserSettingsInput) {
    updateSettings.mutate(values, {
      onSuccess: (updated) => {
        setTheme(updated.theme);
        toast.success(tCommon('save'));

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
        <Select id="language" {...form.register('language')}>
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="theme" className="text-sm font-medium">
          {t('theme')}
        </label>
        <Select id="theme" {...form.register('theme')}>
          <option value="light">{t('themes.light')}</option>
          <option value="dark">{t('themes.dark')}</option>
          <option value="system">{t('themes.system')}</option>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="defaultCurrency" className="text-sm font-medium">
          {t('defaultCurrency')}
        </label>
        <Select id="defaultCurrency" {...form.register('defaultCurrency')}>
          <option value="PEN">Sol peruano (PEN)</option>
          <option value="USD">US Dollar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="dateFormat" className="text-sm font-medium">
          {t('dateFormat')}
        </label>
        <Select id="dateFormat" {...form.register('dateFormat')}>
          <option value="DD/MM/YYYY">DD/MM/YYYY (15/03/2026)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY (03/15/2026)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (2026-03-15)</option>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="startOfWeek" className="text-sm font-medium">
          {t('startOfWeek')}
        </label>
        <Select id="startOfWeek" {...form.register('startOfWeek')}>
          <option value="monday">{t('days.monday')}</option>
          <option value="sunday">{t('days.sunday')}</option>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="timezone" className="text-sm font-medium">
          {t('timezone')}
        </label>
        <Select id="timezone" {...form.register('timezone')}>
          {customTimezone ? (
            <option value={customTimezone.value}>{customTimezone.label}</option>
          ) : null}
          {TIMEZONE_REGIONS.map((region) => (
            <optgroup key={region.regionKey} label={t(`timezoneRegions.${region.regionKey}`)}>
              {region.zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {t(`timezoneZones.${zone.labelKey}`)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <button
        type="submit"
        disabled={updateSettings.isPending || !form.formState.isDirty}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {updateSettings.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {tCommon('save')}
      </button>
    </form>
  );
}
