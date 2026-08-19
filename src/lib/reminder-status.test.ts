import { describe, expect, it } from 'vitest';

import { compareReminders, resolveReminderStatus } from './reminder-status';

const TODAY = '2026-05-19';

function make(over: Partial<Parameters<typeof resolveReminderStatus>[0]> = {}) {
  return { remindDate: null, remindTime: null, completed: false, ...over };
}

describe('resolveReminderStatus', () => {
  it('is done whenever it is completed, whatever the date says', () => {
    expect(resolveReminderStatus(make({ completed: true, remindDate: '2026-01-01' }), TODAY)).toBe(
      'done',
    );
  });

  it('is undated when it has no date', () => {
    expect(resolveReminderStatus(make(), TODAY)).toBe('undated');
  });

  it('is overdue when its date is behind today', () => {
    expect(resolveReminderStatus(make({ remindDate: '2026-05-18' }), TODAY)).toBe('overdue');
  });

  it('is today on its own date', () => {
    expect(resolveReminderStatus(make({ remindDate: TODAY }), TODAY)).toBe('today');
  });

  it('stays "today" all day even with an hour that has not arrived', () => {
    // The hour gates the ALERT, not the status. A reminder set for 23:00 is
    // still a thing you have to do today, and the list must say so.
    expect(resolveReminderStatus(make({ remindDate: TODAY, remindTime: '23:00' }), TODAY)).toBe(
      'today',
    );
  });

  it('is upcoming when its date is ahead', () => {
    expect(resolveReminderStatus(make({ remindDate: '2026-05-20' }), TODAY)).toBe('upcoming');
  });
});

describe('compareReminders', () => {
  function sorted(items: ReturnType<typeof make>[]) {
    return [...items].sort((a, b) => compareReminders(a, b, TODAY));
  }

  it('puts pending before done', () => {
    const done = make({ completed: true, remindDate: '2026-05-01' });
    const pending = make({ remindDate: '2026-12-01' });
    expect(sorted([done, pending])[0]).toBe(pending);
  });

  it('orders pending by urgency: overdue, today, upcoming, undated', () => {
    const overdue = make({ remindDate: '2026-05-18' });
    const today = make({ remindDate: TODAY });
    const upcoming = make({ remindDate: '2026-06-01' });
    const undated = make();

    expect(sorted([undated, upcoming, today, overdue])).toEqual([
      overdue,
      today,
      upcoming,
      undated,
    ]);
  });

  it('breaks ties within a bucket by time of day, untimed first', () => {
    // An untimed reminder is due from the start of the day, so it comes first.
    const at15 = make({ remindDate: TODAY, remindTime: '15:00' });
    const at9 = make({ remindDate: TODAY, remindTime: '09:00' });
    const untimed = make({ remindDate: TODAY });

    expect(sorted([at15, untimed, at9])).toEqual([untimed, at9, at15]);
  });

  it('puts the OLDEST overdue first — the one you have dodged longest', () => {
    const older = make({ remindDate: '2026-05-01' });
    const newer = make({ remindDate: '2026-05-18' });
    expect(sorted([newer, older])[0]).toBe(older);
  });
});
