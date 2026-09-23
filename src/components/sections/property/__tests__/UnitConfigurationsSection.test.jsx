import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UnitConfigurationsSection, { activeUnits } from '../UnitConfigurationsSection';
import leadService from '../../../../services/leadService';
import propertyService from '../../../../services/propertyService';
import { leadStorage } from '../../../../utils/leadStorage';
import { resetGatedFiles } from '../../../../hooks/useGatedFiles';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { documentAccess: jest.fn() },
}));

// The lightbox is ESM-only and lazy-loaded; this suite only needs to know
// which drawing it was opened on.
jest.mock('../PropertyLightbox', () => ({
  __esModule: true,
  default: ({ open, index, slides }) =>
    open ? <div data-testid="lightbox">{slides[index]?.description}</div> : null,
}));

/**
 * jsdom has no layout, so the breakpoint hook is told which side it is on.
 *
 * Only width queries are answered: a stub that says "yes" to everything also
 * says yes to `prefers-reduced-motion`, which is not what a 1280 px desktop is.
 */
const setViewport = (width) => {
  window.matchMedia = (query) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const matches =
      Boolean(max || min) &&
      (max ? width <= Number(max[1]) : true) &&
      (min ? width >= Number(min[1]) : true);
    return {
      matches,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
};

const property = {
  id: 1,
  title: 'Lakeview Heights',
  listingType: 'sale',
  unitConfigurations: [
    {
      id: 2,
      name: '3 BHK',
      bedrooms: 3,
      bathrooms: 3,
      superBuiltUpArea: 1650,
      carpetArea: 1188,
      areaUnit: 'sqft',
      price: 12400000,
      priceOnRequest: false,
      floorPlanImageUrl: 'https://example.test/plan-3bhk.png',
      availableUnits: 6,
      isActive: true,
    },
    {
      id: 1,
      name: '2 BHK',
      bedrooms: 2,
      bathrooms: 2,
      superBuiltUpArea: 1180,
      carpetArea: 850,
      areaUnit: 'sqft',
      price: null,
      priceOnRequest: true,
      isActive: true,
    },
    { id: 9, name: 'Sold-out studio', bedrooms: 1, isActive: false },
  ],
};

beforeEach(() => {
  setViewport(1280);
  sessionStorage.clear();
  resetGatedFiles();
  jest.clearAllMocks();
});

describe('activeUnits', () => {
  it('drops inactive units and sorts the rest by bedrooms', () => {
    expect(activeUnits(property.unitConfigurations).map((unit) => unit.name)).toEqual([
      '2 BHK',
      '3 BHK',
    ]);
  });

  it('prefers the editor’s own order when the rows carry one', () => {
    const units = [
      { id: 1, name: 'B', bedrooms: 2, order: 2, isActive: true },
      { id: 2, name: 'A', bedrooms: 3, order: 1, isActive: true },
    ];
    expect(activeUnits(units).map((unit) => unit.name)).toEqual(['A', 'B']);
  });

  it('survives a record with no units at all', () => {
    expect(activeUnits(undefined)).toEqual([]);
    expect(activeUnits(null)).toEqual([]);
  });
});

describe('UnitConfigurationsSection', () => {
  it('renders a captioned table with column headers on a desktop', () => {
    renderWith(<UnitConfigurationsSection property={property} />);

    const table = screen.getByRole('table');
    expect(within(table).getByText(/Unit configurations, areas and prices/i)).toBeInTheDocument();

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent.trim());
    expect(headers).toEqual([
      'Configuration',
      'Carpet area',
      'Super built-up',
      'Price',
      'Floor plan',
      'Enquire',
    ]);

    expect(within(table).getByText('1,188 sq ft')).toBeInTheDocument();
    expect(within(table).getByText('6 available')).toBeInTheDocument();
  });

  it('prints "Price on Request" and a "Get price" call to action for an on-request unit', () => {
    renderWith(<UnitConfigurationsSection property={property} />);

    expect(screen.getByText('Price on Request')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get price' })).toBeInTheDocument();
    // The priced row asks a different question.
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('still renders the table when every unit is on request', () => {
    const onRequest = {
      ...property,
      unitConfigurations: property.unitConfigurations.map((unit) => ({
        ...unit,
        price: null,
        priceOnRequest: true,
      })),
    };

    renderWith(<UnitConfigurationsSection property={onRequest} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Price on Request')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Get price' })).toHaveLength(2);
  });

  it('renders stacked cards instead of a table on a phone', () => {
    setViewport(390);
    renderWith(<UnitConfigurationsSection property={property} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: '3 BHK' })).toBeInTheDocument();
    expect(screen.getByText('850 sq ft')).toBeInTheDocument();
  });

  it('renders nothing when the listing sells no configurations', () => {
    const { container } = renderWith(
      <UnitConfigurationsSection property={{ ...property, unitConfigurations: [] }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * The drawings sit behind the floor plans' gate, and a public read carries no
 * address for them (QA-51 OPEN-1).
 */
describe('UnitConfigurationsSection and the floor-plan gate', () => {
  const later = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const DRAWING = 'https://example.test/plan-3bhk.png';

  const publicRead = {
    ...property,
    unitConfigurations: property.unitConfigurations.map((unit) => ({
      ...unit,
      floorPlanImageUrl: null,
      floorPlanPdfUrl: null,
      hasFloorPlanImage: Boolean(unit.floorPlanImageUrl),
      hasFloorPlanPdf: false,
    })),
  };

  beforeEach(() => {
    leadService.create.mockResolvedValue({
      data: { id: 1, access: { token: 'tok', expiresAt: later() } },
    });
    propertyService.documentAccess.mockResolvedValue({
      data: {
        brochureUrl: null,
        documents: [],
        floorPlans: [],
        unitConfigurations: [{ id: 2, floorPlanImageUrl: DRAWING, floorPlanPdfUrl: null }],
      },
    });
  });

  it('locks the drawing, and a unit without one shows nothing', () => {
    renderWith(<UnitConfigurationsSection property={publicRead} />);

    expect(screen.getByRole('button', { name: 'Unlock the 3 BHK floor plan' })).toBeInTheDocument();
    expect(screen.queryByAltText('3 BHK floor plan')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /2 BHK floor plan/ })).not.toBeInTheDocument();
    expect(propertyService.documentAccess).not.toHaveBeenCalled();
  });

  it('asks for the visitor’s details, then opens the drawing they asked for', async () => {
    renderWith(<UnitConfigurationsSection property={publicRead} />);

    await userEvent.click(screen.getByRole('button', { name: 'Unlock the 3 BHK floor plan' }));
    await userEvent.type(await screen.findByLabelText(/your name/i), 'Asha Rao');
    await userEvent.type(screen.getByLabelText(/phone/i), '9880000011');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByText(/request received/i);

    expect(leadService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'floor-plan-request',
        propertyId: 1,
        message: 'Floor plan for 3 BHK',
      })
    );

    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    expect(await screen.findByTestId('lightbox')).toHaveTextContent('3 BHK');
    expect(screen.getByAltText('3 BHK floor plan')).toHaveAttribute('src', DRAWING);
    expect(propertyService.documentAccess).toHaveBeenCalledWith(1, 'tok');
  });

  it('shows the drawing to a visit that has already opened the floor plans', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919880000011' });
    leadStorage.markCaptured(1, 'property-enquiry', { token: 'tok', expiresAt: later() });
    renderWith(<UnitConfigurationsSection property={publicRead} />);

    expect(
      await screen.findByRole('button', { name: 'View the 3 BHK floor plan full screen' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('keeps even a drawing the record carries locked until the gate is open', () => {
    renderWith(<UnitConfigurationsSection property={property} />);
    expect(screen.getByRole('button', { name: 'Unlock the 3 BHK floor plan' })).toBeInTheDocument();
  });
});
