import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableColumn } from './DataTable';

interface Person {
  id: string;
  name: string;
  age: number;
}

const rows: Person[] = [
  { id: 'a', name: 'Ada', age: 36 },
  { id: 'b', name: 'Linus', age: 54 },
];

const columns: DataTableColumn<Person>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name },
  { key: 'age', header: 'Age', render: (r) => r.age, align: 'right' },
];

describe('DataTable', () => {
  it('renders a header cell per column', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
  });

  it('renders one body row per data row using the column renderers', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    // 1 header row + 2 body rows.
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Linus')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
  });

  it('wraps the table in a horizontally scrollable container', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />,
    );
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });

  it('calls onRowClick with the row when a body row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} onRowClick={onRowClick} />,
    );

    await user.click(screen.getByText('Ada'));

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('renders the empty message instead of body rows when there are no rows', () => {
    render(
      <DataTable columns={columns} rows={[]} getRowKey={(r) => r.id} emptyMessage="Nothing here" />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
