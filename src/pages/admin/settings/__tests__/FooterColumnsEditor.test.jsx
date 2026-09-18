/* eslint-disable testing-library/no-unnecessary-act */
/**
 * The footer's columns editor (prompt 40, §6.13 `footer.columns`).
 *
 * A list of lists is where a repeater usually goes wrong: a link removed from
 * the second column vanishes from the first, or a reorder rewrites a sibling.
 * Every assertion here is about the shape that comes back out of `onChange`,
 * because that shape is what the `PUT` carries.
 *
 * Reordering is exercised through the ↑/↓ buttons rather than a drag: jsdom
 * fires no HTML5 drag events, and the buttons are the path a keyboard and a
 * touch device take anyway (`SortableList`, prompt 13).
 */

import { act, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';

import FooterColumnsEditor from '../parts/FooterColumnsEditor';
import renderWith from '../../../../test-utils';
import { LIMITS } from '../settingsSchema';

const COLUMNS = [
  {
    title: 'Buy',
    links: [
      { label: 'Ready to move', href: '/buy/ready-to-move', external: false },
      { label: 'Resale', href: '/buy/resale', external: false },
    ],
  },
  {
    title: 'Services',
    links: [{ label: 'Home loan', href: '/buyer-assistance/home-loan', external: false }],
  },
];

const click = (element) =>
  act(async () => {
    await userEvent.click(element);
  });

const mountEditor = (props = {}) => {
  const onChange = jest.fn();
  renderWith(<FooterColumnsEditor value={COLUMNS} onChange={onChange} {...props} />);
  return onChange;
};

/**
 * The editor as a screen holds it — its own value, written back on every
 * change. Typing needs it: a controlled component whose value never moves
 * rebuilds each keystroke from the same starting point.
 */
function Harness({ onChange }) {
  const [value, setValue] = useState(COLUMNS);
  return (
    <FooterColumnsEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

it('adds a column, and a link inside one', async () => {
  const onChange = mountEditor();

  await click(screen.getByRole('button', { name: /add a column/i }));
  expect(onChange.mock.calls[0][0]).toHaveLength(3);
  expect(onChange.mock.calls[0][0][2]).toEqual({ title: '', links: [] });

  onChange.mockClear();
  await click(screen.getAllByRole('button', { name: /add a link/i })[1]);
  const [columns] = onChange.mock.calls[0];
  // The link lands in the column it was asked for, and nowhere else.
  expect(columns[1].links).toHaveLength(2);
  expect(columns[1].links[1]).toEqual({ label: '', href: '', external: false });
  expect(columns[0].links).toEqual(COLUMNS[0].links);
});

it('removes a link without touching its neighbours', async () => {
  const onChange = mountEditor();

  await click(screen.getByRole('button', { name: /remove the link ready to move/i }));

  const [columns] = onChange.mock.calls[0];
  expect(columns[0].links.map((link) => link.label)).toEqual(['Resale']);
  expect(columns[1]).toEqual(COLUMNS[1]);
});

it('removes a whole column', async () => {
  const onChange = mountEditor();

  await click(screen.getByRole('button', { name: /remove the column buy/i }));

  expect(onChange.mock.calls[0][0]).toEqual([COLUMNS[1]]);
});

it('reorders the columns, and the links inside one', async () => {
  const onChange = mountEditor();

  await click(screen.getByRole('button', { name: /move services up/i }));
  expect(onChange.mock.calls[0][0].map((column) => column.title)).toEqual(['Services', 'Buy']);

  onChange.mockClear();
  await click(screen.getByRole('button', { name: /move resale up/i }));
  const [columns] = onChange.mock.calls[0];
  expect(columns[0].links.map((link) => link.label)).toEqual(['Resale', 'Ready to move']);
  expect(columns[1]).toEqual(COLUMNS[1]);
});

it('edits a link’s label, target and “opens a new tab”', async () => {
  const onChange = jest.fn();
  renderWith(<Harness onChange={onChange} />);

  // The rows of the "Buy" column; its own row is the one that holds them.
  const buy = screen
    .getAllByRole('listitem')
    .find((row) => within(row).queryByDisplayValue('/buy/ready-to-move'));

  await act(async () => {
    await userEvent.type(within(buy).getByDisplayValue('Ready to move'), ' today');
    await userEvent.type(within(buy).getByDisplayValue('/buy/ready-to-move'), '?sort=new');
  });

  const edited = onChange.mock.calls.at(-1)[0][0].links[0];
  expect(edited.label).toBe('Ready to move today');
  expect(edited.href).toBe('/buy/ready-to-move?sort=new');
  // The link beside it is untouched by either keystroke.
  expect(onChange.mock.calls.at(-1)[0][0].links[1]).toEqual(COLUMNS[0].links[1]);

  // One switch per link row, in the order the links are drawn.
  await click(within(buy).getAllByRole('switch', { name: /opens a new tab/i })[0]);
  expect(onChange.mock.calls.at(-1)[0][0].links[0].external).toBe(true);
  expect(onChange.mock.calls.at(-1)[0][0].links[1].external).toBe(false);
});

it('stops at four columns and eight links', async () => {
  const full = Array.from({ length: LIMITS.footerColumns }, (_entry, index) => ({
    title: `Column ${index + 1}`,
    links: Array.from({ length: LIMITS.footerLinks }, (_link, position) => ({
      label: `Link ${position + 1}`,
      href: `/link-${position + 1}`,
      external: false,
    })),
  }));

  mountEditor({ value: full });

  expect(screen.getByRole('button', { name: /add a column/i })).toBeDisabled();
  screen
    .getAllByRole('button', { name: /add a link/i })
    .forEach((button) => expect(button).toBeDisabled());
  expect(screen.getByText(/four columns of your own/i)).toBeInTheDocument();
});

it('offers nothing to press when it is read-only', async () => {
  mountEditor({ disabled: true });

  expect(screen.getByRole('button', { name: /add a column/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /remove the column buy/i })).toBeDisabled();
  expect(screen.getByDisplayValue('Buy')).toBeDisabled();
});
