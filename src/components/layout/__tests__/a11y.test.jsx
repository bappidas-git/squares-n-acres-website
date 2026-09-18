/**
 * The accessibility contract of the chrome: the header, the phone's drawer and
 * the bottom bar.
 *
 * These three are on every public page, so a missing name or a duplicated id
 * here is a missing name or a duplicated id everywhere (prompt 42 §4.5).
 */

import { screen } from '@testing-library/react';

import BottomNav from '../BottomNav';
import Header from '../Header';
import MobileDrawer from '../MobileDrawer';
import renderWith from '../../../test-utils';
import {
  expectDialogSemantics,
  expectImageAlt,
  expectNamedControls,
  expectNoDuplicateIds,
} from '../../../test-utils/a11y';

const master = {
  propertyTypes: [
    { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential', order: 1 },
    { id: 2, name: 'Villas', slug: 'villas', segment: 'residential', order: 2 },
    { id: 11, name: 'Office Spaces', slug: 'office-spaces', segment: 'commercial', order: 11 },
  ],
  localities: [{ id: 1, name: 'Whitefield', slug: 'whitefield', isActive: true, order: 1 }],
  amenities: [],
  badges: [],
  developers: [],
  banks: [],
  cities: [],
  loading: false,
};

jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => master,
}));

// The header's CMS menus come from an endpoint; the menus themselves are not
// what these tests are about.
jest.mock('../../../hooks/useNavPages', () => ({
  __esModule: true,
  default: () => ({ header: [], footer: [] }),
}));

describe('Header', () => {
  it('names every control and uses no id twice', () => {
    const { container } = renderWith(<Header />);

    expectNamedControls(container);
    expectNoDuplicateIds(container);
    expectImageAlt(container);
  });

  it('gives its navigation landmark a name', () => {
    renderWith(<Header />);
    expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument();
  });
});

describe('MobileDrawer', () => {
  it('is a named modal dialog whose menus say whether they are open', () => {
    const { baseElement } = renderWith(<MobileDrawer open onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    expectDialogSemantics(dialog);
    expect(dialog).toHaveAccessibleName('Menu');

    expectNamedControls(baseElement);
    expectNoDuplicateIds(baseElement);

    // Every collapsible menu declares its state and the panel it controls.
    screen
      .getAllByRole('button', { expanded: false })
      .forEach((trigger) => expect(trigger).toHaveAttribute('aria-controls'));
  });
});

describe('BottomNav', () => {
  it('is a named landmark of named controls', () => {
    const { container } = renderWith(<BottomNav />);

    const nav = screen.getByRole('navigation', { name: 'Quick navigation' });
    expect(nav).toBeInTheDocument();

    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });
});
