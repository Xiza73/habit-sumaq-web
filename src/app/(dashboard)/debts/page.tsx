import { DebtsLoansDashboard } from '@/presentation/features/debts-loans/DebtsLoansDashboard';

/**
 * /debts — surfaced by the v1.0.0 `debts_loans` backend module.
 * Replaces the legacy `/transactions/debts` view in the sidebar.
 * The legacy route stays alive but unlinked until A6-W drops the
 * legacy transactions UI.
 */
export default function DebtsPage() {
  return <DebtsLoansDashboard />;
}
