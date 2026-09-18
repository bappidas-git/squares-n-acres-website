/**
 * The related-records picker (prompt 33; NEW-38 closed in prompt 45).
 *
 * The picker stores ids and draws them as a chip row, or — when it is
 * `orderable` — as a `SortableList` the editor drags into order. Both key on
 * the id, so a value that carries the same id twice is two children with the
 * same key: React keeps the first and drops the second, which is a row that
 * vanishes on the next reorder rather than an error anybody sees.
 *
 * `add()` has always refused a duplicate it is asked for. What it could not
 * refuse is a value that arrives from outside — a record written by an older
 * build, or a paste into the form state — so the de-duplication belongs where
 * the ids are read rather than where they are added.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EntityPicker from '../EntityPicker';
import renderWith from '../../../test-utils';

const RECORDS = [
  { id: 1, title: 'Karnataka RERA, explained' },
  { id: 2, title: 'A khata and B khata' },
  { id: 3, title: 'Stamp duty in Karnataka' },
];

const fetcher = (params) =>
  Promise.resolve({
    data: RECORDS.filter((record) =>
      record.title.toLowerCase().includes(String(params.q ?? '').toLowerCase())
    ),
    meta: { total: RECORDS.length, page: 1, perPage: 10 },
  });

/** Console noise is a failure: the key collision is a `console.error`. */
let consoleError;
const noise = [];

/**
 * The key collision on its own.
 *
 * A test that drives the 300 ms search debounce also collects React's
 * "not wrapped in act(...)" notice, which is about the test and not about the
 * component (NEW-33). The rendering tests below assert silence outright; the
 * interactive ones assert the thing this suite is here for.
 */
const keyWarnings = () => noise.filter((line) => /same key/i.test(line));

beforeEach(() => {
  noise.length = 0;
  consoleError = jest.spyOn(console, 'error').mockImplementation((...args) => {
    noise.push(args.join(' '));
  });
});

afterEach(() => {
  consoleError.mockRestore();
});

const setup = (props = {}) =>
  renderWith(
    <EntityPicker
      label="Related articles"
      labelKey="title"
      fetcher={fetcher}
      selectedRecords={RECORDS}
      value={[1, 2]}
      onChange={() => {}}
      {...props}
    />
  );

describe('EntityPicker', () => {
  it('draws one row per chosen id', () => {
    setup();
    expect(screen.getByText('Karnataka RERA, explained')).toBeInTheDocument();
    expect(screen.getByText('A khata and B khata')).toBeInTheDocument();
    expect(noise).toEqual([]);
  });

  it('draws a repeated id once, and says nothing to the console (NEW-38)', () => {
    setup({ value: [1, 2, 1] });

    expect(screen.getAllByText('Karnataka RERA, explained')).toHaveLength(1);
    expect(screen.getAllByText('A khata and B khata')).toHaveLength(1);
    expect(noise).toEqual([]);
  });

  it('does the same in the orderable list, where the keys collide (NEW-38)', () => {
    setup({ value: [1, 1, 2], orderable: true });

    const list = screen.getByRole('list', { name: /Related articles, in order/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(noise).toEqual([]);
  });

  it('counts a repeated id once against the maximum', () => {
    setup({ value: [1, 1, 1], max: 3 });
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('writes the de-duplicated list back on the next change', async () => {
    const onChange = jest.fn();
    setup({ value: [1, 1], onChange });

    await userEvent.type(screen.getByRole('combobox'), 'khata');
    const option = await screen.findByRole('option', { name: /A khata and B khata/i });
    await userEvent.click(option);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenLastCalledWith([1, 2]);
    expect(keyWarnings()).toEqual([]);
  });

  it('still refuses a duplicate it is asked to add', async () => {
    const onChange = jest.fn();
    setup({ value: [1], onChange });

    await userEvent.type(screen.getByRole('combobox'), 'RERA');
    const option = await screen.findByRole('option', { name: /Karnataka RERA/i });
    expect(option).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the row the editor asked to remove', async () => {
    const onChange = jest.fn();
    setup({ value: [1, 2], onChange });

    await userEvent.click(screen.getByRole('button', { name: /Remove Karnataka RERA/i }));
    expect(onChange).toHaveBeenLastCalledWith([2]);
  });

  it('holds a single value as one id rather than a list', async () => {
    const onChange = jest.fn();
    setup({ value: 3, multiple: false, onChange });

    await userEvent.type(screen.getByRole('combobox'), 'khata');
    await userEvent.click(await screen.findByRole('option', { name: /A khata and B khata/i }));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(2));
  });
});
