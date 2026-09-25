'use client';

import { useTranslations } from 'next-intl';

import { X } from 'lucide-react';

import { closeSelfPip } from '@/lib/pip-window';

import { PipOpacityButton, usePipOpacity } from './PipOpacity';

/**
 * The window chrome a floating popup does not get from the OS: a drag surface,
 * a close button, and an opacity control.
 *
 * Used by the popups whose content is a ROW or a LIST — those components have
 * no corner to host a close button, and giving them one would distort them
 * where they actually live. The card popups pass their controls into the
 * card's own header slot instead.
 */
export function PipShell({ children }: { children: React.ReactNode }) {
  const tPip = useTranslations('pip');
  const opacity = usePipOpacity();

  return (
    // `data-tauri-drag-region="deep"` makes the whole surface a title bar the
    // window does not have. Tauri stops the drag at any clickable element, so
    // every control keeps working and only empty space moves the window.
    <div
      data-tauri-drag-region="deep"
      onMouseEnter={opacity.onMouseEnter}
      onMouseLeave={opacity.onMouseLeave}
      style={{ opacity: opacity.value }}
      className="flex h-screen w-screen flex-col overflow-hidden bg-card transition-opacity duration-200"
    >
      <div className="flex shrink-0 items-center justify-end gap-1 px-2 pt-2">
        <PipOpacityButton level={opacity.level} onClick={opacity.cycle} />
        <button
          type="button"
          onClick={() => void closeSelfPip()}
          aria-label={tPip('close')}
          title={tPip('close')}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable because rows expand and the window cannot be resized. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </div>
  );
}
