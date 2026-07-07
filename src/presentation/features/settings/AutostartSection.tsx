'use client';

import { useTranslations } from 'next-intl';

import { Power } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

import { useAutostart } from './useAutostart';

/**
 * Settings section that lets the user toggle "launch Habit Sumaq when the
 * computer starts". Backed by the OS via `tauri-plugin-autostart`.
 *
 * Renders nothing outside the Tauri desktop app: a browser/PWA has no API to
 * register itself into Windows/macOS startup, so there is no honest toggle to
 * show there. The section (and its leading divider) only appear on desktop.
 */
export function AutostartSection() {
  const t = useTranslations('settings.autostart');
  const { enabled, status, pending, toggle } = useAutostart();

  // Render nothing until we've confirmed we're inside the desktop app AND read
  // the current OS state — this keeps the section (and its divider) out of the
  // browser/PWA entirely, with no flash.
  if (status !== 'ready') return null;

  const busy = pending;

  async function handleToggle() {
    const ok = await toggle(!enabled);
    if (!ok) toast.error(t('error'));
  }

  return (
    <>
      <hr className="border-border" />
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => void handleToggle()}
          disabled={busy}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors',
            enabled ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
            busy && 'cursor-not-allowed opacity-60',
          )}
        >
          <Power className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">{t('label')}</span>
          <span
            className={cn(
              'inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
              enabled ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
            aria-hidden
          >
            <span
              className={cn(
                'size-4 rounded-full bg-background transition-transform',
                enabled ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </span>
        </button>
        <p className="text-[11px] text-muted-foreground">{t('hint')}</p>
      </section>
    </>
  );
}
