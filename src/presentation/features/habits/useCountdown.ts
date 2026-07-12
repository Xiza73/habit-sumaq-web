'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CountdownStatus = 'idle' | 'running' | 'paused' | 'done';

interface UseCountdown {
  status: CountdownStatus;
  /** Seconds left. */
  remaining: number;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

/**
 * A drift-free countdown. Remaining is derived from an absolute end timestamp
 * (`Date.now() + duration`) rather than by decrementing a counter, so OS sleep
 * or a slow tab never accumulate error. Transitions to `done` at zero and fires
 * `onComplete` once.
 */
export function useCountdown(onComplete?: () => void): UseCountdown {
  const [status, setStatus] = useState<CountdownStatus>('idle');
  const [remaining, setRemaining] = useState(0);
  const endAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      if (endAtRef.current == null) return;
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        endAtRef.current = null;
        setStatus('done');
        onCompleteRef.current?.();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status]);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    endAtRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    if (endAtRef.current == null) return; // only running has an end timestamp
    setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
    endAtRef.current = null;
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    setStatus((current) => {
      if (current !== 'paused') return current;
      endAtRef.current = Date.now() + remaining * 1000;
      return 'running';
    });
  }, [remaining]);

  const reset = useCallback(() => {
    endAtRef.current = null;
    setRemaining(0);
    setStatus('idle');
  }, []);

  return { status, remaining, start, pause, resume, reset };
}
