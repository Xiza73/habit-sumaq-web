import { useTranslations } from 'next-intl';

import { SettingsForm } from '@/presentation/features/settings/SettingsForm';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SettingsForm />
    </div>
  );
}
