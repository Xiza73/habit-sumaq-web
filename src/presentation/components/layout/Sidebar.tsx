'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  BarChart3,
  CheckSquare,
  CreditCard,
  FolderTree,
  HandCoins,
  ListChecks,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat2,
  Settings,
  Star,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

import { useFavoriteKeys, useUpdateUserSettings } from '@/core/application/hooks/use-user-settings';
import { useUIStore } from '@/core/application/stores/ui.store';

import { ApiError } from '@/infrastructure/api/api-error';

import { isFavoriteKey, MAX_FAVORITES } from '@/lib/nav-registry';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /**
   * Favorite key (matches the `FavoriteKey` union in `nav-registry`). When
   * present, the item can be marked as a favorite via right-click + shows
   * the ★ when it's in `favoriteKeys`. `undefined` = not favoritable (e.g.
   * Settings, or future grouped headers).
   */
  favoriteKey?: string;
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
      { href: '/habits', labelKey: 'habits', icon: Target, favoriteKey: 'habits' },
      {
        href: '/quick-tasks',
        labelKey: 'priorities',
        icon: CheckSquare,
        favoriteKey: 'quick-tasks',
      },
      { href: '/tasks', labelKey: 'tasks', icon: ListChecks, favoriteKey: 'tasks' },
      { href: '/chores', labelKey: 'chores', icon: Repeat2, favoriteKey: 'chores' },
    ],
  },
  {
    titleKey: 'finances',
    items: [
      { href: '/accounts', labelKey: 'accounts', icon: CreditCard, favoriteKey: 'accounts' },
      { href: '/categories', labelKey: 'categories', icon: FolderTree, favoriteKey: 'categories' },
      // A6-W.3 (`accounts-to-modular-finance` v1.0.0): the legacy
      // `/transactions` route is gone. The `/debts` item no longer hangs
      // off it — promoted to a top-level finances item. The next slice
      // (A6-W.5) drops `/accounts` and merges Balance Total with the pool.
      { href: '/debts', labelKey: 'debts', icon: HandCoins, favoriteKey: 'debts' },
      { href: '/services', labelKey: 'services', icon: Receipt, favoriteKey: 'services' },
      { href: '/budgets', labelKey: 'budgets', icon: PiggyBank, favoriteKey: 'budgets' },
    ],
  },
  {
    titleKey: 'reports',
    items: [
      {
        href: '/reports/finances',
        labelKey: 'finances',
        icon: BarChart3,
        favoriteKey: 'reports-finances',
      },
      {
        href: '/reports/routines',
        labelKey: 'routines',
        icon: BarChart3,
        favoriteKey: 'reports-routines',
      },
    ],
  },
];

// Settings is intentionally not favoritable — it's always available
// (mobile fixed slot, sidebar bottom). `favoriteKey: undefined`.
const BOTTOM_ITEMS: NavItem[] = [{ href: '/settings', labelKey: 'settings', icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tFavorites = useTranslations('settings.favorites');
  const tErrors = useTranslations('errors');
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const navRef = useRef<HTMLElement | null>(null);

  const favoriteKeys = useFavoriteKeys();
  const updateSettings = useUpdateUserSettings();
  const favoriteKeysSet = new Set(favoriteKeys);

  /**
   * Toggle a key in/out of the user's favorites. Called from right-click on
   * a sidebar item — gives a power-user-friendly path to manage favorites
   * without going to settings.
   *
   * Rules:
   *  - Toggle off: always allowed (remove from the array).
   *  - Toggle on: rejected with a toast when already at MAX_FAVORITES.
   *  - Unknown keys (somehow): no-op.
   */
  function toggleFavorite(key: string) {
    if (!isFavoriteKey(key)) return;
    const isCurrentlyFavorite = favoriteKeysSet.has(key);

    if (!isCurrentlyFavorite && favoriteKeys.length >= MAX_FAVORITES) {
      toast.error(tFavorites('maxReached', { max: MAX_FAVORITES }));
      return;
    }

    const next = isCurrentlyFavorite
      ? favoriteKeys.filter((k) => k !== key)
      : [...favoriteKeys, key];

    updateSettings.mutate(
      { favoriteKeys: next },
      {
        // No success toast — the ★ marker appearing/disappearing IS the
        // feedback. Toasts here would also overlap the bottom nav on
        // mobile (same window) and add noise without value.
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.code && tErrors.has(error.code)
              ? tErrors(error.code as 'ACC_001')
              : tFavorites('saveError'),
          );
        },
      },
    );
  }

  // When the active route changes (or on mount with a deep route already
  // selected), scroll the active link into view INSIDE the nav. block:
  // 'nearest' is a no-op when the link is already on screen, so users
  // with short routes never see a jump.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [pathname]);

  // Lock the body scroll while the drawer is open on mobile. Desktop has
  // the sidebar sticky as a permanent column (`md:sticky md:translate-x-0`)
  // and `sidebarOpen` never flips there, so the media-query guard keeps
  // the lock from leaking into the desktop layout. On resize across the
  // breakpoint we re-evaluate so a rotation or DevTools-driven resize
  // doesn't strand the page in `overflow: hidden`.
  useEffect(() => {
    if (!sidebarOpen) return;

    const mql = window.matchMedia('(max-width: 767px)');
    const previousOverflow = document.body.style.overflow;

    function applyLock() {
      document.body.style.overflow = mql.matches ? 'hidden' : previousOverflow;
    }

    applyLock();
    mql.addEventListener('change', applyLock);
    return () => {
      mql.removeEventListener('change', applyLock);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

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
    // Favoritable items get a ★ next to the label when they're in
    // `favoriteKeys`, and a right-click handler that toggles them. Settings
    // (and any other non-favoritable items) get neither.
    const isFavorite = item.favoriteKey != null && favoriteKeysSet.has(item.favoriteKey);
    const handleContextMenu = item.favoriteKey
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          toggleFavorite(item.favoriteKey as string);
        }
      : undefined;

    if (item.indent) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          onContextMenu={handleContextMenu}
          aria-current={isActive ? 'page' : undefined}
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
          <span className="flex-1">{t(item.labelKey)}</span>
          {isFavorite && <Star className="size-3 fill-current opacity-60" aria-label="favorite" />}
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        onContextMenu={handleContextMenu}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary/10 text-sidebar-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon className="size-5" />
        <span className="flex-1">{t(item.labelKey)}</span>
        {isFavorite && <Star className="size-3.5 fill-current opacity-60" aria-label="favorite" />}
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
          // Mobile: fixed off-canvas drawer. Desktop: sticky to the top of
          // the viewport so the sidebar stays anchored while the main pane
          // scrolls underneath. h-screen pins the height to the viewport in
          // BOTH layouts — that gives sticky a height to anchor against,
          // and it lets the inner <nav> compute overflow correctly.
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200',
          'md:sticky md:top-0 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
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

        <nav
          ref={navRef}
          // overflow-y-auto on the nav means scrolling stays inside the
          // sidebar — the main content scrolls independently. Custom thin
          // scrollbar via arbitrary variants so we don't pollute globals.css:
          // Firefox uses scrollbar-width, WebKit/Chromium uses the
          // pseudo-elements. Both fall back to the platform default outside
          // those browsers.
          className={cn(
            'flex-1 space-y-6 overflow-y-auto p-3',
            '[scrollbar-width:thin]',
            '[&::-webkit-scrollbar]:w-1.5',
            '[&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:rounded-full',
            '[&::-webkit-scrollbar-thumb]:bg-border',
            'hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40',
          )}
        >
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

        <div className="shrink-0 border-t border-border p-3">{BOTTOM_ITEMS.map(renderNavLink)}</div>
      </aside>
    </>
  );
}
