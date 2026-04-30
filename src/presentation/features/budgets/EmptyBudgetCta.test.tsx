import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { EmptyBudgetCta } from './EmptyBudgetCta';

describe('EmptyBudgetCta', () => {
  it('renders the period label and currency in the heading', () => {
    render(<EmptyBudgetCta currency="PEN" year={2026} month={4} onCreate={vi.fn()} />, {
      wrapper: TestProviders,
    });
    // Title is "No tenés presupuesto para Abril 2026 en PEN" — match the variable parts.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/abril 2026/i);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/pen/i);
  });

  it('fires onCreate when the CTA button is clicked', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<EmptyBudgetCta currency="USD" year={2026} month={5} onCreate={onCreate} />, {
      wrapper: TestProviders,
    });

    await user.click(screen.getByRole('button', { name: /crear presupuesto/i }));

    expect(onCreate).toHaveBeenCalledOnce();
  });
});
