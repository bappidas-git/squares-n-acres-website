/* eslint-disable testing-library/no-node-access --
   a group's panel is found by the id its button names; it has no role. */
/**
 * The phone's drawer (QA-57).
 *
 * The header's panel for a menu whose label is a link now lists the menu's own
 * page first. The drawer already opens such a group with its own "All …" line,
 * so it must not draw that entry a second time.
 */

import { fireEvent, screen, within } from '@testing-library/react';

import MobileDrawer from '../MobileDrawer';
import renderWith from '../../../test-utils';

jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => ({ propertyTypes: [], localities: [], loading: false }),
}));

jest.mock('../../../hooks/useNavPages', () => ({
  __esModule: true,
  default: () => ({
    header: [
      { slug: 'insights/articles', title: 'Articles', headerMenu: 'insights', order: 1 },
      { slug: 'insights/faqs', title: 'FAQs', headerMenu: 'insights', order: 2 },
      { slug: 'about', title: 'About Us', headerMenu: 'company', order: 3 },
    ],
    footer: [],
  }),
}));

/** The links of one drawer group, after opening it. */
function groupLinks(name) {
  const trigger = screen.getByRole('button', { name });
  fireEvent.click(trigger);
  const panel = document.getElementById(trigger.getAttribute('aria-controls'));
  return within(panel)
    .getAllByRole('link')
    .map((link) => [link.textContent, link.getAttribute('href')]);
}

describe('MobileDrawer', () => {
  it('opens Insights with one line for Insights itself, then the pages in it', () => {
    renderWith(<MobileDrawer open onClose={jest.fn()} />);

    expect(groupLinks('Insights')).toEqual([
      ['All insights', '/insights/articles'],
      ['Articles', '/insights/articles'],
      ['FAQs', '/insights/faqs'],
    ]);
  });

  it('draws a menu with no address of its own as it did', () => {
    renderWith(<MobileDrawer open onClose={jest.fn()} />);

    expect(groupLinks('Company')).toEqual([
      ['All company', '/about'],
      ['About Us', '/about'],
    ]);
  });
});
