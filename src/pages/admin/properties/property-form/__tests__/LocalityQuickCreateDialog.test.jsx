import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import LocalityQuickCreateDialog from '../components/LocalityQuickCreateDialog';
import masterDataService from '../../../../../services/masterDataService';
import renderWith from '../../../../../test-utils';

/**
 * "Add a locality" without leaving the property: the zone is a side of the
 * city chosen beside it, and reads with that city's name — as on the
 * locality's own form.
 */

const CITIES = [
  { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  { id: 2, name: 'Bongaigaon', slug: 'bongaigaon' },
];

const city = () => screen.getByRole('combobox', { name: /^City/ });
const zone = () => screen.getByRole('combobox', { name: /^Zone/ });
const zoneLabels = () =>
  within(zone())
    .getAllByRole('option')
    .map((option) => option.textContent);

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('LocalityQuickCreateDialog', () => {
  it('names the zones with the city chosen, and creates the locality with the side', async () => {
    jest
      .spyOn(masterDataService.localities, 'create')
      .mockImplementation((body) => Promise.resolve({ data: { id: 40, ...body } }));
    const onCreated = jest.fn();
    renderWith(
      <LocalityQuickCreateDialog
        open
        cities={CITIES}
        defaultCityId={1}
        onClose={() => {}}
        onCreated={onCreated}
      />
    );

    expect(zoneLabels()).toEqual([
      'Not specified',
      'North Bengaluru',
      'South Bengaluru',
      'East Bengaluru',
      'West Bengaluru',
      'Central Bengaluru',
    ]);

    fireEvent.change(city(), { target: { value: '2' } });
    expect(zoneLabels()).toEqual([
      'Not specified',
      'North Bongaigaon',
      'South Bongaigaon',
      'East Bongaigaon',
      'West Bongaigaon',
      'Central Bongaigaon',
    ]);

    fireEvent.change(zone(), { target: { value: 'north' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Mayapuri' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and select' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(masterDataService.localities.create).toHaveBeenCalledWith({
      name: 'Mayapuri',
      cityId: 2,
      zone: 'north',
    });
  });
});
