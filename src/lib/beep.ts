/**
 * Plays a short, soft two-tone beep via the Web Audio API. Used when a focus
 * timer reaches zero. Fully best-effort: if the browser has no AudioContext
 * (SSR, old browsers) or the context can't start, it silently does nothing.
 *
 * Must be triggered from (or after) a user gesture — browsers block audio that
 * starts without one. The timer is armed by a click, so by the time it fires
 * the page already has an interaction.
 */
export function playBeep(): void {
  if (typeof window === 'undefined') return;

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    // Soft: keep the peak low and ramp out so it doesn't click.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.18); // D6
    osc.connect(gain);

    osc.start(now);
    osc.stop(now + 0.5);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Audio unavailable — ignore.
  }
}
