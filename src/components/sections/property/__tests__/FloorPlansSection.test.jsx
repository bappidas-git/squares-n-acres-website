import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FloorPlansSection, { orderedPlans } from '../FloorPlansSection';
import { leadStorage } from '../../../../utils/leadStorage';
import leadService from '../../../../services/leadService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
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
 * Fills the temporary lead dialog in and waits for the success panel.
 *
 * The boxes are found by their placeholders because `LeadForm` still has no
 * `<label>`s — that is ADD-09, which prompt 28 closes when every form on the
 * site moves behind `LeadCaptureModal`.
 */
async function shareDetails() {
  await userEvent.click(screen.getByRole('button', { name: /view floor plans/i }));
  await userEvent.type(await screen.findByPlaceholderText('Your name *'), 'Asha Rao');
  await userEvent.type(screen.getByPlaceholderText('Phone number *'), '9880000011');
  await userEvent.click(screen.getByRole('button', { name: /submit request/i }));
  await screen.findByText(/request received/i);
}

beforeEach(() => {
  sessionStorage.clear();
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
        phone: '9880000011',
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
