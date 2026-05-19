import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Alert } from '@/core/domain/entities/alert';

import { alertsApi } from '@/infrastructure/api/alerts.api';

import { TestProviders } from '@/test/utils';

import { AlertItem } from './AlertItem';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/infrastructure/api/alerts.api', () => ({
  alertsApi: {
    getAll: vi.fn(),
    dismiss: vi.fn().mockResolvedValue(undefined),
    markSeen: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeAlert(overrides: Partial<Alert>): Alert {
  return {
    id: 'service-due-today:abc:2026-05',
    type: 'service-due-today',
    severity: 'info',
    isDismissable: true,
    triggeredAt: '2026-05-01T00:00:00.000Z',
    payload: {},
    ...overrides,
  };
}

function renderItem(alert: Alert, onNavigate?: () => void) {
  return render(
    <TestProviders>
      <AlertItem alert={alert} onNavigate={onNavigate} />
    </TestProviders>,
  );
}

describe('AlertItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('per-type rendering', () => {
    it('renders service-due-today with payload (name + day + amount)', () => {
      renderItem(
        makeAlert({
          type: 'service-due-today',
          payload: {
            serviceName: 'Netflix',
            dueDay: 15,
            currency: 'PEN',
            estimatedAmount: 45.9,
          },
        }),
      );
      expect(screen.getByText(/Netflix/)).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it('renders service-overdue with overdue period in the subtitle', () => {
      renderItem(
        makeAlert({
          id: 'service-overdue:abc',
          type: 'service-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: {
            serviceName: 'Internet',
            overduePeriod: '2026-04',
            currency: 'PEN',
            estimatedAmount: 120,
          },
        }),
      );
      expect(screen.getByText(/Atrasado/i)).toBeInTheDocument();
      expect(screen.getByText(/Internet/)).toBeInTheDocument();
      expect(screen.getByText(/2026-04/)).toBeInTheDocument();
    });

    it('renders habits-midday singular vs plural subtitle based on count', () => {
      const { rerender } = renderItem(
        makeAlert({
          id: 'habits-midday:2026-05-19',
          type: 'habits-midday',
          payload: { missingCount: 1, firstHabitName: 'Tomar agua' },
        }),
      );
      expect(screen.getByText('Empezá por Tomar agua')).toBeInTheDocument();

      rerender(
        <TestProviders>
          <AlertItem
            alert={makeAlert({
              id: 'habits-midday:2026-05-19',
              type: 'habits-midday',
              payload: { missingCount: 3, firstHabitName: 'Tomar agua' },
            })}
          />
        </TestProviders>,
      );
      // 3 missing → 2 left after the "first" name.
      expect(screen.getByText('Empezá por Tomar agua y 2 más')).toBeInTheDocument();
    });

    it('renders budget-overspent with formatted absolute overage', () => {
      renderItem(
        makeAlert({
          id: 'budget-overspent:abc',
          type: 'budget-overspent',
          severity: 'warning',
          isDismissable: false,
          payload: {
            budgetId: 'abc',
            currency: 'PEN',
            amount: 2000,
            spent: 2250,
            remaining: -250,
          },
        }),
      );
      // Currency formatting in es-PE uses non-breaking spaces — match the
      // number digits we control, not the exact glyph.
      expect(screen.getByText(/250/)).toBeInTheDocument();
    });

    it('renders chore-overdue with the due date in the subtitle', () => {
      renderItem(
        makeAlert({
          id: 'chore-overdue:abc',
          type: 'chore-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: { choreId: 'abc', choreName: 'Lavar el auto', nextDueDate: '2026-05-15' },
        }),
      );
      expect(screen.getByText(/Lavar el auto/)).toBeInTheDocument();
      expect(screen.getByText(/2026-05-15/)).toBeInTheDocument();
    });
  });

  describe('close button (isDismissable contract)', () => {
    it('SHOWS the close button on a per-day alert (isDismissable=true)', () => {
      renderItem(
        makeAlert({
          isDismissable: true,
          payload: { serviceName: 'Netflix', dueDay: 15, currency: 'PEN', estimatedAmount: null },
        }),
      );
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('HIDES the close button on a persistent alert (isDismissable=false)', () => {
      renderItem(
        makeAlert({
          id: 'service-overdue:abc',
          type: 'service-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: {
            serviceName: 'Internet',
            overduePeriod: '2026-04',
            currency: 'PEN',
            estimatedAmount: null,
          },
        }),
      );
      expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument();
    });

    it('calls alertsApi.dismiss with the alert id when the close button is clicked', async () => {
      const user = userEvent.setup();
      const alert = makeAlert({
        id: 'service-due-today:xyz:2026-05',
        isDismissable: true,
        payload: { serviceName: 'Netflix', dueDay: 15, currency: 'PEN', estimatedAmount: null },
      });
      renderItem(alert);

      await user.click(screen.getByRole('button', { name: 'Cerrar' }));

      expect(alertsApi.dismiss).toHaveBeenCalledWith('service-due-today:xyz:2026-05');
    });
  });

  describe('navigation (click → feature page)', () => {
    it('navigates to /monthly-services on click for service alerts', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderItem(
        makeAlert({
          type: 'service-due-today',
          payload: { serviceName: 'Netflix', dueDay: 15, currency: 'PEN', estimatedAmount: null },
        }),
        onNavigate,
      );

      // Click on the row (not the close button) — the role="button" wrapper
      // exposes a labeled clickable region.
      await user.click(screen.getByRole('button', { name: /Netflix/i }));

      expect(pushMock).toHaveBeenCalledWith('/monthly-services');
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('navigates to /chores for chore-overdue', async () => {
      const user = userEvent.setup();
      renderItem(
        makeAlert({
          id: 'chore-overdue:abc',
          type: 'chore-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: { choreId: 'abc', choreName: 'Lavar el auto', nextDueDate: '2026-05-15' },
        }),
      );

      await user.click(screen.getByRole('button', { name: /Lavar el auto/i }));

      expect(pushMock).toHaveBeenCalledWith('/chores');
    });

    it('does NOT navigate when the close button is clicked (stopPropagation)', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderItem(
        makeAlert({
          isDismissable: true,
          payload: { serviceName: 'Netflix', dueDay: 15, currency: 'PEN', estimatedAmount: null },
        }),
        onNavigate,
      );

      await user.click(screen.getByRole('button', { name: 'Cerrar' }));

      expect(pushMock).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});
