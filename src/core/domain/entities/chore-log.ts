export interface ChoreLog {
  id: string;
  choreId: string;
  /** 'YYYY-MM-DD' — calendar day the chore was marked as done. */
  doneAt: string;
  note: string | null;
  createdAt: string;
}
