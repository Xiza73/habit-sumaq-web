import { describe, expect, it } from 'vitest';

import { type Alert, ALERT_TYPES, getAlertHref } from './alert';

function makeAlert(type: Alert['type']): Alert {
  return {
    id: `${type}:test`,
    type,
    severity: 'info',
    isDismissable: true,
    triggeredAt: '2026-05-01T00:00:00.000Z',
    payload: {},
  };
}

describe('getAlertHref', () => {
  // Locks the mapping to the actual Next.js routes under
  // `src/app/(dashboard)/`. If a route ever gets renamed (e.g. `/services` →
  // `/subscriptions`) this table is the first thing that should turn red so
  // the popover doesn't silently 404 the user.
  //
  // Cross-reference: `NAV_SECTIONS` in `src/presentation/components/layout/Sidebar.tsx`.
  const EXPECTED_HREFS: Record<Alert['type'], string> = {
    'service-due-today': '/services',
    'service-overdue': '/services',
    'habits-midday': '/habits',
    'budget-unlogged': '/budgets',
    'chore-overdue': '/chores',
  };

  it.each(ALERT_TYPES)('maps "%s" to its in-app route', (type) => {
    expect(getAlertHref(makeAlert(type))).toBe(EXPECTED_HREFS[type]);
  });

  it('returns a non-null href for every known AlertType (no dead links)', () => {
    for (const type of ALERT_TYPES) {
      expect(getAlertHref(makeAlert(type))).not.toBeNull();
    }
  });
});
