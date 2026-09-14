import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { ModulesSection } from './ModulesSection';

let mockFavoriteKeys: string[] = ['debts', 'budgets', 'habits', 'quick-tasks'];
let mockDisabledModules: string[] = [];
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useFavoriteKeys: () => mockFavoriteKeys,
  useDisabledModules: () => mockDisabledModules,
  useUserSettings: () => ({ data: null, isLoading: false }),
  useDateFormat: () => 'YYYY-MM-DD',
  useUpdateUserSettings: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderSection() {
  render(
    <TestProviders>
      <ModulesSection />
    </TestProviders>,
  );
}

/** The payload of the single `updateSettings.mutate(...)` call. */
function lastPayload(): Record<string, unknown> {
  return mockUpdateMutate.mock.calls[0][0] as Record<string, unknown>;
}

describe('ModulesSection', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
    mockFavoriteKeys = ['debts', 'budgets', 'habits', 'quick-tasks'];
    mockDisabledModules = [];
  });

  it('renders every module, grouped, with all of them on by default', () => {
    renderSection();

    expect(screen.getByRole('button', { name: /Quehaceres/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Recordatorios/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows a disabled module as off', () => {
    mockDisabledModules = ['chores'];
    renderSection();

    expect(screen.getByRole('button', { name: /Quehaceres/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('adds the module to disabledModules when switching it off', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /Recordatorios/ }));

    expect(lastPayload().disabledModules).toEqual(['reminders']);
  });

  it('removes it from disabledModules when switching it back on', async () => {
    const user = userEvent.setup();
    mockDisabledModules = ['chores', 'reminders'];
    renderSection();

    await user.click(screen.getByRole('button', { name: /Quehaceres/ }));

    expect(lastPayload().disabledModules).toEqual(['reminders']);
  });

  // The invariant. Without it a favorite would point at a hidden module:
  // occupying one of the four slots, rendering nothing, and impossible to
  // remove because an unrendered item has no row to right-click.
  it('drops the module from favorites in the SAME write that disables it', async () => {
    const user = userEvent.setup();
    mockFavoriteKeys = ['debts', 'budgets', 'habits', 'quick-tasks'];
    renderSection();

    await user.click(screen.getByRole('button', { name: /Hábitos/ }));

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    expect(lastPayload()).toEqual({
      disabledModules: ['habits'],
      favoriteKeys: ['debts', 'budgets', 'quick-tasks'],
    });
  });

  it('leaves favorites alone when the disabled module was not one', async () => {
    const user = userEvent.setup();
    mockFavoriteKeys = ['debts', 'budgets'];
    renderSection();

    await user.click(screen.getByRole('button', { name: /Quehaceres/ }));

    expect(lastPayload()).not.toHaveProperty('favoriteKeys');
  });

  it('does not touch favorites when switching a module back ON', async () => {
    // Re-enabling deliberately does NOT restore a favorite that was dropped:
    // there is no record of whether it was one, and silently re-pinning it
    // would fight whatever the user picked in the meantime.
    const user = userEvent.setup();
    mockDisabledModules = ['habits'];
    mockFavoriteKeys = ['debts', 'budgets'];
    renderSection();

    await user.click(screen.getByRole('button', { name: /Hábitos/ }));

    expect(lastPayload()).not.toHaveProperty('favoriteKeys');
  });
});
