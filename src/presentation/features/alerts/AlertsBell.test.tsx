import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Alert, type AlertsListResponse } from '@/core/domain/entities/alert';

import { alertsApi } from '@/infrastructure/api/alerts.api';

import { TestProviders } from '@/test/utils';

import { AlertsBell } from './AlertsBell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
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
    payload: {
      serviceName: 'Netflix',
      dueDay: 15,
      currency: 'PEN',
      estimatedAmount: null,
    },
    ...overrides,
  };
}

function mockAlertsResponse(data: AlertsListResponse) {
  vi.mocked(alertsApi.getAll).mockResolvedValue(data);
}

describe('AlertsBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('badge', () => {
    it('shows no badge when there are zero alerts', async () => {
      mockAlertsResponse({ alerts: [], lastSeenAt: null });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      // Wait for the query to settle.
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });
      // No badge means no element with the unread aria-label.
      expect(screen.queryByLabelText(/sin leer/i)).not.toBeInTheDocument();
    });

    it('shows a badge with the unread count when lastSeenAt is null', async () => {
      mockAlertsResponse({
        alerts: [makeAlert({ id: 'a1' }), makeAlert({ id: 'a2' }), makeAlert({ id: 'a3' })],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText('3 sin leer')).toBeInTheDocument();
      });
    });

    it('clamps the badge label to 99+ for huge counts', async () => {
      const many = Array.from({ length: 120 }, (_, i) => makeAlert({ id: `a${i}` }));
      mockAlertsResponse({ alerts: many, lastSeenAt: null });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });
  });

  describe('open + mark-seen wiring', () => {
    it('calls alertsApi.markSeen exactly once when opening with unread > 0', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [makeAlert({ id: 'a1' })],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText('1 sin leer')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      await waitFor(() => {
        expect(alertsApi.markSeen).toHaveBeenCalledTimes(1);
      });
    });

    it('does NOT call markSeen when opening with unread === 0 (no-op optimization)', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [makeAlert({ id: 'a1', triggeredAt: '2026-01-01T00:00:00.000Z' })],
        // lastSeenAt is AFTER the triggered time → already seen, unread=0
        lastSeenAt: '2026-05-01T00:00:00.000Z',
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      // Wait for the query before clicking.
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      // markSeen should NOT have been called — opening with 0 unread is a no-op.
      expect(alertsApi.markSeen).not.toHaveBeenCalled();
    });
  });

  describe('"Cerrar todas" button', () => {
    it('is HIDDEN when there are < 2 dismissable alerts (1 per-day → only the X)', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [makeAlert({ id: 'a1', isDismissable: true })],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText('1 sin leer')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      expect(screen.queryByRole('button', { name: 'Cerrar todas' })).not.toBeInTheDocument();
    });

    it('is HIDDEN when all alerts are persistent (no dismiss target)', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [
          makeAlert({ id: 'p1', isDismissable: false }),
          makeAlert({ id: 'p2', isDismissable: false }),
        ],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      expect(screen.queryByRole('button', { name: 'Cerrar todas' })).not.toBeInTheDocument();
    });

    it('SHOWS the button when there are >= 2 dismissable alerts', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [
          makeAlert({ id: 'a1', isDismissable: true }),
          makeAlert({ id: 'a2', isDismissable: true }),
        ],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      expect(screen.getByRole('button', { name: 'Cerrar todas' })).toBeInTheDocument();
    });

    it('dismisses every dismissable in parallel — persistent ones are NOT touched', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [
          makeAlert({ id: 'd1', isDismissable: true }),
          makeAlert({ id: 'd2', isDismissable: true }),
          // Persistent: server would reject this — the button must not even
          // try.
          makeAlert({ id: 'p1', isDismissable: false }),
        ],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));
      await user.click(screen.getByRole('button', { name: 'Cerrar todas' }));

      await waitFor(() => {
        expect(alertsApi.dismiss).toHaveBeenCalledTimes(2);
      });
      const dismissedIds = vi
        .mocked(alertsApi.dismiss)
        .mock.calls.map(([id]) => id)
        .sort();
      expect(dismissedIds).toEqual(['d1', 'd2']);
    });

    it('shows the persistent hint footer when at least one persistent alert remains', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [makeAlert({ id: 'p1', isDismissable: false })],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      expect(
        screen.getByText('Las alertas restantes se cierran solas al resolverlas'),
      ).toBeInTheDocument();
    });

    it('hides the persistent hint footer when there are no persistent alerts', async () => {
      const user = userEvent.setup();
      mockAlertsResponse({
        alerts: [
          makeAlert({ id: 'a1', isDismissable: true }),
          makeAlert({ id: 'a2', isDismissable: true }),
        ],
        lastSeenAt: null,
      });
      render(
        <TestProviders>
          <AlertsBell />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled();
      });

      await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

      expect(
        screen.queryByText('Las alertas restantes se cierran solas al resolverlas'),
      ).not.toBeInTheDocument();
    });
  });
});
