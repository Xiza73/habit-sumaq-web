import { HabitPipView } from '@/presentation/features/habits/HabitPipView';

export default async function HabitPipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HabitPipView habitId={id} />;
}
