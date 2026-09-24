/**
 * A table row's controls (prompt 13, QA-53).
 *
 * A web address opens in a new tab — "View on site" is another context. A
 * `tel:` or `mailto:` one is the device's to answer from this tab: given a tab
 * of its own, "Call" left an empty one behind on a desktop browser.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RowActions from '../RowActions';
import renderWith from '../../../test-utils';

const ACTIONS = [
  { key: 'call', label: 'Call', icon: 'mdi:phone-outline', href: 'tel:+919876500100' },
  { key: 'wa', label: 'WhatsApp', icon: 'mdi:whatsapp', href: 'https://wa.me/919876500100' },
];

// MUI reads an anchor's box when a menu opens; jsdom's is 0×0.
const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

describe('RowActions', () => {
  it('opens a web address in a new tab and dials a number from this one', () => {
    renderWith(<RowActions actions={ACTIONS} />);

    expect(screen.getByRole('link', { name: 'Call' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
  });

  it('does the same inside the kebab menu', async () => {
    renderWith(<RowActions actions={ACTIONS} compact menuLabel="Actions for Ananya Rao" />);

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Ananya Rao' }));

    expect(await screen.findByRole('menuitem', { name: 'Call' })).not.toHaveAttribute('target');
    expect(screen.getByRole('menuitem', { name: 'WhatsApp' })).toHaveAttribute('target', '_blank');
  });
});
