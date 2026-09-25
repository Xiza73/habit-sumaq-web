'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Blend } from 'lucide-react';

/**
 * Dim levels the control cycles through.
 *
 * A cycling button, not a slider: at 340px a slider is a hair-wide target, and
 * three steps cover what the window is for — solid, see-through enough to read
 * what is behind, and barely there.
 *
 * Tauri exposes no window-opacity API, so this is plain CSS alpha over a
 * window created with `transparent: true`.
 */
const OPACITY_LEVELS = [1, 0.7, 0.4] as const;

/**
 * Dimming state for a floating window.
 *
 * Lives here rather than in each popup because all five of them dim the same
 * way, and the previous copy-per-popup is the exact shape of bug the chore
 * status colours already cost us once.
 */
export function usePipOpacity() {
  const [step, setStep] = useState(0);
  // Dimming only helps while the window is being ignored. The moment the
  // pointer arrives the user wants to READ and click it, so it goes solid.
  const [hovered, setHovered] = useState(false);

  return {
    /** What to put on `style.opacity` — hover wins over the chosen level. */
    value: hovered ? 1 : OPACITY_LEVELS[step],
    /** The chosen level, for the button's label. */
    level: OPACITY_LEVELS[step],
    cycle: () => setStep((current) => (current + 1) % OPACITY_LEVELS.length),
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

/** The dim button. Card popups host it in the card's header slot. */
export function PipOpacityButton({ level, onClick }: { level: number; onClick: () => void }) {
  const tPip = useTranslations('pip');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tPip('opacity')}
      title={`${tPip('opacity')} — ${Math.round(level * 100)}%`}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Blend className="size-4" />
    </button>
  );
}
