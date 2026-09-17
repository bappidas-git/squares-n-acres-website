import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import JobApplicationsPage from '../JobApplicationsPage';
import careerService from '../../../../services/careerService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/careerService', () => ({
  __esModule: true,
  default: {
    adminApplicationList: jest.fn(),
    adminJobList: jest.fn(),
    patchApplication: jest.fn(),
    removeApplication: jest.fn(),
  },
}));

/**
 * Admin → Jobs → Applications (prompt 31, §6.11).
 *
 * The status chip is the commonest edit on the screen, so it is the one worth
 * asserting end to end: it shows the new status before the API has answered
 * and puts the old one back when the API disagrees (§8.2). The résumé link is
 * the other: it points at a file on somebody else's origin and must never hand
 * that origin a reference to the admin window.
 */

const ROWS = [
  {
    id: 3,
    jobId: 2,
    name: 'Vivek Nair',
    email: 'vivek.nair@example.com',
    phone: '9740100123',
    resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/vivek.pdf',
    linkedinUrl: null,
    coverLetter: 'Two years in valuation at a consultancy.',
    status: 'new',
    notes: null,
    createdAt: '2026-09-10T11:15:00.000Z',
    job: { id: 2, title: 'Property Analyst', slug: 'property-analyst' },
  },
];

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

const render = () => renderWith(<JobApplicationsPage />);

beforeEach(() => {
  jest.clearAllMocks();
  careerService.adminApplicationList.mockResolvedValue(envelope(ROWS));
  careerService.adminJobList.mockResolvedValue(envelope([]));
  careerService.patchApplication.mockResolvedValue({ data: { ...ROWS[0], status: 'shortlisted' } });
  careerService.removeApplication.mockResolvedValue({ data: null, message: 'Deleted' });
});

const openStatusMenu = async () => {
  const chip = await screen.findByRole('button', { name: /status of vivek nair/i });
  await userEvent.click(chip);
  return screen.findByRole('menu');
};

it('lists what the API answered with, and asks for nothing it was not given', async () => {
  render();

  expect(await screen.findByText('Vivek Nair')).toBeInTheDocument();
  expect(screen.getByText(/vivek\.nair@example\.com/)).toBeInTheDocument();
  expect(screen.getByText('Property Analyst')).toBeInTheDocument();

  const call = careerService.adminApplicationList.mock.calls[0][0];
  expect(call).toMatchObject({ page: 1, sort: 'createdAt', order: 'desc' });
});

it('opens the résumé in a new tab without handing over the window', async () => {
  render();

  const link = await screen.findByRole('link', { name: /open the résumé of vivek nair/i });
  expect(link).toHaveAttribute('href', ROWS[0].resumeUrl);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

it('changes a status from the chip, showing it before the API answers', async () => {
  let resolve;
  careerService.patchApplication.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );

  render();
  const menu = await openStatusMenu();
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Shortlisted' }));

  expect(careerService.patchApplication).toHaveBeenCalledWith(3, { status: 'shortlisted' });
  // The chip already reads the new status while the PATCH is in flight.
  expect(
    await screen.findByRole('button', { name: /status of vivek nair: shortlisted/i })
  ).toBeInTheDocument();

  resolve({ data: { ...ROWS[0], status: 'shortlisted' } });
  expect(await screen.findByText(/is now Shortlisted/i)).toBeInTheDocument();
});

it('puts the old status back when the API refuses the change', async () => {
  careerService.patchApplication.mockRejectedValue(
    new ApiError({ status: 422, message: 'That status is not allowed.' })
  );

  render();
  const menu = await openStatusMenu();
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Hired' }));

  expect(await screen.findByText('That status is not allowed.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /status of vivek nair: new/i })).toBeInTheDocument();
});

it('opens the panel from a row and saves a note as its own PATCH', async () => {
  render();

  await userEvent.click(await screen.findByRole('button', { name: /actions for vivek nair/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: /^open$/i }));

  const panel = await screen.findByRole('presentation');
  expect(within(panel).getByText(/two years in valuation/i)).toBeInTheDocument();

  await userEvent.type(
    within(panel).getByRole('textbox', { name: 'Notes' }),
    'Second round on Tuesday.'
  );
  await userEvent.click(within(panel).getByRole('button', { name: /save notes/i }));

  await waitFor(() =>
    expect(careerService.patchApplication).toHaveBeenCalledWith(3, {
      notes: 'Second round on Tuesday.',
    })
  );
  // A note never moves somebody through the hiring statuses by accident.
  expect(careerService.patchApplication.mock.calls[0][1]).not.toHaveProperty('status');
});

it('asks before deleting, and names who is being deleted', async () => {
  render();

  await userEvent.click(await screen.findByRole('button', { name: /actions for vivek nair/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: /delete/i }));

  expect(await screen.findByText(/delete this application\?/i)).toBeInTheDocument();
  expect(screen.getByText(/the application from “Vivek Nair”/i)).toBeInTheDocument();
  expect(careerService.removeApplication).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
  await waitFor(() => expect(careerService.removeApplication).toHaveBeenCalledWith(3));
});
