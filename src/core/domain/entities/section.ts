/**
 * A user-owned container for tasks. Sections are reorderable; tasks live
 * inside them with their own per-section position.
 */
export interface Section {
  id: string;
  userId: string;
  name: string;
  /** `#RRGGBB` or null. Used by the UI to render a swatch next to the section header. */
  color: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
