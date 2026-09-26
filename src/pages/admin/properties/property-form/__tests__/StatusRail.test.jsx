/**
 * The property form's rail — "Copy share link (24 h)" (prompt 51): a saved
 * listing that is not published can be shown, for a day, to somebody who never
 * signs in; the link is copied, and shown too for a browser that refuses.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StatusRail from '../StatusRail';
import renderWith from '../../../../../test-utils';

const formOf = (overrides = {}) => ({
  state: { initial: { slug: 'aurelia-court', isActive: false } },
  values: {
    slug: 'aurelia-court',
    title: 'Aurelia Court',
    isActive: false,
    isFeatured: false,
    isVerified: false,
    availability: 'available',
    priorityOrder: 0,
    seo: {},
  },
  errors: {},
  dirty: false,
  saving: false,
  busy: false,
  isNew: false,
  readOnly: false,
  lastSavedAt: '2026-09-26T06:00:00.000Z',
  draftSavedAt: null,
  completeness: { percent: 60, items: [] },
  warnings: [],
  viewUrl: '/properties/aurelia-court?preview=admin',
  viewStale: false,
  setField: jest.fn(),
  setActive: jest.fn(),
  focusField: jest.fn(),
  setActiveTab: jest.fn(),
  save: jest.fn(),
  duplicate: jest.fn(),
  remove: jest.fn(),
  shareLink: jest.fn(),
  ...overrides,
});

const LINK = {
  url: 'http://localhost:3000/properties/aurelia-court?preview=tok-1',
  expiresAt: '2026-09-27T06:00:00.000Z',
};

describe('StatusRail — the share link (prompt 51)', () => {
  const realClipboard = navigator.clipboard;
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: realClipboard, configurable: true });
  });

  it('copies a 24-hour link to an unpublished listing, and shows it', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const form = formOf();
    form.shareLink.mockResolvedValue(LINK);
    renderWith(<StatusRail form={form} />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy share link (24 h)' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK.url));
    expect(await screen.findByText(/^Share link copied — it works until/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'this link' })).toHaveAttribute('href', LINK.url);
  });

  it('shows the link to copy by hand when the browser refuses the clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn(() => Promise.reject(new Error('denied'))) },
      configurable: true,
    });
    const form = formOf();
    form.shareLink.mockResolvedValue(LINK);
    renderWith(<StatusRail form={form} />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy share link (24 h)' }));

    expect(await screen.findByText(/did not let the page copy it/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'this link' })).toHaveAttribute('href', LINK.url);
  });

  it('is not offered for a published listing, nor to a read-only role', () => {
    const { unmount } = renderWith(
      <StatusRail
        form={formOf({
          state: { initial: { slug: 'aurelia-court', isActive: true } },
          viewUrl: '/properties/aurelia-court',
        })}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'Copy share link (24 h)' })
    ).not.toBeInTheDocument();
    unmount();

    renderWith(<StatusRail form={formOf({ readOnly: true })} />);
    expect(
      screen.queryByRole('button', { name: 'Copy share link (24 h)' })
    ).not.toBeInTheDocument();
  });
});

describe('StatusRail — who saved last (prompt 51)', () => {
  it('names the account that saved the listing', () => {
    renderWith(
      <StatusRail
        form={formOf({
          state: {
            initial: { slug: 'aurelia-court', isActive: false, updatedByName: 'Priya Sales' },
          },
        })}
      />
    );
    expect(screen.getByText(/^Last saved .* by Priya Sales$/)).toBeInTheDocument();
  });
});
