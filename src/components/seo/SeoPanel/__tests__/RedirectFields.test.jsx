/**
 * "Redirect this page somewhere else" (§9.6), and the one page it is never
 * offered for: the home page, whose address is the site root (QA-56).
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RedirectFields from '../parts/RedirectFields';
import renderWith from '../../../../test-utils';
import { SeoPanelProvider } from '../SeoPanelContext';
import { withSeoDefaults } from '../../seoValues';

function render({ entity, seo, fixedPath, setField = jest.fn() }) {
  const full = withSeoDefaults(seo);
  const api = {
    entityType: 'page',
    entity: { ...entity, seo: full },
    seo: full,
    setField,
    errors: {},
    disabled: false,
    fixedPath,
  };

  renderWith(
    <SeoPanelProvider value={api}>
      <RedirectFields />
    </SeoPanelProvider>
  );
  return { setField };
}

const SWITCH = { name: 'Redirect this page somewhere else' };

describe('RedirectFields', () => {
  it('redirects a page from its own address', async () => {
    const { setField } = render({ entity: { id: 2, slug: 'about', title: 'About' } });

    expect(screen.getByText(/Visitors asking for \/about are sent on/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', SWITCH));
    expect(setField).toHaveBeenCalledWith('redirect.enabled', true);
  });

  it('is not offered for the home page (QA-56)', () => {
    render({ entity: { id: 1, slug: 'home', title: 'Home' }, fixedPath: '/' });

    expect(screen.getByRole('switch', SWITCH)).toBeDisabled();
    expect(screen.getByText(/The home page cannot be redirected/)).toBeInTheDocument();
  });

  it('lets a home redirect saved before the rule be switched off', async () => {
    const { setField } = render({
      entity: { id: 1, slug: 'home', title: 'Home' },
      seo: { redirect: { enabled: true, toPath: '/about', statusCode: 301 } },
      fixedPath: '/',
    });

    const toggle = screen.getByRole('switch', SWITCH);
    expect(toggle).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot be redirected/);
    await userEvent.click(toggle);
    expect(setField).toHaveBeenCalledWith('redirect.enabled', false);
  });
});
