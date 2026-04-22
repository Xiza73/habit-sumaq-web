/**
 * Streak milestone detection for celebratory toasts.
 *
 * Milestones:
 *   - 7   → first week  ("week")
 *   - 30  → first month ("month")
 *   - 100, 200, 300, ...  → every hundred days ("century")
 *
 * Detection is STATELESS: if the user undoes a check-in and re-does it, the
 * milestone fires again. No persistence, no deduping — the trigger is the
 * pure crossing `prev < threshold && next >= threshold`.
 *
 * If more than one milestone is crossed in a single log (unlikely, but
 * possible if the backend recomputes a streak), the HIGHEST one wins.
 */

export const STREAK_MILESTONES = {
  week: 7,
  month: 30,
  centuryStep: 100,
} as const;

export type StreakMilestoneKind = 'week' | 'month' | 'century';

export interface StreakMilestone {
  kind: StreakMilestoneKind;
  days: number;
}

/**
 * Returns the highest milestone crossed when the streak moves from
 * `prevStreak` to `newStreak`, or `null` if none was crossed.
 *
 * A threshold T is "crossed" when `prevStreak < T <= newStreak`.
 *
 * Priority (highest first):
 *   1. A century (multiple of 100). The lowest multiple that is crossed is
 *      reported — e.g. prev=150, next=350 → 200 (not 300).
 *   2. month (30)
 *   3. week (7)
 */
export function detectMilestoneCrossed(
  prevStreak: number,
  newStreak: number,
): StreakMilestone | null {
  if (newStreak <= prevStreak) return null;

  // Century milestones first (highest priority).
  const { centuryStep } = STREAK_MILESTONES;
  // Smallest multiple of 100 strictly greater than prevStreak.
  const nextCentury =
    prevStreak < centuryStep
      ? centuryStep
      : (Math.floor(prevStreak / centuryStep) + 1) * centuryStep;
  if (newStreak >= nextCentury) {
    return { kind: 'century', days: nextCentury };
  }

  if (prevStreak < STREAK_MILESTONES.month && newStreak >= STREAK_MILESTONES.month) {
    return { kind: 'month', days: STREAK_MILESTONES.month };
  }

  if (prevStreak < STREAK_MILESTONES.week && newStreak >= STREAK_MILESTONES.week) {
    return { kind: 'week', days: STREAK_MILESTONES.week };
  }

  return null;
}
