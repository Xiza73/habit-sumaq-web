import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { FavoritesSection } from './FavoritesSection';

// A6-W.5 dropped `accounts` (after A6-W.3 dropped `transactions`). Use
// v1.0.0-valid keys throughout.
let mockFavoriteKeys: string[] = ['debts', 'budgets', 'habits', 'quick-tasks'];
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useFavoriteKeys: () => mockFavoriteKeys,
  useUserSettings: () => ({ data: null, isLoading: false }),
  useDateFormat: () => 'YYYY-MM-DD',
  useUpdateUserSettings: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderSection() {
  return render(<FavoritesSection />, { wrapper: TestProviders });
}

describe('FavoritesSection', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
    mockFavoriteKeys = ['debts', 'budgets', 'habits', 'quick-tasks'];
  });

  it('renders every favoritable key with its label', () => {
    renderSection();

    // Spot-check a few keys from different sections of the registry.
    expect(screen.getByRole('button', { name: /deudas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /presupuesto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hábitos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quehaceres/i })).toBeInTheDocument();
  });

  it('marks current favorites with aria-pressed="true"', () => {
    renderSection();

    const habits = screen.getByRole('button', { name: /hábitos/i });
    const tasks = screen.getByRole('button', { name: /^tareas/i });
    expect(habits).toHaveAttribute('aria-pressed', 'true');
    expect(tasks).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables non-favorite buttons when the user is already at the 4-favorite max', () => {
    // Defaults to 4 favorites — adding a 5th should be blocked at the
    // button level. The CURRENT favorites stay clickable so the user can
    // remove one to free a slot.
    renderSection();

    const chores = screen.getByRole('button', { name: /quehaceres/i });
    const habits = screen.getByRole('button', { name: /hábitos/i });

    expect(chores).toBeDisabled();
    expect(habits).not.toBeDisabled(); // already a favorite — can be toggled OFF
  });

  it('enables every button when the user is under the max (3 favorites)', () => {
    mockFavoriteKeys = ['debts', 'budgets', 'habits']; // 3 < 4
    renderSection();

    expect(screen.getByRole('button', { name: /quehaceres/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /servicios/i })).not.toBeDisabled();
  });

  it('toggles a favorite ON when clicked (appends to favoriteKeys, preserves order)', async () => {
    mockFavoriteKeys = ['debts', 'budgets']; // 2/4 — room to add
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /servicios/i }));

    expect(mockUpdateMutate).toHaveBeenCalledOnce();
    const arg = mockUpdateMutate.mock.calls[0][0] as { favoriteKeys: string[] };
    // Appended, NOT prepended — keeps the user's pre-existing slot order.
    expect(arg.favoriteKeys).toEqual(['debts', 'budgets', 'services']);
  });

  it('toggles a favorite OFF when clicked (removes from favoriteKeys, preserves remaining order)', async () => {
    const user = userEvent.setup();
    renderSection();

    // Click an already-favorite — should remove from the array.
    await user.click(screen.getByRole('button', { name: /hábitos/i }));

    expect(mockUpdateMutate).toHaveBeenCalledOnce();
    const arg = mockUpdateMutate.mock.calls[0][0] as { favoriteKeys: string[] };
    expect(arg.favoriteKeys).toEqual(['debts', 'budgets', 'quick-tasks']);
  });

  it('shows the subtitle with the max embedded (so the i18n change with MAX_FAVORITES surfaces)', () => {
    renderSection();
    // The exact copy depends on locale, but the number "4" should always
    // appear because the subtitle template substitutes {max}.
    expect(screen.getByText(/4 m[oó]dulos/i)).toBeInTheDocument();
  });

  it('also exposes the right-click hint as user education for the inline shortcut', () => {
    renderSection();
    // We don't need to assert exact wording; just that the hint exists so
    // a user who hasn't discovered right-click learns about it here.
    const section = screen.getByRole('heading', { name: /favoritos/i }).closest('section');
    expect(within(section as HTMLElement).getByText(/click derecho/i)).toBeInTheDocument();
  });
});
