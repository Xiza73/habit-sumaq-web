import { useTranslations } from 'next-intl';

export default function AccountsPage() {
  const t = useTranslations('accounts');

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
    </div>
  );
}
