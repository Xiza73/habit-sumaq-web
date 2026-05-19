'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Modal renders its content into `document.body` via `createPortal`. This
 * matters whenever a Modal can host another Modal — e.g. `TransactionForm`
 * embeds `CategorySelectField`, which can open `CategoryForm`. Both modals
 * have a `<form>` inside, and HTML forbids nested forms; without the
 * portal the inner `<form>` would render as a DOM descendant of the outer
 * one, breaking hydration and submitting both on a single Enter press.
 *
 * Rendering to the body also sidesteps z-index battles with sticky
 * headers / sidebars and keeps the modal usable when an ancestor has
 * `overflow: hidden` (e.g. a constrained card container).
 */
export function Modal({ open, onClose, title, className, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([disabled])',
    );
    firstFocusable?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;
  // SSR safety net: createPortal needs a real DOM target. The component is
  // 'use client' but a parent server component could still hand us a true
  // `open` prop during the initial render — bail rather than throw.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Stop submit events from bubbling out of the modal's React tree.
        //
        // React events follow the *component* tree, not the DOM tree —
        // `createPortal` moves the DOM nodes to document.body but keeps
        // the component-tree parent intact. So a <form> inside this
        // Modal that's mounted from another <form> (e.g. CategoryForm
        // opened from inside TransactionForm) would have its submit
        // bubble up to the outer form and silently trigger it. We catch
        // the event at the dialog boundary and stop it here so the
        // inner submit stays inner.
        onSubmit={(e) => e.stopPropagation()}
        className={cn(
          'relative z-50 flex w-full max-w-md flex-col rounded-t-xl border border-border bg-background shadow-lg sm:rounded-xl',
          'mb-16 max-h-[calc(100vh-5rem)] sm:mb-0 sm:max-h-[90vh]',
          className,
        )}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
