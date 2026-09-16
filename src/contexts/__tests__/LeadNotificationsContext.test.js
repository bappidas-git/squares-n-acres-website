/**
 * `LeadNotificationsContext` — the admin panel's one lead poller (D45/D55).
 *
 * What matters here is the cost of the thing: one request every thirty
 * seconds, and none at all while the tab is in the background.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ToastProvider from '../../components/common/ToastProvider';
import leadService from '../../services/leadService';
import {
  LeadNotificationsProvider,
  POLL_INTERVAL_MS,
  useLeadNotifications,
} from '../LeadNotificationsContext';

jest.mock('../../services/leadService');

let hidden = false;

const answer = (rows = [], total = rows.length) =>
  Promise.resolve({ data: rows, meta: { page: 1, perPage: 5, total, totalPages: 1 } });

const Probe = () => {
  const { newLeadCount } = useLeadNotifications();
  return <span data-testid="count">{newLeadCount}</span>;
};

const renderProvider = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <LeadNotificationsProvider>
          <Probe />
        </LeadNotificationsProvider>
      </ToastProvider>
    </MemoryRouter>
  );

/** Lets the promise chain of one poll settle inside `act`. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const tick = async (ms = POLL_INTERVAL_MS) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

describe('LeadNotificationsContext', () => {
  beforeAll(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    hidden = false;
    leadService.adminList.mockImplementation(() => answer([], 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('asks only for the five newest new leads, then once every thirty seconds', async () => {
    renderProvider();
    await flush();

    expect(leadService.adminList).toHaveBeenCalledTimes(1);
    expect(leadService.adminList).toHaveBeenCalledWith({
      status: 'new',
      perPage: 5,
      sort: 'createdAt',
      order: 'desc',
    });

    await tick();
    expect(leadService.adminList).toHaveBeenCalledTimes(2);
  });

  it('publishes meta.total as the badge count', async () => {
    leadService.adminList.mockImplementation(() =>
      answer(
        [
          {
            id: 7,
            name: 'A. Buyer',
            source: 'property-enquiry',
            createdAt: '2026-09-16T09:00:00.000Z',
          },
        ],
        4
      )
    );

    renderProvider();
    await flush();

    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });

  it('does not poll while the tab is hidden and fetches the moment it returns', async () => {
    hidden = true;
    renderProvider();
    await flush();

    expect(leadService.adminList).not.toHaveBeenCalled();

    await tick(POLL_INTERVAL_MS * 3);
    expect(leadService.adminList).not.toHaveBeenCalled();

    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(leadService.adminList).toHaveBeenCalledTimes(1);

    hidden = true;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await tick(POLL_INTERVAL_MS * 2);
    expect(leadService.adminList).toHaveBeenCalledTimes(1);
  });
});
