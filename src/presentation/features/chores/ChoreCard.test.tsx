import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chore } from '@/core/domain/entities/chore';

import { TestProviders } from '@/test/utils';

import { ChoreCard } from './ChoreCard';

// Pin only `Date` (not the timers) so `getTodayLocaleDate()` is deterministic
// while leaving real timers in place — userEvent interactions deadlock under
// fully-faked timers unless every step explicitly advances them.
const FIXED_TODAY = new Date('2026-04-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: FIXED_TODAY });
});

afterEach(() => {
  vi.useRealTimers();
});

const baseChore: Chore = {
  id: 'chore-1',
  userId: 'user-1',
  name: 'Cortar el pelo',
  notes: null,
  category: null,
  intervalValue: 6,
  intervalUnit: 'weeks',
  startDate: '2026-01-01',
  lastDoneDate: null,
  nextDueDate: '2026-04-22', // 7 days from FIXED_TODAY → "upcoming"
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  isOverdue: false,
};

function renderCard(chore: Chore = baseChore) {
  const handlers = {
    onMarkDone: vi.fn(),
    onSkip: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onViewHistory: vi.fn(),
  };
  render(<ChoreCard chore={chore} {...handlers} />, { wrapper: TestProviders });
  return handlers;
}

describe('ChoreCard', () => {
  it('renders the chore name', () => {
    renderCard();
    expect(screen.getByText('Cortar el pelo')).toBeInTheDocument();
  });

  it('shows "Próxima" status when nextDueDate is within 7 days', () => {
    renderCard();
    expect(screen.getByText('Próxima')).toBeInTheDocument();
  });

  it('shows "Atrasada" status when nextDueDate is in the past', () => {
    renderCard({ ...baseChore, nextDueDate: '2026-04-10', isOverdue: true });
    expect(screen.getByText('Atrasada')).toBeInTheDocument();
  });

  it('shows "En el horizonte" status when nextDueDate is more than 7 days away', () => {
    renderCard({ ...baseChore, nextDueDate: '2026-06-01' });
    expect(screen.getByText('En el horizonte')).toBeInTheDocument();
  });

  it('renders the interval label as "Cada {value} {unit}" with pluralization', () => {
    renderCard();
    // intervalValue=6, intervalUnit="weeks" → plural form ("semanas").
    expect(screen.getByText(/cada 6 semanas/i)).toBeInTheDocument();
  });

  it('renders the singular interval form for "1 mes"', () => {
    renderCard({ ...baseChore, intervalValue: 1, intervalUnit: 'months' });
    expect(screen.getByText(/cada 1 mes/i)).toBeInTheDocument();
  });

  it('renders the next due date', () => {
    renderCard();
    expect(screen.getByText(/próxima:\s*2026-04-22/i)).toBeInTheDocument();
  });

  it('renders "Nunca" when lastDoneDate is null', () => {
    renderCard();
    expect(screen.getByText(/última vez:\s*nunca/i)).toBeInTheDocument();
  });

  it('renders the last done date when present', () => {
    renderCard({ ...baseChore, lastDoneDate: '2026-03-04' });
    expect(screen.getByText(/última vez:\s*2026-03-04/i)).toBeInTheDocument();
  });

  it('renders the category chip when category is set', () => {
    renderCard({ ...baseChore, category: 'Salud' });
    expect(screen.getByText('Salud')).toBeInTheDocument();
  });

  it('does not render the category chip when category is null', () => {
    renderCard();
    // The chip would be the only place "Salud" is mentioned — make sure no
    // category chip leaks when none was set.
    expect(screen.queryByText('Salud')).not.toBeInTheDocument();
  });

  it('renders the notes when present (truncated)', () => {
    renderCard({ ...baseChore, notes: 'En la peluquería de la esquina' });
    expect(screen.getByText('En la peluquería de la esquina')).toBeInTheDocument();
  });

  it('shows "Hecho" and "Saltear" buttons in active mode', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /^hecho$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^saltear$/i })).toBeInTheDocument();
  });

  it('hides the action buttons and shows "Desarchivar" when archived', () => {
    renderCard({ ...baseChore, isActive: false });
    expect(screen.queryByRole('button', { name: /^hecho$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^saltear$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /desarchivar/i }).length).toBeGreaterThan(0);
  });

  it('renders archived badge when chore is archived', () => {
    renderCard({ ...baseChore, isActive: false });
    expect(screen.getByText(/^archivada$/i)).toBeInTheDocument();
  });

  it('fires onMarkDone when the "Hecho" button is clicked', async () => {
    const handlers = renderCard();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^hecho$/i }));
    expect(handlers.onMarkDone).toHaveBeenCalledWith(baseChore);
  });

  it('fires onSkip when the "Saltear" button is clicked', async () => {
    const handlers = renderCard();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^saltear$/i }));
    expect(handlers.onSkip).toHaveBeenCalledWith(baseChore);
  });

  it('hides the inline footer buttons when status is "horizon"', () => {
    // Regression: after marking a chore as done, nextDueDate jumps far
    // ahead and the chore enters "horizon" — the inline Done/Skip buttons
    // should disappear (they're still reachable via the 3-dot menu).
    renderCard({ ...baseChore, nextDueDate: '2026-06-01' });
    expect(screen.queryByRole('button', { name: /^hecho$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^saltear$/i })).not.toBeInTheDocument();
  });
});
