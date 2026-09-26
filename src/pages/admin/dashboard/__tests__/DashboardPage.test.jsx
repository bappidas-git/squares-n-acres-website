/**
 * Admin → Dashboard (prompt 29).
 *
 * The screen draws one response and computes nothing (NEW-24), so the
 * assertions are about what a role is shown: the figures the API sent, the
 * one comparison that is arithmetic rather than decoration (BUG-11), and the
 * cards §7 does or does not give a sales user.
 *
 * The four charts are mocked. They are `React.lazy` chunks around `recharts`,
 * which needs a laid-out box jsdom does not have; what matters here is the
 * data the page hands them, which each chart also publishes as a table.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DashboardPage from '../DashboardPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import dashboardService from '../../../../services/dashboardService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/dashboardService');

const chartStub = (name, key) => ({
  __esModule: true,
  default: ({ data = [] }) => (
    <div data-testid={name}>{`${name}:${data.map((entry) => entry[key]).join(',')}`}</div>
  ),
});

jest.mock('../charts/LeadsByDayChart', () => chartStub('leads-by-day', 'count'));
jest.mock('../charts/LeadsBySourceChart', () => chartStub('leads-by-source', 'source'));
jest.mock('../charts/LeadsByStatusChart', () => chartStub('leads-by-status', 'count'));
jest.mock('../charts/ViewsByDayChart', () => chartStub('views-by-day', 'count'));

const FIXTURE = {
  stats: {
    propertiesTotal: 24,
    propertiesActive: 20,
    propertiesFeatured: 6,
    propertiesInactive: 4,
    leadsTotal: 48,
    leadsNew: 7,
    leadsToday: 3,
    leadsThisMonth: 12,
    leadsLastMonth: 8,
    conversionRate: 12.5,
    articlesPublished: 9,
    articlesDraft: 2,
    viewsThisMonth: 430,
    enquiriesThisMonth: 5,
    subscribers: 61,
  },
  trends: {
    leadsByDay: [
      { date: '2026-09-14', count: 2 },
      { date: '2026-09-15', count: 5 },
    ],
    leadsBySource: [
      { source: 'property-enquiry', count: 20 },
      { source: 'brochure-download', count: 6 },
    ],
    leadsByStatus: [
      { status: 'new', count: 7 },
      { status: 'converted', count: 6 },
    ],
    viewsByDay: [{ date: '2026-09-15', count: 40 }],
  },
  recentLeads: [
    {
      id: 1,
      name: 'Ananya Rao',
      phone: '+919876543210',
      source: 'property-enquiry',
      status: 'new',
      propertyId: 1,
      property: { id: 1, title: 'Lakeview Heights', slug: 'lakeview-heights' },
      createdAt: '2026-09-15T06:00:00.000Z',
      assignedTo: null,
    },
  ],
  topProperties: [
    { id: 1, title: 'Lakeview Heights', slug: 'lakeview-heights', viewCount: 120, enquiryCount: 4 },
  ],
  seoHealth: {
    averageScore: 72.4,
    good: 5,
    ok: 9,
    poor: 3,
    missingFocusKeyword: 2,
    missingMetaDescription: 4,
  },
  upcomingFollowUps: [
    {
      id: 2,
      name: 'Rahul Menon',
      followUpAt: '2099-09-20T05:30:00.000Z',
      status: 'contacted',
      assignedTo: 3,
      assignedUser: 'Sales User',
    },
  ],
};

const userOf = (role) => ({
  id: role === 'sales' ? 3 : 1,
  name: `${role} user`,
  email: `${role}@squaresnacres.com`,
  role,
  phone: '9880000012',
  avatarUrl: null,
});

const renderAs = (role) => {
  const user = userOf(role);
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, user);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: user });

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <DashboardPage />
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: ['/admin/dashboard'] }
  );
};

/** The `StatCard` whose label is `label`, as one element to read. */
const tile = (label) => screen.getByRole('group', { name: label });

/**
 * Waits for the aggregate to land.
 *
 * The heading is on the screen while it is still loading, so it is not the
 * thing to wait for; the first tile is.
 */
const loaded = () => screen.findByText('Conversion rate');

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  dashboardService.get.mockResolvedValue({ data: FIXTURE });
});

describe('DashboardPage', () => {
  it('draws the stat tiles from the response', async () => {
    renderAs('admin');

    await loaded();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();

    expect(tile('Properties')).toHaveTextContent('24');
    expect(tile('Properties')).toHaveTextContent('20 live · 6 featured · 4 inactive');
    expect(tile('Leads')).toHaveTextContent('48');
    expect(tile('New leads')).toHaveTextContent('7');
    expect(tile('Leads today')).toHaveTextContent('3');
    expect(tile('Conversion rate')).toHaveTextContent('12.5%');
    expect(tile('Views this month')).toHaveTextContent('430');
    expect(tile('Enquiries this month')).toHaveTextContent('5');
    expect(tile('Articles published')).toHaveTextContent('9');
    expect(tile('Subscribers')).toHaveTextContent('61');
  });

  it('computes the month-on-month delta instead of printing one (BUG-11)', async () => {
    renderAs('admin');
    await loaded();

    // 12 against 8 is +50 %, and the figure it is measured against is on the tile.
    expect(tile('Leads this month')).toHaveTextContent('50% vs last month');
    expect(tile('Leads this month')).toHaveTextContent('8 last month');
  });

  it('shows no delta when last month was empty', async () => {
    dashboardService.get.mockResolvedValue({
      data: { ...FIXTURE, stats: { ...FIXTURE.stats, leadsLastMonth: 0 } },
    });
    renderAs('admin');
    await loaded();

    expect(tile('Leads this month')).not.toHaveTextContent('vs last month');
  });

  it('hands each chart the series the API sent', async () => {
    renderAs('admin');

    expect(await screen.findByTestId('leads-by-day')).toHaveTextContent('leads-by-day:2,5');
    expect(screen.getByTestId('leads-by-source')).toHaveTextContent(
      'property-enquiry,brochure-download'
    );
    expect(screen.getByTestId('leads-by-status')).toHaveTextContent('7,6');
    expect(screen.getByTestId('views-by-day')).toHaveTextContent('40');
  });

  it('renders the recent leads, the top listings, the SEO health and the follow-ups', async () => {
    renderAs('admin');
    await loaded();

    const leads = screen.getByRole('region', { name: 'Latest leads' });
    expect(within(leads).getByRole('link', { name: 'Ananya Rao' })).toHaveAttribute(
      'href',
      '/admin/leads/1'
    );

    const listings = screen.getByRole('region', { name: 'Top listings' });
    expect(within(listings).getByText(/120 views/)).toBeInTheDocument();
    // The enquiry count opens the leads that name the listing (prompt 51).
    expect(within(listings).getByRole('link', { name: '4 enquiries' })).toHaveAttribute(
      'href',
      expect.stringContaining('/admin/leads?propertyId=')
    );

    const seo = screen.getByRole('region', { name: 'SEO health' });
    expect(within(seo).getByText('72.4')).toBeInTheDocument();
    expect(within(seo).getByLabelText('Average SEO score 72.4 out of 100')).toBeInTheDocument();
    expect(within(seo).getByRole('link', { name: 'Open SEO' })).toHaveAttribute(
      'href',
      '/admin/seo'
    );

    const followUps = screen.getByRole('region', { name: 'Follow-ups due' });
    expect(within(followUps).getByRole('link', { name: 'Rahul Menon' })).toBeInTheDocument();
    // Nothing is late: "View all" opens the week ahead.
    expect(within(followUps).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/admin/leads?followUp=next7'
    );
  });

  it('puts the overdue follow-ups first, counts them, and opens them all (prompt 51)', async () => {
    dashboardService.get.mockResolvedValue({
      data: {
        ...FIXTURE,
        overdueCount: 11,
        upcomingFollowUps: [
          {
            id: 4,
            name: 'Kavya Iyer',
            followUpAt: '2026-09-01T05:30:00.000Z',
            status: 'contacted',
            isOverdue: true,
            assignedTo: 3,
            assignedUser: 'Sales User',
          },
          ...FIXTURE.upcomingFollowUps,
        ],
      },
    });
    renderAs('admin');
    await loaded();

    const followUps = screen.getByRole('region', { name: 'Follow-ups due' });
    expect(within(followUps).getByText('11 overdue')).toBeInTheDocument();
    const [first] = within(followUps).getAllByRole('listitem');
    expect(within(first).getByText('Kavya Iyer')).toBeInTheDocument();
    expect(within(first).getByText('Overdue')).toBeInTheDocument();
    expect(within(followUps).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/admin/leads?followUp=overdue'
    );
  });

  it('reads the trends over the range chosen, kept in the address (prompt 51)', async () => {
    renderAs('admin');
    await loaded();
    expect(dashboardService.get).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: { range: 30 } })
    );
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: '90 days' }));
    await waitFor(() =>
      expect(dashboardService.get).toHaveBeenLastCalledWith(
        expect.objectContaining({ params: { range: 90 } })
      )
    );
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers an admin every quick link', async () => {
    renderAs('admin');
    await loaded();

    const links = screen.getByRole('region', { name: 'Quick links' });
    ['Add property', 'Write article', 'SEO issues', 'Media library'].forEach((label) => {
      expect(within(links).getByRole('link', { name: label })).toBeInTheDocument();
    });
  });

  it('gives a sales user their own lead figures and none of the content ones (§7)', async () => {
    renderAs('sales');
    await loaded();

    // The server scopes the numbers (D15); the screen says whose they are.
    expect(tile('Leads')).toHaveTextContent('Your leads');
    expect(tile('New leads')).toHaveTextContent('Your leads');
    expect(tile('Properties')).toHaveTextContent('24');

    expect(screen.queryByText('Articles published')).not.toBeInTheDocument();
    expect(screen.queryByText('Subscribers')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'SEO health' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Quick links' })).not.toBeInTheDocument();
  });

  it('offers a retry when the aggregate cannot be read', async () => {
    dashboardService.get.mockRejectedValue(
      Object.assign(new Error('Service unavailable'), { status: 500 })
    );
    renderAs('admin');

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await screen.findByText('Service unavailable')).toBeInTheDocument();
  });
});
