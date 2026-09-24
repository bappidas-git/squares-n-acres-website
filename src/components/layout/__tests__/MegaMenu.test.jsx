/* eslint-disable testing-library/no-node-access --
   the hover target is the trigger's wrapper and the panel is found by the id
   the trigger names: neither has a role of its own to query by. */
/**
 * One header menu and its panel (prompt 27, QA-56).
 *
 * The mega panel is centred under its trigger, and "Buy" — the first menu — is
 * close enough to the left edge that its panel started off the page on every
 * laptop: 70 px at 1 536, 198 px at 1 280. `MegaMenu` now measures where the
 * panel lands and moves it in by exactly what spills.
 */

import { fireEvent, screen } from '@testing-library/react';

import MegaMenu, { PANEL_GUTTER, panelShift } from '../MegaMenu';
import renderWith from '../../../test-utils';

const MENU = {
  key: 'buy',
  label: 'Buy',
  to: '/buy',
  columns: [
    { key: 'status', title: 'By status', links: [{ key: 'a', label: 'Ready', to: '/buy/a' }] },
    { key: 'type', title: 'By type', links: [{ key: 'b', label: 'Villas', to: '/buy/b' }] },
  ],
};

describe('panelShift', () => {
  it('leaves a panel that fits where it is', () => {
    expect(panelShift({ left: 120, right: 920, width: 800 }, 1920)).toBe(0);
  });

  it('moves a panel that spills past the left edge in by what spills, plus the gutter', () => {
    // The measured Buy panel at 1 536 px.
    expect(panelShift({ left: -70, right: 732, width: 802 }, 1536)).toBe(70 + PANEL_GUTTER);
  });

  it('moves a panel that spills past the right edge back in', () => {
    expect(panelShift({ left: 900, right: 1300, width: 400 }, 1280)).toBe(
      1280 - PANEL_GUTTER - 1300
    );
  });

  it('pins a panel wider than the window to the left gutter', () => {
    expect(panelShift({ left: -50, right: 1050, width: 1100 }, 1024)).toBe(PANEL_GUTTER + 50);
  });

  it('does nothing without a window to measure against', () => {
    expect(panelShift({ left: -50, right: 50, width: 100 }, 0)).toBe(0);
    expect(panelShift(null, 1280)).toBe(0);
  });
});

describe('MegaMenu', () => {
  const realRect = Element.prototype.getBoundingClientRect;

  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect;
  });

  it('draws the open panel moved inside the window', () => {
    // Every element measures as the Buy panel did at 1 280 px; jsdom's window
    // is 1 024 px wide.
    Element.prototype.getBoundingClientRect = function rect() {
      return {
        left: -198,
        right: 604,
        width: 802,
        top: 0,
        bottom: 300,
        height: 300,
        x: -198,
        y: 0,
      };
    };

    renderWith(<MegaMenu menu={MENU} />);
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Buy' }).parentElement);

    const panel = document.getElementById(
      screen.getByRole('link', { name: 'Buy' }).getAttribute('aria-controls')
    );
    expect(panel).not.toBeNull();
    expect(panel.style.getPropertyValue('--panel-shift')).toBe(`${198 + PANEL_GUTTER}px`);
  });

  it('draws a menu’s own page first in its panel, marked as the section (QA-57)', () => {
    Element.prototype.getBoundingClientRect = function rect() {
      return { left: 200, right: 500, width: 300, top: 0, bottom: 300, height: 300, x: 200, y: 0 };
    };
    const insights = {
      key: 'insights',
      label: 'Insights',
      to: '/insights/articles',
      columns: [
        {
          key: 'insights-own',
          title: 'Insights',
          links: [
            { key: 'o', label: 'Insights', to: '/insights/articles', overview: true },
            { key: 'a', label: 'Articles', to: '/insights/articles' },
            { key: 'f', label: 'FAQs', to: '/insights/faqs' },
          ],
        },
      ],
    };

    renderWith(<MegaMenu menu={insights} />);
    const trigger = screen.getByRole('link', { name: 'Insights' });
    fireEvent.mouseEnter(trigger.parentElement);

    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    const links = Array.from(panel.querySelectorAll('a'));
    expect(links.map((link) => link.textContent)).toEqual(['Insights', 'Articles', 'FAQs']);
    expect(links[0]).toHaveAttribute('href', '/insights/articles');
    expect(links[0]).toHaveClass('overview');
    expect(links[1]).not.toHaveClass('overview');
  });

  it('keeps a panel that fits unshifted', () => {
    Element.prototype.getBoundingClientRect = function rect() {
      return { left: 200, right: 500, width: 300, top: 0, bottom: 300, height: 300, x: 200, y: 0 };
    };

    renderWith(<MegaMenu menu={MENU} />);
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Buy' }).parentElement);

    const panel = document.getElementById(
      screen.getByRole('link', { name: 'Buy' }).getAttribute('aria-controls')
    );
    expect(panel.style.getPropertyValue('--panel-shift')).toBe('0px');
  });
});
