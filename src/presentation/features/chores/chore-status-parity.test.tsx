import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type Chore } from '@/core/domain/entities/chore';

import { CHORE_STATUS_CLASSES, type ChoreStatus } from '@/lib/chore-status';
import messages from '@/i18n/messages/es.json';

import { TestProviders } from '@/test/utils';

import { ChoreCard } from './ChoreCard';
import { ChoresTable } from './ChoresTable';

/**
 * The card and the table used to keep their OWN copy of the status→classes
 * map. They happened to agree, and nothing made them: change a colour in one
 * and the same chore would show two different states depending on the view
 * mode, with no test to notice.
 *
 * These render both views over the same chore and compare the chip, so the
 * duplication cannot come back unseen — reintroducing a local map would only
 * be caught here.
 */

const TODAY = new Date('2026-04-20T12:00:00');

/** `nextDueDate` offsets that land a chore in each status, relative to TODAY. */
const DUE_DATE_BY_STATUS: Record<ChoreStatus, string> = {
  overdue: '2026-04-15',
  today: '2026-04-20',
  // Inside the upcoming window for a 6-week cadence.
  upcoming: '2026-04-24',
  // Far enough out to be nobody's problem yet.
  horizon: '2026-08-01',
};

function makeChore(nextDueDate: string): Chore {
  return {
    id: 'chore-1',
    userId: 'user-1',
    name: 'Cortar el pelo',
    notes: null,
    category: 'Personal',
    intervalValue: 6,
    intervalUnit: 'weeks',
    startDate: '2026-01-01',
    lastDoneDate: '2026-03-01',
    nextDueDate,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOverdue: false,
  };
}

const noop = vi.fn();

function wrap(ui: React.ReactElement) {
  // `ChoreCard` reads the user's date format, so it needs the query client
  // too — `TestProviders` carries both it and the `es` messages.
  return render(ui, { wrapper: TestProviders });
}

/** The status chip's classes, found by the localized status label. */
function chipClassFor(status: ChoreStatus): string {
  const label = messages.chores.status[status];
  return screen.getByText(label).className;
}

describe('chore status chip — card and table agree', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it.each(Object.keys(DUE_DATE_BY_STATUS) as ChoreStatus[])(
    'renders the same chip classes in both views for "%s"',
    (status) => {
      const chore = makeChore(DUE_DATE_BY_STATUS[status]);

      const card = wrap(
        <ChoreCard
          chore={chore}
          onMarkDone={noop}
          onSkip={noop}
          onEdit={noop}
          onArchive={noop}
          onDelete={noop}
          onViewHistory={noop}
        />,
      );
      const fromCard = chipClassFor(status);
      card.unmount();

      wrap(
        <ChoresTable
          chores={[chore]}
          onMarkDone={noop}
          onSkip={noop}
          onViewHistory={noop}
          onEdit={noop}
          onArchive={noop}
          onDelete={noop}
        />,
      );
      const fromTable = chipClassFor(status);

      // Both must carry the colours the single source declares. Comparing the
      // two views to each other alone would pass if BOTH drifted together.
      expect(fromCard).toContain(CHORE_STATUS_CLASSES[status]);
      expect(fromTable).toContain(CHORE_STATUS_CLASSES[status]);
    },
  );
});
