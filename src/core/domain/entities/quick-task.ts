export interface QuickTask {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
