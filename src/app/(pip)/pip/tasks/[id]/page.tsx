import { SectionPipView } from '@/presentation/features/tasks/SectionPipView';

export default async function TasksPipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SectionPipView sectionId={id} />;
}
