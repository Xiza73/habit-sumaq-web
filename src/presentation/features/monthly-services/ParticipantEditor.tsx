'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2, Plus, Trash2 } from 'lucide-react';

import {
  useReplaceParticipants,
  useServiceParticipants,
} from '@/core/application/hooks/use-monthly-service-participants';
import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import { type Currency } from '@/core/domain/enums/currency.enum';
import { type MonthlyServiceParticipantRowInput } from '@/core/domain/schemas/monthly-service-participant.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';

import { formatCurrency } from '@/lib/format';

/** A locally-edited row. Carries a stable client-side `key` for React list identity. */
interface EditableRow {
  key: string;
  reference: string;
  defaultAmount: number;
}

let rowKeySeq = 0;
function nextRowKey(): string {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function toRows(participants: MonthlyServiceParticipant[]): EditableRow[] {
  return participants.map((p) => ({
    key: p.id,
    reference: p.reference,
    defaultAmount: p.defaultAmount,
  }));
}

function toRowInputs(rows: EditableRow[]): MonthlyServiceParticipantRowInput[] {
  return rows.map((r) => ({ reference: r.reference, defaultAmount: r.defaultAmount }));
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

  // Re-seed local rows every time FRESH server data lands — the initial
  // load AND every successful refetch after `useReplaceParticipants`
  // invalidates the list (e.g. so server-side reference normalization is
  // reflected after a save). `dataUpdatedAt` changes on every successful
  // fetch, so comparing it against the last-seeded value tells us exactly
  // when to reset local edits. This intentionally discards any in-flight
  // unsaved edits on refetch — acceptable because the only refetch trigger
  // here is this editor's own successful save.
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [seededAt, setSeededAt] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  let effectiveRows = rows;
  if (!isLoading && dataUpdatedAt !== seededAt) {
    effectiveRows = toRows(participants);
    setRows(effectiveRows);
    setSeededAt(dataUpdatedAt);
  }

  function handleError(error: Error) {
    setFormError(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'MSP_PARTICIPANT_DUPLICATE_REFERENCE')
        : tErrors('generic'),
    );
  }

  function handleAddRow() {
    setRows([...effectiveRows, { key: nextRowKey(), reference: '', defaultAmount: 0 }]);
  }

  function handleRemoveRow(key: string) {
    setRows(effectiveRows.filter((row) => row.key !== key));
  }

  function handleRowChange(
    key: string,
    patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>,
  ) {
    setRows(effectiveRows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function handleSave() {
    setFormError(null);
    replaceMutation.mutate(toRowInputs(effectiveRows), {
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
          currency={currency}
          knownReferences={knownReferences}
          onRowChange={handleRowChange}
          onRemoveRow={handleRemoveRow}
          emptyLabel={t('empty')}
        />
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Plus className="size-3.5" />
          {t('addRow')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={replaceMutation.isPending}
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

function CreateModeEditor({ currency, knownReferences = [], rows, onRowsChange }: CreateModeProps) {
  const t = useTranslations('monthlyServices.participants');

  // Create mode has no server-assigned ids yet — key rows by their index-
  // stable position instead. Rows are provided by the parent and only ever
  // mutated through onRowsChange, so index identity is stable across
  // re-renders here.
  const editableRows: EditableRow[] = rows.map((row, index) => ({
    key: `create-row-${index}`,
    reference: row.reference,
    defaultAmount: row.defaultAmount,
  }));

  function handleAddRow() {
    onRowsChange([...rows, { reference: '', defaultAmount: 0 }]);
  }

  function handleRemoveRow(key: string) {
    const index = Number(key.replace('create-row-', ''));
    onRowsChange(rows.filter((_, i) => i !== index));
  }

  function handleRowChange(
    key: string,
    patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>,
  ) {
    const index = Number(key.replace('create-row-', ''));
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{t('title')}</h3>
        <p className="text-[11px] text-muted-foreground">{t('hint')}</p>
      </div>

      <ParticipantRows
        rows={editableRows}
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
  currency,
  knownReferences,
  onRowChange,
  onRemoveRow,
  emptyLabel,
}: {
  rows: EditableRow[];
  currency: Currency;
  knownReferences: string[];
  onRowChange: (
    key: string,
    patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>,
  ) => void;
  onRemoveRow: (key: string) => void;
  emptyLabel: string;
}) {
  // `useId()` keeps the datalist id unique even if this editor is rendered
  // more than once on a page — a hardcoded id would collide. Same pattern
  // as `ChoreForm`. Rendered ONCE here (not per-row) — duplicate ids across
  // rows would be invalid HTML and only the first would ever be picked up
  // by each row's `list` attribute.
  const referenceListId = useId();
  const datalist = (
    <datalist id={referenceListId}>
      {knownReferences.map((ref) => (
        <option key={ref} value={ref} />
      ))}
    </datalist>
  );

  if (rows.length === 0) {
    return (
      <>
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        {datalist}
      </>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {rows.map((row) => (
          <ParticipantRowItem
            key={row.key}
            row={row}
            currency={currency}
            referenceListId={referenceListId}
            onChange={(patch) => onRowChange(row.key, patch)}
            onRemove={() => onRemoveRow(row.key)}
          />
        ))}
      </ul>
      {datalist}
    </>
  );
}

function ParticipantRowItem({
  row,
  currency,
  referenceListId,
  onChange,
  onRemove,
}: {
  row: EditableRow;
  currency: Currency;
  referenceListId: string;
  onChange: (patch: Partial<Pick<EditableRow, 'reference' | 'defaultAmount'>>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('monthlyServices.participants');
  const referenceInputId = `participant-reference-${row.key}`;
  const amountInputId = `participant-amount-${row.key}`;

  return (
    <li className="flex flex-wrap items-end gap-2 rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={referenceInputId} className="text-xs font-medium">
          {t('reference')}
        </label>
        <Input
          id={referenceInputId}
          type="text"
          list={referenceListId}
          compact
          placeholder={t('referencePlaceholder')}
          value={row.reference}
          onChange={(e) => onChange({ reference: e.target.value })}
        />
      </div>
      <div className="w-28 space-y-1">
        <label htmlFor={amountInputId} className="text-xs font-medium">
          {t('defaultAmount')}
        </label>
        <Input
          id={amountInputId}
          type="number"
          step="0.01"
          min="0.01"
          compact
          value={Number.isFinite(row.defaultAmount) ? row.defaultAmount : ''}
          onChange={(e) => onChange({ defaultAmount: Number(e.target.value) })}
        />
      </div>
      <span className="pb-2 text-[11px] text-muted-foreground">
        {formatCurrency(row.defaultAmount, currency)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md p-1.5 text-destructive hover:bg-muted"
        aria-label={t('removeRow', { reference: row.reference || t('reference') })}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
