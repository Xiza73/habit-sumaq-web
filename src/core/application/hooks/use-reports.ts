import { useQuery } from '@tanstack/react-query';

import { type ReportPeriod } from '@/core/domain/entities/reports';

import { reportsApi } from '@/infrastructure/api/reports.api';

export const reportsKeys = {
  all: ['reports'] as const,
  finances: (period: ReportPeriod) => [...reportsKeys.all, 'finances', period] as const,
  routines: (period: ReportPeriod) => [...reportsKeys.all, 'routines', period] as const,
};

export function useFinancesDashboard(period: ReportPeriod) {
  return useQuery({
    queryKey: reportsKeys.finances(period),
    queryFn: () => reportsApi.getFinancesDashboard(period),
  });
}

export function useRoutinesDashboard(period: ReportPeriod) {
  return useQuery({
    queryKey: reportsKeys.routines(period),
    queryFn: () => reportsApi.getRoutinesDashboard(period),
  });
}
