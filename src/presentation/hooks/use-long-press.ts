'use client';

import { useCallback, useRef } from 'react';

/**
 * Triggers `onLongPress` when the user holds down a pointer (touch or mouse)
 * for at least `delay` ms over the same target. Touch-safe + mouse-safe via
 * `pointer*` events.
 *
 * Returns handlers ready to spread onto the target element. The hook cancels
 * cleanly on `pointer-up`, `pointer-cancel`, `pointer-leave`, and on any
 * pointer movement past a small slop tolerance (so accidental drags don't
 * fire the long-press).
 *
 * Why a custom hook (no library): the project already pulls a lot from
 * lucide / react / next-intl — adding `react-use` or similar just for this
 * is wasted footprint. The logic is ~25 lines.
 *
 * Usage:
 * ```tsx
 * const lpProps = useLongPress(() => openPicker(slotIndex));
 * <button {...lpProps}>…</button>
 * ```
 */
export function useLongPress(
  onLongPress: () => void,
  delay = 500,
): {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Anchor x/y captured on `pointerdown`. Pointer-moves are tolerated within
  // a small tolerance (10px); anything past that cancels the long-press —
  // catches the user scrolling instead of holding.
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const MOVE_TOLERANCE_PX = 10;

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    anchorRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      anchorRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!anchorRef.current || timerRef.current === null) return;
      const dx = Math.abs(e.clientX - anchorRef.current.x);
      const dy = Math.abs(e.clientY - anchorRef.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
        clear();
      }
    },
    [clear],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // On long-press the browser's native context menu interrupts our flow;
    // suppress it so the picker modal can take over. `preventDefault` is
    // safe here because the user is interacting with our custom control,
    // not text the OS needs to copy.
    e.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onPointerMove,
    onContextMenu,
  };
}
