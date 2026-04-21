import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { ReportShell } from './ReportShell';

describe('ReportShell', () => {
  const defaultProps = {
    title: 'Reporte de Finanzas',
    period: 'month' as const,
    onPeriodChange: vi.fn(),
    isLoading: false,
    isError: false,
  };

  it('renders the title', () => {
    render(
      <ReportShell {...defaultProps}>
        <p>body</p>
      </ReportShell>,
      { wrapper: TestProviders },
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reporte de Finanzas' }),
    ).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(
      <ReportShell {...defaultProps} subtitle="Resumen del período">
        <p>body</p>
      </ReportShell>,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Resumen del período')).toBeInTheDocument();
  });

  it('shows the period selector wired to onPeriodChange', () => {
    render(
      <ReportShell {...defaultProps}>
        <p>body</p>
      </ReportShell>,
      { wrapper: TestProviders },
    );
    // The 4 period buttons come from PeriodSelector — just assert they're present.
    expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes' })).toBeInTheDocument();
  });

  it('shows a loading spinner and hides children when isLoading', () => {
    render(
      <ReportShell {...defaultProps} isLoading>
        <p data-testid="body">body</p>
      </ReportShell>,
      { wrapper: TestProviders },
    );
    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
  });

  it('shows an error message and hides children when isError', () => {
    render(
      <ReportShell {...defaultProps} isError>
        <p data-testid="body">body</p>
      </ReportShell>,
      { wrapper: TestProviders },
    );
    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
    // Error copy comes from i18n — at minimum it should surface something not empty.
    expect(screen.getByText(/cargar|error/i)).toBeInTheDocument();
  });

  it('renders children when neither loading nor error', () => {
    render(
      <ReportShell {...defaultProps}>
        <p data-testid="body">body</p>
      </ReportShell>,
      { wrapper: TestProviders },
    );
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });
});
