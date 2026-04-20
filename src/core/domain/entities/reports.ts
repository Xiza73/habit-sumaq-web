import { type Currency } from '@/core/domain/enums/account.enums';

export const REPORT_PERIODS = ['week', '30d', 'month', '3m'] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export interface DateRange {
  from: string;
  to: string;
}

// ─── Finances dashboard ──────────────────────────────────────────────────────

export interface BalanceByCurrency {
  currency: Currency;
  amount: number;
  accountCount: number;
}

export interface FlowByCurrency {
  currency: Currency;
  income: number;
  expense: number;
  net: number;
}

export interface TopExpenseCategory {
  categoryId: string | null;
  name: string | null;
  color: string | null;
  currency: Currency;
  total: number;
  percentage: number;
}

export interface DailyFlowPoint {
  date: string;
  income: number;
  expense: number;
}

export interface DailyFlowSeries {
  currency: Currency;
  points: DailyFlowPoint[];
}

export interface DebtsKpi {
  currency: Currency;
  owesYou: number;
  youOwe: number;
  net: number;
}

export interface FinancesDashboard {
  period: ReportPeriod;
  range: DateRange;
  totalBalance: BalanceByCurrency[];
  periodFlow: FlowByCurrency[];
  topExpenseCategories: TopExpenseCategory[];
  dailyFlow: DailyFlowSeries[];
  pendingDebts: DebtsKpi[];
}

// ─── Routines dashboard ──────────────────────────────────────────────────────

export interface HabitStreak {
  habitId: string;
  name: string;
  color: string | null;
  frequency: 'DAILY' | 'WEEKLY';
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

export interface HabitCompletionToday {
  completedToday: number;
  dueToday: number;
  rate: number;
}

export interface QuickTasksToday {
  completed: number;
  pending: number;
  total: number;
}

export interface RoutinesDashboard {
  period: ReportPeriod;
  range: DateRange;
  topHabitStreaks: HabitStreak[];
  habitCompletionToday: HabitCompletionToday;
  quickTasksToday: QuickTasksToday;
}
