'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { useChoreLogs, useRevertLastChoreDone } from '@/core/application/hooks/use-chores';
import { type Chore } from '@/core/domain/entities/chore';

import { ApiError } from '@/infrastructure/api/api-error';

import { Modal } from '@/presentation/components/ui/Modal';

interface ChoreLogsHistoryDialogProps {
  open: boolean;
  chore: Chore | null;
  onClose: () => void;
}

const PAGE_SIZE = 10;

/**
 * Inner content component — receives the chore as a prop and owns its own
 * pagination state. The parent passes `key={chore.id}`, which forces React
 * to remount this component when the chore changes, so the offset resets
 * naturally without needing a `setState` inside an effect (which the
 * `react-hooks/set-state-in-effect` lint rule rightly flags as a smell).
 */
function ChoreLogsContent({ chore, open }: { chore: Chore; open: boolean }) {
  const t = useTranslations('chores');
  const tErrors = useTranslations('errors');
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching } = useChoreLogs(
    chore.id,
    { limit: PAGE_SIZE, offset },
    open,
  );

  const revertMutation = useRevertLastChoreDone();

  // Backend returns the paginated envelope { data: ChoreLog[], meta }.
  // Reading `data?.data` here gets the actual log array; `meta.total` gives
  // the count we need for the "load more" gate.
  const logs = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const hasMore = offset + logs.length < total;

  function handleRevertLast() {
    revertMutation.mutate(chore.id, {
      onSuccess: () => {
        toast.success(t('logs.revertSuccess'));
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'CHRE_003')
            : tErrors('generic'),
        );
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Revert lives at the top of the history: it always acts on the most
          recent completion, so it belongs above the (newest-first) list.
          Hidden when there is nothing to revert. */}
      {logs.length > 0 && (
        <button
          type="button"
          onClick={handleRevertLast}
          disabled={revertMutation.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {revertMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Undo2 className="size-4" />
          )}
          {t('logs.revertLast')}
        </button>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {t('logs.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="font-medium tabular-nums">{log.doneAt}</span>
              {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setOffset(offset + PAGE_SIZE)}
          disabled={isFetching}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {isFetching && <Loader2 className="size-4 animate-spin" />}
          {t('logs.loadMore')}
        </button>
      )}
    </div>
  );
}

export function ChoreLogsHistoryDialog({ open, chore, onClose }: ChoreLogsHistoryDialogProps) {
  const t = useTranslations('chores');
  if (!chore) return null;

  return (
    <Modal open={open} onClose={onClose} title={t('logs.title', { name: chore.name })}>
      <ChoreLogsContent key={chore.id} chore={chore} open={open} />
    </Modal>
  );
}
