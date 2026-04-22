import confetti from 'canvas-confetti';

/**
 * Fires a short celebratory confetti burst. No-op during SSR.
 *
 * Settings tuned for "visible but not annoying": a single 150-particle burst
 * at 60° spread, origin a bit above the bottom-center of the viewport.
 *
 * Kept as a thin wrapper so the hook layer stays decoupled from the lib.
 */
export function fireCelebrationConfetti(): void {
  if (typeof window === 'undefined') return;

  void confetti({
    particleCount: 150,
    spread: 60,
    origin: { y: 0.7 },
  });
}
