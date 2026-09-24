/**
 * The filter row above an admin table (prompt 13; QA-51, QA-53).
 *
 * A filter is never on without being visible: every active value is a chip,
 * the chips are what "Reset" counts, and a phone's "More filters" says how many
 * are hiding behind it. A `custom` control — the lead list's property picker —
 * used to be the exception, on and invisible. A date range cannot be made to
 * end before it starts, and its chips speak in dates rather than ISO strings.
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FilterBar from '../FilterBar';
import renderWith from '../../../test-utils';

const FIELDS = [
  { key: 'q', type: 'search', label: 'Search', placeholder: 'Name' },
  { key: 'created', type: 'daterange', label: 'Created', keys: ['from', 'to'] },
  {
    key: 'propertyId',
    type: 'custom',
    label: 'Property',
    render: () => <span>picker</span>,
    chipLabel: (values) => `Property: listing ${values.propertyId}`,
  },
];

/** jsdom has no layout, so the breakpoint hook is told which side it is on. */
const setViewport = (width) => {
  window.matchMedia = (query) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    return {
      matches: (max ? width <= Number(max[1]) : true) && (min ? width >= Number(min[1]) : true),
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
};

const setup = (values = {}, onChange = jest.fn(), onReset = jest.fn()) => {
  renderWith(<FilterBar fields={FIELDS} values={values} onChange={onChange} onReset={onReset} />);
  return { onChange, onReset };
};

beforeEach(() => setViewport(1280));

describe('FilterBar', () => {
  it('gives a custom filter a chip, and counts it for Reset', async () => {
    const { onChange, onReset } = setup({ propertyId: '12' });

    expect(screen.getByText('Property: listing 12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove filter Property: listing 12' })
    );
    expect(onChange).toHaveBeenCalledWith({ propertyId: undefined });
  });

  it('counts a custom filter behind a phone’s "More filters"', () => {
    setViewport(390);
    setup({ propertyId: '12' });

    expect(screen.getByRole('button', { name: 'More filters (1)' })).toBeInTheDocument();
  });

  it('prints a range’s ends as dates', () => {
    setup({ from: '2026-09-01', to: '2026-09-10' });

    expect(screen.getByText('Created from 01 Sep 2026')).toBeInTheDocument();
    expect(screen.getByText('Created to 10 Sep 2026')).toBeInTheDocument();
  });

  it('keeps each end of a range on its side of the other', () => {
    setup({ from: '2026-09-01', to: '2026-09-10' });

    expect(screen.getByLabelText('Created from')).toHaveAttribute('max', '2026-09-10');
    expect(screen.getByLabelText('Created to')).toHaveAttribute('min', '2026-09-01');
  });

  it('moves the other end along when a date is typed past it', () => {
    const { onChange } = setup({ from: '2026-09-01', to: '2026-09-10' });

    fireEvent.change(screen.getByLabelText('Created from'), { target: { value: '2026-09-15' } });
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-09-15', to: '2026-09-15' });

    fireEvent.change(screen.getByLabelText('Created to'), { target: { value: '2026-08-20' } });
    expect(onChange).toHaveBeenLastCalledWith({ to: '2026-08-20', from: '2026-08-20' });
  });

  it('leaves the other end alone while a year is still being typed', () => {
    const { onChange } = setup({ from: '2026-09-01', to: '2026-09-10' });

    fireEvent.change(screen.getByLabelText('Created to'), { target: { value: '0002-09-10' } });
    expect(onChange).toHaveBeenLastCalledWith({ to: '0002-09-10' });
  });

  it('gives the search box the width its field asks for on a laptop, and the row on a phone (QA-55)', () => {
    const fields = [{ key: 'q', type: 'search', label: 'Search', width: '220px' }];
    // The width sits on the control's box, which has no role of its own.
    // eslint-disable-next-line testing-library/no-node-access
    const box = () => screen.getByLabelText('Search').closest('.control');

    const { unmount } = renderWith(
      <FilterBar fields={fields} values={{}} onChange={jest.fn()} onReset={jest.fn()} />
    );
    // A laptop row of six filters has no room for the default 300 px.
    expect(box()).toHaveStyle({ width: '220px' });
    unmount();

    setViewport(390);
    renderWith(<FilterBar fields={fields} values={{}} onChange={jest.fn()} onReset={jest.fn()} />);
    expect(box()).not.toHaveStyle({ width: '220px' });
  });
});
