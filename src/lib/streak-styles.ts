/**
 * Visual tiers for habit streaks. The longer the streak, the more vibrant the
 * flame icon and the card background — reinforcing the user's progress.
 *
 * Metaphor: fire kindling → hot flame → tempered gold → legendary gem.
 *
 * Tiers:
 *   0  → streak === 0   (no streak yet, muted flame, no bg)
 *   1  → 1–6 days       (started, orange + subtle gradient)
 *   2  → 7–29 days      (a week, red + slow pulse, "hot flame")
 *   3  → 30–99 days     (a month, amber/gold + normal pulse, "tempered")
 *   4  → 100+ days      (legendary, amethyst glow + multi-color gradient)
 *
 * The single source of truth for streak visuals — consumed by HabitCard,
 * HabitDetail, and the top-streaks block in RoutinesDashboard.
 */

export type StreakTier = 0 | 1 | 2 | 3 | 4;

export interface StreakStyle {
  tier: StreakTier;
  /**
   * Classes to apply to the `<Flame />` icon. Includes color, optional pulse
   * animation (tiers 2+), and optional drop-shadow glow (tier 4).
   */
  flameClass: string;
  /**
   * Additional classes to merge into the card wrapper. Provides the tier's
   * gradient background and a colored border that replaces the default
   * `border-border`. Empty string for tiers 0–1 (no visual change).
   *
   * IMPORTANT: the consumer must NOT include the default `border-border` when
   * applying `cardClass` for tiers 2+, since this string brings its own border
   * color.
   */
  cardClass: string;
}

export function getStreakTier(streak: number): StreakTier {
  if (streak <= 0) return 0;
  if (streak < 7) return 1;
  if (streak < 30) return 2;
  if (streak < 100) return 3;
  return 4;
}

const STYLES: Record<StreakTier, Omit<StreakStyle, 'tier'>> = {
  0: {
    // No streak yet — flame looks "unlit".
    flameClass: 'text-muted-foreground',
    cardClass: '',
  },
  1: {
    // 1–6 days — orange flame + subtle warm gradient so the first tier feels
    // alive (not just "flame color changed").
    flameClass: 'text-orange-500',
    cardClass:
      'bg-gradient-to-br from-card to-orange-200/60 dark:to-orange-800/35 border-orange-500/20',
  },
  2: {
    // 7–29 days — "hot flame": red, slow pulse. Red before gold so the tier
    // progression reads as "kindling → fire → tempered gold".
    flameClass: 'text-red-500 animate-pulse [animation-duration:3s]',
    cardClass: 'bg-gradient-to-br from-card to-red-200/75 dark:to-red-700/50 border-red-500/25',
  },
  3: {
    // 30–99 days — amber/gold, normal pulse. Dark mode uses yellow-600 instead
    // of amber-800 to keep clear hue separation from the red tier above.
    flameClass: 'text-amber-500 animate-pulse [animation-duration:2s]',
    cardClass:
      'bg-gradient-to-br from-card to-amber-200/70 dark:to-yellow-600/45 border-amber-500/25',
  },
  4: {
    // 100+ — amethyst glow, fastest pulse, multi-color gradient.
    // Light: fuchsia-300 + amber-400 (saturated, not pastel).
    // Dark: keeps the fuchsia-800 + amber-800 combo that felt "professional".
    flameClass:
      'text-purple-400 animate-pulse [animation-duration:1.5s] drop-shadow-[0_0_6px_rgba(192,132,252,0.7)]',
    cardClass:
      'bg-gradient-to-br from-card via-fuchsia-300/55 to-amber-400/40 dark:via-fuchsia-800/40 dark:to-amber-800/40 border-purple-400/30',
  },
};

export function getStreakStyle(streak: number): StreakStyle {
  const tier = getStreakTier(streak);
  return { tier, ...STYLES[tier] };
}
