'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  useAddParticipant,
  useRemoveParticipant,
  useServiceParticipants,
  useUpdateParticipant,
} from '@/core/application/hooks/use-monthly-service-participants';
import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import { type Currency } from '@/core/domain/enums/currency.enum';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';
import { Input } from '@/presentation/components/ui/Input';

import { formatCurrency } from '@/lib/format';

interface ParticipantEditorProps {
  monthlyServiceId: string;
  /**
   * The owning service's currency — used to render each participant's
   * `defaultAmount` as formatted currency instead of a raw number.
   */
  currency: Currency;
  /**
   * Prior `reference` values across the user's debts/loans, offered as
   * autocomplete suggestions (soft — the field stays free-text). Same
   * pattern as `DebtLoanForm.knownReferences`.
   */
  knownReferences?: string[];
}

/**
 * Config editor for a shared service's participants
 * (`/monthly-services/:id/participants[...]`). A service is considered
 * "shared" purely client-side, derived from `participants.length > 0` —
 * the backend has no `shared` boolean field.
 */
export function ParticipantEditor({
  monthlyServiceId,
  currency,
  knownReferences = [],
}: ParticipantEditorProps) {
  const t = useTranslations('monthlyServices.participants');
  const tErrors = useTranslations('errors');

  const { data: participants = [], isLoading } = useServiceParticipants(monthlyServiceId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleError(error: Error) {
    setFormError(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'MSP_PARTICIPANT_DUPLICATE_REFERENCE')
        : tErrors('generic'),
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{t('title')}</h3>
        <p className="text-[11px] text-muted-foreground">{t('hint')}</p>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t('loading')}
        </p>
      ) : participants.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {participants.map((participant) =>
            editingId === participant.id ? (
              <li key={participant.id}>
                <EditRow
                  monthlyServiceId={monthlyServiceId}
                  participant={participant}
                  onDone={() => setEditingId(null)}
                  onError={handleError}
                />
              </li>
            ) : (
              <li
                key={participant.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{participant.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(participant.defaultAmount, currency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(participant.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label={t('edit')}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <RemoveButton
                    monthlyServiceId={monthlyServiceId}
                    participant={participant}
                    onError={handleError}
                  />
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <AddRow
        monthlyServiceId={monthlyServiceId}
        knownReferences={knownReferences}
        onError={handleError}
      />

      {formError && <p className="text-xs text-destructive">{formError}</p>}
    </div>
  );
}

function RemoveButton({
  monthlyServiceId,
  participant,
  onError,
}: {
  monthlyServiceId: string;
  participant: MonthlyServiceParticipant;
  onError: (error: Error) => void;
}) {
  const t = useTranslations('monthlyServices.participants');
  const removeMutation = useRemoveParticipant(monthlyServiceId);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    removeMutation.mutate(participant.id, {
      onSuccess: () => setConfirming(false),
      onError: (error) => {
        setConfirming(false);
        onError(error);
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={removeMutation.isPending}
        className="rounded-md p-1.5 text-destructive hover:bg-muted disabled:opacity-50"
        aria-label={t('deleteParticipant', { reference: participant.reference })}
      >
        {removeMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
      <ConfirmDialog
        open={confirming}
        title={t('delete')}
        description={t('deleteConfirm', { reference: participant.reference })}
        variant="destructive"
        confirmLabel={t('delete')}
        loading={removeMutation.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function EditRow({
  monthlyServiceId,
  participant,
  onDone,
  onError,
}: {
  monthlyServiceId: string;
  participant: MonthlyServiceParticipant;
  onDone: () => void;
  onError: (error: Error) => void;
}) {
  const t = useTranslations('monthlyServices.participants');
  const updateMutation = useUpdateParticipant(monthlyServiceId);
  const [amount, setAmount] = useState<number>(participant.defaultAmount);

  function handleSave() {
    updateMutation.mutate(
      { participantId: participant.id, data: { defaultAmount: amount } },
      {
        onSuccess: onDone,
        onError,
      },
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2">
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{participant.reference}</p>
      <div className="w-24">
        <label htmlFor={`participant-amount-${participant.id}`} className="sr-only">
          {t('defaultAmount')}
        </label>
        <Input
          id={`participant-amount-${participant.id}`}
          type="number"
          step="0.01"
          min="0.01"
          compact
          value={Number.isFinite(amount) ? amount : ''}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {t('save')}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
      >
        {t('cancel')}
      </button>
    </div>
  );
}

function AddRow({
  monthlyServiceId,
  knownReferences,
  onError,
}: {
  monthlyServiceId: string;
  knownReferences: string[];
  onError: (error: Error) => void;
}) {
  const t = useTranslations('monthlyServices.participants');
  const addMutation = useAddParticipant(monthlyServiceId);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  // `useId()` keeps the datalist id unique even if this editor is rendered
  // more than once on a page — a hardcoded id would collide. Same pattern
  // as `ChoreForm`.
  const referenceListId = useId();

  function handleAdd() {
    if (!reference.trim() || !amount || amount <= 0) return;
    addMutation.mutate(
      { reference, defaultAmount: Number(amount) },
      {
        onSuccess: () => {
          setReference('');
          setAmount('');
        },
        onError,
      },
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor="participant-reference" className="text-xs font-medium">
          {t('reference')}
        </label>
        <Input
          id="participant-reference"
          type="text"
          list={referenceListId}
          compact
          placeholder={t('referencePlaceholder')}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <datalist id={referenceListId}>
          {knownReferences.map((ref) => (
            <option key={ref} value={ref} />
          ))}
        </datalist>
      </div>
      <div className="w-28 space-y-1">
        <label htmlFor="participant-default-amount" className="text-xs font-medium">
          {t('defaultAmount')}
        </label>
        <Input
          id="participant-default-amount"
          type="number"
          step="0.01"
          min="0.01"
          compact
          value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={addMutation.isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {addMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Plus className="size-3.5" />
        )}
        {t('add')}
      </button>
    </div>
  );
}
