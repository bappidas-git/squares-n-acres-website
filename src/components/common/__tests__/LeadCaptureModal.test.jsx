import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LeadCaptureModal, { canSkipForm } from '../LeadCaptureModal';
import leadService from '../../../services/leadService';
import renderWith from '../../../test-utils';
import { leadFormProps } from '../../../utils/leadSources';
import { leadStorage } from '../../../utils/leadStorage';

jest.mock('../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

/**
 * The gated deliveries of BUG-08: asking once, delivering every time.
 *
 * The decision this suite pins down is that a second gated action in the same
 * session files **no second lead** — the first capture per listing is the
 * record that matters, and asking a visitor for their phone number twice to
 * read two papers of the same project is theatre.
 */

const BROCHURE = {
  kind: 'file',
  unlockKind: 'documents',
  fileUrl: 'https://example.test/brochure.pdf',
  fileLabel: 'the brochure',
};

/** An hour from now — a token `POST /leads` answered with. */
const later = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

const renderModal = (props = {}) =>
  renderWith(
    <LeadCaptureModal
      {...leadFormProps('brochure-download')}
      open
      onClose={jest.fn()}
      propertyId={7}
      propertyTitle="Lakeview Heights"
      deliver={BROCHURE}
      {...props}
    />
  );

const shareDetails = async () => {
  await userEvent.type(screen.getByLabelText(/your name/i), 'Asha Rao');
  await userEvent.type(screen.getByLabelText(/phone/i), '9876543210');
  await userEvent.click(screen.getByRole('button', { name: /send/i }));
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  leadService.create.mockResolvedValue({ data: { id: 51 } });
  window.open = jest.fn(() => ({ focus: jest.fn() }));
});

describe('canSkipForm', () => {
  it('asks a visitor we have never met', () => {
    expect(canSkipForm({ propertyId: 7, unlockKind: 'documents' })).toBe(false);
  });

  it('skips a visitor who already enquired about this listing', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download');

    expect(canSkipForm({ propertyId: 7, unlockKind: 'documents' })).toBe(true);
  });

  it('asks again on a different listing', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download');

    expect(canSkipForm({ propertyId: 8, unlockKind: 'documents' })).toBe(false);
  });

  it('skips when the gate this asks about is already open', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.unlock(7, 'documents');

    expect(canSkipForm({ propertyId: 7, unlockKind: 'documents' })).toBe(true);
    expect(canSkipForm({ propertyId: 7, unlockKind: 'floorPlans' })).toBe(false);
  });

  it('needs the listing’s token too when the file’s address is the API’s to give', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download');
    expect(canSkipForm({ propertyId: 7, unlockKind: 'documents', needsAccess: true })).toBe(false);

    leadStorage.markCaptured(7, 'brochure-download', { token: 'tok', expiresAt: later() });
    expect(canSkipForm({ propertyId: 7, unlockKind: 'documents', needsAccess: true })).toBe(true);
  });

  it('never skips somebody who only left a name', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao' });
    leadStorage.markCaptured(7, 'brochure-download');

    expect(canSkipForm({ propertyId: 7, unlockKind: 'documents' })).toBe(false);
  });
});

describe('a visitor we have not met', () => {
  it('is asked, and gets the file once the lead is filed', async () => {
    const onSuccess = jest.fn();
    renderModal({ onSuccess });

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    await shareDetails();

    await waitFor(() => expect(leadService.create).toHaveBeenCalledTimes(1));
    expect(window.open).toHaveBeenCalledWith(BROCHURE.fileUrl, '_blank', 'noopener,noreferrer');
    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('files the lead under the canonical source of the entry point', async () => {
    renderModal();
    await shareDetails();

    await waitFor(() => expect(leadService.create).toHaveBeenCalled());
    expect(leadService.create.mock.calls[0][0]).toMatchObject({
      source: 'brochure-download',
      propertyId: 7,
    });
  });

  it('offers the file again, for a browser that blocked the tab (BUG-08)', async () => {
    window.open = jest.fn(() => null);
    renderModal();
    await shareDetails();

    const link = await screen.findByRole('link', { name: /open the brochure/i });
    expect(link).toHaveAttribute('href', BROCHURE.fileUrl);
  });
});

describe('a visitor who has already told us', () => {
  beforeEach(() => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download');
    jest.clearAllMocks();
  });

  it('is not asked a second time', () => {
    renderModal();

    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(screen.getByText(/we have your details/i)).toBeInTheDocument();
  });

  it('gets the file straight away', async () => {
    renderModal();

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(BROCHURE.fileUrl, '_blank', 'noopener,noreferrer')
    );
    expect(await screen.findByRole('link', { name: /open the brochure/i })).toBeInTheDocument();
  });

  it('files no second lead for the same session', async () => {
    renderModal();

    await waitFor(() => expect(window.open).toHaveBeenCalled());
    expect(leadService.create).not.toHaveBeenCalled();
  });

  it('opens the gate the delivery belongs to', async () => {
    renderModal();

    await waitFor(() => expect(leadStorage.isUnlocked(7, 'documents')).toBe(true));
  });
});

/**
 * A public read carries no address for a gated file (QA-51 OPEN-1): the page
 * hands the dialog a `resolveUrl` that asks the API for it with the token the
 * lead was answered with.
 */
describe('a gated file the page has no address for', () => {
  const FILE_URL = 'https://example.test/brochure.pdf';
  const gated = (resolveUrl) => ({
    kind: 'file',
    unlockKind: 'documents',
    fileLabel: 'the brochure',
    resolveUrl,
  });

  it('fetches the address once the lead is filed, then opens it', async () => {
    leadService.create.mockResolvedValue({
      data: { id: 51, access: { token: 'tok', expiresAt: later() } },
    });
    const resolveUrl = jest.fn(async () => FILE_URL);
    renderModal({ deliver: gated(resolveUrl) });

    await shareDetails();

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(FILE_URL, '_blank', 'noopener,noreferrer')
    );
    expect(resolveUrl).toHaveBeenCalledTimes(1);
    expect(leadStorage.getAccess(7)).toBe('tok');
    expect(await screen.findByRole('link', { name: /open the brochure/i })).toHaveAttribute(
      'href',
      FILE_URL
    );
  });

  it('keeps the lead, and offers to try again, when the address does not arrive', async () => {
    const resolveUrl = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(FILE_URL);
    renderModal({ deliver: gated(resolveUrl) });

    await shareDetails();

    expect(await screen.findByText(/could not fetch the file just now/i)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: /open the brochure/i }));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(FILE_URL, '_blank', 'noopener,noreferrer')
    );
    expect(leadService.create).toHaveBeenCalledTimes(1);
  });

  it('skips a visitor the listing already gave a token, and fetches the file', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download', { token: 'tok', expiresAt: later() });
    const resolveUrl = jest.fn(async () => FILE_URL);

    renderModal({ deliver: gated(resolveUrl) });

    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(FILE_URL, '_blank', 'noopener,noreferrer')
    );
    expect(resolveUrl).toHaveBeenCalledTimes(1);
    expect(leadService.create).not.toHaveBeenCalled();
    expect(await screen.findByRole('link', { name: /open the brochure/i })).toHaveAttribute(
      'href',
      FILE_URL
    );
  });

  it('asks a visitor whose visit holds no token for the listing', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download');
    const resolveUrl = jest.fn();

    renderModal({ deliver: gated(resolveUrl) });

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(resolveUrl).not.toHaveBeenCalled();
  });

  it('asks again, opening and unlocking nothing, when the address cannot be had', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'brochure-download', { token: 'stale', expiresAt: later() });
    const resolveUrl = jest.fn(async () => null);

    renderModal({ deliver: gated(resolveUrl) });

    expect(await screen.findByLabelText(/your name/i)).toBeInTheDocument();
    expect(resolveUrl).toHaveBeenCalledTimes(1);
    expect(leadStorage.isUnlocked(7, 'documents')).toBe(false);
    expect(window.open).not.toHaveBeenCalled();
    expect(leadService.create).not.toHaveBeenCalled();
  });
});

describe('an unlock rather than a file', () => {
  it('opens the gate and shows the confirmation, with nothing to download', async () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.markCaptured(7, 'property-enquiry');

    renderModal({
      ...leadFormProps('floor-plan-request'),
      deliver: { kind: 'unlock', unlockKind: 'floorPlans' },
    });

    expect(screen.getByText(/everything is unlocked/i)).toBeInTheDocument();
    await waitFor(() => expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(true));
    expect(window.open).not.toHaveBeenCalled();
  });
});
