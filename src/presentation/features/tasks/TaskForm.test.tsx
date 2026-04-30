import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { TestProviders } from '@/test/utils';

import { TaskForm } from './TaskForm';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/core/application/hooks/use-tasks', () => ({
  useCreateTask: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateTask: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const sectionA: Section = {
  id: '11111111-1111-4111-a111-111111111111',
  userId: 'user-1',
  name: 'Trabajo',
  color: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

const sectionB: Section = {
  id: '22222222-2222-4222-a222-222222222222',
  userId: 'user-1',
  name: 'Personal',
  color: '#000000',
  position: 2,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

const mockTask: Task = {
  id: 'tk-1',
  userId: 'user-1',
  sectionId: sectionA.id,
  title: 'Llamar al banco',
  description: 'Preguntar por la tarjeta',
  completed: false,
  completedAt: null,
  position: 1,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

function renderForm(
  overrides: {
    open?: boolean;
    task?: Task | null;
    defaultSectionId?: string;
    sections?: Section[];
  } = {},
) {
  const props = {
    open: true,
    task: null as Task | null,
    sections: [sectionA, sectionB],
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<TaskForm {...props} />, { wrapper: TestProviders }), ...props };
}

describe('TaskForm', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
  });

  it('does not render when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-selects the defaultSectionId in create mode', () => {
    renderForm({ defaultSectionId: sectionB.id });
    expect(screen.getByLabelText(/sección/i)).toHaveValue(sectionB.id);
  });

  it('falls back to first section when no defaultSectionId is provided', () => {
    renderForm();
    expect(screen.getByLabelText(/sección/i)).toHaveValue(sectionA.id);
  });

  it('pre-fills fields including the current sectionId when editing', () => {
    renderForm({ task: mockTask });
    expect(screen.getByLabelText(/sección/i)).toHaveValue(sectionA.id);
    expect(screen.getByLabelText(/título/i)).toHaveValue('Llamar al banco');
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('Preguntar por la tarjeta');
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('does not call create when submitting with empty title', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: /crear/i }));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls create with trimmed title and chosen section', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/sección/i), sectionB.id);
    await user.type(screen.getByLabelText(/título/i), '  Pagar luz  ');
    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: sectionB.id,
        title: 'Pagar luz',
        description: null,
      }),
      expect.any(Object),
    );
  });

  it('only sends sectionId in update payload when it actually changed', async () => {
    const user = userEvent.setup();
    renderForm({ task: mockTask });

    await user.clear(screen.getByLabelText(/título/i));
    await user.type(screen.getByLabelText(/título/i), 'Nueva versión');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    // Title changed but section did NOT — sectionId should be undefined to
    // avoid a no-op cross-section move on the backend.
    // The mock typing erases the variant data shape; cast to a permissive
    // local type so eslint's no-unsafe-member-access stays happy without
    // pulling the full UpdateTaskInput shape into this file.
    const callArg = mockUpdateMutate.mock.calls[0][0] as {
      data: { title?: string; sectionId?: string };
    };
    expect(callArg.data.title).toBe('Nueva versión');
    expect(callArg.data.sectionId).toBeUndefined();
  });

  it('sends sectionId when the user picks a different section in edit mode', async () => {
    const user = userEvent.setup();
    renderForm({ task: mockTask });

    await user.selectOptions(screen.getByLabelText(/sección/i), sectionB.id);
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    // The mock typing erases the variant data shape; cast to a permissive
    // local type so eslint's no-unsafe-member-access stays happy without
    // pulling the full UpdateTaskInput shape into this file.
    const callArg = mockUpdateMutate.mock.calls[0][0] as {
      data: { title?: string; sectionId?: string };
    };
    expect(callArg.data.sectionId).toBe(sectionB.id);
  });

  it('toggles between edit and preview modes for the description', async () => {
    const user = userEvent.setup();
    renderForm({ task: { ...mockTask, description: 'This is **bold**' } });

    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /vista previa/i }));

    expect(screen.queryByLabelText(/descripción/i)).not.toBeInTheDocument();
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });
});
