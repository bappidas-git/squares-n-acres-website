/**
 * The accessibility contract of the phone's filter sheet (prompt 42 §4.5).
 *
 * The sheet is the one place a visitor changes a search on a phone, and it is
 * a state no crawl reaches — it only exists after a tap.
 */

import { screen, waitFor } from '@testing-library/react';

import FilterSheet from '../FilterSheet';
import propertyService from '../../../services/propertyService';
import renderWith from '../../../test-utils';
import {
  expectDialogSemantics,
  expectLabelledInputs,
  expectNamedControls,
  expectNoDuplicateIds,
} from '../../../test-utils/a11y';

jest.mock('../../../services/propertyService', () => ({
  __esModule: true,
  default: { list: jest.fn(), suggestions: jest.fn() },
}));

const master = {
  localities: [
    { id: 4, name: 'Whitefield', slug: 'whitefield', order: 1, isActive: true },
    { id: 7, name: 'Hebbal', slug: 'hebbal', order: 2, isActive: true },
  ],
  propertyTypes: [
    { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential', order: 1 },
    { id: 2, name: 'Villas', slug: 'villas', segment: 'residential', order: 2 },
  ],
  amenities: [{ id: 1, name: 'Gym', slug: 'gym', icon: 'mdi:dumbbell' }],
  badges: [],
  developers: [],
  banks: [],
  cities: [{ id: 1, name: 'Bengaluru', slug: 'bengaluru' }],
  loading: false,
};

jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => master,
}));

beforeEach(() => {
  jest.clearAllMocks();
  propertyService.list.mockResolvedValue({ data: [], meta: { total: 0 } });
});

describe('FilterSheet', () => {
  const props = {
    open: true,
    onClose: jest.fn(),
    params: {},
    fixed: {},
    facets: null,
    onApply: jest.fn(),
    onReset: jest.fn(),
    activeCount: 0,
  };

  // The sheet asks the API how many listings the draft would return; the count
  // settles 300 ms after it opens and every assertion waits for it, so no state
  // lands after the test has finished.
  const settle = () => waitFor(() => expect(propertyService.list).toHaveBeenCalled());

  it('is a modal dialog named "Filters"', async () => {
    renderWith(<FilterSheet {...props} />);

    const dialog = screen.getByRole('dialog');
    expectDialogSemantics(dialog);
    expect(dialog).toHaveAccessibleName('Filters');
    await settle();
  });

  it('labels every control it puts in front of a thumb', async () => {
    const { baseElement } = renderWith(<FilterSheet {...props} />);

    expectLabelledInputs(baseElement);
    expectNamedControls(baseElement);
    expectNoDuplicateIds(baseElement);
    await settle();
  });

  it('counts the active filters in the name so the heading is not just "Filters"', async () => {
    renderWith(<FilterSheet {...props} activeCount={3} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Filters (3)');
    await settle();
  });
});
