import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AutocompleteInput } from './AutocompleteInput';

/** Resolve the `<datalist>` an input points at through its `list` attribute. */
function datalistFor(input: HTMLElement): HTMLElement {
  const listId = input.getAttribute('list');
  expect(listId).toBeTruthy();
  const list = document.getElementById(listId as string);
  expect(list).not.toBeNull();
  return list as HTMLElement;
}

function optionValues(list: HTMLElement): (string | null)[] {
  return within(list)
    .getAllByRole('option', { hidden: true })
    .map((o) => o.getAttribute('value'));
}

describe('AutocompleteInput', () => {
  it('wires the input to a datalist holding the suggestions', () => {
    render(<AutocompleteInput suggestions={['Ana', 'Luis']} placeholder="Person" />);

    const input = screen.getByPlaceholderText('Person');
    expect(optionValues(datalistFor(input))).toEqual(['Ana', 'Luis']);
  });

  it('gives each instance its own datalist id so two on a page do not collide', () => {
    render(
      <>
        <AutocompleteInput suggestions={['Ana']} placeholder="First" />
        <AutocompleteInput suggestions={['Luis']} placeholder="Second" />
      </>,
    );

    const first = screen.getByPlaceholderText('First');
    const second = screen.getByPlaceholderText('Second');

    expect(first.getAttribute('list')).not.toBe(second.getAttribute('list'));
    expect(optionValues(datalistFor(first))).toEqual(['Ana']);
    expect(optionValues(datalistFor(second))).toEqual(['Luis']);
  });

  it('still renders an empty datalist when there are no suggestions', () => {
    render(<AutocompleteInput suggestions={[]} placeholder="Empty" />);

    const list = datalistFor(screen.getByPlaceholderText('Empty'));
    expect(within(list).queryAllByRole('option', { hidden: true })).toHaveLength(0);
  });

  it('forwards the ref, which is what makes react-hook-form register() work', () => {
    const ref = vi.fn();
    render(<AutocompleteInput suggestions={[]} ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('stays a free-text field — a value outside the suggestions is accepted', async () => {
    const user = userEvent.setup();
    render(<AutocompleteInput suggestions={['Ana']} placeholder="Person" />);

    const input = screen.getByPlaceholderText('Person');
    await user.type(input, 'Someone new');

    expect(input).toHaveValue('Someone new');
  });

  it('passes through the remaining input props', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AutocompleteInput
        suggestions={[]}
        id="custom-id"
        name="reference"
        placeholder="Person"
        onChange={onChange}
      />,
    );

    const input = screen.getByPlaceholderText('Person');
    expect(input).toHaveAttribute('id', 'custom-id');
    expect(input).toHaveAttribute('name', 'reference');

    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalled();
  });
});
