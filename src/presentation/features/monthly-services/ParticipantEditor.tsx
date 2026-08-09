'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2, Plus, Trash2 } from 'lucide-react';

import {
  useReplaceParticipants,
  useServiceParticipants,
} from '@/core/application/hooks/use-monthly-service-participants';
import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import { type Currency } from '@/core/domain/enums/currency.enum';
import {
  type MonthlyServiceParticipantRowInput,
  replaceMonthlyServiceParticipantsSchema,
} from '@/core/domain/schemas/monthly-service-participant.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { AutocompleteInput } from '@/presentation/components/ui/AutocompleteInput';
import { FieldGrid } from '@/presentation/components/ui/FieldGrid';
import { Input } from '@/presentation/components/ui/Input';

import { formatCurrency } from '@/lib/format';

/** A locally-edited row. Carries a stable client-side `key` for React list identity. */
interface EditableRow {
  key: string;
  reference: string;
  defaultAmount: number;
}

/** Per-row validation problems, keyed by the row `key`. */
type RowErrors = Record<string, { reference?: string; defaultAmount?: string }>;

function toRowSeeds(participants: MonthlyServiceParticipant[]): RowSeed[] {
  return participants.map((p) => ({ reference: p.reference, defaultAmount: p.defaultAmount }));
}

function toRowInputs(rows: EditableRow[]): MonthlyServiceParticipantRowInput[] {
  return rows.map((r) => ({ reference: r.reference, defaultAmount: r.defaultAmount }));
}

/**
 * Validate the current rows against the batch-replace schema. Returns the
 * per-row error map (empty when the whole list is valid). `reference` is
 * flagged when blank; `defaultAmount` when it is not a finite number > 0
 * (an empty amount input coerces to `NaN`, a zero to `0` — both invalid).
 */
function validateRows(
  rows: EditableRow[],
  messages: { referenceRequired: string; amountInvalid: string },
): RowErrors {
  const errors: RowErrors = {};
  for (const row of rows) {
    const rowError: { reference?: string; defaultAmount?: string } = {};
    if (row.reference.trim().length === 0) {
      rowError.reference = messages.referenceRequired;
    }
    if (!Number.isFinite(row.defaultAmount) || row.defaultAmount <= 0) {
      rowError.defaultAmount = messages.amountInvalid;
    }
    if (rowError.reference || rowError.defaultAmount) {
      errors[row.key] = rowError;
    }
  }
  return errors;
}

/** A row shape without its client key — the input to `seed`. */
type RowSeed = Pick<EditableRow, 'reference' | 'defaultAmount'>;

/**
 * Owns the mutable list of editable rows plus the CRUD handlers shared by
 * both modes. Row identity is a monotonic, instance-scoped counter kept in
 * React state — never module-global, and never a ref read during render — so
 * keys are deterministic per mount and never leak across editor instances.
 * Rows are keyed by identity, never by array index, so removing a middle row
 * can't reshuffle the survivors.
 *
 * Every handler returns the resulting keyed list so a controlled caller
 * (create mode) can forward it to its parent in the same tick without waiting
 * for the state commit.
 */
function useEditableRows(initialSeed: RowSeed[]) {
  // `keySeq` is React state so advancing it is a normal render-safe state
  // update. The initializer seeds the counter and the rows together so their
  // keys never collide with keys minted later. A local `seq` accumulator lets
  // one handler mint several keys before a single `setKeySeq` commit.
  const [initial] = useState(() => seedWithKeys(initialSeed, 0));
  const [keySeq, setKeySeq] = useState(initial.seq);
  const [rows, setRows] = useState<EditableRow[]>(initial.rows);

  function commit(built: { rows: EditableRow[]; seq: number }): EditableRow[] {
    setKeySeq(built.seq);
    setRows(built.rows);
    return built.rows;
  }

  /** Replace the whole list from a keyless seed, minting fresh keys. */
  function seed(seeds: RowSeed[]): EditableRow[] {
    return commit(seedWithKeys(seeds, keySeq));
  }

  function addRow(): EditableRow[] {
    const seq = keySeq + 1;
    const next = [...rows, { key: `row-${seq}`, reference: '', defaultAmount: 0 }];
    return commit({ rows: next, seq });
  }

  function removeRow(key: string): EditableRow[] {
    // Keep the survivors' existing keys — only the removed row drops out.
    return commit({ rows: rows.filter((row) => row.key !== key), seq: keySeq });
  }

  function changeRow(
    key: string,
    patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>,
  ): EditableRow[] {
    return commit({
      rows: rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      seq: keySeq,
    });
  }

  return { rows, seed, addRow, removeRow, changeRow };
}

/** Build keyed rows from keyless seeds, advancing a counter for each. */
function seedWithKeys(seeds: RowSeed[], startSeq: number): { rows: EditableRow[]; seq: number } {
  let seq = startSeq;
  const rows = seeds.map((s) => {
    seq += 1;
    return { key: `row-${seq}`, reference: s.reference, defaultAmount: s.defaultAmount };
  });
  return { rows, seq };
}

interface BaseProps {
  /**
   * The owning service's currency — used to render each participant's
   * `defaultAmount` as formatted currency alongside the editable number
   * input.
   */
  currency: Currency;
  /**
   * Prior `reference` values across the user's debts/loans, offered as
   * autocomplete suggestions (soft — the field stays free-text). Same
   * pattern as `DebtLoanForm.knownReferences`.
   */
  knownReferences?: string[];
}

interface EditModeProps extends BaseProps {
  mode: 'edit';
  monthlyServiceId: string;
}

interface CreateModeProps extends BaseProps {
  mode: 'create';
  /** Controlled rows — lifted to the parent `MonthlyServiceForm` so they can ride the create-service payload. */
  rows: MonthlyServiceParticipantRowInput[];
  onRowsChange: (rows: MonthlyServiceParticipantRowInput[]) => void;
}

type ParticipantEditorProps = EditModeProps | CreateModeProps;

/**
 * Multi-row batch editor for a shared service's participants
 * (`PUT /monthly-services/:id/participants`). Rows are added/removed
 * LOCALLY — no API call happens until Save. A service is considered
 * "shared" purely client-side, derived from `rows.length > 0` — the
 * backend has no `shared` boolean field.
 *
 * Two modes:
 *   - `edit`: self-managed. Seeds rows from `useServiceParticipants` and
 *     owns its own "Guardar participantes" button that calls
 *     `useReplaceParticipants` with the current rows.
 *   - `create`: fully controlled by the parent — there's no `serviceId`
 *     yet, so rows are lifted to `MonthlyServiceForm` and included in the
 *     create-service payload. No Save button here; the parent's "Crear"
 *     persists everything atomically.
 */
export function ParticipantEditor(props: ParticipantEditorProps) {
  return props.mode === 'edit' ? <EditModeEditor {...props} /> : <CreateModeEditor {...props} />;
}

function EditModeEditor({ monthlyServiceId, currency, knownReferences = [] }: EditModeProps) {
  const t = useTranslations('monthlyServices.participants');
  const tErrors = useTranslations('errors');

  const {
    data: participants = [],
    isLoading,
    dataUpdatedAt,
  } = useServiceParticipants(monthlyServiceId);
  const replaceMutation = useReplaceParticipants(monthlyServiceId);

  const { rows, seed, addRow, removeRow, changeRow } = useEditableRows([]);
  const [seededAt, setSeededAt] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Re-seed local rows every time FRESH server data lands — the initial
  // load AND every successful refetch after `useReplaceParticipants`
  // invalidates the list (e.g. so server-side reference normalization is
  // reflected after a save). `dataUpdatedAt` changes on every successful
  // fetch, so comparing it against the last-seeded value tells us exactly
  // when to reset local edits. This intentionally discards any in-flight
  // unsaved edits on refetch — acceptable because the only refetch trigger
  // here is this editor's own successful save.
  let effectiveRows = rows;
  if (!isLoading && dataUpdatedAt !== seededAt) {
    effectiveRows = seed(toRowSeeds(participants));
    setSeededAt(dataUpdatedAt);
  }

  const rowErrors = validateRows(effectiveRows, {
    referenceRequired: t('referenceRequired'),
    amountInvalid: t('amountInvalid'),
  });
  const hasRowErrors = Object.keys(rowErrors).length > 0;

  function handleError(error: Error) {
    setFormError(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'MSP_PARTICIPANT_DUPLICATE_REFERENCE')
        : tErrors('generic'),
    );
  }

  function handleSave() {
    setFormError(null);
    // Client-side gate before the batch write — the rows are validated
    // against the same schema shape as `replaceMonthlyServiceParticipantsSchema`
    // (see `validateRows`), so an obviously-invalid payload never reaches the
    // network. The Save button is also disabled while `hasRowErrors`, making
    // this a defensive backstop.
    if (hasRowErrors) return;
    const parsed = replaceMonthlyServiceParticipantsSchema.safeParse({
      participants: toRowInputs(effectiveRows),
    });
    if (!parsed.success) return;
    replaceMutation.mutate(parsed.data.participants, {
      onError: handleError,
    });
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
      ) : (
        <ParticipantRows
          rows={effectiveRows}
          errors={rowErrors}
          currency={currency}
          knownReferences={knownReferences}
          onRowChange={changeRow}
          onRemoveRow={removeRow}
          emptyLabel={t('empty')}
        />
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Plus className="size-3.5" />
          {t('addRow')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={replaceMutation.isPending || hasRowErrors}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {replaceMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {t('save')}
        </button>
      </div>

      {formError && <p className="text-xs text-destructive">{formError}</p>}
    </div>
  );
}

/**
 * A "signature" of an external row list — used to detect when the parent
 * resets/replaces `rows` (e.g. cleared on modal open) versus when the change
 * originated from this editor's own handlers. Row order + content is enough;
 * we never need to diff individual fields.
 */
function rowsSignature(rows: MonthlyServiceParticipantRowInput[]): string {
  return rows.map((r) => `${r.reference}::${r.defaultAmount}`).join('|');
}

function CreateModeEditor({ currency, knownReferences = [], rows, onRowsChange }: CreateModeProps) {
  const t = useTranslations('monthlyServices.participants');

  // Create mode is controlled by the parent (`rows` rides the create-service
  // payload), but identity lives HERE: `useEditableRows` owns keyed rows so
  // React list identity and per-row error placement stay stable across edits.
  // Every mutation updates local state AND is pushed up via `onRowsChange`.
  // Keys come from the hook's instance-scoped counter — never the array index
  // — so removing a middle row can't reshuffle the survivors' identities.
  const { rows: editableRows, seed, addRow, removeRow, changeRow } = useEditableRows(rows);

  // Re-seed from the parent only when it replaced the list out-of-band (modal
  // open reset, editing a different service). Comparing signatures keeps the
  // echo of our own `onRowsChange` from clobbering local identity/edits. Same
  // sanctioned "adjust state during render on prop change" pattern as
  // `EditModeEditor`'s `dataUpdatedAt` reseed.
  const [seededSignature, setSeededSignature] = useState(() => rowsSignature(rows));
  const incomingSignature = rowsSignature(rows);
  const localSignature = rowsSignature(toRowInputs(editableRows));
  let effectiveRows = editableRows;
  if (incomingSignature !== seededSignature && incomingSignature !== localSignature) {
    effectiveRows = seed(rows);
    setSeededSignature(incomingSignature);
  }

  const rowErrors = validateRows(effectiveRows, {
    referenceRequired: t('referenceRequired'),
    amountInvalid: t('amountInvalid'),
  });

  function handleAddRow() {
    const next = addRow();
    setSeededSignature(rowsSignature(toRowInputs(next)));
    onRowsChange(toRowInputs(next));
  }

  function handleRemoveRow(key: string) {
    const next = removeRow(key);
    setSeededSignature(rowsSignature(toRowInputs(next)));
    onRowsChange(toRowInputs(next));
  }

  function handleRowChange(
    key: string,
    patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>,
  ) {
    const next = changeRow(key, patch);
    setSeededSignature(rowsSignature(toRowInputs(next)));
    onRowsChange(toRowInputs(next));
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{t('title')}</h3>
        <p className="text-[11px] text-muted-foreground">{t('hint')}</p>
      </div>

      <ParticipantRows
        rows={effectiveRows}
        errors={rowErrors}
        currency={currency}
        knownReferences={knownReferences}
        onRowChange={handleRowChange}
        onRemoveRow={handleRemoveRow}
        emptyLabel={t('empty')}
      />

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Plus className="size-3.5" />
          {t('addRow')}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">{t('createHint')}</p>
    </div>
  );
}

function ParticipantRows({
  rows,
  errors,
  currency,
  knownReferences,
  onRowChange,
  onRemoveRow,
  emptyLabel,
}: {
  rows: EditableRow[];
  errors: RowErrors;
  currency: Currency;
  knownReferences: string[];
  onRowChange: (
    key: string,
    patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>,
  ) => void;
  onRemoveRow: (key: string) => void;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  // Each row's `AutocompleteInput` owns its own `useId()`-generated datalist,
  // so the suggestion list is duplicated once per row instead of shared. That
  // is a few dozen hidden <option> nodes in the worst case, and it buys back
  // the `referenceListId` prop that used to be threaded down to every row.
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <ParticipantRowItem
          key={row.key}
          row={row}
          error={errors[row.key]}
          currency={currency}
          knownReferences={knownReferences}
          onChange={(patch) => onRowChange(row.key, patch)}
          onRemove={() => onRemoveRow(row.key)}
        />
      ))}
    </ul>
  );
}

function ParticipantRowItem({
  row,
  error,
  currency,
  knownReferences,
  onChange,
  onRemove,
}: {
  row: EditableRow;
  error?: { reference?: string; defaultAmount?: string };
  currency: Currency;
  knownReferences: string[];
  onChange: (patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('monthlyServices.participants');
  const referenceInputId = `participant-reference-${row.key}`;
  const amountInputId = `participant-amount-${row.key}`;

  return (
    // FieldGrid (columns=2) keeps the Reference and Amount fields in shared
    // label/control/error bands, so a validation error under one column no
    // longer grows that column and pushes its sibling out of alignment. The
    // amount input, its currency-formatted preview and the remove button share
    // the control band (the preview + trash sit inline beside the input).
    <li className="rounded-md border border-border px-3 py-2">
      <FieldGrid columns={2}>
        <FieldGrid.Field label={t('reference')} htmlFor={referenceInputId} error={error?.reference}>
          <AutocompleteInput
            id={referenceInputId}
            suggestions={knownReferences}
            compact
            placeholder={t('referencePlaceholder')}
            value={row.reference}
            aria-invalid={error?.reference ? true : undefined}
            onChange={(e) => onChange({ reference: e.target.value })}
          />
        </FieldGrid.Field>
        <FieldGrid.Field
          label={t('defaultAmount')}
          htmlFor={amountInputId}
          error={error?.defaultAmount}
        >
          <div className="flex items-center gap-2">
            <Input
              id={amountInputId}
              type="number"
              step="0.01"
              min="0.01"
              compact
              className="w-24"
              value={Number.isFinite(row.defaultAmount) ? row.defaultAmount : ''}
              aria-invalid={error?.defaultAmount ? true : undefined}
              // An empty input yields `''` → `Number('')` is `0`; a non-numeric
              // value yields `NaN`. Map the empty case to `NaN` (not the silent
              // `0`) so `validateRows` flags it as "amount required" instead of
              // treating a blank field as a valid-looking zero.
              onChange={(e) =>
                onChange({ defaultAmount: e.target.value === '' ? NaN : Number(e.target.value) })
              }
            />
            <span className="text-[11px] text-muted-foreground">
              {formatCurrency(Number.isFinite(row.defaultAmount) ? row.defaultAmount : 0, currency)}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto rounded-md p-1.5 text-destructive hover:bg-muted"
              aria-label={t('removeRow', { reference: row.reference || t('reference') })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </FieldGrid.Field>
      </FieldGrid>
    </li>
  );
}
