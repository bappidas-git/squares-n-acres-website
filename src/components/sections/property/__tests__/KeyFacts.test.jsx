import { screen } from '@testing-library/react';

import KeyFacts, { keyFacts } from '../KeyFacts';
import renderWith from '../../../../test-utils';

/** A §6.1 apartment, with every branch of the grid filled in. */
const apartment = {
  id: 1,
  title: 'Lakeview Heights',
  listingType: 'sale',
  constructionStatus: 'ready-to-move',
  availability: 'available',
  ageOfPropertyYears: 2,
  furnishing: 'semi-furnished',
  facing: 'east',
  floorNumber: 7,
  totalFloors: 18,
  ownership: 'freehold',
  propertyType: { id: 1, name: 'Apartments', slug: 'apartments' },
  area: { superBuiltUpArea: 1650, builtUpArea: 1436, carpetArea: 1188, areaUnit: 'sqft' },
  configuration: { bedrooms: 3, bathrooms: 3, balconies: 2, parkingCovered: 2, parkingOpen: 0 },
};

describe('KeyFacts', () => {
  it('prints the facts the listing carries, formatted', () => {
    renderWith(<KeyFacts property={apartment} />);

    expect(screen.getByText('3 BHK')).toBeInTheDocument();
    expect(screen.getByText('1,650 sq ft')).toBeInTheDocument();
    expect(screen.getByText('1,188 sq ft')).toBeInTheDocument();
    expect(screen.getByText('7 of 18')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
    expect(screen.getByText('Semi-furnished')).toBeInTheDocument();
    expect(screen.getByText('Freehold')).toBeInTheDocument();
    expect(screen.getByText('2 covered')).toBeInTheDocument();
    expect(screen.getByText('2 years old')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('hides a fact the record does not carry rather than printing an em dash', () => {
    const plot = {
      id: 2,
      listingType: 'sale',
      constructionStatus: 'ready-to-move',
      propertyType: { id: 9, name: 'Residential Plots', slug: 'residential-plots' },
      area: { plotArea: 2400, plotLength: 40, plotWidth: 60, areaUnit: 'sqft' },
      configuration: {},
    };

    renderWith(<KeyFacts property={plot} />);

    expect(screen.getByText('2,400 sq ft')).toBeInTheDocument();
    expect(screen.getByText('40 × 60 ft')).toBeInTheDocument();
    expect(screen.queryByText('Bathrooms')).not.toBeInTheDocument();
    expect(screen.queryByText('Balconies')).not.toBeInTheDocument();
    expect(screen.queryByText('Floor')).not.toBeInTheDocument();
    expect(screen.queryByText('Facing')).not.toBeInTheDocument();
    expect(screen.queryByText('Parking')).not.toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders nothing at all when the listing has no facts', () => {
    const { container } = renderWith(<KeyFacts property={{ id: 3 }} />);

    expect(container).toBeEmptyDOMElement();
    expect(keyFacts({ id: 3 })).toEqual([]);
  });

  it('shows a possession month while a project is being built, and an age once it is not', () => {
    const building = keyFacts({
      ...apartment,
      constructionStatus: 'under-construction',
      possessionDate: '2027-06-01',
    });
    expect(building.find((fact) => fact.key === 'possession')?.value).toBe('June 2027');
    expect(building.find((fact) => fact.key === 'age')).toBeUndefined();

    const ready = keyFacts(apartment);
    expect(ready.find((fact) => fact.key === 'age')?.value).toBe('2 years old');
    expect(ready.find((fact) => fact.key === 'possession')).toBeUndefined();
  });

  it('counts a zero as a fact and an empty string as nothing', () => {
    const facts = keyFacts({
      ...apartment,
      configuration: { ...apartment.configuration, balconies: 0 },
      facing: '',
    });

    expect(facts.find((fact) => fact.key === 'balconies')?.value).toBe('0');
    expect(facts.find((fact) => fact.key === 'facing')).toBeUndefined();
  });

  it('reads an empty list out of anything that is not a record', () => {
    expect(keyFacts(null)).toEqual([]);
    expect(keyFacts('a property')).toEqual([]);
  });
});
