import { useTranslations } from 'next-intl';

import { AutostartSection } from '@/presentation/features/settings/AutostartSection';
import { FavoritesSection } from '@/presentation/features/settings/FavoritesSection';
import { ModulesSection } from '@/presentation/features/settings/ModulesSection';
import { SettingsForm } from '@/presentation/features/settings/SettingsForm';
import { TemplatesSection } from '@/presentation/features/settings/TemplatesSection';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SettingsForm />
      <hr className="border-border" />
      {/* Modules before favorites: you pick what exists for you, then pick
          which of those get a nav slot. The other order invites favoriting
          something you are about to hide. */}
      <ModulesSection />
      <hr className="border-border" />
      <FavoritesSection />
      <hr className="border-border" />
      <TemplatesSection />
      <AutostartSection />
    </div>
  );
}
