'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { type Account } from '@/core/domain/entities/account';

import { ACCOUNT_TYPE_ICONS } from '@/lib/account-icons';
import { formatCurrency } from '@/lib/format';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onArchive, onDelete }: AccountCardProps) {
  const t = useTranslations('accounts');
  const [menuOpen, setMenuOpen] = useState(false);

  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const isNegative = account.balance < 0;

  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Account actions"
        >
          <MoreVertical className="size-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMenuOpen(false);
              }}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
            />
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(account);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <Pencil className="size-4" />
                {t('editAccount')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onArchive(account);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                {account.isArchived ? (
                  <>
                    <ArchiveRestore className="size-4" />
                    {t('unarchiveAccount', { defaultValue: 'Desarchivar' })}
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    {t('archiveAccount')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(account);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                <Trash2 className="size-4" />
                {t('deleteAccount')}
              </button>
            </div>
          </>
        )}
      </div>

      <Link href={`/accounts/${account.id}`} className="block space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: account.color ? `${account.color}20` : undefined }}
          >
            <Icon className="size-5" style={{ color: account.color ?? undefined }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{account.name}</p>
            <p className="text-xs text-muted-foreground">{t(`types.${account.type}`)}</p>
          </div>
        </div>

        <div>
          <p
            className={`text-xl font-semibold tabular-nums ${isNegative ? 'text-expense' : 'text-foreground'}`}
          >
            {formatCurrency(account.balance, account.currency)}
          </p>
          <p className="text-xs text-muted-foreground">{account.currency}</p>
        </div>
      </Link>

      {account.isArchived && (
        <div className="mt-3 rounded-md bg-muted px-2 py-1 text-center text-xs text-muted-foreground">
          {t('archived', { defaultValue: 'Archivada' })}
        </div>
      )}
    </div>
  );
}
