/**
 * A single TODO inside a Section. Drag-and-drop reorder is restricted to
 * within the same section; cross-section moves go through the edit form
 * (changing `sectionId`). Description supports markdown (≤5000 chars).
 *
 * Cleanup is weekly: completed tasks whose `completedAt` is earlier than
 * the start of the user's current week are hard-deleted lazy on `GET /tasks`.
 * Incomplete tasks survive across week boundaries.
 */
export interface Task {
  id: string;
  userId: string;
  sectionId: string;
  title: string;
  description: string | null;
  completed: boolean;
  /** ISO timestamp; null when incomplete. */
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
