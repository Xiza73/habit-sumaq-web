'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  ArrowLeftRight,
  CheckSquare,
  CreditCard,
  type LucideIcon,
  Settings,
  Target,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/accounts', labelKey: 'accounts', icon: CreditCard },
  { href: '/transactions', labelKey: 'transactions', icon: ArrowLeftRight },
  { href: '/habits', labelKey: 'habits', icon: Target },
  { href: '/quick-tasks', labelKey: 'quickTasks', icon: CheckSquare },
  { href: '/settings', labelKey: 'settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
