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
 *
 * We don't use `@tailwindcss/typography` here — Tailwind 4 doesn't ship it
 * by default and the surface area is small. Instead, every block element
 * gets explicit utility classes so things like `<ol>` markers actually
 * render (the global CSS reset removes them otherwise — that was the cause
 * of the "1. detalle" → "detalle" bug).
 */
export function QuickTaskMarkdown({ children }: QuickTaskMarkdownProps) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: c }) => <h1 className="mb-2 mt-3 text-base font-semibold">{c}</h1>,
          h2: ({ children: c }) => <h2 className="mb-2 mt-3 text-base font-semibold">{c}</h2>,
          h3: ({ children: c }) => <h3 className="mb-1.5 mt-2 text-sm font-semibold">{c}</h3>,
          p: ({ children: c }) => <p className="my-1">{c}</p>,
          ol: ({ children: c }) => <ol className="my-1 list-decimal space-y-0.5 pl-5">{c}</ol>,
          ul: ({ children: c }) => <ul className="my-1 list-disc space-y-0.5 pl-5">{c}</ul>,
          li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
          strong: ({ children: c }) => <strong className="font-semibold">{c}</strong>,
          em: ({ children: c }) => <em className="italic">{c}</em>,
          code: ({ children: c }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{c}</code>
          ),
          pre: ({ children: c }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{c}</pre>
          ),
          blockquote: ({ children: c }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 italic text-muted-foreground">
              {c}
            </blockquote>
          ),
          // Open markdown links in a new tab with rel=noreferrer by default.
          a: ({ href, children: linkChildren, ...rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline underline-offset-2 hover:opacity-80"
              {...rest}
            >
              {linkChildren}
            </a>
          ),
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
