import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    // Only `Date` is faked, never the timers themselves — userEvent deadlocks
    // under fully-faked timers unless every step advances them by hand. Same
    // reasoning as ChoreCard.test.tsx.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-05-20T12:00:00') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('per-type rendering', () => {
    describe('reminder-due', () => {
      function reminderAlert(remindDate: string, remindTime: string | null = null) {
        return makeAlert({
          type: 'reminder-due',
          payload: { reminderId: 'rem-1', title: 'Llamar al dentista', remindDate, remindTime },
        });
      }

      // The suite's clock is 2026-05-20.
      const TODAY = '2026-05-20';

      it('names the reminder in the title', () => {
        renderItem(reminderAlert(TODAY));
        expect(screen.getByText(/Recordatorio: Llamar al dentista/)).toBeInTheDocument();
      });

      it('says "toca hoy" for one dated today with no hour', () => {
        renderItem(reminderAlert(TODAY));
        expect(screen.getByText(/^Toca hoy$/)).toBeInTheDocument();
      });

      it('names the hour when there is one', () => {
        renderItem(reminderAlert(TODAY, '15:00'));
        expect(screen.getByText(/Toca hoy a las 15:00/)).toBeInTheDocument();
      });

      it('counts the days it has been pending once overdue', () => {
        renderItem(reminderAlert('2026-05-17'));
        expect(screen.getByText(/3 días que está pendiente/)).toBeInTheDocument();
      });

      it('ignores the hour once overdue — the moment has passed, it is just late', () => {
        renderItem(reminderAlert('2026-05-17', '23:00'));
        expect(screen.queryByText(/23:00/)).not.toBeInTheDocument();
      });
    });

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

    it('renders budget-unlogged with the day streak + currency', () => {
      renderItem(
        makeAlert({
          id: 'budget-unlogged:abc:2026-05-19',
          type: 'budget-unlogged',
          severity: 'info',
          isDismissable: true,
          payload: {
            budgetId: 'abc',
            currency: 'PEN',
            remaining: 900,
            days: 3,
          },
        }),
      );
      expect(screen.getByText('¿Olvidaste registrar un gasto?')).toBeInTheDocument();
      expect(screen.getByText(/3 días sin registrar en tu presupuesto PEN/)).toBeInTheDocument();
    });

    it('renders chore-overdue as an action for today, with the delay as context', () => {
      // An overdue chore is still something to do TODAY. Leading with
      // "Atrasada" made the whole popover read as a list of failures, and in
      // practice a chore that is behind never reaches the due-today state at
      // all — `nextDueDate < today` and `nextDueDate === today` cannot both
      // hold, so the user only ever saw the past-tense copy.
      renderItem(
        makeAlert({
          id: 'chore-overdue:abc',
          type: 'chore-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: { choreId: 'abc', choreName: 'Lavar el auto', nextDueDate: '2026-05-15' },
        }),
      );
      expect(screen.getByText(/Toca hoy/i)).toBeInTheDocument();
      expect(screen.getByText(/Lavar el auto/)).toBeInTheDocument();
    });

    it('counts the days a chore has been overdue', () => {
      vi.setSystemTime(new Date('2026-05-20T12:00:00'));
      renderItem(
        makeAlert({
          id: 'chore-overdue:abc',
          type: 'chore-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: { choreId: 'abc', choreName: 'Lavar el auto', nextDueDate: '2026-05-15' },
        }),
      );
      expect(screen.getByText(/5 días/)).toBeInTheDocument();
    });

    it('uses the singular for a chore one day overdue', () => {
      vi.setSystemTime(new Date('2026-05-16T12:00:00'));
      renderItem(
        makeAlert({
          id: 'chore-overdue:abc',
          type: 'chore-overdue',
          severity: 'warning',
          isDismissable: false,
          payload: { choreId: 'abc', choreName: 'Lavar el auto', nextDueDate: '2026-05-15' },
        }),
      );
      expect(screen.getByText(/1 día(?!s)/)).toBeInTheDocument();
    });

    it('renders service-overdue as an action for today too', () => {
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
      // Same present-tense framing as chores — the two modules should not
      // disagree about how a late item is phrased.
      expect(screen.getByText(/Toca hoy/i)).toBeInTheDocument();
      expect(screen.getByText(/Internet/)).toBeInTheDocument();
      // The period still appears, as the context for how late it is.
      expect(screen.getByText(/2026-04/)).toBeInTheDocument();
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
    it('navigates to /services on click for service alerts', async () => {
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

      // Note: backend API path is /monthly-services, but the Next.js route
      // for the UI is /services. NAV_SECTIONS in Sidebar.tsx is the source
      // of truth for in-app routes.
      expect(pushMock).toHaveBeenCalledWith('/services');
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
