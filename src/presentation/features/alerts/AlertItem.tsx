'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Receipt,
  Repeat2,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';

import { useDismissAlert } from '@/core/application/hooks/use-alerts';
import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import {
  type Alert,
  type AlertSeverity,
  type AlertType,
  getAlertHref,
} from '@/core/domain/entities/alert';
import { type DateFormat } from '@/core/domain/enums/common.enums';
import { type Currency } from '@/core/domain/enums/currency.enum';

import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: Alert;
  /**
   * Called after a successful navigation. The parent uses this to close
   * the popover so the user lands on the destination page without a
   * lingering overlay.
   */
  onNavigate?: () => void;
}

/**
 * Single row inside the alerts popover. Renders icon + headline + supporting
 * line + optional close button (`X`), keyed off `alert.type` so each kind
 * gets its own copy + payload mapping. The close button is hidden when
 * `isDismissable === false` (persistent alerts — server-enforced too).
 *
 * The row itself is clickable: it navigates to the feature index page that
 * lets the user act on the alert (`/services`, `/habits`, `/budgets`,
 * `/chores`). The close button stops propagation so dismissing doesn't also
 * navigate.
 */
export function AlertItem({ alert, onNavigate }: AlertItemProps) {
  const t = useTranslations('alerts.items');
  const tCommon = useTranslations('common');
  const dateFormat = useDateFormat();
  const router = useRouter();
  const dismiss = useDismissAlert();

  const href = getAlertHref(alert);

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    dismiss.mutate(alert.id);
  }

  function handleNavigate() {
    if (!href) return;
    router.push(href);
    onNavigate?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!href) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  }

  return (
    <div
      role={href ? 'button' : 'listitem'}
      tabIndex={href ? 0 : undefined}
      onClick={href ? handleNavigate : undefined}
      onKeyDown={href ? handleKeyDown : undefined}
      aria-label={href ? renderTitle(alert, t) : undefined}
      className={cn(
        'flex items-start gap-3 rounded-md border border-border bg-background p-3 transition-colors',
        href &&
          'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className={cn('mt-0.5 shrink-0', SEVERITY_ICON_CLASS[alert.severity])}>
        <AlertIcon type={alert.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{renderTitle(alert, t)}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {renderSubtitle(alert, t, dateFormat)}
        </p>
      </div>

      {alert.isDismissable && (
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismiss.isPending}
          aria-label={tCommon('close')}
          title={tCommon('close')}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

const SEVERITY_ICON_CLASS: Record<AlertSeverity, string> = {
  info: 'text-primary',
  warning: 'text-amber-600 dark:text-amber-500',
};

function AlertIcon({ type }: { type: AlertType }) {
  switch (type) {
    case 'service-due-today':
      return <Wallet className="size-5" aria-hidden="true" />;
    case 'service-overdue':
      return <CalendarClock className="size-5" aria-hidden="true" />;
    case 'habits-midday':
      return <Sparkles className="size-5" aria-hidden="true" />;
    case 'budget-unlogged':
      return <Receipt className="size-5" aria-hidden="true" />;
    case 'chore-overdue':
      return <AlertTriangle className="size-5" aria-hidden="true" />;
    case 'chore-due-today':
      // Not the warning triangle: due today is a heads-up, not a miss.
      return <Repeat2 className="size-5" aria-hidden="true" />;
    default:
      return <CheckCircle2 className="size-5" aria-hidden="true" />;
  }
}

type Translator = ReturnType<typeof useTranslations>;

function renderTitle(alert: Alert, t: Translator): string {
  switch (alert.type) {
    case 'service-due-today':
      return t('serviceDueToday.title', {
        name: stringOf(alert.payload.serviceName) ?? '',
      });
    case 'service-overdue':
      return t('serviceOverdue.title', {
        name: stringOf(alert.payload.serviceName) ?? '',
      });
    case 'habits-midday': {
      const count = numberOf(alert.payload.missingCount) ?? 0;
      return t('habitsMidday.title', { count });
    }
    case 'budget-unlogged':
      return t('budgetUnlogged.title');
    case 'chore-overdue':
      return t('choreOverdue.title', {
        name: stringOf(alert.payload.choreName) ?? '',
      });
    case 'chore-due-today':
      return t('choreDueToday.title', {
        name: stringOf(alert.payload.choreName) ?? '',
      });
  }
}

function renderSubtitle(alert: Alert, t: Translator, dateFormat: DateFormat): string {
  switch (alert.type) {
    case 'service-due-today': {
      const dueDay = numberOf(alert.payload.dueDay) ?? 0;
      const currency = stringOf(alert.payload.currency);
      const amount = numberOf(alert.payload.estimatedAmount);
      if (amount != null && isCurrency(currency)) {
        return t('serviceDueToday.subtitleWithAmount', {
          day: dueDay,
          amount: formatCurrency(amount, currency),
        });
      }
      return t('serviceDueToday.subtitle', { day: dueDay });
    }
    case 'service-overdue': {
      const period = stringOf(alert.payload.overduePeriod) ?? '';
      return t('serviceOverdue.subtitle', { period });
    }
    case 'habits-midday': {
      const first = stringOf(alert.payload.firstHabitName) ?? '';
      const count = numberOf(alert.payload.missingCount) ?? 0;
      return count > 1
        ? t('habitsMidday.subtitleMany', { first, rest: count - 1 })
        : t('habitsMidday.subtitleOne', { first });
    }
    case 'budget-unlogged': {
      const days = numberOf(alert.payload.days) ?? 0;
      const currency = stringOf(alert.payload.currency) ?? '';
      return t('budgetUnlogged.subtitle', { days, currency });
    }
    case 'chore-overdue': {
      const date = stringOf(alert.payload.nextDueDate);
      return t('choreOverdue.subtitle', { date: date ? formatDate(date, dateFormat) : '' });
    }
    case 'chore-due-today':
      // No date interpolated — "today" is the whole point, and echoing the
      // date back would just be the same information twice.
      return t('choreDueToday.subtitle');
  }
}

function stringOf(v: string | number | null | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function numberOf(v: string | number | null | undefined): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function isCurrency(v: string | undefined): v is Currency {
  return v === 'PEN' || v === 'USD' || v === 'EUR';
}
