/**
 * Allowed cadence units for a Chore. The backend stores these as strings on
 * the `chores.interval_unit` column with a CHECK constraint — keep this list
 * in sync with the migration if a new unit is ever added.
 */
export const CHORE_INTERVAL_UNITS = ['days', 'weeks', 'months', 'years'] as const;
export type ChoreIntervalUnit = (typeof CHORE_INTERVAL_UNITS)[number];

export interface Chore {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  category: string | null;
  /** Positive integer. The cadence is `intervalValue` × `intervalUnit`. */
  intervalValue: number;
  intervalUnit: ChoreIntervalUnit;
  /** 'YYYY-MM-DD' — first day the user wants the chore to start counting from. */
  startDate: string;
  /** 'YYYY-MM-DD' of the last time the chore was marked done. Null before any log. */
  lastDoneDate: string | null;
  /** 'YYYY-MM-DD' of the next time the chore is due. Computed in the user timezone. */
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Backend-computed derivative — always present on list/detail responses:
  /** True when `nextDueDate` is earlier than today in the user timezone. */
  isOverdue: boolean;
}
