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
  /**
   * Whether the section header is rendered "collapsed" in the task dashboard.
   * Persisted server-side so the choice survives refresh and follows the user
   * across devices. Defaults to `false` (expanded) for new sections.
   */
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}
