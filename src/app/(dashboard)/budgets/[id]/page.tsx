import { BudgetDetailView } from '@/presentation/features/budgets/BudgetDetailView';

interface BudgetDetailPageProps {
  params: Promise<{ id: string }>;
}

// Budget ids are only known at runtime. `output: 'export'` requires at least
// one param, so we emit a single throwaway shell; real ids are reached via
// client-side navigation from the budgets list. In the web build,
// `dynamicParams` (default true) still serves any id on demand.
export function generateStaticParams(): { id: string }[] {
  return [{ id: 'placeholder' }];
}

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  const { id } = await params;
  return <BudgetDetailView id={id} />;
}
