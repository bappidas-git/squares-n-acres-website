import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DataTable from '../DataTable';
import renderWith from '../../../test-utils';

const ROWS = [
  { id: 1, name: 'Whitefield', zone: 'east', properties: 12 },
  { id: 2, name: 'Indiranagar', zone: 'east', properties: 7 },
  { id: 3, name: 'Jayanagar', zone: 'south', properties: 4 },
];

const COLUMNS = [
  { key: 'name', label: 'Name', sortable: true, primary: true },
  { key: 'zone', label: 'Zone' },
  { key: 'properties', label: 'Properties', sortable: true, align: 'right' },
];

const META = { page: 1, perPage: 20, total: 3, totalPages: 1 };

/** jsdom has no layout, so the breakpoint hook is told which side it is on. */
const setViewport = (width) => {
  window.matchMedia = (query) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const matches =
      (max ? width <= Number(max[1]) : true) && (min ? width >= Number(min[1]) : true);
    return {
      matches,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
};

beforeEach(() => setViewport(1280));

// jsdom gives every element a 0×0 box, which MUI reads as "this anchor is not
// part of the document layout" when a menu opens. The box is a fiction either
// way; this one at least does not warn.
const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

describe('DataTable', () => {
  it('renders one row per record', () => {
    renderWith(<DataTable columns={COLUMNS} rows={ROWS} meta={META} />);

    expect(screen.getByText('Whitefield')).toBeInTheDocument();
    expect(screen.getByText('Jayanagar')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(ROWS.length + 1);
  });

  describe('sorting', () => {
    it('asks for ascending order the first time a column is clicked', async () => {
      const onSortChange = jest.fn();
      renderWith(
        <DataTable columns={COLUMNS} rows={ROWS} meta={META} onSortChange={onSortChange} />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Name' }));

      expect(onSortChange).toHaveBeenCalledWith({ field: 'name', order: 'asc' });
    });

    it('flips the order when the active column is clicked again', async () => {
      const onSortChange = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          sort={{ field: 'name', order: 'asc' }}
          onSortChange={onSortChange}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Name' }));

      expect(onSortChange).toHaveBeenCalledWith({ field: 'name', order: 'desc' });
    });

    it('announces the sort state to assistive technology', () => {
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          sort={{ field: 'properties', order: 'desc' }}
          onSortChange={jest.fn()}
        />
      );

      expect(screen.getByRole('columnheader', { name: /Properties/ })).toHaveAttribute(
        'aria-sort',
        'descending'
      );
      expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
        'aria-sort',
        'none'
      );
    });

    it('does not offer to sort a column that is not sortable', () => {
      renderWith(<DataTable columns={COLUMNS} rows={ROWS} meta={META} onSortChange={jest.fn()} />);
      expect(screen.queryByRole('button', { name: 'Zone' })).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('select-all selects every id on the page', () => {
      const onSelectionChange = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          selectable
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
        />
      );

      // `fireEvent` rather than `userEvent`: MUI's checkbox starts a focus-visible
      // timer on a real click, which lands after the test and warns about act().
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));

      expect(onSelectionChange).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('select-all clears the page when everything is already selected', () => {
      const onSelectionChange = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          selectable
          selectedIds={[1, 2, 3]}
          onSelectionChange={onSelectionChange}
        />
      );

      // `fireEvent` rather than `userEvent`: MUI's checkbox starts a focus-visible
      // timer on a real click, which lands after the test and warns about act().
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('toggles one row without disturbing the others', () => {
      const onSelectionChange = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          selectable
          selectedIds={[1]}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
      expect(onSelectionChange).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('bulk actions', () => {
    const bulkActions = [
      { key: 'activate', label: 'Activate' },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        confirm: { title: 'Delete the selected records?', message: '{count} will be removed.' },
      },
    ];

    it('stays hidden until something is selected', () => {
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          selectable
          selectedIds={[]}
          bulkActions={bulkActions}
          onSelectionChange={jest.fn()}
        />
      );

      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('runs an action without a confirm straight away', async () => {
      const onBulkAction = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          selectable
          selectedIds={[1, 2]}
          bulkActions={bulkActions}
          onBulkAction={onBulkAction}
          onSelectionChange={jest.fn()}
        />
      );

      expect(screen.getByText('2 selected')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

      expect(onBulkAction).toHaveBeenCalledWith('activate', [1, 2]);
    });

    it('asks before a destructive action and names how many records it touches', async () => {
      const onBulkAction = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={META}
          selectable
          selectedIds={[1, 2]}
          bulkActions={bulkActions}
          onBulkAction={onBulkAction}
          onSelectionChange={jest.fn()}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Delete the selected records?')).toBeInTheDocument();
      expect(within(dialog).getByText('2 records will be removed.')).toBeInTheDocument();
      expect(onBulkAction).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(onBulkAction).toHaveBeenCalledWith('delete', [1, 2]);
    });
  });

  describe('states', () => {
    it('shows skeleton rows while loading', () => {
      renderWith(<DataTable columns={COLUMNS} rows={[]} loading />);
      expect(screen.getByRole('status', { name: 'Loading rows' })).toHaveAttribute(
        'aria-busy',
        'true'
      );
    });

    it('offers a retry when the call failed', async () => {
      const onRetry = jest.fn();
      renderWith(
        <DataTable columns={COLUMNS} rows={[]} error={{ message: 'Boom' }} onRetry={onRetry} />
      );

      expect(screen.getByText('Boom')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetry).toHaveBeenCalled();
    });

    it('shows the empty state, with its action, when nothing matched', () => {
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={[]}
          meta={{ page: 1, perPage: 20, total: 0, totalPages: 0 }}
          emptyState={{
            title: 'No localities',
            text: 'No records match the current filters.',
            action: <button type="button">Reset filters</button>,
          }}
        />
      );

      expect(screen.getByText('No localities')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('counts the rows on screen out of the total', () => {
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          meta={{ page: 2, perPage: 20, total: 57, totalPages: 3 }}
        />
      );

      expect(screen.getByText('Showing 21–40 of 57')).toBeInTheDocument();
    });

    it('reports a new page size', () => {
      const onPerPageChange = jest.fn();
      renderWith(
        <DataTable columns={COLUMNS} rows={ROWS} meta={META} onPerPageChange={onPerPageChange} />
      );

      fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
      expect(onPerPageChange).toHaveBeenCalledWith(50);
    });
  });

  describe('below 900px', () => {
    beforeEach(() => setViewport(390));

    it('renders cards with a title and the first columns as labelled values', () => {
      renderWith(<DataTable columns={COLUMNS} rows={ROWS} meta={META} />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Whitefield' })).toBeInTheDocument();
      expect(screen.getAllByText('Zone')).toHaveLength(ROWS.length);
    });

    it('collapses the row actions into a kebab menu', async () => {
      const onClick = jest.fn();
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={[ROWS[0]]}
          meta={META}
          rowActions={() => [{ key: 'edit', label: 'Edit Whitefield', onClick }]}
        />
      );

      expect(screen.queryByRole('button', { name: 'Edit Whitefield' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Row actions' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit Whitefield' }));

      expect(onClick).toHaveBeenCalled();
    });

    it('lets a custom renderer replace the card body', () => {
      renderWith(
        <DataTable
          columns={COLUMNS}
          rows={[ROWS[0]]}
          meta={META}
          mobileCard={(row) => <p>Card for {row.name}</p>}
        />
      );

      expect(screen.getByText('Card for Whitefield')).toBeInTheDocument();
    });
  });
});
