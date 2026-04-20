import {
  type FinancesDashboard,
  type ReportPeriod,
  type RoutinesDashboard,
} from '@/core/domain/entities/reports';

import { httpClient } from './http-client';

export const reportsApi = {
  getFinancesDashboard(period: ReportPeriod): Promise<FinancesDashboard> {
    return httpClient.get<FinancesDashboard>(`/reports/finances-dashboard?period=${period}`);
  },

  getRoutinesDashboard(period: ReportPeriod): Promise<RoutinesDashboard> {
    return httpClient.get<RoutinesDashboard>(`/reports/routines-dashboard?period=${period}`);
  },
};
