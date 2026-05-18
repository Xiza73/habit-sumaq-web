import { create } from 'zustand';

/**
 * Queue + active item for the global streak-celebration modal. The
 * `useLogHabit` hook pushes a payload here whenever a "big" milestone is
 * crossed (month, century, year — week is left to the toast/confetti
 * combo since the modal would be too noisy at that cadence).
 *
 * Mounted once via `<CelebrationModal>` at the dashboard layout level so
 * the modal pops regardless of the route the user was on when they
 * logged the habit.
 */

export interface CelebrationPayload {
  habitId: string;
  habitName: string;
  /** Streak that was just hit. Drives the visual + the phrase tier. */
  days: number;
  /** Optional brand color from the habit. Used as the gradient anchor. */
  color: string | null;
}

interface CelebrationState {
  /** Payload currently shown by the modal. `null` = no celebration on screen. */
  active: CelebrationPayload | null;
  /** Push a celebration to be shown next. Overwrites any prior pending. */
  trigger: (payload: CelebrationPayload) => void;
  /** Dismiss the active celebration. Called when the modal closes. */
  dismiss: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  active: null,
  trigger: (payload) => set({ active: payload }),
  dismiss: () => set({ active: null }),
}));
