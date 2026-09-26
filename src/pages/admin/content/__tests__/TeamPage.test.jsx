/**
 * Admin → Team (prompt 51): each advisor's listings are counted and one press
 * away, and switching off an advisor who still answers for listings asks who
 * takes them over first.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TeamPage from '../TeamPage';
import propertyService from '../../../../services/propertyService';
import renderWith from '../../../../test-utils';
import { team } from '../../../../services/masterDataService';

jest.mock('../../../../services/masterDataService', () => {
  const actual = jest.requireActual('../../../../services/masterDataService');
  const fake = () => ({
    adminList: jest.fn(),
    adminGet: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
    bulk: jest.fn(),
    checkSlug: jest.fn(),
  });
  return {
    ...actual,
    team: fake(),
    faqs: fake(),
    partners: fake(),
    testimonials: fake(),
    propertyTypes: fake(),
  };
});

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { adminList: jest.fn(), bulk: jest.fn() },
}));

jest.mock('../../../../services/userService', () => ({
  __esModule: true,
  default: { list: jest.fn() },
}));

const MEMBERS = [
  {
    id: 2,
    name: 'Team Member 2',
    slug: 'team-member-2',
    designation: 'Director, Sales',
    isActive: true,
    showOnAbout: true,
    order: 1,
    listingCount: 3,
    userId: 3,
  },
  {
    id: 3,
    name: 'Team Member 3',
    slug: 'team-member-3',
    designation: 'Senior Property Advisor',
    isActive: true,
    showOnAbout: true,
    order: 2,
    listingCount: 0,
    userId: 2,
  },
];

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

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

/** What was patched, without the request options the service passes along. */
const patched = () => team.patch.mock.calls.map(([id, body]) => [id, body]);

// The table rather than the drag list, which only the Order sort shows.
const render = () => renderWith(<TeamPage />, { initialEntries: ['/admin/team?sort=name'] });

beforeEach(() => {
  jest.clearAllMocks();
  team.adminList.mockResolvedValue(envelope(MEMBERS));
  team.patch.mockImplementation(async (id, body) => ({
    data: { ...MEMBERS.find((member) => member.id === id), ...body },
  }));
  propertyService.adminList.mockResolvedValue(envelope([{ id: 11 }, { id: 12 }, { id: 13 }]));
  propertyService.bulk.mockResolvedValue({
    data: { affected: 3 },
    message: '3 properties updated.',
  });
});

describe('TeamPage', () => {
  it('counts each advisor’s listings and links to them', async () => {
    render();
    const link = await screen.findByRole('link', { name: '3 listings of Team Member 2' });
    expect(link).toHaveAttribute('href', '/admin/properties?agentId=2');
  });

  it('hands the listings to another advisor before switching one off', async () => {
    render();
    await userEvent.click(await screen.findByRole('switch', { name: 'Team Member 2 is active' }));

    const dialog = await screen.findByRole('dialog', { name: 'Deactivate Team Member 2?' });
    expect(within(dialog).getByText(/is the advisor on 3 listings/)).toBeInTheDocument();
    expect(team.patch).not.toHaveBeenCalled();
    await waitFor(() => expect(within(dialog).getByLabelText(/^Advisor/)).toHaveValue('3'));

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reassign and deactivate' }));

    await waitFor(() => expect(patched()).toEqual([[2, { isActive: false }]]));
    expect(propertyService.adminList).toHaveBeenCalledWith({ agentId: 2, perPage: 'all' });
    expect(propertyService.bulk).toHaveBeenCalledWith({
      ids: [11, 12, 13],
      action: 'assignAgent',
      payload: { agentId: 3 },
    });
    expect(await screen.findByText('3 listings now name Team Member 3.')).toBeInTheDocument();
  });

  it('switches off an advisor with no listings straight away', async () => {
    render();
    await userEvent.click(await screen.findByRole('switch', { name: 'Team Member 3 is active' }));

    await waitFor(() => expect(patched()).toEqual([[3, { isActive: false }]]));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(propertyService.bulk).not.toHaveBeenCalled();
  });
});
