import { HabitDetail } from '@/presentation/features/habits/HabitDetail';

interface HabitDetailPageProps {
  params: Promise<{ id: string }>;
}

// Habit ids are only known at runtime. `output: 'export'` requires at least
// one param, so we emit a single throwaway shell; real ids are reached via
// client-side navigation from the habits list. In the web build,
// `dynamicParams` (default true) still serves any id on demand.
export function generateStaticParams(): { id: string }[] {
  return [{ id: 'placeholder' }];
}

export default async function HabitDetailPage({ params }: HabitDetailPageProps) {
  const { id } = await params;
  return <HabitDetail habitId={id} />;
}
