'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  ArrowLeftRight,
  BarChart3,
  CheckSquare,
  CreditCard,
  FolderTree,
  HandCoins,
  type LucideIcon,
  Receipt,
  Repeat2,
  Settings,
  Target,
} from 'lucide-react';

import { useUIStore } from '@/core/application/stores/ui.store';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** True = rendered indented, as a sub-item of the previous sibling. */
  indent?: boolean;
}

interface NavSection {
  titleKey: string | null;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'routines',
    items: [
      { href: '/habits', labelKey: 'habits', icon: Target },
      { href: '/quick-tasks', labelKey: 'quickTasks', icon: CheckSquare },
      { href: '/chores', labelKey: 'chores', icon: Repeat2 },
    ],
  },
  {
    titleKey: 'finances',
    items: [
      { href: '/accounts', labelKey: 'accounts', icon: CreditCard },
      { href: '/categories', labelKey: 'categories', icon: FolderTree },
      { href: '/transactions', labelKey: 'transactions', icon: ArrowLeftRight },
      { href: '/transactions/debts', labelKey: 'debts', icon: HandCoins, indent: true },
      { href: '/services', labelKey: 'services', icon: Receipt },
    ],
  },
  {
    titleKey: 'reports',
    items: [
      { href: '/reports/finances', labelKey: 'finances', icon: BarChart3 },
      { href: '/reports/routines', labelKey: 'routines', icon: BarChart3 },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [{ href: '/settings', labelKey: 'settings', icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  function isItemActive(item: NavItem): boolean {
    if (pathname === item.href) return true;
    if (!pathname.startsWith(item.href + '/')) return false;
    // A parent nav item does NOT light up when we're on a sub-route that has
    // its own registered entry (e.g. /transactions should not highlight when
    // the user is on /transactions/debts).
    const hasMoreSpecific = NAV_SECTIONS.flatMap((s) => s.items).some(
      (other) =>
        other.href !== item.href &&
        other.href.startsWith(item.href + '/') &&
        (pathname === other.href || pathname.startsWith(other.href + '/')),
    );
    return !hasMoreSpecific;
  }

  function renderNavLink(item: NavItem) {
    const isActive = isItemActive(item);
    const Icon = item.icon;

    if (item.indent) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'ml-6 flex items-center gap-2 border-l py-1.5 pl-3 pr-3 text-xs font-normal transition-colors',
            // rounded only on the right so the left border reads as a hanging
            // indent connected to the parent item above.
            'rounded-r-md',
            isActive
              ? 'border-sidebar-primary bg-sidebar-primary/10 text-sidebar-primary'
              : 'border-border text-muted-foreground hover:border-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <Icon className="size-3.5" />
          {t(item.labelKey)}
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary/10 text-sidebar-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon className="size-5" />
        {t(item.labelKey)}
      </Link>
    );
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200 md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <Image
            src="/logo/logo_lg_dark.svg"
            alt="Habit Sumaq"
            width={32}
            height={32}
            className="block dark:hidden"
          />
          <Image
            src="/logo/logo_lg.svg"
            alt="Habit Sumaq"
            width={32}
            height={32}
            className="hidden dark:block"
          />
          <span className="text-lg font-semibold">Habit Sumaq</span>
        </div>

        <nav className="flex-1 space-y-6 p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.titleKey ?? section.items[0].href}>
              {section.titleKey && (
                <span className="mb-1 block px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(section.titleKey)}
                </span>
              )}
              <div className="space-y-1">{section.items.map(renderNavLink)}</div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">{BOTTOM_ITEMS.map(renderNavLink)}</div>
      </aside>
    </>
  );
}
