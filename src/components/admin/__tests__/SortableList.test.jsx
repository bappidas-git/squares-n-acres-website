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
