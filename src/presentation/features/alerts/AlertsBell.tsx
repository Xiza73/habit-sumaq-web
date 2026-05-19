'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Bell } from 'lucide-react';

import {
  computeUnreadCount,
  useAlerts,
  useMarkAlertsSeen,
} from '@/core/application/hooks/use-alerts';

import { cn } from '@/lib/utils';

import { AlertsPopover } from './AlertsPopover';

/**
 * Header-mounted bell with an unread-count badge. Opens a portal popover
 * with the alerts list and bumps `lastAlertsSeenAt` server-side the
 * moment the popover opens — so the badge drops to zero immediately
 * (optimistic) and the next `GET /alerts` reflects the new `lastSeenAt`.
 *
 * We deliberately do NOT call `markSeen` on every render that has a
 * non-zero badge — only on the OPENING transition. Otherwise a user
 * with the popover already open would keep bumping `lastSeenAt` every
 * time a refetch returned new alerts, which is wasteful + confusing.
 */
export function AlertsBell() {
  const t = useTranslations('alerts');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useAlerts();
  const markSeen = useMarkAlertsSeen();

  const unread = computeUnreadCount(data);
  const badgeLabel = unread > 99 ? '99+' : String(unread);

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      // Bump lastSeenAt only on the open transition, and only when there
      // are actually unread alerts. Calling it with `unread === 0` would
      // be a no-op for the badge but still hit the network — skip it.
      if (next && unread > 0 && !markSeen.isPending) {
        markSeen.mutate();
      }
      return next;
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={t('toggleLabel')}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t('toggleLabel')}
        className={cn(
          'relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          open && 'bg-muted text-foreground',
        )}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-label={t('unreadCount', { count: unread })}
            className="absolute right-1 top-1 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 py-0.5 text-[0.625rem] font-semibold leading-none text-destructive-foreground"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      <AlertsPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={buttonRef}
        alerts={data?.alerts ?? []}
        isLoading={isLoading}
        isError={isError}
      />
    </>
  );
}
