import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DebtLoan, type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { debtsLoansApi } from '@/infrastructure/api/debts-loans.api';

import { TestProviders } from '@/test/utils';

import { SHARE_IMAGE_BACKGROUNDS } from './DebtCardShareImage';
import { DebtLoanDetailModal } from './DebtLoanDetailModal';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

// next-themes needs a real provider + a matchMedia stub to resolve anything in
// jsdom; mocking the hook keeps these tests about the export, not the theme
// machinery. Mutable so each case can pick the theme it is asserting on.
const themeMock = vi.hoisted<{ resolvedTheme: string | undefined }>(() => ({
  resolvedTheme: 'light',
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: themeMock.resolvedTheme }),
}));

vi.mock('@/infrastructure/api/debts-loans.api', () => ({
  debtsLoansApi: {
    list: vi.fn().mockResolvedValue([]),
    summary: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    settle: vi.fn(),
    settleAmountByReference: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const FAKE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQBHm/u5AAAAAElFTkSuQmCC';

function makeRow(overrides: Partial<DebtLoanSummaryRow> = {}): DebtLoanSummaryRow {
  return {
    reference: 'juan',
    currency: 'PEN',
    displayName: 'Juan',
    pendingDebt: 500,
    pendingLoan: 200,
    netOwed: -300,
    pendingCount: 2,
    settledCount: 0,
    ...overrides,
  };
}

function makeDebt(overrides: Partial<DebtLoan> = {}): DebtLoan {
  return {
    id: 'dl-1',
    userId: 'user-1',
    type: 'DEBT',
    currency: 'PEN',
    amount: 500,
    remainingAmount: 500,
    status: 'PENDING',
    reference: 'juan',
    description: null,
    categoryId: null,
    date: '2026-04-10T12:00:00.000Z',
    createdAt: '2026-04-10T12:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    ...overrides,
  };
}

function renderModal(row: DebtLoanSummaryRow = makeRow()) {
  render(
    <TestProviders>
      <DebtLoanDetailModal row={row} onClose={vi.fn()} onEdit={vi.fn()} />
    </TestProviders>,
  );
}

describe('DebtLoanDetailModal — share image export', () => {
  let clipboardWrite: ReturnType<typeof vi.fn>;
  let clipboardItems: Array<Record<string, Blob>>;

  /**
   * jsdom ships neither a writable clipboard nor `ClipboardItem`, and
   * `userEvent.setup()` installs its OWN `navigator.clipboard` stub — so this
   * MUST run after `setup()` in each test to win, stubbing both APIs the copy
   * path relies on.
   */
  function installClipboard() {
    clipboardItems = [];
    clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: clipboardWrite },
    });
    class ClipboardItemStub {
      constructor(items: Record<string, Blob>) {
        clipboardItems.push(items);
      }
    }
    (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = ClipboardItemStub;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(htmlToImage.toPng).mockResolvedValue(FAKE_DATA_URL);
    vi.mocked(debtsLoansApi.list).mockResolvedValue([]);
  });

  afterEach(() => {
    delete (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem;
  });

  it('copies the card: renders the off-screen node to PNG then writes an image/png ClipboardItem', async () => {
    const user = userEvent.setup();
    installClipboard();
    renderModal(makeRow());

    await user.click(screen.getByRole('button', { name: /Copiar imagen/i }));

    await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalledTimes(1));

    // The node handed to toPng must be the off-screen share card (carries the
    // person's name), and pixelRatio must be 2 for a crisp export.
    const [node, options] = vi.mocked(htmlToImage.toPng).mock.calls[0];
    expect(node).toBeInstanceOf(HTMLElement);
    expect(node.textContent).toContain('Juan');
    expect(options).toMatchObject({ pixelRatio: 2 });

    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledTimes(1));
    expect(clipboardItems).toHaveLength(1);
    expect(Object.keys(clipboardItems[0])).toContain('image/png');
    expect(clipboardItems[0]['image/png']).toBeInstanceOf(Blob);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('falls back to a download and an info toast when the clipboard write fails', async () => {
    const user = userEvent.setup();
    installClipboard();
    clipboardWrite.mockRejectedValueOnce(new Error('unsupported'));

    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderModal(makeRow());

    await user.click(screen.getByRole('button', { name: /Copiar imagen/i }));

    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledTimes(1));

    const anchor = createElementSpy.mock.results
      .map((r) => r.value as HTMLElement)
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement);
    expect(anchor).toBeDefined();
    expect(anchor?.download).toBe('Juan-PEN.png');
    expect(anchor?.href).toContain('data:image/png');
    expect(clickSpy).toHaveBeenCalled();

    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();

    clickSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it('downloads the card: creates an anchor with the person/currency filename and clicks it', async () => {
    const user = userEvent.setup();
    installClipboard();
    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderModal(makeRow({ displayName: 'María José', currency: 'USD' }));

    await user.click(screen.getByRole('button', { name: /Descargar/i }));

    await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalledTimes(1));

    const anchor = createElementSpy.mock.results
      .map((r) => r.value as HTMLElement)
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement);
    expect(anchor).toBeDefined();
    expect(anchor?.download).toBe('Maria-Jose-USD.png');
    expect(anchor?.href).toContain('data:image/png');
    expect(clickSpy).toHaveBeenCalled();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(clipboardWrite).not.toHaveBeenCalled();

    clickSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it('renders the individual pending rows and the group total into the exported node', async () => {
    const user = userEvent.setup();
    installClipboard();
    vi.mocked(debtsLoansApi.list).mockResolvedValue([
      makeDebt({ id: 'd1', type: 'DEBT', description: 'Almuerzo', remainingAmount: 500 }),
      makeDebt({ id: 'd2', type: 'LOAN', description: 'Libro prestado', remainingAmount: 200 }),
    ]);

    // netOwed -300 → the user owes Juan (youOwe copy).
    renderModal(makeRow({ pendingDebt: 500, pendingLoan: 200, netOwed: -300, pendingCount: 2 }));

    // Wait for the pending rows to load into the modal before exporting.
    await screen.findByText('Almuerzo');

    await user.click(screen.getByRole('button', { name: /Copiar imagen/i }));

    await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalledTimes(1));

    const [node] = vi.mocked(htmlToImage.toPng).mock.calls[0];
    // Individual pending rows (the detail) are in the exported node…
    expect(node.textContent).toContain('Almuerzo');
    expect(node.textContent).toContain('Libro prestado');
    // …followed by a labeled Total reflecting the group's net (you owe Juan).
    expect(node.textContent).toContain('Total');
    expect(node.textContent).toContain('Debés');
  });

  it('shows an error toast when the image cannot be generated', async () => {
    const user = userEvent.setup();
    installClipboard();
    vi.mocked(htmlToImage.toPng).mockRejectedValueOnce(new Error('canvas boom'));

    renderModal(makeRow());

    await user.click(screen.getByRole('button', { name: /Descargar/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  describe('theme awareness', () => {
    /**
     * The card's own colours come from Tailwind `dark:` variants, which
     * resolve on the live node and so survive rasterization. The solid
     * `backgroundColor` handed to `html-to-image` is the one thing JS has to
     * pick, because it is painted behind the node rather than read off it —
     * leave it white and a dark card exports with a white halo around it.
     */
    it('paints a light background when the resolved theme is light', async () => {
      const user = userEvent.setup();
      installClipboard();
      themeMock.resolvedTheme = 'light';

      renderModal(makeRow());
      await user.click(screen.getByRole('button', { name: /Copiar imagen/i }));

      await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalledTimes(1));
      const [, options] = vi.mocked(htmlToImage.toPng).mock.calls[0];
      expect(options).toMatchObject({ backgroundColor: SHARE_IMAGE_BACKGROUNDS.light });
    });

    it('paints a dark background when the resolved theme is dark', async () => {
      const user = userEvent.setup();
      installClipboard();
      themeMock.resolvedTheme = 'dark';

      renderModal(makeRow());
      await user.click(screen.getByRole('button', { name: /Copiar imagen/i }));

      await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalledTimes(1));
      const [, options] = vi.mocked(htmlToImage.toPng).mock.calls[0];
      expect(options).toMatchObject({ backgroundColor: SHARE_IMAGE_BACKGROUNDS.dark });
    });

    it('falls back to light while the theme is still resolving', async () => {
      // next-themes reports `undefined` on the first render, before it has
      // read the stored preference. Exporting in that window must not produce
      // a transparent or black background.
      const user = userEvent.setup();
      installClipboard();
      themeMock.resolvedTheme = undefined;

      renderModal(makeRow());
      await user.click(screen.getByRole('button', { name: /Copiar imagen/i }));

      await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalledTimes(1));
      const [, options] = vi.mocked(htmlToImage.toPng).mock.calls[0];
      expect(options).toMatchObject({ backgroundColor: SHARE_IMAGE_BACKGROUNDS.light });
    });

    it('keeps the two backgrounds distinct — otherwise the switch is a no-op', () => {
      expect(SHARE_IMAGE_BACKGROUNDS.light).not.toBe(SHARE_IMAGE_BACKGROUNDS.dark);
    });
  });
});
