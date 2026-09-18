import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DocumentsSection, { orderedDocuments } from '../DocumentsSection';
import { leadStorage } from '../../../../utils/leadStorage';
import leadService from '../../../../services/leadService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

const property = {
  id: 7,
  title: 'Lakeview Heights 3 BHK',
  brochureUrl: 'https://example.test/brochure.pdf',
  brochureLeadGated: true,
  documents: [
    {
      id: 2,
      title: 'Approved plan sanction',
      url: 'https://example.test/sanction.pdf',
      type: 'approval',
      leadGated: true,
      order: 2,
    },
    {
      id: 1,
      title: 'Current price list',
      url: 'https://example.test/prices.pdf',
      type: 'price-list',
      leadGated: false,
      order: 1,
    },
  ],
};

/** Fills the gated lead dialog in and waits for the success panel. */
async function shareDetails() {
  await userEvent.type(await screen.findByLabelText(/your name/i), 'Asha Rao');
  await userEvent.type(screen.getByLabelText(/phone/i), '9876543210');
  await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
  await screen.findByRole('link', { name: /^open /i });
}

beforeEach(() => {
  jest.clearAllMocks();
  leadStorage.clear();
  leadService.create.mockResolvedValue({ id: 51 });
  window.open = jest.fn(() => ({ focus: jest.fn() }));
});

describe('orderedDocuments', () => {
  it('sorts by order and drops what cannot be opened', () => {
    const rows = orderedDocuments([
      { id: 1, title: 'Second', url: 'b.pdf', order: 2 },
      { id: 2, title: 'First', url: 'a.pdf', order: 1 },
      { id: 3, title: 'No address', url: '', order: 0 },
      { id: 4, url: 'untitled.pdf', order: 0 },
    ]);

    expect(rows.map((row) => row.title)).toEqual(['First', 'Second']);
  });

  it('drops a document that is the brochure again, so one file is one row', () => {
    const rows = orderedDocuments(
      [
        { id: 1, title: 'Project brochure', url: 'brochure.pdf', order: 1 },
        { id: 2, title: 'Price list', url: 'prices.pdf', order: 2 },
      ],
      'brochure.pdf'
    );

    expect(rows.map((row) => row.title)).toEqual(['Price list']);
  });

  it('is empty for a listing that carries nothing', () => {
    expect(orderedDocuments(null)).toEqual([]);
  });
});

describe('<DocumentsSection>', () => {
  it('renders nothing when there is no brochure and no document', () => {
    const { container } = renderWith(
      <DocumentsSection property={{ id: 7, title: 'No papers', documents: [] }} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('opens a document the editor left open without asking anything', async () => {
    renderWith(<DocumentsSection property={property} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open Current price list' }));

    expect(window.open).toHaveBeenCalledWith(
      'https://example.test/prices.pdf',
      '_blank',
      'noopener,noreferrer'
    );
    expect(leadService.create).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
  });

  it('asks first for a gated brochure, then delivers the file (BUG-08)', async () => {
    renderWith(<DocumentsSection property={property} />);

    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));
    expect(window.open).not.toHaveBeenCalled();

    await shareDetails();

    expect(leadService.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'brochure-download', propertyId: 7 })
    );
    expect(window.open).toHaveBeenCalledWith(
      'https://example.test/brochure.pdf',
      '_blank',
      'noopener,noreferrer'
    );
    expect(window.dataLayer.at(-1)).toMatchObject({ event: 'brochure_download', propertyId: 7 });
  });

  it('files which document was asked for, without a box to overwrite it', async () => {
    renderWith(<DocumentsSection property={property} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open Approved plan sanction' }));
    expect(await screen.findByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^message$/i)).not.toBeInTheDocument();

    await shareDetails();

    expect(leadService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'document-request',
        message: 'Requested: Approved plan sanction',
      })
    );
  });

  it('offers a link in a toast when a blocker ate the tab', async () => {
    window.open = jest.fn(() => null);
    renderWith(<DocumentsSection property={property} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open Current price list' }));

    expect(screen.getByText(/your browser blocked the new tab/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open current price list/i })).toHaveAttribute(
      'href',
      'https://example.test/prices.pdf'
    );
  });

  it('offers the file again from the success panel, whatever the browser did', async () => {
    window.open = jest.fn(() => null);
    renderWith(<DocumentsSection property={property} />);

    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));
    await shareDetails();

    // A real link rather than a second `window.open`: a blocker that ate the
    // first tab would eat another one too (BUG-08).
    expect(screen.getByRole('link', { name: /^open project brochure/i })).toHaveAttribute(
      'href',
      'https://example.test/brochure.pdf'
    );
  });

  it('remembers the unlock for the rest of the visit', async () => {
    renderWith(<DocumentsSection property={property} />);

    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));
    await shareDetails();

    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);
  });

  it('opens a gated document directly once this visit has already enquired', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'property-enquiry');
    renderWith(<DocumentsSection property={property} />);

    expect(screen.queryByText(/shared on request/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));

    expect(leadService.create).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      'https://example.test/brochure.pdf',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
