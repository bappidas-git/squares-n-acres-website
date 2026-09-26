/**
 * The contact methods read Site settings (D83) — the alternate phone included
 * since prompt 51: Settings → Contact promised "a second number for the contact
 * page" and nothing drew it.
 */

import { screen } from '@testing-library/react';

import ContactMethods from '../ContactMethods';
import renderWith from '../../../../test-utils';
import { SiteSettingsContext } from '../../../../contexts/SiteSettingsContext';

const renderWithContact = (contact) =>
  renderWith(
    <SiteSettingsContext.Provider
      value={{
        settings: {},
        getContact: () => ({
          email: '',
          phone: '+919800000001',
          phoneHref: 'tel:+919800000001',
          alternatePhone: '',
          whatsappNumber: '',
          ...contact,
        }),
        getWhatsappLink: () => '',
      }}
    >
      <ContactMethods />
    </SiteSettingsContext.Provider>
  );

describe('ContactMethods', () => {
  it('offers the alternate number as a second way to call', () => {
    renderWithContact({ alternatePhone: '9845012345' });

    const second = screen.getByRole('link', { name: /Or call/ });
    expect(second).toHaveAttribute('href', 'tel:+919845012345');
    expect(second).toHaveTextContent('98450 12345');
  });

  it('draws nothing more when there is no second number, or it is the first', () => {
    const { unmount } = renderWithContact({});
    expect(screen.queryByRole('link', { name: /Or call/ })).not.toBeInTheDocument();
    unmount();

    renderWithContact({ alternatePhone: '+919800000001' });
    expect(screen.queryByRole('link', { name: /Or call/ })).not.toBeInTheDocument();
  });
});
