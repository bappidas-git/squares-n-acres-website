/**
 * Admin → Newsletter (QA-61): a value in the URL no control can show filters
 * nothing, emptying the last page steps back a page, the removal says
 * "removed", and a subscriber removed elsewhere is treated as removed.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import NewsletterSubscribersPage, {
  exportParamsOf,
  sanitiseSubscriberParams,
} from '../NewsletterSubscribersPage';
import newsletterService from '../../../../services/newsletterService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/newsletterService', () => ({
  __esModule: true,
  default: { adminList: jest.fn(), remove: jest.fn() },
}));

const ROW = {
  id: 12,
  email: 'tanvi@example.com',
  name: 'Tanvi',
  source: 'newsletter',
  status: 'subscribed',
  createdAt: '2026-09-11T10:20:00.000Z',
};

const envelope = (data, meta = {}) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1, ...meta },
});

const render = (url = '/admin/newsletter') =>
  renderWith(<NewsletterSubscribersPage />, { initialEntries: [url] });

const removeRow = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
  const dialog = await screen.findByRole('dialog', { name: 'Remove this subscriber?' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  newsletterService.adminList.mockResolvedValue(envelope([ROW]));
  newsletterService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
});

describe('NewsletterSubscribersPage (QA-61)', () => {
  it('asks for no status the list cannot show, and exports what is on screen', async () => {
    render('/admin/newsletter?status=bogus&sort=nope&q=tan');

    await screen.findByText('tanvi@example.com');
    const call = newsletterService.adminList.mock.calls[0][0];
    expect(call.status).toBeUndefined();
    expect(call).toMatchObject({ sort: 'createdAt', order: 'desc', q: 'tan' });
    expect(screen.queryByText(/bogus/)).toBeNull();

    expect(
      exportParamsOf(sanitiseSubscriberParams({ status: 'bogus', q: 'tan', page: 2 }))
    ).toEqual({ q: 'tan' });
  });

  it('says "removed", and steps back a page when it removes the last row of one', async () => {
    newsletterService.adminList.mockResolvedValue(
      envelope([ROW], { page: 2, perPage: 10, total: 11, totalPages: 2 })
    );
    render('/admin/newsletter?perPage=10&page=2');

    await removeRow();

    expect(await screen.findByText('“tanvi@example.com” removed')).toBeInTheDocument();
    await waitFor(() =>
      expect(newsletterService.adminList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything()
      )
    );
  });

  it('treats a subscriber removed elsewhere as removed, and reads the list again', async () => {
    newsletterService.remove.mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }));
    render();

    await removeRow();

    expect(
      await screen.findByText('“tanvi@example.com” had already been removed.')
    ).toBeInTheDocument();
    await waitFor(() => expect(newsletterService.adminList).toHaveBeenCalledTimes(2));
  });

  it('offers the first page from a page past the end', async () => {
    newsletterService.adminList.mockResolvedValue(
      envelope([], { page: 4, total: 12, totalPages: 1 })
    );
    render('/admin/newsletter?page=4');

    expect(await screen.findByRole('button', { name: 'Go to first page' })).toBeInTheDocument();
  });
});
