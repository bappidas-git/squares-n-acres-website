/**
 * Admin → Leads: the CRM list (prompt 29, QA-53).
 *
 * The services are spies, so what the screen asks the API for is the
 * assertion. The poller is a stand-in whose answers each test sets: the "N new"
 * chip, "Mark all seen" and the refresh a write asks of it are what the audit
 * found wrong — a button that did nothing visible, a count that went stale for
 * thirty seconds after every change, a bulk "Lost" that asked no question.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LeadsListPage from '../LeadsListPage';
import leadService from '../../../../services/leadService';
import renderWith from '../../../../test-utils';
import userService from '../../../../services/userService';

jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: {
    adminList: jest.fn(),
    patch: jest.fn(),
    bulk: jest.fn(),
    claim: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { adminGet: jest.fn(), adminList: jest.fn() },
}));

jest.mock('../../../../services/userService', () => ({
  __esModule: true,
  default: { list: jest.fn() },
}));

const mockNotifications = {
  newLeadCount: 1,
  refreshKey: 0,
  hasUnseen: false,
  markSeen: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('../../../../contexts/LeadNotificationsContext', () => ({
  useLeadNotifications: () => mockNotifications,
}));

let mockRole = 'admin';

jest.mock('../../../../contexts/AdminAuthContext', () => {
  const { can } = jest.requireActual('../../../../config/rbac');
  return {
    useAdminAuth: () => ({
      user: { id: 1, name: 'Admin User', role: mockRole },
      can: (area, action) => can(mockRole, area, action),
    }),
  };
});

const ROWS = [
  {
    id: 1,
    name: 'Ananya Rao',
    phone: '9876500100',
    email: 'ananya.rao@example.com',
    source: 'property-enquiry',
    status: 'new',
    priority: 'high',
    assignedTo: null,
    assignedUser: null,
    followUpAt: null,
    createdAt: '2026-09-14T09:00:00.000Z',
    property: { id: 1, title: 'Lakeview Heights', slug: 'lakeview-heights' },
    isPossibleDuplicate: false,
  },
  {
    id: 2,
    name: 'Vikram Shetty',
    phone: '+919876500101',
    email: 'vikram.shetty@example.com',
    source: 'site-visit-request',
    status: 'contacted',
    priority: 'medium',
    assignedTo: 3,
    assignedUser: { id: 3, name: 'Sales User' },
    followUpAt: '2026-09-20T10:30:00.000Z',
    createdAt: '2026-09-13T09:00:00.000Z',
    property: null,
    isPossibleDuplicate: false,
  },
];

const envelope = (data = ROWS) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

/** jsdom has no layout, so the breakpoint hook is told which side it is on. */
const setViewport = (width) => {
  window.matchMedia = (query) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    return {
      matches: (max ? width <= Number(max[1]) : true) && (min ? width >= Number(min[1]) : true),
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
};

// MUI reads an anchor's box when a menu opens; jsdom's is 0×0.
const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

const render = (url = '/admin/leads') => renderWith(<LeadsListPage />, { initialEntries: [url] });

beforeEach(() => {
  jest.clearAllMocks();
  setViewport(1440);
  mockRole = 'admin';
  Object.assign(mockNotifications, { newLeadCount: 1, hasUnseen: false });
  leadService.adminList.mockResolvedValue(envelope());
  leadService.patch.mockResolvedValue({ data: ROWS[0] });
  leadService.bulk.mockResolvedValue({ data: { affected: 2 }, message: '2 leads updated.' });
  userService.list.mockResolvedValue({
    data: [
      { id: 2, name: 'Manager User', role: 'manager' },
      { id: 3, name: 'Sales User', role: 'sales' },
    ],
  });
});

describe('LeadsListPage', () => {
  it('offers "Mark all seen" only while something is unseen', async () => {
    const { unmount } = render();
    await screen.findByText('Ananya Rao');
    expect(screen.queryByRole('button', { name: 'Mark all seen' })).not.toBeInTheDocument();
    unmount();

    mockNotifications.hasUnseen = true;
    render();
    await screen.findByText('Ananya Rao');
    await userEvent.click(screen.getByRole('button', { name: 'Mark all seen' }));
    expect(mockNotifications.markSeen).toHaveBeenCalled();
  });

  it('turns the "N new" chip into the view of the new leads', async () => {
    render();
    await screen.findByText('Ananya Rao');

    const chip = screen.getByRole('button', { name: '1 new' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);

    await waitFor(() =>
      expect(leadService.adminList).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: ['new'] }),
        expect.anything()
      )
    );
    expect(screen.getByRole('button', { name: '1 new' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('names each row’s checkbox after the lead', async () => {
    render();
    await screen.findByText('Ananya Rao');

    expect(screen.getByRole('checkbox', { name: 'Select Ananya Rao' })).toBeInTheDocument();
  });

  it('changes a status from the chip, re-reads the page and asks the poller', async () => {
    render();
    await screen.findByText('Ananya Rao');
    const calls = leadService.adminList.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /Status of Ananya Rao/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Contacted' }));

    await waitFor(() => expect(leadService.patch).toHaveBeenCalledWith(1, { status: 'contacted' }));
    await waitFor(() => expect(mockNotifications.refresh).toHaveBeenCalled());
    expect(leadService.adminList.mock.calls.length).toBeGreaterThan(calls);
  });

  it('offers WhatsApp and a priority for one lead in its menu', async () => {
    render();
    await screen.findByText('Ananya Rao');

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Ananya Rao' }));
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent);
    expect(items).toEqual([
      'View',
      'Call',
      'WhatsApp',
      'Change status',
      'Set priority',
      'Assign',
      'Delete',
    ]);
    expect(screen.getByRole('menuitem', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:+919876500100'
    );
  });

  it('asks why before a batch is marked as lost, and sends the reason with it', async () => {
    render();
    await screen.findByText('Ananya Rao');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Ananya Rao' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Vikram Shetty' }));
    const bar = screen.getByRole('region', { name: /bulk/i });
    await userEvent.click(within(bar).getByRole('button', { name: 'Change status' }));

    let dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'lost');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change status' }));

    dialog = await screen.findByRole('dialog', { name: 'Mark the selected leads as lost?' });
    expect(leadService.bulk).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Duplicate enquiries');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as lost' }));

    await waitFor(() =>
      expect(leadService.bulk).toHaveBeenCalledWith({
        ids: [1, 2],
        action: 'status',
        payload: { status: 'lost', lostReason: 'Duplicate enquiries' },
      })
    );
  });

  it('says a range that ends before it starts is the reason nothing matches', async () => {
    leadService.adminList.mockResolvedValue(envelope([]));
    render('/admin/leads?from=2026-09-10&to=2026-09-01');

    expect(await screen.findByText('The Created range ends before it starts.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Swap the dates' }));

    await waitFor(() =>
      expect(leadService.adminList).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-09-01', to: '2026-09-10' }),
        expect.anything()
      )
    );
  });

  it('gives a sales user no bulk bar, no delete and no assign', async () => {
    mockRole = 'sales';
    render();
    await screen.findByText('Ananya Rao');

    expect(screen.queryByRole('checkbox', { name: 'Select Ananya Rao' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Ananya Rao' }));
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent);
    expect(items).not.toContain('Delete');
    expect(items).not.toContain('Assign');
    expect(userService.list).not.toHaveBeenCalled();
  });
});
