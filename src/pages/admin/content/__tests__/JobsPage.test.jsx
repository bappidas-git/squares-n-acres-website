/**
 * Admin → Jobs (QA-61): the list opens the opening's own page, offers "View on
 * the site" only for a page that answers, says which openings have closed, and
 * says what to do with one that has applications instead of deleting it.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';

import ApiError from '../../../../services/apiError';
import JobsPage, { hasClosed } from '../JobsPage';
import careerService from '../../../../services/careerService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/careerService', () => ({
  __esModule: true,
  default: {
    adminJobList: jest.fn(),
    adminJobGet: jest.fn(),
    createJob: jest.fn(),
    updateJob: jest.fn(),
    patchJob: jest.fn(),
    removeJob: jest.fn(),
    bulkJobs: jest.fn(),
    checkJobSlug: jest.fn(),
  },
}));

const JOBS = [
  {
    id: 1,
    title: 'Property Analyst',
    slug: 'property-analyst',
    department: 'Research',
    location: 'Bengaluru',
    employmentType: 'full-time',
    isActive: true,
    postedAt: '2026-08-29',
    closesAt: '2020-01-01',
    applicationCount: 2,
  },
  {
    id: 2,
    title: 'Site Engineer',
    slug: 'site-engineer',
    department: 'Projects',
    location: 'Remote',
    employmentType: 'contract',
    isActive: false,
    postedAt: '2026-09-01',
    closesAt: null,
    applicationCount: 0,
  },
];

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const render = (url = '/admin/jobs') =>
  renderWith(
    <>
      <Routes>
        <Route path="/admin/jobs" element={<JobsPage />} />
        <Route path="*" element={null} />
      </Routes>
      <Where />
    </>,
    { initialEntries: [url] }
  );

/** The list's own requests, not the read of every opening for the departments. */
const listCalls = () =>
  careerService.adminJobList.mock.calls.filter(([params]) => params.perPage !== 'all');

beforeEach(() => {
  jest.clearAllMocks();
  careerService.adminJobList.mockResolvedValue(envelope(JOBS));
  careerService.removeJob.mockResolvedValue({ data: null, message: 'Deleted' });
});

const menuFor = async (title) => {
  await userEvent.click(await screen.findByRole('button', { name: `Actions for ${title}` }));
  return screen.findByRole('menu');
};

describe('JobsPage (QA-61)', () => {
  it('opens the add and edit pages at their own addresses', async () => {
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Add opening' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/jobs/add');
  });

  it('edits an opening on its own page', async () => {
    render();

    const menu = await menuFor('Property Analyst');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Edit Property Analyst' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/jobs/edit/1');
  });

  it('offers "View on the site" only for an opening that has a page', async () => {
    render();

    let menu = await menuFor('Property Analyst');
    expect(
      within(menu).getByRole('menuitem', { name: 'View Property Analyst on the site' })
    ).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    menu = await menuFor('Site Engineer');
    expect(within(menu).queryByRole('menuitem', { name: /View Site Engineer/ })).toBeNull();
  });

  it('says which live openings have closed', async () => {
    render();

    expect(await screen.findByText('Closed 01 Jan 2020')).toBeInTheDocument();
  });

  it('says the whole batch is refused when one has applications', async () => {
    render();

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Property Analyst' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Site Engineer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText(
        '2 openings will be deleted. If any of them has received applications, none is deleted and you are told which. This cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('asks for the department a link names, before the departments are known', async () => {
    render('/admin/jobs?department=Research');

    await screen.findByText('Property Analyst');
    // Judged against no departments, it was dropped: every opening was listed
    // under a "Department: Research" chip.
    expect(listCalls()[0][0]).toMatchObject({ department: 'Research' });
    expect(
      await screen.findByRole('button', { name: 'Remove filter Department: Research' })
    ).toBeInTheDocument();
    expect(listCalls()).toHaveLength(1);
  });

  it('drops a department no opening has once the departments are known, and asks again', async () => {
    render('/admin/jobs?department=Bogus');

    await waitFor(() => expect(listCalls()).toHaveLength(2));
    expect(listCalls()[0][0]).toMatchObject({ department: 'Bogus' });
    expect(listCalls()[1][0].department).toBeUndefined();
    expect(screen.queryByRole('button', { name: /Remove filter Department/ })).toBeNull();
  });

  it('names the applications in the way, and says to switch the opening off instead', async () => {
    careerService.removeJob.mockRejectedValue(
      new ApiError({
        status: 409,
        message: 'This item is in use.',
        data: { usedBy: [{ type: 'jobApplication', id: 7, title: 'Vivek Nair' }] },
      })
    );
    render();

    const menu = await menuFor('Property Analyst');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Delete Property Analyst' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    const guard = await screen.findByRole('dialog', { name: 'Still in use' });
    expect(within(guard).getByText('Application')).toBeInTheDocument();
    expect(within(guard).getByRole('link', { name: /Vivek Nair/ })).toHaveAttribute(
      'href',
      '/admin/jobs/applications?q=Vivek%20Nair'
    );
    expect(within(guard).getByText(/switch it off instead/)).toBeInTheDocument();
    await waitFor(() => expect(careerService.removeJob.mock.calls[0][0]).toBe(1));
  });
});

describe('hasClosed', () => {
  it('is true once the closing day is behind', () => {
    expect(hasClosed({ closesAt: '2026-09-01' }, '2026-09-02')).toBe(true);
    expect(hasClosed({ closesAt: '2026-09-02' }, '2026-09-02')).toBe(false);
    expect(hasClosed({ closesAt: null }, '2026-09-02')).toBe(false);
  });
});
