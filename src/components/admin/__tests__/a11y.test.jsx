/**
 * The accessibility contract of the admin's three custom controls: the table,
 * the reorderable list and the icon picker (prompt 42 §4.4, §4.5).
 *
 * The admin is where an editor spends the day, and it is the half of the site
 * a crawler cannot reach without signing in — so its rules are asserted here.
 */

import { screen, within } from '@testing-library/react';

import DataTable from '../DataTable';
import IconPicker from '../IconPicker';
import ImageField from '../ImageField';
import { TextareaField } from '../../ui/FormField';
import SortableList from '../SortableList';
import renderWith from '../../../test-utils';
import {
  expectAccessibleName,
  expectDialogSemantics,
  expectLabelledInputs,
  expectNamedControls,
  expectNoDuplicateIds,
} from '../../../test-utils/a11y';

const ROWS = [
  { id: 1, name: 'Whitefield', zone: 'east', properties: 12 },
  { id: 2, name: 'Indiranagar', zone: 'east', properties: 7 },
];

const COLUMNS = [
  { key: 'name', label: 'Name', sortable: true, primary: true },
  { key: 'zone', label: 'Zone' },
  { key: 'properties', label: 'Properties', sortable: true, align: 'right' },
];

const META = { page: 1, perPage: 20, total: 2, totalPages: 1 };

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
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  };
};

afterEach(() => setViewport(1280));

describe('DataTable', () => {
  it('gives the table a caption and every header a scope', () => {
    setViewport(1280);
    const { container } = renderWith(
      <DataTable columns={COLUMNS} rows={ROWS} meta={META} caption="Localities" />
    );

    const table = screen.getByRole('table');
    expect(within(table).getByText('Localities')).toBeInTheDocument();
    // A header cell without a scope leaves a screen reader guessing which
    // column it belongs to once the table is more than a few rows long.
    screen
      .getAllByRole('columnheader')
      .forEach((header) => expect(header).toHaveAttribute('scope', 'col'));

    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });

  it('keeps every row action reachable once the rows become cards (§4.4)', () => {
    setViewport(390);
    const { container } = renderWith(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        meta={META}
        caption="Localities"
        rowActions={(row) => [{ key: 'edit', label: `Edit ${row.name}`, onClick: () => {} }]}
        rowActionsLabel={(row) => `Actions for ${row.name}`}
      />
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    ROWS.forEach((row) =>
      expect(screen.getByRole('button', { name: `Actions for ${row.name}` })).toBeInTheDocument()
    );

    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });
});

describe('SortableList', () => {
  const items = [
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
    { id: 3, name: 'Third' },
  ];

  it('names the list, every row and both move buttons, and keeps a live region', () => {
    const { container } = renderWith(
      <SortableList
        items={items}
        label="Amenity order"
        getLabel={(item) => item.name}
        renderItem={(item) => <span>{item.name}</span>}
        onReorder={() => {}}
      />
    );

    expectAccessibleName(screen.getByRole('list'), 'Amenity order');
    expect(screen.getByRole('listitem', { name: /First, position 1 of 3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Second up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Second down' })).toBeInTheDocument();

    // Every move is spoken: the buttons move a row without moving focus.
    // (`within(container)` because the toast provider owns a live region too.)
    expect(within(container).getByRole('status')).toHaveAttribute('aria-live', 'polite');

    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });
});

describe('IconPicker', () => {
  it('is a named dialog with a labelled search box and named tiles', () => {
    const { baseElement } = renderWith(
      <IconPicker open onClose={jest.fn()} onSelect={jest.fn()} />
    );

    expectDialogSemantics(screen.getByRole('dialog'));
    expectLabelledInputs(baseElement);
    expectNoDuplicateIds(baseElement);
  });
});

/** Every id an element's `aria-describedby` names, and whether each is on the page. */
const describedByIds = (element) =>
  String(element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    // eslint-disable-next-line testing-library/no-node-access -- the ids are the point
    .map((id) => [id, Boolean(document.getElementById(id))]);

describe('what a field says it is described by (QA-61)', () => {
  it('names the image slot’s note, which the box pointed at without it carrying the id', () => {
    renderWith(<ImageField label="Photo" hint="avatar" value="" onChange={() => {}} />);

    const box = screen.getByLabelText('Photo');
    expect(describedByIds(box)).toEqual([[expect.stringMatching(/-hint$/), true]]);
    expect(box).toHaveAccessibleDescription(/256 × 256/);
  });

  it('drops the hint from the description while the error stands in its place', () => {
    renderWith(
      <TextareaField label="Quote" hint="Their words." error="The quote field is required." />
    );

    const box = screen.getByLabelText('Quote');
    for (const [, present] of describedByIds(box)) expect(present).toBe(true);
    expect(box).toHaveAccessibleDescription('The quote field is required.');
  });
});
