import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Section } from '@/core/domain/entities/section';

import { TestProviders } from '@/test/utils';

import { SectionForm } from './SectionForm';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-sections', () => ({
  useCreateSection: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateSection: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const mockSection: Section = {
  id: 'sec-1',
  userId: 'user-1',
  name: 'Trabajo',
  color: '#FF6B35',
  position: 1,
  isCollapsed: false,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function renderForm(overrides: { open?: boolean; section?: Section | null } = {}) {
  const props = {
    open: true,
    section: null as Section | null,
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<SectionForm {...props} />, { wrapper: TestProviders }), ...props };
}

describe('SectionForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
  });

  it('does not render when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the create dialog when no section is provided', () => {
    renderForm();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument();
  });

  it('renders the edit dialog and pre-fills name + color when editing', () => {
    renderForm({ section: mockSection });
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Trabajo');
    expect(screen.getByLabelText(/color/i)).toHaveValue('#ff6b35');
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('does not call create when submitting with empty name', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls create with trimmed name', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/nombre/i), '  Personal  ');
    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Personal' }),
      expect.any(Object),
    );
  });

  it('calls update on edit, sending color: null when cleared', async () => {
    const user = userEvent.setup();
    renderForm({ section: mockSection });

    await user.click(screen.getByRole('button', { name: /quitar color/i }));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockSection.id,
        data: expect.objectContaining({ color: null }),
      }),
      expect.any(Object),
    );
  });
});
