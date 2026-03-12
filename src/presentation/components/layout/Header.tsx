'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LogOut, Menu } from 'lucide-react';

import { useAuthStore } from '@/core/application/stores/auth.store';
import { useUIStore } from '@/core/application/stores/ui.store';

import { authApi } from '@/infrastructure/api/auth.api';

export function Header() {
  const router = useRouter();
  const t = useTranslations('auth');
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      router.replace('/login');
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={32}
                height={32}
                className="size-8 rounded-full"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm font-medium md:block">{user.name}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label={t('logout')}
          title={t('logout')}
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  );
}
