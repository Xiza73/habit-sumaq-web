import { ChorePipView } from '@/presentation/features/chores/ChorePipView';

export default async function ChorePipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChorePipView choreId={id} />;
}
