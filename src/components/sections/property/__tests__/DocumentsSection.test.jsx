import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DocumentsSection, { orderedDocuments } from '../DocumentsSection';
import { leadStorage } from '../../../../utils/leadStorage';
import leadService from '../../../../services/leadService';
import propertyService from '../../../../services/propertyService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { documentAccess: jest.fn() },
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

  it('keeps a gated paper a public read gives no address for', () => {
    const rows = orderedDocuments([
      { id: 1, title: 'Approved plan sanction', url: null, hasFile: true, order: 1 },
      { id: 2, title: 'Nothing attached', url: null, hasFile: false, order: 2 },
    ]);

    expect(rows.map((row) => row.title)).toEqual(['Approved plan sanction']);
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

/**
 * The listing as `GET /properties/slug/:slug` serves it now: a gated file keeps
 * its row and loses its address (QA-51 OPEN-1), which the page fetches with
 * the token of the visitor's lead.
 */
describe('<DocumentsSection> over a public read', () => {
  const SANCTION = 'https://example.test/sanction.pdf';
  const BROCHURE = 'https://example.test/brochure.pdf';
  const later = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const publicRead = {
    id: 7,
    title: 'Lakeview Heights 3 BHK',
    brochureUrl: null,
    hasBrochure: true,
    brochureLeadGated: true,
    documents: [
      {
        id: 2,
        title: 'Approved plan sanction',
        url: null,
        type: 'approval',
        leadGated: true,
        hasFile: true,
        order: 2,
      },
      {
        id: 1,
        title: 'Current price list',
        url: 'https://example.test/prices.pdf',
        type: 'price-list',
        leadGated: false,
        hasFile: true,
        order: 1,
      },
    ],
  };

  beforeEach(() => {
    leadService.create.mockResolvedValue({
      data: { id: 51, access: { token: 'tok', expiresAt: later() } },
    });
    propertyService.documentAccess.mockResolvedValue({
      data: {
        brochureUrl: BROCHURE,
        documents: [
          { id: 1, url: 'https://example.test/prices.pdf' },
          { id: 2, url: SANCTION },
        ],
      },
    });
  });

  it('offers every file the listing has, the gated ones locked', () => {
    renderWith(<DocumentsSection property={publicRead} />);

    expect(screen.getByRole('button', { name: /download brochure/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Approved plan sanction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Current price list' })).toBeInTheDocument();
    expect(screen.getAllByText(/shared on request/i)).toHaveLength(2);
    expect(propertyService.documentAccess).not.toHaveBeenCalled();
  });

  it('fetches the brochure with the token its lead was answered with, then opens it', async () => {
    renderWith(<DocumentsSection property={publicRead} />);

    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));
    await shareDetails();

    expect(propertyService.documentAccess).toHaveBeenCalledWith(7, 'tok');
    expect(window.open).toHaveBeenCalledWith(BROCHURE, '_blank', 'noopener,noreferrer');
    expect(screen.getByRole('link', { name: /^open project brochure/i })).toHaveAttribute(
      'href',
      BROCHURE
    );
    expect(window.dataLayer.at(-1)).toMatchObject({ event: 'brochure_download', propertyId: 7 });
  });

  it('opens the next gated paper at once, with no second lead and no second fetch', async () => {
    renderWith(<DocumentsSection property={publicRead} />);

    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));
    await shareDetails();
    await userEvent.click(screen.getAllByRole('button', { name: /^close$/i })[0]);
    window.open.mockClear();

    await userEvent.click(screen.getByRole('button', { name: 'Open Approved plan sanction' }));

    expect(window.open).toHaveBeenCalledWith(SANCTION, '_blank', 'noopener,noreferrer');
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(leadService.create).toHaveBeenCalledTimes(1);
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(1);
  });

  it('fetches the addresses as soon as it finds the gate already open', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'property-enquiry', { token: 'tok', expiresAt: later() });
    renderWith(<DocumentsSection property={publicRead} />);

    await waitFor(() => expect(propertyService.documentAccess).toHaveBeenCalledWith(7, 'tok'));
    expect(screen.queryByText(/shared on request/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open Approved plan sanction' }));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(SANCTION, '_blank', 'noopener,noreferrer')
    );
    expect(leadService.create).not.toHaveBeenCalled();
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(1);
  });

  it('asks for the visitor’s details again when the API refuses their token', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'property-enquiry', { token: 'stale', expiresAt: later() });
    propertyService.documentAccess.mockRejectedValue({ status: 403, message: 'Forbidden' });
    renderWith(<DocumentsSection property={publicRead} />);

    await waitFor(() => expect(leadStorage.getAccess(7)).toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /download brochure/i }));

    expect(await screen.findByLabelText(/your name/i)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });
});
