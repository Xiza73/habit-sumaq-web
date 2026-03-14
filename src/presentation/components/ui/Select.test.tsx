import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Select } from './Select';

describe('Select', () => {
  it('renders a select element', () => {
    render(
      <Select aria-label="Choose">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    expect(screen.getByLabelText('Choose')).toBeInTheDocument();
  });

  it('renders options', () => {
    render(
      <Select aria-label="Choose">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('handles selection change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select aria-label="Choose" onChange={onChange}>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    await user.selectOptions(screen.getByLabelText('Choose'), 'b');
    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(
      <Select aria-label="Choose" disabled>
        <option value="a">Option A</option>
      </Select>,
    );
    expect(screen.getByLabelText('Choose')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(
      <Select ref={ref} aria-label="Choose">
        <option value="a">Option A</option>
      </Select>,
    );
    expect(ref).toHaveBeenCalled();
  });
});
