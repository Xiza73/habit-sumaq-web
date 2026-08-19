import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Alert, type AlertsListResponse } from '@/core/domain/entities/alert';

import { alertsApi } from '@/infrastructure/api/alerts.api';

import { ALERTS_REFETCH_INTERVAL_MS, computeUnreadCount, useAlerts } from './use-alerts';

vi.mock('@/infrastructure/api/alerts.api', () => ({
  alertsApi: {
    getAll: vi.fn(),
    dismiss: vi.fn(),
    markSeen: vi.fn(),
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

describe('computeUnreadCount', () => {
  it('returns 0 when there is no data yet (initial render)', () => {
    expect(computeUnreadCount(undefined)).toBe(0);
  });

  it('counts every alert as unread when the user has never opened the popover', () => {
    const data: AlertsListResponse = {
      alerts: [makeAlert({ id: 'a1' }), makeAlert({ id: 'a2' }), makeAlert({ id: 'a3' })],
      lastSeenAt: null,
    };
    expect(computeUnreadCount(data)).toBe(3);
  });

  it('only counts alerts triggered strictly AFTER lastSeenAt', () => {
    const data: AlertsListResponse = {
      alerts: [
        // Triggered before — counts as seen.
        makeAlert({ id: 'old', triggeredAt: '2026-05-01T00:00:00.000Z' }),
        // Triggered exactly at lastSeenAt — counts as seen (strict >).
        makeAlert({ id: 'boundary', triggeredAt: '2026-05-10T12:00:00.000Z' }),
        // Triggered after — unread.
        makeAlert({ id: 'new', triggeredAt: '2026-05-10T12:00:01.000Z' }),
      ],
      lastSeenAt: '2026-05-10T12:00:00.000Z',
    };
    expect(computeUnreadCount(data)).toBe(1);
  });

  it('returns 0 when every alert is older than lastSeenAt (the all-seen case)', () => {
    const data: AlertsListResponse = {
      alerts: [makeAlert({ triggeredAt: '2026-05-01T00:00:00.000Z' })],
      lastSeenAt: '2026-05-10T12:00:00.000Z',
    };
    expect(computeUnreadCount(data)).toBe(0);
  });
});

describe('useAlerts staleness', () => {
  // The reported doubt: close the budget nudge, and the next day it never
  // comes back. The backend is proven correct — the alert ID embeds the date,
  // so tomorrow is a different row, and the dismissal expires at local
  // midnight either way (see get-alerts.use-case.spec.ts).
  //
  // The gap is here. `staleTime` only MARKS data stale; it never refetches on
  // its own. A refetch needs a trigger — mount, window focus, or reconnect.
  // The desktop app runs with autostart and can stay open and focused for
  // days, so none of those fire, and the popover can hold a day-old list
  // indefinitely.
  //
  // These tests pin that something periodic exists.
  function renderAlerts() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return renderHook(() => useAlerts(), {
      wrapper: ({ children }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(alertsApi.getAll).mockResolvedValue({ alerts: [], lastSeenAt: null });
  });

  it('refetches on its own while the app stays open', async () => {
    vi.useFakeTimers();
    try {
      renderAlerts();
      await vi.waitFor(() => expect(alertsApi.getAll).toHaveBeenCalledTimes(1));

      // Nothing here mounts, focuses or reconnects — only time passes, which
      // is exactly the desktop-app-left-open case.
      await vi.advanceTimersByTimeAsync(ALERTS_REFETCH_INTERVAL_MS + 1_000);

      expect(vi.mocked(alertsApi.getAll).mock.calls.length).toBeGreaterThan(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('polls often enough that a day boundary cannot be missed', () => {
    // The interval is what bounds how stale the list can get. Anything close
    // to a day would let the exact bug it fixes happen again.
    expect(ALERTS_REFETCH_INTERVAL_MS).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(ALERTS_REFETCH_INTERVAL_MS).toBeGreaterThan(0);
  });
});
