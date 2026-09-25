import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';

import SortableList from '../SortableList';
import renderWith from '../../../test-utils';

function Harness() {
  const [items, setItems] = useState([
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
  ]);
  return (
    <>
      <SortableList
        label="Rows"
        items={items}
        getLabel={(item) => item.name}
        onReorder={(next) => setItems(next)}
        renderItem={(item) => <input aria-label={`${item.name} name`} defaultValue={item.name} />}
      />
      <output data-testid="order">{items.map((item) => item.name).join(',')}</output>
    </>
  );
}

const order = () => screen.getByTestId('order').textContent;
const row = (name) => screen.getByRole('listitem', { name: new RegExp(`^${name},`) });

describe('SortableList', () => {
  it('moves the focused row with Alt+↑', () => {
    renderWith(<Harness />);

    fireEvent.keyDown(row('Second'), { key: 'ArrowUp', altKey: true });
    expect(order()).toBe('Second,First');
  });

  it('leaves Alt+↑ to a field inside the row', () => {
    renderWith(<Harness />);

    // The paragraph jump of a Mac, pressed while typing — not a reorder.
    fireEvent.keyDown(screen.getByLabelText('Second name'), { key: 'ArrowUp', altKey: true });
    expect(order()).toBe('First,Second');
  });

  it('makes a row draggable only while its handle is held', () => {
    renderWith(<Harness />);

    expect(row('First')).toHaveAttribute('draggable', 'false');

    // eslint-disable-next-line testing-library/no-node-access -- the handle is aria-hidden
    fireEvent.pointerDown(row('First').querySelector('[aria-hidden="true"]'));
    expect(row('First')).toHaveAttribute('draggable', 'true');
    expect(row('Second')).toHaveAttribute('draggable', 'false');

    fireEvent.pointerUp(window);
    expect(row('First')).toHaveAttribute('draggable', 'false');
  });
});

/*
 * Lists keyed by position (QA-64): the settings' opening hours, counters and
 * footer columns have no ids, so a row's id is its index. The focus followed
 * the id the row had *before* the move — the neighbour's, now — and a second
 * Enter on the arrow put the row straight back.
 */
function PositionHarness({ nested = false }) {
  const [items, setItems] = useState(['Alpha', 'Beta', 'Gamma']);
  return (
    <>
      <SortableList
        label="Rows"
        items={items}
        getId={(_item, index) => index}
        getLabel={(item) => item}
        onReorder={(next) => setItems(next)}
        renderItem={(item) =>
          nested ? (
            <SortableList
              label={`Links of ${item}`}
              items={['one', 'two']}
              getId={(_link, index) => index}
              getLabel={(link) => `${item} ${link}`}
              onReorder={() => {}}
              renderItem={(link) => <span>{link}</span>}
            />
          ) : (
            <span>{item}</span>
          )
        }
      />
      <output data-testid="order">{items.join(',')}</output>
    </>
  );
}

describe('SortableList — a list keyed by position (QA-64)', () => {
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    window.requestAnimationFrame.mockRestore();
  });

  it('keeps the focus on the row that moved, so a second press moves it again', () => {
    renderWith(<PositionHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Move Gamma up' }));
    expect(order()).toBe('Alpha,Gamma,Beta');
    expect(screen.getByRole('button', { name: 'Move Gamma up' })).toHaveFocus();

    // The arrow that has the focus is pressed again.
    fireEvent.click(screen.getByRole('button', { name: 'Move Gamma up' }));
    expect(order()).toBe('Gamma,Alpha,Beta');
    // At the top its up arrow is disabled, so the row itself takes the focus.
    expect(screen.getByRole('listitem', { name: /^Gamma, position 1/ })).toHaveFocus();
  });

  it('moves the focus with Alt+↓ to the row at its new place', () => {
    renderWith(<PositionHarness />);

    fireEvent.keyDown(row('Alpha'), { key: 'ArrowDown', altKey: true });
    expect(order()).toBe('Beta,Alpha,Gamma');
    expect(screen.getByRole('listitem', { name: /^Alpha, position 2/ })).toHaveFocus();
  });

  it('does not send the focus into a list nested inside a row', () => {
    renderWith(<PositionHarness nested />);

    fireEvent.click(screen.getByRole('button', { name: 'Move Beta up' }));
    expect(order()).toBe('Beta,Alpha,Gamma');
    expect(screen.getByRole('listitem', { name: /^Beta, position 1/ })).toHaveFocus();
  });
});
