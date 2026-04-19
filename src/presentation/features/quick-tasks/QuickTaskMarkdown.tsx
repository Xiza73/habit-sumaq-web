'use client';

import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

interface QuickTaskMarkdownProps {
  children: string;
}

/**
 * Minimal Markdown renderer used for quick task descriptions.
 *
 * `react-markdown` escapes raw HTML by default, so we get safe rendering
 * without needing a separate sanitizer. Plugins: GFM (tables, strikethrough,
 * task lists). No raw HTML passthrough.
 */
export function QuickTaskMarkdown({ children }: QuickTaskMarkdownProps) {
  return (
    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Open markdown links in a new tab with rel=noreferrer by default.
          a: ({ href, children: linkChildren, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
