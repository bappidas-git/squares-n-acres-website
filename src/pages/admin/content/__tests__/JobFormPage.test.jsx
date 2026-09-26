/**
 * Admin → Jobs → add / edit (QA-61).
 *
 * The opening used to be edited in place of the list, on the list's own
 * address: Back left the Jobs screen, a reload dropped the form, and a live
 * opening's URL moved in silence. It has a page of its own now, saved the way
 * the developer and locality forms save (`useRecordPage`); what is asserted
 * here is the opening's own part and that it is wired to it.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom';

import ApiError from '../../../../services/apiError';
import JobFormPage, { jobRules, toJobPayload } from '../JobFormPage';
import careerService from '../../../../services/careerService';
import redirectService from '../../../../services/redirectService';
import renderWith from '../../../../test-utils';
import { istToday } from '../../../../utils/format';

jest.mock('../../../../services/redirectService');
jest.mock('../../../../services/careerService', () => ({
  __esModule: true,
  default: {
    adminJobGet: jest.fn(),
    adminJobList: jest.fn(),
    createJob: jest.fn(),
    updateJob: jest.fn(),
    checkJobSlug: jest.fn(),
  },
}));
jest.mock('../../../../contexts/NavigationGuardContext', () => ({
  __esModule: true,
  useNavigationGuard: () => ({ register: () => () => {}, isBlocking: false }),
  NavigationGuardProvider: ({ children }) => children,
}));
jest.mock('../../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: () => ({ can: () => true }),
}));
jest.mock('../../../../components/editor/RichTextField', () => ({
  __esModule: true,
  default: function MockRichTextField({ label, value, error, onChange }) {
    return (
      <>
        <label>
          {label}
          <textarea value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
        {error ? <span role="alert">{error}</span> : null}
      </>
    );
  },
}));

const RECORD = {
  id: 3,
  title: 'Property Analyst',
  slug: 'property-analyst',
  department: 'Research',
  location: 'Bengaluru, Karnataka',
  employmentType: 'full-time',
  experience: '1–3 years',
  description: '<p>Research the market.</p>',
  responsibilities: ['Track prices'],
  requirements: ['Excel'],
  salaryRange: null,
  isActive: true,
  postedAt: '2026-08-29',
  closesAt: null,
  applicationCount: 1,
};

/** Where the router is, and how it got there. */
function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${useNavigationType()} ${location.pathname}`}</p>;
}

const renderForm = ({ add = false } = {}) =>
  renderWith(
    <>
      <Routes>
        <Route path="/admin/jobs/add" element={<JobFormPage />} />
        <Route path="/admin/jobs/edit/:id" element={<JobFormPage />} />
      </Routes>
      <Where />
    </>,
    { initialEntries: [add ? '/admin/jobs/add' : `/admin/jobs/edit/${RECORD.id}`] }
  );

const loaded = () => screen.findByDisplayValue(RECORD.title);
const saveButton = () => screen.getAllByRole('button', { name: 'Save' })[0];

beforeEach(() => {
  jest.clearAllMocks();
  // A dirty form keeps a copy of itself on the way out (prompt 51).
  window.localStorage.clear();
  careerService.adminJobGet.mockResolvedValue({ data: RECORD });
  careerService.adminJobList.mockResolvedValue({
    data: [RECORD, { ...RECORD, id: 4, department: 'Sales' }],
    meta: { page: 1, perPage: 2, total: 2, totalPages: 1 },
  });
  careerService.checkJobSlug.mockResolvedValue({ data: { available: true } });
  careerService.createJob.mockImplementation((body) =>
    Promise.resolve({ data: { ...body, id: 9, slug: body.slug || 'site-engineer' } })
  );
  careerService.updateJob.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...RECORD, ...body, id: Number(id) } })
  );
  redirectService.deactivateByFromPath.mockResolvedValue(null);
  redirectService.upsertByFromPath.mockResolvedValue({ data: {} });
});

describe('JobFormPage (QA-61)', () => {
  it('opens a new opening at its own address, posted today in Bengaluru', async () => {
    renderForm({ add: true });

    expect(
      await screen.findByRole('heading', { name: 'New opening', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Posted on')).toHaveValue(istToday());
    expect(careerService.adminJobGet).not.toHaveBeenCalled();
  });

  it('names the fields by their labels when an empty form is saved', async () => {
    renderForm({ add: true });
    await screen.findByRole('heading', { name: 'New opening', level: 1 });

    await userEvent.click(saveButton());

    expect(await screen.findByText('The role title field is required.')).toBeInTheDocument();
    expect(screen.getByText('The role description field is required.')).toBeInTheDocument();
    expect(careerService.createJob).not.toHaveBeenCalled();
  });

  it('moves a created opening to its edit address, replacing the add one', async () => {
    renderForm({ add: true });
    await screen.findByRole('heading', { name: 'New opening', level: 1 });

    fireEvent.change(screen.getByLabelText(/^Role title/), {
      target: { value: '  Site Engineer ' },
    });
    fireEvent.change(screen.getByLabelText(/^Department/), { target: { value: 'Projects' } });
    fireEvent.change(screen.getByLabelText(/^Location/), { target: { value: 'Remote' } });
    fireEvent.change(screen.getByLabelText('About the role'), {
      target: { value: '<p>Oversee handovers.</p>' },
    });
    await userEvent.click(saveButton());

    await waitFor(() => expect(careerService.createJob).toHaveBeenCalledTimes(1));
    expect(careerService.createJob.mock.calls[0][0]).toMatchObject({
      title: 'Site Engineer',
      department: 'Projects',
      postedAt: istToday(),
      closesAt: null,
    });
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('REPLACE /admin/jobs/edit/9')
    );
  });

  it('offers the departments the other openings use', async () => {
    renderForm({ add: true });
    await screen.findByRole('heading', { name: 'New opening', level: 1 });

    await waitFor(() =>
      // eslint-disable-next-line testing-library/no-node-access -- a datalist has no role
      expect([...document.querySelectorAll('datalist option')].map((o) => o.value)).toEqual([
        'Research',
        'Sales',
      ])
    );
  });

  it('writes nothing when nothing has changed, and saves in place otherwise', async () => {
    renderForm();
    await loaded();

    await userEvent.click(saveButton());
    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(careerService.updateJob).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Location/), { target: { value: 'Remote' } });
    await userEvent.click(saveButton());
    expect(await screen.findByText('Opening saved')).toBeInTheDocument();
    expect(careerService.updateJob).toHaveBeenCalledWith(
      '3',
      expect.objectContaining({ location: 'Remote' })
    );
    expect(careerService.adminJobGet).toHaveBeenCalledTimes(1);
  });

  it('redirects a live opening’s old address when its URL changes', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByDisplayValue('property-analyst'), {
      target: { value: 'property-analyst-bengaluru' },
    });
    expect(await screen.findByText(/This page is live at/)).toBeInTheDocument();
    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(redirectService.upsertByFromPath).toHaveBeenCalledWith(
        expect.objectContaining({
          fromPath: '/careers/property-analyst',
          toPath: '/careers/property-analyst-bengaluru',
          statusCode: 301,
        })
      )
    );
  });

  it('says so when the opening was deleted elsewhere, and guards nothing', async () => {
    careerService.updateJob.mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }));
    renderForm();
    await loaded();

    fireEvent.change(screen.getByLabelText(/^Location/), { target: { value: 'Remote' } });
    await userEvent.click(saveButton());

    expect(await screen.findByText('This opening no longer exists')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute(
      'href',
      '/admin/jobs'
    );
  });

  it('answers an unknown opening with a way back', async () => {
    careerService.adminJobGet.mockRejectedValue(
      new ApiError({ status: 404, message: 'Not found' })
    );
    renderForm();

    expect(await screen.findByText('We could not load this opening')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to jobs' })).toBeInTheDocument();
  });
});

describe('the opening’s rules and body', () => {
  it('refuses a closing date before the posting date, and a description with no text', () => {
    expect(
      jobRules({ postedAt: '2026-09-10', closesAt: '2026-09-01', description: '<p>x</p>' })
    ).toEqual({ closesAt: 'An opening cannot close before it was posted.' });
    expect(jobRules({ description: '<p> </p><ul><li></li></ul>' }).description).toMatch(
      /no text in it/
    );
    expect(jobRules({ description: '' })).toEqual({});
  });

  it('trims the text, drops the empty rows and sends an emptied box as null', () => {
    expect(
      toJobPayload({
        title: ' Site Engineer ',
        slug: '',
        department: ' Projects',
        location: 'Remote ',
        employmentType: 'contract',
        experience: '  ',
        description: '<p>x</p>',
        responsibilities: [' Walk the units ', '', '  '],
        requirements: [],
        salaryRange: '',
        isActive: true,
        postedAt: '',
        closesAt: '2026-10-01',
      })
    ).toEqual({
      title: 'Site Engineer',
      slug: '',
      department: 'Projects',
      location: 'Remote',
      employmentType: 'contract',
      experience: null,
      description: '<p>x</p>',
      responsibilities: ['Walk the units'],
      requirements: [],
      salaryRange: null,
      isActive: true,
      postedAt: null,
      closesAt: '2026-10-01',
    });
  });
});

describe('JobFormPage — two editors, one opening (prompt 51)', () => {
  it('names the version it read, and a save over somebody else’s opens the dialog', async () => {
    const STORED = { ...RECORD, updatedAt: '2026-09-10T06:00:00.000Z' };
    careerService.adminJobGet.mockResolvedValue({ data: STORED });
    careerService.updateJob.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        message: 'Manager User saved this job opening after you opened it.',
        data: {
          conflict: 'stale',
          current: {
            updatedAt: '2026-09-11T06:00:00.000Z',
            updatedBy: { id: 2, name: 'Manager User' },
            updatedByName: 'Manager User',
          },
        },
      })
    );
    renderForm();
    await loaded();
    fireEvent.change(screen.getByDisplayValue(RECORD.title), {
      target: { value: 'Senior Property Analyst' },
    });

    await userEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', {
      name: 'Somebody else saved this job opening',
    });
    expect(within(dialog).getByText(/Manager User saved it/)).toBeInTheDocument();
    expect(careerService.updateJob).toHaveBeenCalledWith(
      String(RECORD.id),
      expect.objectContaining({ updatedAt: STORED.updatedAt })
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Somebody else saved this job opening' })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByDisplayValue('Senior Property Analyst')).toBeInTheDocument();
    expect(careerService.updateJob).toHaveBeenCalledTimes(1);
  });
});
