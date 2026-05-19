'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Settings, Star } from 'lucide-react';
import { toast } from 'sonner';

import { useFavoriteKeys, useUpdateUserSettings } from '@/core/application/hooks/use-user-settings';

import { ApiError } from '@/infrastructure/api/api-error';

import { FavoriteSlotPickerModal } from '@/presentation/features/navigation/FavoriteSlotPickerModal';
import { useLongPress } from '@/presentation/hooks/use-long-press';

import { DEFAULT_FAVORITES, getNavEntries, MAX_FAVORITES, type NavEntry } from '@/lib/nav-registry';
import { cn } from '@/lib/utils';

const SETTINGS_HREF = '/settings';

/**
 * Mobile bottom nav. Renders the user's favorite slots (`favoriteKeys`,
 * up to {@link MAX_FAVORITES}) followed by a fixed Settings slot.
 * Long-press on any favorite slot opens the picker so the user can swap
 * it without leaving the screen — the settings page also offers a fuller
 * UI for the same operation.
 *
 * When a favorite slot is empty (`favoriteKeys.length < MAX_FAVORITES`) we
 * render a placeholder slot with a star icon so the user has a target to
 * long-press. The placeholder isn't a link.
 */
export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tErrors = useTranslations('errors');
  const tFavorites = useTranslations('settings.favorites');

  const favoriteKeys = useFavoriteKeys();
  const updateSettings = useUpdateUserSettings();

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  // Resolve to NavEntry[], silently dropping any keys that aren't in the
  // registry (e.g. a route we removed since the user last set their
  // favorites). Slot order = array order, capped at MAX_FAVORITES.
  const entries: (NavEntry | null)[] = Array.from({ length: MAX_FAVORITES }, (_, i) => {
    const resolved = getNavEntries([favoriteKeys[i] ?? '']);
    return resolved[0] ?? null;
  });

  // Settings is always rendered last and is NOT favoritable — it sits in
  // its own slot. Pulling the metadata in directly because it isn't in
  // NAV_REGISTRY by design (the registry is "user-pickable items only").
  const settingsActive = pathname.startsWith(SETTINGS_HREF);

  function applyPick(slot: number, pickedKey: string) {
    // Mutate the favorites array atomically:
    //   - If the picked key is already in another slot, swap with the
    //     target slot so we never duplicate.
    //   - Otherwise replace the target slot's key.
    // Both paths preserve order in the rest of the array, which matters
    // because slot order = mobile visual order.
    const next = [...favoriteKeys];
    // Pad the array up to the target slot in case the user picks for a
    // slot beyond `favoriteKeys.length` (an empty placeholder slot).
    while (next.length <= slot) next.push('');

    const existingIndex = next.indexOf(pickedKey);
    if (existingIndex >= 0 && existingIndex !== slot) {
      // Swap.
      const tmp = next[slot];
      next[slot] = pickedKey;
      next[existingIndex] = tmp;
    } else {
      next[slot] = pickedKey;
    }

    // Drop empties before submitting — backend expects a clean string[].
    const cleaned = next.filter((k) => k !== '');

    updateSettings.mutate(
      { favoriteKeys: cleaned },
      {
        // No success toast — the visible slot swap IS the feedback, and a
        // toast at the bottom of the screen would overlap the very nav
        // the user just changed (the user reported this UX bug after the
        // first round). Errors still surface (less common, important).
        onSuccess: () => {
          setPickerSlot(null);
        },
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

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-safe md:hidden">
        <div className="flex items-center justify-around">
          {entries.map((entry, i) => (
            <FavoriteSlot
              key={`slot-${i}`}
              entry={entry}
              isActive={entry !== null && pathname.startsWith(entry.href)}
              labelTranslator={t}
              onLongPress={() => setPickerSlot(i)}
            />
          ))}

          {/* Fixed Settings slot — not user-pickable. */}
          <Link
            href={SETTINGS_HREF}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition-colors',
              settingsActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Settings className="size-5" />
            <span>{t('settings')}</span>
          </Link>
        </div>
      </nav>

      <FavoriteSlotPickerModal
        open={pickerSlot !== null}
        slotIndex={pickerSlot ?? 0}
        favoriteKeys={favoriteKeys.length > 0 ? favoriteKeys : DEFAULT_FAVORITES}
        onPick={(key) => {
          if (pickerSlot === null) return;
          applyPick(pickerSlot, key);
        }}
        onClose={() => setPickerSlot(null)}
      />
    </>
  );
}

interface FavoriteSlotProps {
  entry: NavEntry | null;
  isActive: boolean;
  labelTranslator: ReturnType<typeof useTranslations<'navigation'>>;
  onLongPress: () => void;
}

function FavoriteSlot({ entry, isActive, labelTranslator, onLongPress }: FavoriteSlotProps) {
  // Long-press handlers spread onto the slot regardless of whether it's a
  // populated link or an empty placeholder — both cases the user wants to
  // change what lives there.
  const lpProps = useLongPress(onLongPress);

  if (entry === null) {
    // Empty placeholder — same footprint as a real slot so the bottom nav
    // stays evenly-spaced. The star is muted to read as "not yet picked".
    return (
      <button
        type="button"
        {...lpProps}
        className="flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium text-muted-foreground/50 transition-colors"
        aria-label="Empty favorite slot — long-press to pick"
      >
        <Star className="size-5" />
        <span>—</span>
      </button>
    );
  }

  const Icon = entry.icon;
  // Prefer the short label when the registry provides one — keeps long
  // labels like "Deudas y préstamos" from wrapping to 2 lines and pushing
  // the icon off-center vs sibling slots. `truncate` is defensive in case
  // a future label slips past the short-label net.
  const label = labelTranslator((entry.shortLabelKey ?? entry.labelKey) as 'debts');
  return (
    <Link
      href={entry.href}
      {...lpProps}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="block max-w-full truncate whitespace-nowrap">{label}</span>
    </Link>
  );
}
