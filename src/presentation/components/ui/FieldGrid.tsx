import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface FieldGridProps {
  /**
   * Number of columns on `sm:` and up. Below `sm`, the grid collapses to a
   * single column (mobile-first) where subgrid alignment is irrelevant since
   * fields stack vertically.
   */
  columns: 2 | 3;
  className?: string;
  children: ReactNode;
}

const COLUMNS_CLASS: Record<FieldGridProps['columns'], string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
};

/**
 * A grid layout for multi-column form-field rows that keeps every field's
 * label, control, error and hint vertically aligned across columns — even when
 * one column's label/error/hint text wraps to more lines than its sibling
 * (common across es/en/pt).
 *
 * It defines four shared row tracks (label / control / error / hint). Each
 * {@link FieldGrid.Field} is a subgrid child spanning those four rows, so the
 * tallest label in a row sets the label band's height, the controls all sit in
 * the next band, and so on. Inputs therefore stay aligned regardless of text
 * length or language.
 *
 * @example
 * <FieldGrid columns={2}>
 *   <FieldGrid.Field label={t('amount')} htmlFor="amount" error={errors.amount?.message}>
 *     <Input id="amount" {...register('amount')} />
 *   </FieldGrid.Field>
 *   <FieldGrid.Field label={t('date')} htmlFor="date">
 *     <DatePicker id="date" ... />
 *   </FieldGrid.Field>
 * </FieldGrid>
 */
export function FieldGrid({ columns, className, children }: FieldGridProps) {
  return (
    <div
      className={cn(
        // No row gap: the label→control gap comes from the label's `mb`, and
        // the error/hint gaps come from THEIR own `mt` — so empty error/hint
        // rows contribute zero height instead of a stray gap band (which
        // otherwise added dead space below fields with no error and no hint).
        'grid grid-cols-1 gap-x-4 [grid-template-rows:auto_auto_auto_auto]',
        COLUMNS_CLASS[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FieldGridFieldProps {
  /** Label text rendered in the shared label row. */
  label: ReactNode;
  /** `htmlFor` target — must match the control's `id`. */
  htmlFor: string;
  /** The form control (Input, Select, DatePicker, …). */
  children: ReactNode;
  /**
   * Error message rendered in the shared error row with the standard
   * `text-xs text-destructive` styling. Falsy values render nothing.
   */
  error?: ReactNode;
  /**
   * Custom error node. When provided it replaces the default `<p>` rendering
   * of {@link error} — use for fields that show a static error copy instead of
   * the RHF message (e.g. a range hint). If both are omitted the error row is
   * empty.
   */
  errorNode?: ReactNode;
  /**
   * Hint text rendered in the shared hint row with the standard
   * `text-[11px] text-muted-foreground` styling. Falsy values render nothing.
   */
  hint?: ReactNode;
  className?: string;
}

/**
 * A single field within a {@link FieldGrid}. Renders its label, control, error
 * and hint into the parent grid's shared row tracks via `grid-rows-subgrid`.
 */
function Field({
  label,
  htmlFor,
  children,
  error,
  errorNode,
  hint,
  className,
}: FieldGridFieldProps) {
  return (
    <div className={cn('grid row-span-4 grid-rows-subgrid', className)}>
      {/* `mb-2` (8px) matches the non-FieldGrid `space-y-2` field sections so a
          converted field looks identical to a plain one. */}
      <label htmlFor={htmlFor} className="mb-2 text-sm font-medium">
        {label}
      </label>
      {children}
      {/* The error/hint spacing lives on the `<p>` (`mt-1`), not on the wrapper
          `<div>` — so an empty row (no `<p>`) has zero height and adds no gap. */}
      <div>
        {errorNode ?? (error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null)}
      </div>
      <div>{hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}</div>
    </div>
  );
}

FieldGrid.Field = Field;
