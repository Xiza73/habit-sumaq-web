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
 */
export function MarkdownToolbar({ textareaRef }: MarkdownToolbarProps) {
  const t = useTranslations('quickTasks.markdownToolbar');

  function run(action: (textarea: HTMLTextAreaElement) => void) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      action(ta);
    };
  }

  const buttonClass =
    'rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
      <button
        type="button"
        title={t('bold')}
        aria-label={t('bold')}
        onMouseDown={run((ta) => wrapSelection(ta, '**'))}
        className={buttonClass}
      >
        <Bold className="size-3.5" />
      </button>
      <button
        type="button"
        title={t('italic')}
        aria-label={t('italic')}
        onMouseDown={run((ta) => wrapSelection(ta, '*'))}
        className={buttonClass}
      >
        <Italic className="size-3.5" />
      </button>
      <button
        type="button"
        title={t('code')}
        aria-label={t('code')}
        onMouseDown={run((ta) => wrapSelection(ta, '`'))}
        className={buttonClass}
      >
        <Code className="size-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-border" aria-hidden />

      <button
        type="button"
        title={t('heading')}
        aria-label={t('heading')}
        onMouseDown={run((ta) => prefixLine(ta, '## '))}
        className={buttonClass}
      >
        <Heading className="size-3.5" />
      </button>
      <button
        type="button"
        title={t('bulletList')}
        aria-label={t('bulletList')}
        onMouseDown={run((ta) => prefixLine(ta, '- '))}
        className={buttonClass}
      >
        <List className="size-3.5" />
      </button>
      <button
        type="button"
        title={t('orderedList')}
        aria-label={t('orderedList')}
        onMouseDown={run((ta) => prefixLine(ta, '1. '))}
        className={buttonClass}
      >
        <ListOrdered className="size-3.5" />
      </button>
      <button
        type="button"
        title={t('quote')}
        aria-label={t('quote')}
        onMouseDown={run((ta) => prefixLine(ta, '> '))}
        className={buttonClass}
      >
        <Quote className="size-3.5" />
      </button>
    </div>
  );
}
