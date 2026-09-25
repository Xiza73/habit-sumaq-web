import { TaskPipView } from '@/presentation/features/tasks/TaskPipView';

export default async function TaskPipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskPipView taskId={id} />;
}
