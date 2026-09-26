import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

import Localities from '../Localities';
import masterDataService from '../../../services/masterDataService';
import renderWith from '../../../test-utils';

/**
 * `/localities` names the cities its localities are in: one city reads as the
 * site always read, several are named with a chip each, and `?city=` makes the
 * index one city's — heading, zones and list.
 */

jest.mock('../../../services/masterDataService', () => ({
  __esModule: true,
  default: { localities: { list: jest.fn() } },
}));

let mockMasterData = {};
jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => mockMasterData,
}));

const BENGALURU = { id: 1, name: 'Bengaluru', slug: 'bengaluru' };
const BONGAIGAON = { id: 2, name: 'Bongaigaon', slug: 'bongaigaon' };

const locality = (id, name, city, zone) => ({
  id,
  name,
  slug: name.toLowerCase(),
  zone,
  cityId: city.id,
  city,
  propertyCount: 1,
});

const WHITEFIELD = locality(1, 'Whitefield', BENGALURU, 'east');
const HEBBAL = locality(2, 'Hebbal', BENGALURU, 'north');
const MAYAPURI = locality(3, 'Mayapuri', BONGAIGAON, 'north');

/** What `GET /localities` answers from, filtered as the API filters. */
let rows = [];

/** The API and the master data, both holding these localities. */
const seed = (localities, masterData = {}) => {
  rows = localities;
  mockMasterData = {
    loading: false,
    localities,
    cities: [BENGALURU, BONGAIGAON],
    propertyTypes: [],
    developers: [],
    amenities: [],
    ...masterData,
  };
};

const answer = (list) => ({
  data: list,
  meta: { page: 1, perPage: 24, total: list.length, totalPages: 1 },
});

/** Where the page has sent the URL. */
function Where() {
  return <p data-testid="where">{useLocation().search}</p>;
}

const render = (url = '/localities') =>
  renderWith(
    <>
      <Localities />
      <Where />
    </>,
    { initialEntries: [url] }
  );

const chipLabels = (group) =>
  within(screen.getByRole('group', { name: group }))
    .getAllByRole('button')
    .map((chip) => chip.textContent);

const listCalls = () => masterDataService.localities.list.mock.calls.map(([params]) => params);

beforeEach(() => {
  jest.clearAllMocks();
  masterDataService.localities.list.mockImplementation((params) =>
    Promise.resolve(
      answer(
        rows.filter(
          (row) =>
            (!params.cityId || row.cityId === params.cityId) &&
            (!params.zone || row.zone === params.zone)
        )
      )
    )
  );
});

describe('Localities', () => {
  it('reads as it always did when every locality is in one city', async () => {
    seed([WHITEFIELD, HEBBAL]);
    render();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Localities in Bengaluru' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Explore neighbourhoods across Bengaluru: connectivity, prices and lifestyle at a glance.'
      )
    ).toBeInTheDocument();
    expect(chipLabels('Filter by zone')).toEqual([
      'All zones',
      'North Bengaluru',
      'South Bengaluru',
      'East Bengaluru',
      'West Bengaluru',
      'Central Bengaluru',
    ]);
    expect(screen.queryByRole('group', { name: 'Filter by city' })).toBeNull();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Whitefield' })
    ).toBeInTheDocument();
    expect(listCalls()).toHaveLength(1);
    expect(listCalls()[0].cityId).toBeUndefined();
  });

  it('names every city, offers a chip for each, and becomes the one chosen', async () => {
    seed([WHITEFIELD, HEBBAL, MAYAPURI]);
    render();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Localities in Bengaluru and Bongaigaon' })
    ).toBeInTheDocument();
    expect(chipLabels('Filter by city')).toEqual(['All cities', 'Bengaluru', 'Bongaigaon']);
    expect(screen.getByRole('button', { name: 'All cities' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // The zones span both cities, so they are sides alone.
    expect(chipLabels('Filter by zone')).toEqual([
      'All zones',
      'North',
      'South',
      'East',
      'West',
      'Central',
    ]);
    expect(await screen.findByRole('heading', { level: 2, name: 'Mayapuri' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bongaigaon' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Localities in Bongaigaon' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('?city=bongaigaon');
    expect(screen.getByRole('button', { name: 'Bongaigaon' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(chipLabels('Filter by zone')).toContain('North Bongaigaon');
    await waitFor(() => expect(listCalls().at(-1).cityId).toBe(2));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 2, name: 'Whitefield' })).toBeNull()
    );
  });

  it('opens on the city of the URL, and asks the API for that city only', async () => {
    seed([WHITEFIELD, HEBBAL, MAYAPURI]);
    render('/localities?city=bongaigaon&zone=north');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Localities in Bongaigaon' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'North Bongaigaon' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(await screen.findByRole('heading', { level: 2, name: 'Mayapuri' })).toBeInTheDocument();
    expect(listCalls()).toEqual([expect.objectContaining({ cityId: 2, zone: 'north' })]);
  });

  it('waits for the master data before it asks for the city of the URL', async () => {
    seed([WHITEFIELD, HEBBAL, MAYAPURI], { loading: true, localities: [], cities: [] });
    const { rerender } = render('/localities?city=bongaigaon');

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(masterDataService.localities.list).not.toHaveBeenCalled();

    seed([WHITEFIELD, HEBBAL, MAYAPURI]);
    rerender(
      <>
        <Localities />
        <Where />
      </>
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Mayapuri' })).toBeInTheDocument();
    // One request, for the one city: never every city's localities first.
    expect(listCalls()).toEqual([expect.objectContaining({ cityId: 2 })]);
  });

  it('treats a city it does not cover as no city at all', async () => {
    seed([WHITEFIELD, HEBBAL, MAYAPURI]);
    render('/localities?city=mysuru');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Localities in Bengaluru and Bongaigaon' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All cities' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await screen.findByRole('heading', { level: 2, name: 'Mayapuri' });
    expect(listCalls()[0].cityId).toBeUndefined();
  });

  it('keeps its words through a refresh of the master data in the background', async () => {
    seed([WHITEFIELD, HEBBAL], { loading: true });
    render();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Localities in Bengaluru' })
    ).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Whitefield' });
  });
});
