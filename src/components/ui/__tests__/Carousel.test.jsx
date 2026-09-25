import { screen } from '@testing-library/react';

import Carousel from '../Carousel';
import renderWith from '../../../test-utils';

/** jsdom reports zero-size boxes, so overflow is faked per test. */
function mockOverflow({ scrollWidth, clientWidth }) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      return this.className.includes('viewport') ? scrollWidth : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return this.className.includes('viewport') ? clientWidth : 0;
    },
  });
}

afterEach(() => {
  delete HTMLElement.prototype.scrollWidth;
  delete HTMLElement.prototype.clientWidth;
});

describe('Carousel', () => {
  it('renders every item as a labelled slide inside a carousel region', () => {
    mockOverflow({ scrollWidth: 0, clientWidth: 0 });
    renderWith(
      <Carousel label="Similar properties">
        <div>One</div>
        <div>Two</div>
        <div>Three</div>
      </Carousel>
    );

    const region = screen.getByRole('region', { name: 'Similar properties' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });

  it('hides arrows and dots when nothing overflows', () => {
    mockOverflow({ scrollWidth: 300, clientWidth: 300 });
    renderWith(
      <Carousel label="Two only">
        <div>One</div>
        <div>Two</div>
      </Carousel>
    );

    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Go to slide/ })).not.toBeInTheDocument();
  });

  it('shows arrows when it scrolls, with the first page disabling Previous', () => {
    mockOverflow({ scrollWidth: 1200, clientWidth: 400 });
    renderWith(
      <Carousel label="Many">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>Item {i}</div>
        ))}
      </Carousel>
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('counts the pages a scroll can reach, and lights the last dot at the end (QA-62)', () => {
    // A phone's 1.15 cards a page: eight cards scroll 6.2 viewports, which is
    // seven pages — "one card, one page" counted eight, and the eighth dot
    // could never light.
    mockOverflow({ scrollWidth: 400 * 7.2, clientWidth: 400 });
    renderWith(
      <Carousel label="Phone rail">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>Item {i}</div>
        ))}
      </Carousel>
    );

    expect(screen.getAllByRole('button', { name: /Go to slide/ })).toHaveLength(7);
  });

  it('says "1 / 20" instead of drawing more dots than fit (QA-62)', () => {
    mockOverflow({ scrollWidth: 400 * 20, clientWidth: 400 });
    renderWith(
      <Carousel label="Featured">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i}>Item {i}</div>
        ))}
      </Carousel>
    );

    expect(screen.queryByRole('button', { name: /Go to slide/ })).not.toBeInTheDocument();
    expect(screen.getByText('1 / 20')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders nothing without children', () => {
    const { container } = renderWith(<Carousel label="Empty">{null}</Carousel>);
    expect(container).toBeEmptyDOMElement();
  });
});
