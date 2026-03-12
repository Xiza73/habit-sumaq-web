import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
    </div>
  );
}
