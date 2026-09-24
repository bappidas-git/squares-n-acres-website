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

  // QA-56: "View on the site" is a path on this site, and it took the admin's
  // own tab to the public page because only `https:` counted as a web address.
  it('opens a path on this site in a new tab too, and keeps mailto: in this one', async () => {
    const actions = [
      { key: 'view', label: 'View on the site', icon: 'mdi:open-in-new', href: '/about' },
      { key: 'mail', label: 'E-mail', icon: 'mdi:email', href: 'mailto:info@example.com' },
    ];
    renderWith(<RowActions actions={actions} compact menuLabel="Actions for About Us" />);

    await userEvent.click(screen.getByRole('button', { name: 'Actions for About Us' }));

    const view = await screen.findByRole('menuitem', { name: 'View on the site' });
    expect(view).toHaveAttribute('target', '_blank');
    expect(view).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('menuitem', { name: 'E-mail' })).not.toHaveAttribute('target');
  });

  // QA-56: the menu is portalled in the DOM but not in React, so a click on
  // its backdrop bubbled to the table row, which opened the record.
  it('does not let a click that closes the menu reach the row around it', async () => {
    const onRowClick = jest.fn();
    renderWith(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onRowClick}>
        <RowActions actions={ACTIONS} compact menuLabel="Actions for Ananya Rao" />
      </div>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Ananya Rao' }));
    await screen.findByRole('menu');

    // eslint-disable-next-line testing-library/no-node-access -- the backdrop has no role
    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop);

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
