import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import JobApplyForm, { buildApplicationBody, validateApplication } from '../JobApplyForm';
import careerService from '../../../../services/careerService';
import renderWith from '../../../../test-utils';
import { leadStorage } from '../../../../utils/leadStorage';

jest.mock('../../../../services/careerService', () => ({
  __esModule: true,
  default: { apply: jest.fn() },
}));

/**
 * The application form of `/careers/:jobSlug` (§6.11, decision D12).
 *
 * The two shapes the résumé control takes are the point of this suite: a URL
 * box when nothing is configured, an upload zone when a cloud name and a
 * preset are — because that switch is the whole of D12, and because a careers
 * page whose only résumé control needs a Cloudinary account is a careers page
 * nobody can apply through.
 *
 * `uploadToCloudinary` is mocked: what matters here is that a resolved upload
 * puts a URL into the body the API receives, not that XHR works (that is
 * `utils/__tests__/cloudinary.test.js`).
 */

const JOB = { id: 7, slug: 'property-analyst', title: 'Property Analyst' };

const mockUpload = jest.fn();

jest.mock('../../../../utils/cloudinary', () => {
  const actual = jest.requireActual('../../../../utils/cloudinary');
  return {
    __esModule: true,
    ...actual,
    isCloudinaryConfigured: () => global.__cloudinaryConfigured === true,
    uploadToCloudinary: (...args) => mockUpload(...args),
  };
});

const fillIdentity = async ({
  name = 'Asha Rao',
  email = 'asha@example.com',
  phone = '9845100121',
} = {}) => {
  await userEvent.type(screen.getByLabelText(/full name/i), name);
  await userEvent.type(screen.getByLabelText(/e-mail/i), email);
  await userEvent.type(screen.getByLabelText(/^phone/i), phone);
};

const submit = () => userEvent.click(screen.getByRole('button', { name: /send application/i }));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  global.__cloudinaryConfigured = false;
  careerService.apply.mockResolvedValue({ data: { id: 12 } });
  window.dataLayer = [];
});

afterAll(() => {
  delete global.__cloudinaryConfigured;
});

describe('validateApplication', () => {
  const valid = {
    name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '9845100121',
    resumeUrl: 'https://drive.example.com/cv.pdf',
  };

  it('accepts a complete application', () => {
    expect(validateApplication(valid)).toEqual({});
  });

  it('insists on a résumé, and on one that is a URL', () => {
    expect(validateApplication({ ...valid, resumeUrl: '' }).resumeUrl).toMatch(/résumé/i);
    expect(validateApplication({ ...valid, resumeUrl: 'drive.example.com/cv' }).resumeUrl).toMatch(
      /https:\/\//
    );
  });

  it('leaves an empty LinkedIn address alone and refuses a malformed one', () => {
    expect(validateApplication({ ...valid, linkedinUrl: '' }).linkedinUrl).toBeUndefined();
    expect(validateApplication({ ...valid, linkedinUrl: 'linkedin.com/in/x' }).linkedinUrl).toMatch(
      /https:\/\//
    );
  });

  it('applies the Indian mobile rule and the e-mail rule', () => {
    expect(validateApplication({ ...valid, phone: '12345' }).phone).toBeTruthy();
    expect(validateApplication({ ...valid, email: 'asha@' }).email).toBeTruthy();
  });
});

describe('buildApplicationBody', () => {
  it('normalises the phone number and leaves out the blank optional fields', () => {
    const body = buildApplicationBody({
      name: ' Asha Rao ',
      email: 'Asha@Example.com',
      phone: '098451 00121',
      resumeUrl: ' https://drive.example.com/cv.pdf ',
      linkedinUrl: '',
      coverLetter: '',
    });

    expect(body).toEqual({
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '+919845100121',
      resumeUrl: 'https://drive.example.com/cv.pdf',
      website: '',
    });
  });

  it('carries the honeypot through untouched (§5.11)', () => {
    expect(buildApplicationBody({ name: 'A', phone: '9845100121' }, 'bot').website).toBe('bot');
  });
});

describe('with no Cloudinary configured', () => {
  it('asks for a résumé link and posts it', async () => {
    renderWith(<JobApplyForm job={JOB} />);

    expect(screen.getByLabelText(/résumé link/i)).toBeInTheDocument();
    expect(screen.queryByText(/drag your résumé here/i)).not.toBeInTheDocument();

    await fillIdentity();
    await userEvent.type(screen.getByLabelText(/résumé link/i), 'https://drive.example.com/cv.pdf');
    await submit();

    await waitFor(() => expect(careerService.apply).toHaveBeenCalledTimes(1));
    expect(careerService.apply).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: 'Asha Rao',
        email: 'asha@example.com',
        phone: '+919845100121',
        resumeUrl: 'https://drive.example.com/cv.pdf',
        website: '',
      })
    );

    expect(await screen.findByText(/application received/i)).toBeInTheDocument();
    expect(leadStorage.getVisitor()).toMatchObject({ name: 'Asha Rao' });
  });

  it('refuses to send without a résumé and marks the box', async () => {
    renderWith(<JobApplyForm job={JOB} />);

    await fillIdentity();
    await submit();

    const field = screen.getByLabelText(/résumé link/i);
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(careerService.apply).not.toHaveBeenCalled();
  });
});

describe('with Cloudinary configured', () => {
  beforeEach(() => {
    global.__cloudinaryConfigured = true;
  });

  it('uploads the chosen file and sends the URL it answered with', async () => {
    mockUpload.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/cv.pdf' });
    renderWith(<JobApplyForm job={JOB} />);

    expect(screen.getByText(/drag your résumé here/i)).toBeInTheDocument();

    const file = new File(['cv'], 'asha-rao.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/résumé/i), file);

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    expect(mockUpload.mock.calls[0][1]).toMatchObject({ resourceType: 'auto', folder: 'resumes' });

    // The upload has finished when the row offers to take the file back out.
    expect(await screen.findByRole('button', { name: /remove/i })).toBeInTheDocument();
    expect(screen.getByText(/asha-rao\.pdf/)).toBeInTheDocument();

    await fillIdentity();
    await submit();

    await waitFor(() => expect(careerService.apply).toHaveBeenCalledTimes(1));
    expect(careerService.apply.mock.calls[0][1].resumeUrl).toBe(
      'https://res.cloudinary.com/demo/raw/upload/v1/cv.pdf'
    );
  });

  it('refuses a file over 5 MB before uploading a byte of it (§7)', async () => {
    renderWith(<JobApplyForm job={JOB} />);

    const big = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    await userEvent.upload(screen.getByLabelText(/résumé/i), big);

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit is 5 MB/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('refuses a file that is not a PDF, DOC or DOCX', async () => {
    renderWith(<JobApplyForm job={JOB} />);

    const wrong = new File(['x'], 'portfolio.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText(/résumé/i), wrong);

    expect(await screen.findByRole('alert')).toHaveTextContent(/PDF, DOC or DOCX/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('offers the link box after a failed upload', async () => {
    mockUpload.mockRejectedValue(new Error('Upload preset must be whitelisted'));
    renderWith(<JobApplyForm job={JOB} />);

    const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/résumé/i), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(/whitelisted/i);
    await userEvent.click(screen.getByRole('button', { name: /send a link instead/i }));

    expect(screen.getByLabelText(/résumé link/i)).toBeInTheDocument();
  });
});

describe('the answers the API can give', () => {
  it('paints the boxes a 422 names rather than showing a toast (§5.3)', async () => {
    careerService.apply.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { email: ['This address is not valid.'] },
      })
    );

    renderWith(<JobApplyForm job={JOB} />);
    await fillIdentity();
    await userEvent.type(screen.getByLabelText(/résumé link/i), 'https://drive.example.com/cv.pdf');
    await submit();

    expect(await screen.findByText('This address is not valid.')).toBeInTheDocument();
    expect(screen.queryByText(/application received/i)).not.toBeInTheDocument();
  });

  it('reads a 404 as the opening having closed', async () => {
    careerService.apply.mockRejectedValue(
      new ApiError({ status: 404, message: 'This opening is closed.' })
    );

    renderWith(<JobApplyForm job={JOB} />);
    await fillIdentity();
    await userEvent.type(screen.getByLabelText(/résumé link/i), 'https://drive.example.com/cv.pdf');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/closed/i);
  });
});

it('renders a notice instead of the boxes for a closed opening', () => {
  renderWith(<JobApplyForm job={JOB} closed />);

  expect(screen.getByText(/no longer accepting applications/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
});
