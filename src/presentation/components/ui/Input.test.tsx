import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('accepts text input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Test" />);
    expect(screen.getByPlaceholderText('Test')).toHaveClass('custom-class');
  });

  it('handles onChange events', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input onChange={onChange} placeholder="Test" />);
    await user.type(screen.getByPlaceholderText('Test'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
