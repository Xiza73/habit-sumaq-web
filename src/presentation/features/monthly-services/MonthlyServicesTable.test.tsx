import { NextIntlClientProvider } from 'next-intl';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import messages from '@/i18n/messages/es.json';

import { MonthlyServicesTable } from './MonthlyServicesTable';

const mockSettleMutate = vi.fn();
vi.mock('@/core/application/hooks/use-debts-loans', () => ({
  useSettleDebtLoan: () => ({ mutate: mockSettleMutate, isPending: false }),
}));

function makeService(overrides: Partial<MonthlyService> = {}): MonthlyService {
  return {
    id: 'svc-1',
    userId: 'user-1',
    name: 'Netflix',
    categoryId: 'cat-1',
    currency: 'PEN',
    frequencyMonths: 1,
    estimatedAmount: 40,
    dueDay: 15,
    startPeriod: '2026-01',
    lastPaidPeriod: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextDuePeriod: '2026-08',
    isOverdue: false,
    isPaidForCurrentMonth: false,
    paidAmountForCurrentMonth: 0,
    linkedDebts: [],
    ...overrides,
  };
}

const categoriesById = new Map<string, Category>([
  [
    'cat-1',
    {
      id: 'cat-1',
      userId: 'user-1',
      name: 'Entretenimiento',
      type: 'EXPENSE',
      color: '#8b5cf6',
      icon: null,
      isDefault: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
]);

function renderTable(
  services: MonthlyService[],
  handlers: Partial<Parameters<typeof MonthlyServicesTable>[0]> = {},
) {
  const onPay = vi.fn();
  const onSkip = vi.fn();
  const onEdit = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MonthlyServicesTable
        services={services}
        categoriesById={categoriesById}
        onPay={onPay}
        onSkip={onSkip}
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        {...handlers}
      />
    </NextIntlClientProvider>,
  );
  return { onPay, onSkip, onEdit, onArchive, onDelete };
}

describe('MonthlyServicesTable', () => {
  beforeEach(() => {
    mockSettleMutate.mockClear();
  });

  it('renders the localized column headers', () => {
    renderTable([makeService()]);
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Categoría' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Moneda' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Monto estimado' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Día venc.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Próx. período' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Deudas enlazadas' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('renders one row per service with its name and category', () => {
    renderTable([makeService({ name: 'Netflix' })]);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Entretenimiento')).toBeInTheDocument();
  });

  it('fires onPay for the service when its pay action is clicked', async () => {
    const user = userEvent.setup();
    const service = makeService({ name: 'Netflix' });
    const { onPay } = renderTable([service]);

    await user.click(screen.getByRole('button', { name: /^Pagar$/i }));

    expect(onPay).toHaveBeenCalledWith(service);
  });

  it('fires onSkip for the service when its skip action is clicked', async () => {
    const user = userEvent.setup();
    const service = makeService({ name: 'Netflix' });
    const { onSkip } = renderTable([service]);

    await user.click(screen.getByRole('button', { name: /saltear mes/i }));

    expect(onSkip).toHaveBeenCalledWith(service);
  });

  it('fires onEdit and onArchive with the service from the row actions', async () => {
    const user = userEvent.setup();
    const service = makeService({ name: 'Netflix' });
    const { onEdit, onArchive } = renderTable([service]);

    await user.click(screen.getByRole('button', { name: /^Editar$/i }));
    expect(onEdit).toHaveBeenCalledWith(service);

    await user.click(screen.getByRole('button', { name: /^Archivar$/i }));
    expect(onArchive).toHaveBeenCalledWith(service);
  });

  it('hides pay/skip for a service already paid this month', () => {
    renderTable([makeService({ isPaidForCurrentMonth: true })]);
    expect(screen.queryByRole('button', { name: /^Pagar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /saltear mes/i })).not.toBeInTheDocument();
  });

  it('fires onDelete with the service from the row delete action', async () => {
    const user = userEvent.setup();
    const service = makeService({ name: 'Netflix' });
    const { onDelete } = renderTable([service]);

    await user.click(screen.getByRole('button', { name: /eliminar permanentemente/i }));
    expect(onDelete).toHaveBeenCalledWith(service);
  });

  describe('linked debts', () => {
    const withLinkedDebts = makeService({
      name: 'Luz',
      linkedDebts: [
        { id: 'debt-ana', reference: 'Ana', remainingAmount: 40, status: 'PENDING' },
        { id: 'debt-luis', reference: 'Luis', remainingAmount: 60, status: 'PENDING' },
      ],
    });

    it('renders an em dash in the linked-debts column when the service has none', () => {
      renderTable([makeService({ linkedDebts: [] })]);
      // The linked-debts column shows a dash; there is at least one em dash cell.
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('renders a settle trigger per linked debt', () => {
      renderTable([withLinkedDebts]);
      expect(screen.getByRole('button', { name: /liquidar ana/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /liquidar luis/i })).toBeInTheDocument();
    });

    it('settling a linked debt goes through the shared useSettleDebtLoan mutation', async () => {
      const user = userEvent.setup();
      renderTable([withLinkedDebts]);

      await user.click(screen.getByRole('button', { name: /liquidar ana/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      expect(mockSettleMutate).toHaveBeenCalledOnce();
      const callArg = mockSettleMutate.mock.calls[0][0] as {
        id: string;
        data: { settledAmount: number; currency?: string };
      };
      expect(callArg.id).toBe('debt-ana');
      expect(callArg.data.settledAmount).toBe(40);
    });
  });
});
