import { describe, expect, it } from 'vitest';

import { type Alert, type AlertsListResponse } from '@/core/domain/entities/alert';

import { computeUnreadCount } from './use-alerts';

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
