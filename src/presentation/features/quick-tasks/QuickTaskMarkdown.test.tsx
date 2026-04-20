import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuickTaskMarkdown } from './QuickTaskMarkdown';

describe('QuickTaskMarkdown', () => {
  it('renders inline formatting (bold / italic)', () => {
    render(<QuickTaskMarkdown>{'This is **bold** and *italic* text'}</QuickTaskMarkdown>);

    // `<strong>` from `**bold**`
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');

    // `<em>` from `*italic*`
    const italic = screen.getByText('italic');
    expect(italic.tagName).toBe('EM');
  });

  it('renders lists', () => {
    render(<QuickTaskMarkdown>{'- one\n- two\n- three'}</QuickTaskMarkdown>);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('one');
  });

  it('forces links to open in a new tab with safe rel', () => {
    render(<QuickTaskMarkdown>{'[docs](https://example.com)'}</QuickTaskMarkdown>);

    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('does not render raw HTML (security — react-markdown escapes by default)', () => {
    const { container } = render(
      <QuickTaskMarkdown>{'<script>alert(1)</script> hello'}</QuickTaskMarkdown>,
    );

    // The script tag should be escaped, not parsed. No real <script> in the DOM.
    expect(container.querySelector('script')).toBeNull();
  });
});
