'use client';

import { useEffect, useState } from 'react';

import { getTodayLocaleDate } from '@/lib/format';

/**
 * How often to notice that the local day has rolled over.
 *
 * ponytail: an interval, not a timer aimed at midnight. A `setTimeout` sized
 * to the exact boundary fires once and precisely — and does not survive the
 * machine sleeping through it, which is the likeliest way a window ends up
 * still open on the wrong day. A string comparison every half minute costs
 * nothing and cannot miss the boundary, only arrive a little after it.
 */
const TICK_MS = 30_000;

/**
 * Today's date in the user's timezone as `YYYY-MM-DD`, kept current for as
 * long as the component stays mounted.
 *
 * `getTodayLocaleDate()` called inline is evaluated at the moment of the call.
 * That is fine for a page someone opens and uses, and wrong for a window that
 * sits on screen across midnight: it renders one day's data and then writes
 * with the next day's date.
 *
 * Reading the date from here instead means a component's reads and writes come
 * from ONE value. Between midnight and the next tick the value is stale, but
 * it is stale on both sides — which is the difference between logging to the
 * day you are looking at and logging yesterday's count onto today.
 */
export function useTodayLocaleDate(): string {
  const [today, setToday] = useState(getTodayLocaleDate);

  useEffect(() => {
    const id = setInterval(() => {
      // Setting the same string is a no-op in React, so the common case does
      // not re-render anything.
      setToday(getTodayLocaleDate());
    }, TICK_MS);

    return () => clearInterval(id);
  }, []);

  return today;
}
