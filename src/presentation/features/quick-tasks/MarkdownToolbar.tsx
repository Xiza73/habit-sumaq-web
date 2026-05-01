'use client';

import { type RefObject } from 'react';
import { useTranslations } from 'next-intl';

import { Bold, Code, Heading, Italic, List, ListOrdered, Quote } from 'lucide-react';

import { prefixLine, wrapSelection } from '@/lib/markdown-input';

interface MarkdownToolbarProps {
  /** Ref to the textarea the toolbar should act on. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * Compact toolbar of markdown shortcuts that operate on the textarea passed
 * via ref. Each button is `type="button"` so it never submits the parent form
 * and `onMouseDown` (instead of onClick) so the textarea doesn't lose focus
 * before we apply the change.
 *
 * The dispatch goes through ONE shared `onMouseDown` handler keyed by a
 * `data-cmd` attribute. The previous factory pattern (`run(action)`) returned
 * a closure during render, which `react-hooks/refs` flagged as "ref accessed
 * during render" because lexically `textareaRef.current` lived inside a
 * function called from JSX. With a single handler the access is unambiguously
 * inside an event callback.
 */
type ToolbarCmd = 'bold' | 'italic' | 'code' | 'heading' | 'bulletList' | 'orderedList' | 'quote';

export function MarkdownToolbar({ textareaRef }: MarkdownToolbarProps) {
  const t = useTranslations('quickTasks.markdownToolbar');

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const ta = textareaRef.current;
    if (!ta) return;

    const cmd = e.currentTarget.dataset.cmd as ToolbarCmd | undefined;
    switch (cmd) {
      case 'bold':
        wrapSelection(ta, '**');
        return;
      case 'italic':
        wrapSelection(ta, '*');
        return;
      case 'code':
        wrapSelection(ta, '`');
        return;
      case 'heading':
        prefixLine(ta, '## ');
        return;
      case 'bulletList':
        prefixLine(ta, '- ');
        return;
      case 'orderedList':
        prefixLine(ta, '1. ');
        return;
      case 'quote':
        prefixLine(ta, '> ');
        return;
    }
  }

  const buttonClass =
    'rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
      <button
        type="button"
        data-cmd="bold"
        title={t('bold')}
        aria-label={t('bold')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <Bold className="size-3.5" />
      </button>
      <button
        type="button"
        data-cmd="italic"
        title={t('italic')}
        aria-label={t('italic')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <Italic className="size-3.5" />
      </button>
      <button
        type="button"
        data-cmd="code"
        title={t('code')}
        aria-label={t('code')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <Code className="size-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-border" aria-hidden />

      <button
        type="button"
        data-cmd="heading"
        title={t('heading')}
        aria-label={t('heading')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <Heading className="size-3.5" />
      </button>
      <button
        type="button"
        data-cmd="bulletList"
        title={t('bulletList')}
        aria-label={t('bulletList')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <List className="size-3.5" />
      </button>
      <button
        type="button"
        data-cmd="orderedList"
        title={t('orderedList')}
        aria-label={t('orderedList')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <ListOrdered className="size-3.5" />
      </button>
      <button
        type="button"
        data-cmd="quote"
        title={t('quote')}
        aria-label={t('quote')}
        onMouseDown={handleMouseDown}
        className={buttonClass}
      >
        <Quote className="size-3.5" />
      </button>
    </div>
  );
}
