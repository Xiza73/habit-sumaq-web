import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSync } from './LocaleSync';

// Controlled inputs for the two hooks LocaleSync depends on.
const state = vi.hoisted(() => ({
  locale: 'es',
  settings: undefined as { language: string } | undefined,
}));

vi.mock('next-intl', () => ({ useLocale: () => state.locale }));
vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useUserSettings: () => ({ data: state.settings }),
}));

const reloadMock = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: reloadMock },
  });
  // Reset cookies between tests.
  document.cookie = 'NEXT_LOCALE=;path=/;max-age=0';
});

afterEach(() => {
  state.locale = 'es';
  state.settings = undefined;
  reloadMock.mockClear();
});

describe('LocaleSync', () => {
  it('does nothing while settings are not loaded', () => {
    state.settings = undefined;
    render(<LocaleSync />);
    expect(reloadMock).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });

  it('does nothing when the setting already matches the rendered locale', () => {
    state.locale = 'es';
    state.settings = { language: 'es' };
    render(<LocaleSync />);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('writes the cookie and reloads once when the setting differs from the locale', () => {
    state.locale = 'es';
    state.settings = { language: 'en' };
    render(<LocaleSync />);
    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('ignores an unsupported saved language (avoids a reload loop)', () => {
    state.locale = 'es';
    state.settings = { language: 'fr' };
    render(<LocaleSync />);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
