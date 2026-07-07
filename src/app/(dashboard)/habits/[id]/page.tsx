import { HabitDetail } from '@/presentation/features/habits/HabitDetail';

interface HabitDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HabitDetailPage({ params }: HabitDetailPageProps) {
  const { id } = await params;
  return <HabitDetail habitId={id} />;
}
