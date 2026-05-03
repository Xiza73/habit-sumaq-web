import { useTranslations } from 'next-intl';

import { SettingsForm } from '@/presentation/features/settings/SettingsForm';
import { TemplatesSection } from '@/presentation/features/settings/TemplatesSection';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SettingsForm />
      <hr className="border-border" />
      <TemplatesSection />
    </div>
  );
}
