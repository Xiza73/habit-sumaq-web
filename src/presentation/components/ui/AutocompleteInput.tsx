import { forwardRef, type InputHTMLAttributes, useId } from 'react';

import { Input } from './Input';

interface AutocompleteInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'list' | 'type'
> {
  /**
   * Values offered as suggestions. The field stays free text — these are a
   * soft hint, not a constraint, which is the whole reason this is a
   * `<datalist>` and not a `<select>`.
   */
  suggestions: string[];
  compact?: boolean;
}

/**
 * A free-text input backed by `<datalist>` suggestions.
 *
 * `list` and `type` are owned by this component, not the caller: the id is
 * generated with `useId()` so any number of these can render on the same page
 * without colliding. A hardcoded id — which is what `DebtLoanForm` used to
 * do — silently breaks the second instance, because a duplicate `id` means
 * every `list` attribute resolves to the first `<datalist>` in the document.
 */
export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  function AutocompleteInput({ suggestions, ...props }, ref) {
    const listId = useId();

    return (
      <>
        <Input ref={ref} type="text" list={listId} {...props} />
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </>
    );
  },
);
