import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';

import NotFoundTab, { createRedirectLink } from '../NotFoundTab';
import RedirectsPage from '../RedirectsPage';
import redirectService from '../../../../services/redirectService';
import renderWith from '../../../../test-utils';
import seoService from '../../../../services/seoService';

jest.mock('../../../../services/seoService', () => ({
  __esModule: true,
  default: { notFoundList: jest.fn(), dismissNotFound: jest.fn() },
}));
jest.mock('../../../../services/redirectService', () => ({
  __esModule: true,
  default: { adminList: jest.fn(), create: jest.fn(), update: jest.fn() },
}));
jest.mock('../../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: () => ({ can: () => true }),
}));

const LINES = [
  {
    id: 7,
    path: '/flats-in-hebal',
    count: 12,
    days: 3,
    firstSeenAt: '2026-09-20T05:00:00.000Z',
    lastSeenAt: '2026-09-25T05:00:00.000Z',
    referrer: 'https://www.google.com/',
    redirectedTo: null,
  },
  {
    id: 9,
    path: '/old-offers',
    count: 2,
    days: 1,
    firstSeenAt: '2026-09-24T05:00:00.000Z',
    lastSeenAt: '2026-09-24T05:00:00.000Z',
    referrer: null,
    redirectedTo: '/offers',
  },
];

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

beforeEach(() => {
  seoService.notFoundList.mockResolvedValue(envelope(LINES));
  seoService.dismissNotFound.mockResolvedValue({ data: null, message: 'Dismissed' });
  redirectService.adminList.mockResolvedValue(envelope([]));
});

describe('SEO → 404s (prompt 51)', () => {
  it('lists the addresses reached most, with where a redirect now sends one', async () => {
    renderWith(<NotFoundTab canEdit />);

    expect(await screen.findByText('/flats-in-hebal')).toBeInTheDocument();
    expect(screen.getByText('Redirected to /offers')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create a redirect for /flats-in-hebal' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create a redirect for /old-offers' })
    ).not.toBeInTheDocument();
  });

  it('opens the redirects form on the address', async () => {
    renderWith(
      <>
        <NotFoundTab canEdit />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </>,
      { initialEntries: ['/admin/seo?tab=notFound'] }
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Create a redirect for /flats-in-hebal' })
    );

    expect(screen.getByTestId('where')).toHaveTextContent(
      '/admin/seo/redirects?create=%2Fflats-in-hebal'
    );
    expect(createRedirectLink('/a b')).toBe('/admin/seo/redirects?create=%2Fa%20b');
  });

  it('dismisses a line and reads the list again', async () => {
    renderWith(<NotFoundTab canEdit />);

    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss /old-offers' }));

    await waitFor(() => expect(seoService.dismissNotFound).toHaveBeenCalledWith(9));
    expect(
      await screen.findByText('/old-offers is off the list until a visitor reaches it again.')
    ).toBeInTheDocument();
    expect(seoService.notFoundList).toHaveBeenCalledTimes(2);
  });

  it('offers nothing to change to somebody who may only look', async () => {
    renderWith(<NotFoundTab canEdit={false} />);

    await screen.findByText('/flats-in-hebal');
    expect(screen.queryByRole('button', { name: /Dismiss/ })).not.toBeInTheDocument();
  });

  it('the redirects screen opens its form on the address it was sent', async () => {
    renderWith(<RedirectsPage />, {
      initialEntries: ['/admin/seo/redirects?create=%2Fflats-in-hebal'],
    });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('/flats-in-hebal')).toBeInTheDocument();
  });
});
