import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts running and counts down', () => {
    const { result } = renderHook(() => useCountdown());
    void act(() => result.current.start(10));
    expect(result.current.status).toBe('running');
    expect(result.current.remaining).toBe(10);

    void act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(7);
  });

  it('reaches done at zero and calls onComplete exactly once', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(onComplete));
    void act(() => result.current.start(2));
    void act(() => vi.advanceTimersByTime(2500));

    expect(result.current.status).toBe('done');
    expect(result.current.remaining).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('pause freezes the remaining time; resume continues from it', () => {
    const { result } = renderHook(() => useCountdown());
    void act(() => result.current.start(10));
    void act(() => vi.advanceTimersByTime(2000));
    expect(result.current.remaining).toBe(8);

    void act(() => result.current.pause());
    expect(result.current.status).toBe('paused');
    void act(() => vi.advanceTimersByTime(5000)); // wall time passes but we're paused
    expect(result.current.remaining).toBe(8);

    void act(() => result.current.resume());
    expect(result.current.status).toBe('running');
    void act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(5);
  });

  it('ignores start with a non-positive duration', () => {
    const { result } = renderHook(() => useCountdown());
    void act(() => result.current.start(0));
    expect(result.current.status).toBe('idle');
  });

  it('reset returns to idle with zero remaining', () => {
    const { result } = renderHook(() => useCountdown());
    void act(() => result.current.start(10));
    void act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.remaining).toBe(0);
  });
});
