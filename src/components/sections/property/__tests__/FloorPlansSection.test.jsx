import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FloorPlansSection, { orderedPlans } from '../FloorPlansSection';
import { leadStorage } from '../../../../utils/leadStorage';
import leadService from '../../../../services/leadService';
import propertyService from '../../../../services/propertyService';
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

// The lightbox is ESM-only and lazy-loaded; this suite is about the gate.
jest.mock('../PropertyLightbox', () => ({
  __esModule: true,
  default: ({ open }) => (open ? <div data-testid="lightbox" /> : null),
}));

const property = {
  id: 7,
  title: 'Lakeview Heights 3 BHK',
  projectName: 'Lakeview Heights',
  listingType: 'sale',
  floorPlans: [
    {
      id: 1,
      title: '2 BHK — 1,180 sq ft',
      imageUrl: 'https://example.test/plan-1.png',
      pdfUrl: 'https://example.test/plan-1.pdf',
      area: 1180,
      areaUnit: 'sqft',
      bedrooms: 2,
      price: 8850000,
      order: 1,
    },
    {
      id: 2,
      title: '3 BHK — 1,650 sq ft',
      imageUrl: 'https://example.test/plan-2.png',
      pdfUrl: null,
      area: 1650,
      areaUnit: 'sqft',
      bedrooms: 3,
      price: 12400000,
      order: 2,
    },
  ],
};

/**
 * Fills the lead dialog in and waits for the success panel.
 */
async function shareDetails() {
  await userEvent.click(screen.getByRole('button', { name: /view floor plans/i }));
  await userEvent.type(await screen.findByLabelText(/your name/i), 'Asha Rao');
  await userEvent.type(screen.getByLabelText(/phone/i), '9880000011');
  await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
  await screen.findByText(/request received/i);
}

beforeEach(() => {
  sessionStorage.clear();
  resetGatedFiles();
  jest.clearAllMocks();
  leadService.create.mockReset();
  leadService.create.mockResolvedValue({ id: 1, message: 'Thank you.' });
});

describe('orderedPlans', () => {
  it('drops a plan with no drawing and sorts the rest by order', () => {
    expect(
      orderedPlans([
        { id: 2, title: 'B', imageUrl: 'b.png', order: 2 },
        { id: 1, title: 'A', imageUrl: 'a.png', order: 1 },
        { id: 3, title: 'C', imageUrl: '' },
      ]).map((plan) => plan.title)
    ).toEqual(['A', 'B']);
  });

  it('keeps a plan a public read gives no drawing address for', () => {
    expect(
      orderedPlans([
        { id: 1, title: 'A', imageUrl: null, hasImage: true },
        { id: 2, title: 'B', imageUrl: null, hasImage: false },
      ]).map((plan) => plan.title)
    ).toEqual(['A']);
  });
});

describe('FloorPlansSection', () => {
  it('locks the drawing until the visitor shares their details', () => {
    renderWith(<FloorPlansSection property={property} />);

    expect(screen.getByText('Share your details to view floor plans')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view floor plans/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open full size/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it('opens the drawing, the lightbox and the PDF once a lead is filed', async () => {
    renderWith(<FloorPlansSection property={property} />);

    await shareDetails();

    expect(leadService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Asha Rao',
        // Every form normalises the number before it is filed (§6.7).
        phone: '+919880000011',
        source: 'floor-plan-request',
        propertyId: 7,
        message: 'Floor plans for Lakeview Heights',
      })
    );
    expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(true);

    // Closing the dialog hands the visitor what they asked for.
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    await waitFor(() =>
      expect(screen.queryByText('Share your details to view floor plans')).not.toBeInTheDocument()
    );
    expect(await screen.findByTestId('lightbox')).toBeInTheDocument();

    const pdf = await screen.findByRole('link', { name: /download pdf/i });
    expect(pdf).toHaveAttribute('href', 'https://example.test/plan-1.pdf');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('starts unlocked when this visit already unlocked the listing', () => {
    leadStorage.unlock(7, 'floorPlans');
    renderWith(<FloorPlansSection property={property} />);

    expect(screen.queryByText('Share your details to view floor plans')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open full size/i })).toBeInTheDocument();
  });

  it('offers no download for a plan that has no PDF', async () => {
    leadStorage.unlock(7, 'floorPlans');
    renderWith(<FloorPlansSection property={property} />);

    await userEvent.click(screen.getByRole('tab', { name: '3 BHK — 1,650 sq ft' }));

    expect(screen.getByRole('button', { name: /open full size/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it('renders nothing when the listing has no drawings', () => {
    const { container } = renderWith(
      <FloorPlansSection property={{ ...property, floorPlans: [] }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * The listing as a public read serves it now: no address for a drawing or a
 * PDF (QA-51 OPEN-1). The gate blurs a stand-in sketch, and the drawings are
 * fetched with the token of the visitor's lead.
 */
describe('FloorPlansSection over a public read', () => {
  const later = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const publicRead = {
    ...property,
    floorPlans: property.floorPlans.map((plan) => ({
      ...plan,
      imageUrl: null,
      pdfUrl: null,
      hasImage: true,
      hasPdf: Boolean(plan.pdfUrl),
    })),
  };

  const ANSWER = {
    data: {
      brochureUrl: null,
      documents: [],
      floorPlans: property.floorPlans.map((plan) => ({
        id: plan.id,
        imageUrl: plan.imageUrl,
        pdfUrl: plan.pdfUrl,
      })),
      unitConfigurations: [],
    },
  };

  beforeEach(() => {
    leadService.create.mockResolvedValue({
      data: { id: 1, access: { token: 'tok', expiresAt: later() } },
    });
    propertyService.documentAccess.mockResolvedValue(ANSWER);
  });

  it('blurs a stand-in sketch, never the drawing, and asks for nothing', () => {
    renderWith(<FloorPlansSection property={publicRead} />);

    expect(screen.getByText('Share your details to view floor plans')).toBeInTheDocument();
    expect(screen.queryByAltText('2 BHK — 1,180 sq ft floor plan')).not.toBeInTheDocument();
    expect(propertyService.documentAccess).not.toHaveBeenCalled();
  });

  it('fetches the drawings with the token of the lead, then shows them full size', async () => {
    renderWith(<FloorPlansSection property={publicRead} />);

    await shareDetails();
    expect(propertyService.documentAccess).toHaveBeenCalledWith(7, 'tok');

    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    expect(await screen.findByAltText('2 BHK — 1,180 sq ft floor plan')).toHaveAttribute(
      'src',
      'https://example.test/plan-1.png'
    );
    expect(await screen.findByTestId('lightbox')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      'https://example.test/plan-1.pdf'
    );
  });

  it('fetches straight away for a visit that already opened the floor plans', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919880000011' });
    leadStorage.markCaptured(7, 'property-enquiry', { token: 'tok', expiresAt: later() });
    renderWith(<FloorPlansSection property={publicRead} />);

    expect(screen.getByText(/loading the drawings/i)).toBeInTheDocument();
    expect(await screen.findByAltText('2 BHK — 1,180 sq ft floor plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open full size/i })).toBeInTheDocument();
  });

  it('opens the floor plans without a second lead for a visitor who asked for a paper (P28)', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919880000011' });
    leadStorage.markCaptured(7, 'document-request', { token: 'tok', expiresAt: later() });
    renderWith(<FloorPlansSection property={publicRead} />);

    await userEvent.click(screen.getByRole('button', { name: /view floor plans/i }));

    expect(await screen.findByText(/everything is unlocked/i)).toBeInTheDocument();
    expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(true);
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(leadService.create).not.toHaveBeenCalled();
    expect(propertyService.documentAccess).toHaveBeenCalledWith(7, 'tok');
  });

  it('offers to try again when the drawings do not load', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919880000011' });
    leadStorage.markCaptured(7, 'property-enquiry', { token: 'tok', expiresAt: later() });
    propertyService.documentAccess.mockRejectedValueOnce({ status: 0 });
    renderWith(<FloorPlansSection property={publicRead} />);

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    expect(await screen.findByAltText('2 BHK — 1,180 sq ft floor plan')).toBeInTheDocument();
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(2);
  });

  it('asks for the visitor’s details again when the API refuses their token', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919880000011' });
    leadStorage.markCaptured(7, 'property-enquiry', { token: 'stale', expiresAt: later() });
    propertyService.documentAccess.mockRejectedValue({ status: 403 });
    renderWith(<FloorPlansSection property={publicRead} />);

    await waitFor(() => expect(leadStorage.getAccess(7)).toBeNull());
    await userEvent.click(await screen.findByRole('button', { name: /view floor plans/i }));

    expect(await screen.findByLabelText(/your name/i)).toBeInTheDocument();
  });
});
