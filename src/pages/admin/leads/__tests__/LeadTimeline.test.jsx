/**
 * The lead activity timeline (prompt 29).
 *
 * The entries come from the server in the order it appended them; the screen
 * reads newest first, which is the whole of this component's opinion — that,
 * and the fact that an unknown activity type still renders rather than
 * disappearing (ADD-21: the old timeline invented its events).
 */

import { screen, within } from '@testing-library/react';

import LeadTimeline from '../LeadTimeline';
import renderWith from '../../../../test-utils';

const ACTIVITIES = [
  {
    id: 1,
    type: 'created',
    description: 'Lead created via Property Enquiry',
    createdBy: null,
    createdAt: '2026-09-10T06:00:00.000Z',
  },
  {
    id: 3,
    type: 'note-added',
    description: 'Note added',
    createdBy: 3,
    createdAt: '2026-09-14T06:00:00.000Z',
  },
  {
    id: 2,
    type: 'status-changed',
    description: 'Status changed from New to Contacted',
    createdBy: 2,
    createdAt: '2026-09-12T06:00:00.000Z',
  },
];

const NAMES = { 2: 'Manager User', 3: 'Sales User' };

const renderTimeline = (activities = ACTIVITIES) =>
  renderWith(<LeadTimeline activities={activities} nameOf={(id) => NAMES[id] ?? null} />);

describe('LeadTimeline', () => {
  it('renders every activity, newest first', () => {
    renderTimeline();

    const events = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(events.map((event) => event.textContent)).toEqual([
      expect.stringContaining('Note added'),
      expect.stringContaining('Status changed from New to Contacted'),
      expect.stringContaining('Lead created via Property Enquiry'),
    ]);
  });

  it('credits the colleague who made each change', () => {
    renderTimeline();

    const events = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(events[0]).toHaveTextContent('Sales User');
    expect(events[1]).toHaveTextContent('Manager User');
    expect(events[2]).not.toHaveTextContent('User');
  });

  it('carries the exact timestamp beside the relative one', () => {
    renderTimeline();

    const [newest] = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(within(newest).getByText(/ago$/).tagName).toBe('TIME');
    expect(within(newest).getByText(/ago$/)).toHaveAttribute(
      'datetime',
      '2026-09-14T06:00:00.000Z'
    );
  });

  it('renders an activity type it has never seen before', () => {
    renderTimeline([
      {
        id: 9,
        type: 'invoice-raised',
        description: 'Invoice raised',
        createdAt: '2026-09-15T06:00:00.000Z',
      },
    ]);

    expect(screen.getByText('Invoice raised')).toBeInTheDocument();
  });

  it('says so when nothing has happened yet', () => {
    renderTimeline([]);

    expect(screen.getByText('Nothing has happened to this lead yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
