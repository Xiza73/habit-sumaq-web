import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { MobileNav } from './MobileNav';

// Hoisted state — let-bound so each test can swap before re-rendering.
let mockFavoriteKeys: string[] = ['accounts', 'transactions', 'habits', 'quick-tasks'];
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useFavoriteKeys: () => mockFavoriteKeys,
  useUserSettings: () => ({ data: null, isLoading: false }),
  useDateFormat: () => 'YYYY-MM-DD',
  useUpdateUserSettings: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/transactions',
}));

// Sonner toast is fire-and-forget — stub the module so the mutation success
// path doesn't try to render real toast UI in the test renderer.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderNav() {
  return render(<MobileNav />, { wrapper: TestProviders });
}

describe('MobileNav', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
    // A6-W.3 dropped `transactions` from the registry. Defaults now use
    // `budgets` in slot 2.
    mockFavoriteKeys = ['accounts', 'budgets', 'habits', 'quick-tasks'];
  });

  it('renders one slot per favorite key + a fixed Settings slot', () => {
    renderNav();

    // The 4 default favorites + Settings = 5 link/buttons in total.
    // We probe by visible labels (i18n value, Spanish default). A6-W.3
    // dropped `transactions` from DEFAULT_FAVORITES and replaced it with
    // `budgets`.
    expect(screen.getByText(/cuentas/i)).toBeInTheDocument();
    expect(screen.getByText(/presupuesto/i)).toBeInTheDocument();
    expect(screen.getByText(/hábitos/i)).toBeInTheDocument();
    expect(screen.getByText(/prioridades/i)).toBeInTheDocument();
    expect(screen.getByText(/configuración/i)).toBeInTheDocument();
  });

  it('renders an empty placeholder for any unset slot (favoriteKeys shorter than the cap)', () => {
    // User has only 2 favorites set — slots 3 and 4 should be empty
    // placeholders with the dash label, NOT silently missing. Keeps the
    // bottom nav layout consistent regardless of customization state.
    mockFavoriteKeys = ['accounts', 'budgets'];
    renderNav();

    const dashLabels = screen.getAllByText('—');
    expect(dashLabels).toHaveLength(2);
  });

  it('silently drops unknown keys (forward-compat with removed routes)', () => {
    // A user with a stale favorite from a removed route shouldn't see a
    // broken slot. Empty placeholder takes its place.
    mockFavoriteKeys = ['accounts', 'i-was-deleted', 'habits', 'quick-tasks'];
    renderNav();

    // Position 2 (the deleted key) should render as the empty placeholder.
    // We assert by checking we have exactly 1 dash (the deleted slot)
    // alongside the 3 known favorites + Settings.
    expect(screen.getAllByText('—')).toHaveLength(1);
    expect(screen.getByText(/cuentas/i)).toBeInTheDocument();
    expect(screen.getByText(/hábitos/i)).toBeInTheDocument();
    expect(screen.getByText(/prioridades/i)).toBeInTheDocument();
  });

  it('renders the favorite slots in the order they appear in favoriteKeys (mobile slot order matters)', () => {
    mockFavoriteKeys = ['budgets', 'services', 'habits', 'tasks'];
    renderNav();

    // Visible labels in DOM order should match the favoriteKeys order.
    // We probe each label individually — vitest's screen API doesn't
    // expose document order directly, but the navigation list is a
    // single flex container so document order = visual order.
    const nav = screen.getByRole('navigation');
    const text = nav.textContent ?? '';
    const positions = ['Presupuesto', 'Servicios', 'Hábitos', 'Tareas'].map((label) =>
      text.indexOf(label),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
