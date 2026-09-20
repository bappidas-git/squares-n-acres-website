import { act, render, screen, within } from '@testing-library/react';

import useFittedMenus from '../useFittedMenus';

/**
 * jsdom lays nothing out — every element reports `clientWidth` and
 * `scrollWidth` as 0 — so the bar is described to the hook rather than measured
 * from it. The two getters below read the description off the element's own
 * dataset: `data-available` is the room the bar has, and `data-content` is what
 * the menus on it come to. That is exactly the comparison the hook makes in a
 * browser: is the content wider than the box.
 */
const describedWidths = {
  clientWidth: {
    configurable: true,
    get() {
      return Number(this.dataset.available ?? 0);
    },
  },
  scrollWidth: {
    configurable: true,
    get() {
      // A box never reports less scrollable width than it has.
      return Math.max(Number(this.dataset.available ?? 0), Number(this.dataset.content ?? 0));
    },
  },
};

/**
 * jsdom has no `ResizeObserver` either, and the hook stands its observers down
 * without one — which would make "the bar grew, put a menu back" untestable.
 * This is the smallest one that serves: it records what it was asked to watch,
 * and `resize()` tells every watcher that something changed, which is the only
 * thing the hook ever does with it.
 */
const observers = new Set();

class TestResizeObserver {
  constructor(callback) {
    this.callback = callback;
    observers.add(this);
  }

  observe() {}

  disconnect() {
    observers.delete(this);
  }
}

const resize = () => {
  [...observers].forEach((observer) => observer.callback([]));
};

beforeAll(() => {
  global.ResizeObserver = TestResizeObserver;
  // Both live on `Element.prototype`, so these are new own properties on
  // `HTMLElement.prototype` rather than replacements — deleting them again is
  // what puts jsdom's originals back in the lookup.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', describedWidths.clientWidth);
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', describedWidths.scrollWidth);
});

afterAll(() => {
  delete HTMLElement.prototype.clientWidth;
  delete HTMLElement.prototype.scrollWidth;
  delete global.ResizeObserver;
});

afterEach(() => observers.clear());

/**
 * A bar that places its menus the way `Header` does: `collapseMenus` keeps
 * `limit` of them and adds "More" once anything is folded, so what is drawn is
 * `limit + 1` — and the whole list whenever nothing needed folding.
 */
function Bar({ total, available, perChild, minimum }) {
  const [ref, limit] = useFittedMenus(total, minimum);
  const drawn = total <= limit + 1 ? total : limit + 1;

  return (
    <div>
      <nav ref={ref} data-available={available} data-content={drawn * perChild} data-testid="bar">
        {Array.from({ length: drawn }, (_, index) => (
          <span key={index}>menu</span>
        ))}
      </nav>
      <output data-testid="limit">{limit}</output>
    </div>
  );
}

const drawn = () => within(screen.getByTestId('bar')).queryAllByText('menu').length;
const limit = () => Number(screen.getByTestId('limit').textContent);

describe('useFittedMenus', () => {
  it('leaves every menu in place when they all fit', () => {
    // Ten menus at 60px each is 600px of a 900px bar.
    render(<Bar total={10} available={900} perChild={60} />);

    expect(limit()).toBe(10);
    expect(drawn()).toBe(10);
  });

  it('folds until the bar stops overflowing, and no further', () => {
    // 100px a menu in a 765px bar: seven fit, so six are kept and "More" is
    // the seventh. An eighth would be 800px and overflow again.
    render(<Bar total={10} available={765} perChild={100} />);

    expect(drawn()).toBe(7);
    expect(drawn() * 100).toBeLessThanOrEqual(765);
  });

  it('folds by one when one is all it takes', () => {
    // Nine at 100px overflow an 850px bar by 50; eight (seven kept + More) fit.
    render(<Bar total={9} available={850} perChild={100} />);

    expect(drawn()).toBe(8);
  });

  it('never folds below the minimum, however narrow the bar', () => {
    // Nothing fits at 400px a menu, so the floor is what decides.
    render(<Bar total={10} available={200} perChild={400} minimum={3} />);

    expect(limit()).toBe(3);
  });

  it('gives a bar with nothing on it nothing to do', () => {
    render(<Bar total={0} available={900} perChild={60} />);

    expect(limit()).toBe(0);
    expect(drawn()).toBe(0);
  });

  it('starts again from the full list when the menus themselves change', () => {
    const { rerender } = render(<Bar total={10} available={765} perChild={100} />);
    expect(limit()).toBeLessThan(10);

    // An editor unpublishes pages: four are left, and all four fit.
    rerender(<Bar total={4} available={765} perChild={100} />);

    expect(limit()).toBe(4);
    expect(drawn()).toBe(4);
  });

  it('puts a menu back when the bar grows', () => {
    const { rerender } = render(<Bar total={10} available={400} perChild={100} />);
    const narrow = drawn();
    expect(narrow).toBeLessThan(10);

    rerender(<Bar total={10} available={1200} perChild={100} />);
    act(resize);

    expect(drawn()).toBeGreaterThan(narrow);
    expect(drawn() * 100).toBeLessThanOrEqual(1200);
  });

  it('folds again when the bar shrinks', () => {
    const { rerender } = render(<Bar total={10} available={1200} perChild={100} />);
    const wide = drawn();

    rerender(<Bar total={10} available={500} perChild={100} />);
    act(resize);

    expect(drawn()).toBeLessThan(wide);
    expect(drawn() * 100).toBeLessThanOrEqual(500);
  });

  it('measures nothing before the bar is mounted', () => {
    function Bare() {
      const [ref, count] = useFittedMenus(6);
      return <output data-testid="bare">{`${count}:${ref.current === null}`}</output>;
    }

    render(<Bare />);
    expect(screen.getByTestId('bare')).toHaveTextContent('6:true');
  });
});
