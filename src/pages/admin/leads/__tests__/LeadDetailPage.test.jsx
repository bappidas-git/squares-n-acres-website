/**
 * Admin → Leads → one lead (prompt 29, QA-53).
 *
 * The audit's findings on this screen were about what happens around a write:
 * every change blanked the page to a skeleton and threw the reader back to the
 * top; a refused "Lost" closed its dialog and lost the reason; a deleted lead
 * stayed one Back press away. And about order: on a phone the decisions came
 * after the whole timeline. The services are spies; the lead is re-read with a
 * promise the test holds open, which is where the skeleton used to appear.
 */

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import ApiError from '../../../../services/apiError';
import LeadDetailPage from '../LeadDetailPage';
import leadService from '../../../../services/leadService';
import renderWith from '../../../../test-utils';
import userService from '../../../../services/userService';

jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: {
    adminGet: jest.fn(),
    patch: jest.fn(),
    addNote: jest.fn(),
    removeNote: jest.fn(),
    claim: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { adminGet: jest.fn(() => new Promise(() => {})) },
}));

jest.mock('../../../../services/userService', () => ({
  __esModule: true,
  default: { list: jest.fn() },
}));

jest.mock('../../../../hooks/useMasterData', () => ({
  useLocalities: () => [{ id: 1, name: 'Whitefield' }],
  usePropertyTypes: () => [{ id: 1, name: 'Apartments' }],
}));

const mockRefresh = jest.fn();

jest.mock('../../../../contexts/LeadNotificationsContext', () => ({
  useLeadNotifications: () => ({ refresh: mockRefresh }),
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

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const LEAD = {
  id: 1,
  name: 'Ananya Rao',
  phone: '9876500100',
  email: 'ananya.rao@example.com',
  message: 'Please call in the evening.',
  source: 'property-enquiry',
  status: 'new',
  priority: 'high',
  assignedTo: null,
  assignedUser: null,
  followUpAt: null,
  lostReason: null,
  consent: true,
  requirement: { listingType: 'sale', propertyTypeId: 1, localityId: 1, bedrooms: 3 },
  property: null,
  meta: null,
  utm: {},
  notes: [],
  activities: [
    {
      id: 1,
      type: 'created',
      description: 'Lead created via Property Enquiry',
      createdBy: null,
      createdByName: null,
      createdAt: '2026-09-14T09:00:00.000Z',
    },
    {
      id: 2,
      type: 'assigned',
      description: 'Assigned to Sales User',
      createdBy: 2,
      createdByName: 'Manager User',
      createdAt: '2026-09-14T10:00:00.000Z',
    },
  ],
  isPossibleDuplicate: false,
  createdAt: '2026-09-14T09:00:00.000Z',
  updatedAt: '2026-09-14T10:00:00.000Z',
};

const render = () =>
  renderWith(
    <Routes>
      <Route path="/admin/leads/:id" element={<LeadDetailPage />} />
    </Routes>,
    { initialEntries: ['/admin/leads/1'] }
  );

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

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'admin';
  leadService.adminGet.mockResolvedValue({ data: LEAD });
  leadService.patch.mockResolvedValue({ data: LEAD });
  userService.list.mockResolvedValue({
    data: [
      { id: 2, name: 'Manager User', role: 'manager' },
      { id: 3, name: 'Sales User', role: 'sales' },
    ],
  });
});

describe('LeadDetailPage', () => {
  it('keeps the lead on screen while it is re-read after a change', async () => {
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    // The re-read never answers: whatever the page shows meanwhile is what it
    // shows for the second the real one takes.
    leadService.adminGet.mockReturnValue(new Promise(() => {}));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'low');

    await waitFor(() => expect(leadService.patch).toHaveBeenCalledWith('1', { priority: 'low' }));
    await waitFor(() => expect(leadService.adminGet).toHaveBeenCalledTimes(2));
    // Let the re-read's own state updates render before looking.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(screen.getByRole('heading', { level: 1, name: 'Ananya Rao' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading rows' })).not.toBeInTheDocument();
  });

  it('puts the decisions straight after the contact card', async () => {
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings.slice(0, 5)).toEqual([
      'Contact',
      'Pipeline',
      'Priority',
      'Assigned to',
      'Follow-up',
    ]);
    expect(headings.at(-1)).toBe('Danger zone');
  });

  it('asks the poller once a status has changed', async () => {
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    await userEvent.click(screen.getByRole('button', { name: 'Move to Contacted' }));

    await waitFor(() =>
      expect(leadService.patch).toHaveBeenCalledWith('1', { status: 'contacted' })
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it('keeps the reason dialog open when the API refuses the reason', async () => {
    leadService.patch.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { lostReason: ['The lost reason must be at least 3 characters.'] },
      })
    );
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    await userEvent.click(screen.getByRole('button', { name: 'Mark as lost' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Bought elsewhere');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as lost' }));

    await waitFor(() => expect(leadService.patch).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText(/Reason/)).toHaveValue(
      'Bought elsewhere'
    );
  });

  it('credits every timeline entry to its author', async () => {
    mockRole = 'sales';
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    const entry = screen
      .getAllByRole('listitem')
      .find((item) => item.textContent.includes('Assigned to Sales User'));
    expect(within(entry).getByText('Manager User')).toBeInTheDocument();
  });

  it('names the new owner in its toast', async () => {
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    await userEvent.type(screen.getByRole('combobox', { name: 'Assign to a colleague' }), 'Sal');
    userService.list.mockResolvedValue({ data: [{ id: 3, name: 'Sales User', role: 'sales' }] });
    await userEvent.click(await screen.findByRole('option', { name: /Sales User/ }));

    await waitFor(() => expect(leadService.patch).toHaveBeenCalledWith('1', { assignedTo: 3 }));
    expect(await screen.findByText('The lead is now Sales User’s.')).toBeInTheDocument();
    expect(userService.list).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
      expect.anything()
    );
  });

  it('leaves no way Back to a lead it has deleted', async () => {
    leadService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
    render();
    await screen.findByRole('heading', { level: 1, name: 'Ananya Rao' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' })
    );

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/admin/leads', { replace: true })
    );
  });
});
