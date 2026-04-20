import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  /** Primary value — string keeps control of formatting (currency, percent, etc.) at call site. */
  value: ReactNode;
  /** Optional small subtitle shown below the value (e.g. "3 cuentas"). */
  subtitle?: ReactNode;
  /** Optional accent color applied to the value (e.g. "text-emerald-500" for positive net). */
  valueClassName?: string;
  /** Optional content rendered at the bottom (progress bar, trend chip, etc.). */
  footer?: ReactNode;
}

export function KpiCard({ label, value, subtitle, valueClassName, footer }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-2xl font-bold', valueClassName)}>{value}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
