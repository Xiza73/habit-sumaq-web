/**
 * Lifecycle of a task. `IN_REVIEW` is finished-but-being-verified, and is
 * deliberately NOT a flavour of done: the weekly cleanup hard-deletes DONE
 * tasks, and one you are still checking has to survive that sweep.
 */
export const TASK_STATUSES = ['PENDING', 'IN_REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * A single TODO inside a Section. Drag-and-drop reorder is restricted to
 * within the same section; cross-section moves go through the edit form
 * (changing `sectionId`). Description supports markdown (≤5000 chars).
 *
 * Cleanup is weekly: DONE tasks whose `completedAt` is earlier than
 * the start of the user's current week are hard-deleted lazy on `GET /tasks`.
 * Incomplete tasks survive across week boundaries.
 */
export interface Task {
  id: string;
  userId: string;
  sectionId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** ISO timestamp; null when incomplete. */
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
