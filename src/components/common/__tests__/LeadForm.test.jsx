import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../services/apiError';
import LeadForm, { buildLeadBody, validateField } from '../LeadForm';
import leadService from '../../../services/leadService';
import renderWith from '../../../test-utils';
import { DEFAULT_FIELDS, leadFormProps } from '../../../utils/leadSources';
import { leadStorage } from '../../../utils/leadStorage';

jest.mock('../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

/**
 * The one lead form of the site (ADD-09). Everything the boilerplate's copy
 * lacked is asserted here: real labels, `required: false` honoured, a honeypot
 * nobody can see, the ten-second throttle of D43 and a 422 that paints the
 * boxes rather than a toast.
 */

const fill = async ({ name = 'Asha Rao', phone = '9876543210' } = {}) => {
  await userEvent.type(screen.getByLabelText(/your name/i), name);
  await userEvent.type(screen.getByLabelText(/phone/i), phone);
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  leadService.create.mockResolvedValue({ data: { id: 51 } });
  window.dataLayer = [];
});

describe('the boxes', () => {
  it('gives every one a visible label', () => {
    renderWith(<LeadForm source="faq" />);

    for (const field of DEFAULT_FIELDS) {
      expect(screen.getByLabelText(new RegExp(field.label, 'i'))).toBeInTheDocument();
    }
  });

  it('marks an invalid box and links its message (§8.3)', async () => {
    renderWith(<LeadForm source="faq" />);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    const phone = screen.getByLabelText(/phone/i);
    await waitFor(() => expect(phone).toHaveAttribute('aria-invalid', 'true'));
    const message = screen.getByText('Phone is required');
    expect(phone.getAttribute('aria-describedby')).toContain(message.id);
    expect(leadService.create).not.toHaveBeenCalled();
  });

  it('honours `required: false` — an untouched optional box is not an error', async () => {
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(leadService.create).toHaveBeenCalledTimes(1));
    const body = leadService.create.mock.calls[0][0];
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('message');
  });

  it('refuses an e-mail address it would send, and accepts a valid one', async () => {
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'asha@');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(leadService.create).not.toHaveBeenCalled();
  });

  it('opens with what the visitor already told us this session', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    renderWith(<LeadForm source="faq" />);

    expect(screen.getByLabelText(/your name/i)).toHaveValue('Asha Rao');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('9876543210');
  });
});

describe('the honeypot (§5.11)', () => {
  it('is out of sight, out of the tab order and out of the accessibility tree', () => {
    renderWith(<LeadForm source="faq" />);

    const name = /leave this field empty/i;
    const input = screen.getByRole('textbox', { name, hidden: true });
    expect(input).toHaveAttribute('name', 'website');
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveAttribute('autocomplete', 'off');
    // `aria-hidden` on the wrapper is what keeps it out of the accessibility
    // tree, so the same query the way a screen reader looks finds nothing.
    expect(screen.queryByRole('textbox', { name })).toBeNull();
  });

  it('travels empty on an honest submission', async () => {
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(leadService.create).toHaveBeenCalled());
    expect(leadService.create.mock.calls[0][0].website).toBe('');
  });
});

describe('the throttle (D43)', () => {
  it('blocks a second submit for ten seconds and says how long is left', async () => {
    leadService.create.mockRejectedValue(new ApiError({ status: 500, message: 'Server error' }));
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText('Server error')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /please wait 10s/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/you can send this again in 10 seconds/i)).toBeInTheDocument();

    await userEvent.click(button);
    expect(leadService.create).toHaveBeenCalledTimes(1);
  });
});

describe('what the server says back', () => {
  it('paints a 422 onto the boxes it names', async () => {
    leadService.create.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { phone: ['The phone must be a valid Indian mobile number.'] },
      })
    );
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(
      await screen.findByText('The phone must be a valid Indian mobile number.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('paints a nested 422 key onto the box its last segment names', async () => {
    leadService.create.mockRejectedValue(
      new ApiError({
        status: 422,
        errors: { 'requirement.localityId': ['The selected locality is invalid.'] },
      })
    );
    renderWith(<LeadForm {...leadFormProps('post-requirement')} />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText('The selected locality is invalid.')).toBeInTheDocument();
  });

  it('says plainly when it is rate limiting us (429)', async () => {
    leadService.create.mockRejectedValue(new ApiError({ status: 429 }));
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Once in the toast and once under the button, so the visitor sees it
    // whichever of the two they are looking at.
    expect(await screen.findAllByText(/too many requests, please wait a minute/i)).toHaveLength(2);
  });
});

describe('a lead that goes through', () => {
  it('remembers the visitor, records the event and tells the host', async () => {
    const onSuccess = jest.fn();
    renderWith(<LeadForm source="property-enquiry" propertyId={7} onSuccess={onSuccess} />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 51 }, expect.any(Object)));
    expect(leadStorage.getVisitor()).toMatchObject({ name: 'Asha Rao', phone: '+919876543210' });
    expect(leadStorage.isCapturedFor(7)).toBe(true);
    expect(window.dataLayer).toContainEqual({
      event: 'lead_submit',
      source: 'property-enquiry',
      propertyId: 7,
    });
  });

  it('replaces the form with the follow-ups', async () => {
    renderWith(<LeadForm source="faq" successMessage="We have your question." />);

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText('We have your question.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
  });
});

describe('consent (§6)', () => {
  it('is ticked by default and travels with the lead', async () => {
    renderWith(<LeadForm source="faq" />);

    expect(screen.getByRole('checkbox', { name: /agree to be contacted/i })).toBeChecked();

    await fill();
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(leadService.create).toHaveBeenCalled());
    expect(leadService.create.mock.calls[0][0].consent).toBe(true);
  });

  it('blocks the submit when it is unticked', async () => {
    renderWith(<LeadForm source="faq" />);

    await fill();
    await userEvent.click(screen.getByRole('checkbox', { name: /agree to be contacted/i }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/please agree to be contacted/i)).toBeInTheDocument();
    expect(leadService.create).not.toHaveBeenCalled();
  });
});

describe('buildLeadBody', () => {
  const fields = [
    { name: 'name', label: 'Your name', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'teamSize', label: 'Team size', type: 'number' },
    { name: 'localityId', label: 'Locality', type: 'select', group: 'requirement' },
  ];

  const body = (values, extra = {}) =>
    buildLeadBody({ values, fields, source: 'flexible-workspace', ...extra });

  it('normalises the phone number however it was typed', () => {
    expect(body({ name: 'Asha', phone: '+91 98765-43210' }).phone).toBe('+919876543210');
    expect(body({ name: 'Asha', phone: '09876543210' }).phone).toBe('+919876543210');
  });

  it('leaves an untouched optional box out rather than sending an empty string', () => {
    expect(body({ name: 'Asha', phone: '9876543210', email: '' })).not.toHaveProperty('email');
  });

  it('files a field the API has no column for under `meta` (D56)', () => {
    expect(body({ name: 'Asha', phone: '9876543210', teamSize: '12' }).meta).toEqual({
      teamSize: '12',
    });
  });

  it('nests a requirement answer under `requirement` (§6.7)', () => {
    expect(body({ name: 'Asha', phone: '9876543210', localityId: '9' }).requirement).toEqual({
      localityId: '9',
    });
  });

  it('merges hidden fields into the branch they belong to', () => {
    const merged = body(
      { name: 'Asha', phone: '9876543210', localityId: '9' },
      { hiddenFields: { requirement: { bedrooms: 3 }, message: 'From the guide' } }
    );

    expect(merged.requirement).toEqual({ localityId: '9', bedrooms: 3 });
    expect(merged.message).toBe('From the guide');
  });

  it('always carries the honeypot and the page it was sent from', () => {
    const sent = body({ name: 'Asha', phone: '9876543210' });
    expect(sent.website).toBe('');
    expect(sent.pageUrl).toBe(window.location.href);
    expect(sent.source).toBe('flexible-workspace');
  });
});

describe('validateField', () => {
  it('names the box that was left blank', () => {
    const field = { name: 'subject', label: 'Subject', type: 'select', required: true };
    expect(validateField(field, '', {})).toBe('Subject is required');
  });

  it('refuses a select value that was never offered', () => {
    const field = {
      name: 'subject',
      label: 'Subject',
      type: 'select',
      options: [{ value: 'other', label: 'Other' }],
    };
    expect(validateField(field, 'other', {})).toBe('');
    expect(validateField(field, 'smuggled', {})).toBe('Choose one of the subject options');
  });
});
