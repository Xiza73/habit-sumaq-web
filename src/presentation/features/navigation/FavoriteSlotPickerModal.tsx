'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@/presentation/components/ui/Modal';

import { FAVORITE_KEYS, NAV_REGISTRY } from '@/lib/nav-registry';
import { cn } from '@/lib/utils';

interface FavoriteSlotPickerModalProps {
  open: boolean;
  /** Index (0..3) of the slot being re-assigned. Drives the title copy. */
  slotIndex: number;
  /** Current favorite keys, including the slot being edited. */
  favoriteKeys: string[];
  /** Called with the picked key. Parent decides whether to add, replace, or swap. */
  onPick: (key: string) => void;
  onClose: () => void;
}

/**
 * Long-press picker for a mobile bottom-nav slot. Lists every key in the
 * registry; tapping one calls `onPick` and closes. The parent
 * (`MobileNav`) handles the slot semantics — if the picked key is already
 * in another slot, the parent SWAPS the two so we never end up with
 * duplicates (backend rejects them anyway).
 *
 * Keys that are currently in another slot are marked visually + with a
 * caption so the user knows tapping them moves them, not duplicates them.
 */
export function FavoriteSlotPickerModal({
  open,
  slotIndex,
  favoriteKeys,
  onPick,
  onClose,
}: FavoriteSlotPickerModalProps) {
  const t = useTranslations('favoritePicker');
  const tNav = useTranslations('navigation');

  const currentKeyInSlot = favoriteKeys[slotIndex];

  return (
    <Modal open={open} onClose={onClose} title={t('title')}>
      <p className="mb-3 text-sm text-muted-foreground">{t('subtitle')}</p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {FAVORITE_KEYS.map((key) => {
          const entry = NAV_REGISTRY[key];
          const isInAnotherSlot = favoriteKeys.includes(key) && key !== currentKeyInSlot;
          const isInThisSlot = key === currentKeyInSlot;
          const Icon = entry.icon;

          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onPick(key)}
                disabled={isInThisSlot}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                  isInThisSlot
                    ? 'cursor-default border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted',
                )}
                aria-current={isInThisSlot ? 'true' : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="truncate">{tNav(entry.labelKey)}</span>
                  {isInAnotherSlot && (
                    <span className="text-[11px] text-muted-foreground">{t('alreadyInSlot')}</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t('cancel')}
        </button>
      </div>
    </Modal>
  );
}
