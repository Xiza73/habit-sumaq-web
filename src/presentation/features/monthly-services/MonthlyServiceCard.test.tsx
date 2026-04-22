import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type Account } from '@/core/domain/entities/account';
import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { TestProviders } from '@/test/utils';

import { MonthlyServiceCard } from './MonthlyServiceCard';

const mockAccount: Account = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'Cuenta corriente',
  type: 'checking',
  currency: 'PEN',
  balance: 1000,
  color: null,
  icon: null,
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCategory: Category = {
  id: 'cat-1',
  userId: 'user-1',
  name: 'Servicios',
  type: 'EXPENSE',
  color: null,
  icon: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseService: MonthlyService = {
  id: 'svc-1',
  userId: 'user-1',
  name: 'Luz',
  defaultAccountId: 'acc-1',
  categoryId: 'cat-1',
  currency: 'PEN',
  estimatedAmount: 120,
  dueDay: 15,
  startPeriod: '2026-01',
  lastPaidPeriod: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nextDuePeriod: '2026-04',
  isOverdue: false,
  isPaidForCurrentMonth: false,
};

function renderCard(service: MonthlyService = baseService) {
  const handlers = {
    onPay: vi.fn(),
    onSkip: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <MonthlyServiceCard
      service={service}
      account={mockAccount}
      category={mockCategory}
      {...handlers}
    />,
    { wrapper: TestProviders },
  );
  return handlers;
}

describe('MonthlyServiceCard', () => {
  it('renders service name and currency badge', () => {
    renderCard();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    expect(screen.getByText('PEN')).toBeInTheDocument();
  });

  it('shows a short "pending" badge without the period when pending', () => {
    renderCard();
    // Deliberately does NOT include the period — the summary header already
    // shows the current month, so the chip stays compact.
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument();
    expect(screen.queryByText(/abril/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026-04/)).not.toBeInTheDocument();
  });

  it('shows paid status when isPaidForCurrentMonth is true', () => {
    renderCard({ ...baseService, isPaidForCurrentMonth: true });
    expect(screen.getByText(/al día/i)).toBeInTheDocument();
  });

  it('shows overdue status with the missed period (localized month name)', () => {
    renderCard({ ...baseService, isOverdue: true });
    // Overdue is the one case that surfaces the period — so the user sees
    // exactly which month they missed.
    expect(screen.getByText(/atrasado/i)).toBeInTheDocument();
    expect(screen.getByText(/abril/i)).toBeInTheDocument();
    expect(screen.queryByText(/2026-04/)).not.toBeInTheDocument();
  });

  it('shows pay and skip buttons when pending', () => {
    const handlers = renderCard();
    expect(screen.getByRole('button', { name: /^pagar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saltear mes/i })).toBeInTheDocument();
    expect(handlers.onPay).not.toHaveBeenCalled();
  });

  it('hides BOTH pay and skip buttons when the service is paid for the current month', () => {
    // Regression guard: originally only skip was hidden, but pay must also
    // disappear — otherwise clicking pay creates a second transaction and
    // silently skips a future month.
    renderCard({ ...baseService, isPaidForCurrentMonth: true });
    expect(screen.queryByRole('button', { name: /^pagar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /saltear mes/i })).not.toBeInTheDocument();
  });

  it('renders archived badge and unarchive button when service is archived', () => {
    renderCard({ ...baseService, isActive: false });
    expect(screen.getByText(/archivado/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pagar$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /desarchivar/i }).length).toBeGreaterThan(0);
  });

  it('fires onPay when the pay button is clicked', async () => {
    const handlers = renderCard();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^pagar$/i }));
    expect(handlers.onPay).toHaveBeenCalledWith(baseService);
  });

  it('renders em dash when estimatedAmount is null', () => {
    renderCard({ ...baseService, estimatedAmount: null });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
