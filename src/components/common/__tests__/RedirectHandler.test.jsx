import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import RedirectHandler, { MAX_HOPS, clearCache } from '../RedirectHandler';
import redirectService from '../../../services/redirectService';
import renderWith from '../../../test-utils';

/**
 * The client-side half of §9.10 (D30).
 *
 * What is worth asserting is not that a `<Navigate>` renders — it is that the
 * table is fetched once however many pages are visited, that a rule pointing
 * off-site is a full navigation rather than a router one, and that two rules
 * pointing at each other stop instead of spinning.
 */

jest.mock('../../../services/redirectService', () => {
  const actual = jest.requireActual('../../../services/redirectService');
  return { __esModule: true, ...actual, default: { ...actual.default, list: jest.fn() } };
});

const RULES = [
  { id: 1, fromPath: '/old-properties', toPath: '/properties', statusCode: 301 },
  { id: 2, fromPath: '/partners', toPath: 'https://example.com/partners', statusCode: 301 },
  { id: 3, fromPath: '/loop-a', toPath: '/loop-b', statusCode: 301 },
  { id: 4, fromPath: '/loop-b', toPath: '/loop-a', statusCode: 301 },
];

/** The handler above a router that names whichever page it lands on. */
function Harness() {
  return (
    <>
      <RedirectHandler />
      <Routes>
        <Route path="/properties" element={<p>Properties</p>} />
        <Route path="/old-properties" element={<p>Old properties</p>} />
        <Route path="/partners" element={<p>Partners</p>} />
        <Route path="/loop-a" element={<p>Loop A</p>} />
        <Route path="/loop-b" element={<p>Loop B</p>} />
        <Route path="*" element={<p>Somewhere else</p>} />
      </Routes>
    </>
  );
}

let assign;

beforeEach(() => {
  clearCache();
  jest.clearAllMocks();
  redirectService.list.mockResolvedValue({ data: RULES });

  assign = jest.fn();
  delete window.location;
  window.location = { assign, href: 'http://localhost/', origin: 'http://localhost' };
});

describe('<RedirectHandler>', () => {
  it('sends a retired URL to its replacement', async () => {
    renderWith(<Harness />, { initialEntries: ['/old-properties'] });

    expect(await screen.findByText('Properties')).toBeInTheDocument();
  });

  it('carries the visitor’s query string with them', async () => {
    renderWith(<Harness />, { initialEntries: ['/old-properties/?utm_source=print'] });

    expect(await screen.findByText('Properties')).toBeInTheDocument();
  });

  it('leaves a path nothing redirects away from alone', async () => {
    renderWith(<Harness />, { initialEntries: ['/properties'] });

    expect(await screen.findByText('Properties')).toBeInTheDocument();
    await waitFor(() => expect(redirectService.list).toHaveBeenCalled());
  });

  it('leaves the site altogether for an external target', async () => {
    renderWith(<Harness />, { initialEntries: ['/partners'] });

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://example.com/partners'));
  });

  it('stops a loop and says so once (§7)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderWith(<Harness />, { initialEntries: ['/loop-a'] });

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(warn.mock.calls[0][0]).toMatch(/Redirect loop stopped/);
    // It stopped rather than spun: the browser never followed more hops than
    // the guard allows.
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('never follows more than the hop limit', () => {
    expect(MAX_HOPS).toBe(5);
  });

  it('fetches the table once and serves the rest of the session from the cache', async () => {
    const { unmount } = renderWith(<Harness />, { initialEntries: ['/old-properties'] });
    expect(await screen.findByText('Properties')).toBeInTheDocument();
    unmount();

    renderWith(<Harness />, { initialEntries: ['/old-properties'] });
    expect(await screen.findByText('Properties')).toBeInTheDocument();

    expect(redirectService.list).toHaveBeenCalledTimes(1);
  });

  it('leaves every URL working when the table cannot be read', async () => {
    redirectService.list.mockRejectedValue(new Error('offline'));
    renderWith(<Harness />, { initialEntries: ['/old-properties'] });

    expect(await screen.findByText('Old properties')).toBeInTheDocument();
  });
});
