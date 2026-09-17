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
