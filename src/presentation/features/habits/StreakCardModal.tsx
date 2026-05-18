'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Download, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Modal } from '@/presentation/components/ui/Modal';

import { analytics } from '@/lib/analytics';
import { buildStreakCardSvg, pickStreakPhraseKey, svgToPngBlob } from '@/lib/streak-card';
import { cn } from '@/lib/utils';

interface StreakCardModalProps {
  open: boolean;
  habitId: string;
  habitName: string;
  days: number;
  color: string | null;
  onClose: () => void;
  /**
   * Optional title shown above the preview. Defaults to the regular
   * "Vista previa" copy; the auto-celebration variant overrides this
   * with "¡Hito desbloqueado!".
   */
  title?: string;
  /** Optional subtitle (motivational copy for the celebration variant). */
  subtitle?: string;
}

/**
 * Renders the streak card preview + share actions. Builds the SVG once
 * per `(days, habitName, color, locale)` combination via useMemo so
 * scrolling / re-rendering the modal doesn't rebuild the markup.
 *
 * Three share paths, in order of preference:
 *
 * 1. **Web Share API** (mobile + modern desktop browsers) — opens the
 *    native share sheet with the PNG as a file. Best UX on phones.
 * 2. **Clipboard image** (modern desktop browsers via Clipboard API) —
 *    pastes directly into chat apps / docs. Optional, falls through
 *    silently if unsupported.
 * 3. **Download** (always available) — saves a `.png` file. Fallback
 *    when neither of the above works.
 *
 * The PNG blob is generated lazily on first share/download click —
 * mounting the modal doesn't pay the canvas cost.
 */
export function StreakCardModal({
  open,
  habitId,
  habitName,
  days,
  color,
  onClose,
  title,
  subtitle,
}: StreakCardModalProps) {
  const t = useTranslations('habits.streakCard');
  const tPhrases = useTranslations('habits.streakCard.phrases');
  // `isWorking` is flipped to true by the click handlers and back to false
  // in their `finally`. No reset effect needed — the handlers always
  // complete (even on AbortError) before unblocking the buttons.
  const [isWorking, setIsWorking] = useState(false);

  const daysLabel = days === 1 ? t('daysSingular') : t('daysPlural');
  const phraseKey = pickStreakPhraseKey(days);
  // Cast: phraseKey is one of 24 valid keys; next-intl's runtime accepts the
  // wider string but its TS overload wants a known literal.
  const phrase = tPhrases(phraseKey as 'starting1');
  const branding = t('branding');

  const svg = useMemo(
    () => buildStreakCardSvg({ days, habitName, daysLabel, phrase, branding, accentColor: color }),
    [days, habitName, daysLabel, phrase, branding, color],
  );

  // SVG-as-data-URL for the in-modal preview. Cheap — the browser parses
  // it directly without a canvas roundtrip.
  const previewUrl = useMemo(() => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, [svg]);

  async function generateBlob(): Promise<Blob> {
    return svgToPngBlob(svg);
  }

  async function handleShare() {
    setIsWorking(true);
    try {
      const blob = await generateBlob();
      const file = new File([blob], `habit-sumaq-streak-${days}d.png`, {
        type: 'image/png',
      });

      // Web Share API path. `canShare` is async in spec but sync in all
      // implementations; we still gate behind a feature check.
      const shareData: ShareData & { files?: File[] } = {
        files: [file],
        title: t('shareTitle'),
        text: t('shareText', { days, habit: habitName }),
      };
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
        analytics.streakCardShared({ habitId, days, format: 'share' });
        return;
      }

      // Fallback: trigger a download.
      downloadBlob(blob, file.name);
      toast.success(t('downloaded'));
      analytics.streakCardShared({ habitId, days, format: 'download' });
    } catch (err) {
      // User cancelling the native share sheet throws an AbortError —
      // that's not an error worth a toast for. Anything else gets one.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error(t('shareError'));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDownload() {
    setIsWorking(true);
    try {
      const blob = await generateBlob();
      downloadBlob(blob, `habit-sumaq-streak-${days}d.png`);
      toast.success(t('downloaded'));
      analytics.streakCardShared({ habitId, days, format: 'download' });
    } catch {
      toast.error(t('shareError'));
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title ?? t('preview')}>
      {subtitle && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}

      {/* Preview — capped to a reasonable on-screen size with aspect-square
          so the modal doesn't blow up on desktop. Inline SVG data URL,
          not a remote image — next/image optimization doesn't apply. */}
      <div className="mx-auto max-w-sm overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={t('preview')} className="block aspect-square w-full" />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={isWorking}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50',
          )}
        >
          {isWorking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {t('downloadAction')}
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={isWorking}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isWorking ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
          {t('shareAction')}
        </button>
      </div>
    </Modal>
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
