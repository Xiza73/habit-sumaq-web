import { BudgetDetailView } from '@/presentation/features/budgets/BudgetDetailView';

interface BudgetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  const { id } = await params;
  return <BudgetDetailView id={id} />;
}
