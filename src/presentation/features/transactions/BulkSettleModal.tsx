'use client';

import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2 } from 'lucide-react';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { type DebtsSummaryRow } from '@/core/domain/schemas/transaction.schema';

import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type BulkSettleMode = 'real' | 'informal';

interface BulkSettleModalProps {
  row: DebtsSummaryRow | null;
  loading: boolean;
  onConfirm: (mode: BulkSettleMode, accountId?: string) => void;
  onCancel: () => void;
}

/**
 * Replaces the previous "informal-only" `ConfirmDialog` for the bulk-settle
 * flow on `/transactions/debts`. Lets the user pick between two modes:
 *
 *  - **Pago real** (default) — picks an account in the row's currency. The
 *    backend creates one EXPENSE/INCOME settlement per pending tx and moves
 *    the balance.
 *  - **Cierre informal** — only marks SETTLED. Useful when the debt was
 *    already settled face-to-face and we just want to close the books.
 *
 * State (mode + account selection) lives in the inner `<Body>`. The outer
 * shell mounts a fresh `<Body>` per row via `key={row.id}`, so opening the
 * modal for a different row resets the form without a setState-in-effect.
 */
export function BulkSettleModal({ row, loading, onConfirm, onCancel }: BulkSettleModalProps) {
  if (!row) return null;
  // `reference + currency` is the row's natural key (per
  // `DebtsSummaryRow` schema). Using it as React key forces a fresh
  // <Body> mount per row, which resets `mode` and the account override
  // without an effect.
  return (
    <Body
      key={`${row.reference}::${row.currency}`}
      row={row}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface BodyProps {
  row: DebtsSummaryRow;
  loading: boolean;
  onConfirm: (mode: BulkSettleMode, accountId?: string) => void;
  onCancel: () => void;
}

function Body({ row, loading, onConfirm, onCancel }: BodyProps) {
  const t = useTranslations('transactions.debtsSummary.bulkSettle');
  const tCommon = useTranslations('common');
  const radioName = useId();

  const [mode, setMode] = useState<BulkSettleMode>('real');
  // `null` = "use the first eligible account once they load". Once the user
  // explicitly picks one, this holds their choice and overrides the default.
  // This avoids a setState-in-effect that would otherwise sync a default
  // selection out of `eligibleAccounts`.
  const [accountIdOverride, setAccountIdOverride] = useState<string | null>(null);

  const { data: accounts } = useAccounts(false);

  const eligibleAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (account) => !account.isArchived && account.currency === row.currency,
      ),
    [accounts, row.currency],
  );

  const accountId = accountIdOverride ?? eligibleAccounts[0]?.id ?? '';

  const canConfirmReal = mode === 'real' && accountId !== '';
  const canConfirm = mode === 'informal' || canConfirmReal;

  const selectedAccount = eligibleAccounts.find((account) => account.id === accountId);

  function handleConfirm() {
    if (mode === 'real') {
      if (!accountId) return;
      onConfirm('real', accountId);
    } else {
      onConfirm('informal');
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={t('title', { name: row.displayName, currency: row.currency })}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('intro', { count: row.pendingCount, currency: row.currency })}
        </p>

        <fieldset className="space-y-2">
          <legend className="sr-only">{t('modeLabel')}</legend>

          <ModeRadio
            name={radioName}
            value="real"
            checked={mode === 'real'}
            onChange={() => setMode('real')}
            title={t('real.title')}
            description={t('real.description')}
          />
          <ModeRadio
            name={radioName}
            value="informal"
            checked={mode === 'informal'}
            onChange={() => setMode('informal')}
            title={t('informal.title')}
            description={t('informal.description')}
          />
        </fieldset>

        {mode === 'real' && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <label htmlFor="bulk-settle-account" className="text-sm font-medium">
              {t('real.accountLabel', { currency: row.currency })}
            </label>
            {eligibleAccounts.length > 0 ? (
              <Select
                id="bulk-settle-account"
                value={accountId}
                onChange={(e) => setAccountIdOverride(e.target.value)}
              >
                {eligibleAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance, account.currency)})
                  </option>
                ))}
              </Select>
            ) : (
              // Edge: the user has no active account in this currency. Block
              // the confirm and tell them; informal close is still valid.
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {t('real.noEligibleAccount', { currency: row.currency })}
              </p>
            )}

            {selectedAccount && (
              <p className="text-xs text-muted-foreground">
                {t('real.summary', {
                  count: row.pendingCount,
                  total: formatCurrency(
                    row.pendingDebt + row.pendingLoan,
                    selectedAccount.currency,
                  ),
                  account: selectedAccount.name,
                })}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            onClick={handleConfirm}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ModeRadioProps {
  name: string;
  value: BulkSettleMode;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}

function ModeRadio({ name, value, checked, onChange, title, description }: ModeRadioProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 cursor-pointer accent-primary"
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
