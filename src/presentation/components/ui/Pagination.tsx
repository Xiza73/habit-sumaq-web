'use client';

import { useTranslations } from 'next-intl';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { type PaginationMeta } from '@/infrastructure/api/http-client';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const t = useTranslations('common');
  const { page, totalPages, total } = meta;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">{t('paginationTotal', { total })}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex size-9 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-16 text-center text-sm">
          {t('paginationPage', { page, totalPages })}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex size-9 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
