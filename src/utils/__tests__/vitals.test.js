import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

import reportWebVitals, { ratingFor, roundValue, vitalsPayload } from '../vitals';

// The real library registers `visibilitychange` and performance observers that
// outlive the test run; what this suite is about is the bridge between it and
// `track()`, so the five reporters are mocks whose callbacks the tests fire
// themselves.
jest.mock('web-vitals', () => ({
  getCLS: jest.fn(),
  getFCP: jest.fn(),
  getFID: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
}));

/**
 * The contract this suite protects is the shape of the `web_vitals` event.
 *
 * Whoever configures GA4 builds dimensions out of `name`, `value`, `rating`
 * and `id`; a rename or a changed rounding here is a broken report there, and
 * nothing in the browser would say so. The thresholds are Google's own, so
 * "good" here means what "good" means in a Search Console report.
 */

describe('ratingFor', () => {
  it('uses Google’s thresholds for each metric', () => {
    expect(ratingFor('LCP', 2000)).toBe('good');
    expect(ratingFor('LCP', 2500)).toBe('good');
    expect(ratingFor('LCP', 3000)).toBe('needs-improvement');
    expect(ratingFor('LCP', 5000)).toBe('poor');

    expect(ratingFor('CLS', 0.05)).toBe('good');
    expect(ratingFor('CLS', 0.2)).toBe('needs-improvement');
    expect(ratingFor('CLS', 0.4)).toBe('poor');

    expect(ratingFor('FID', 80)).toBe('good');
    expect(ratingFor('FCP', 1700)).toBe('good');
    expect(ratingFor('TTFB', 2000)).toBe('poor');
  });

  it('says so rather than guessing for a metric it has no thresholds for', () => {
    expect(ratingFor('INP', 120)).toBe('unknown');
    expect(ratingFor('LCP', Number.NaN)).toBe('unknown');
  });
});

describe('roundValue', () => {
  it('keeps three decimals of CLS, which is a score rather than a duration', () => {
    expect(roundValue('CLS', 0.0512345)).toBe(0.051);
    expect(roundValue('CLS', 0)).toBe(0);
  });

  it('rounds every other metric to the millisecond', () => {
    expect(roundValue('LCP', 2481.6)).toBe(2482);
    expect(roundValue('TTFB', 120.4)).toBe(120);
  });

  it('reports 0 rather than NaN for a value that is not a number', () => {
    expect(roundValue('LCP', undefined)).toBe(0);
    expect(roundValue('CLS', 'x')).toBe(0);
  });
});

describe('vitalsPayload', () => {
  it('carries the name, the rounded value, the load id and the rating', () => {
    expect(vitalsPayload({ name: 'LCP', value: 2481.6, id: 'v2-1700000000000-1' })).toEqual({
      name: 'LCP',
      value: 2482,
      id: 'v2-1700000000000-1',
      rating: 'good',
    });
  });

  it('rates the rounded value, not the raw one', () => {
    // 2500.4 rounds to 2500, which is exactly the "good" boundary.
    expect(vitalsPayload({ name: 'LCP', value: 2500.4, id: 'x' }).rating).toBe('good');
  });
});

describe('reportWebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.dataLayer;
  });

  afterEach(() => {
    delete window.dataLayer;
  });

  it('subscribes to the five metrics `web-vitals@2` reports', async () => {
    await reportWebVitals();

    expect(getCLS).toHaveBeenCalledTimes(1);
    expect(getFCP).toHaveBeenCalledTimes(1);
    expect(getFID).toHaveBeenCalledTimes(1);
    expect(getLCP).toHaveBeenCalledTimes(1);
    expect(getTTFB).toHaveBeenCalledTimes(1);
  });

  it('pushes one `web_vitals` event per metric onto the data layer', async () => {
    await reportWebVitals();

    getLCP.mock.calls[0][0]({ name: 'LCP', value: 2481.6, id: 'load-1' });
    getCLS.mock.calls[0][0]({ name: 'CLS', value: 0.0512345, id: 'load-1' });

    expect(window.dataLayer).toEqual([
      { event: 'web_vitals', name: 'LCP', value: 2482, id: 'load-1', rating: 'good' },
      { event: 'web_vitals', name: 'CLS', value: 0.051, id: 'load-1', rating: 'good' },
    ]);
  });

  it('hands the raw metric to a caller that passes its own reporter', async () => {
    const report = jest.fn();
    await reportWebVitals(report);

    const metric = { name: 'TTFB', value: 120.4, id: 'load-2' };
    getTTFB.mock.calls[0][0](metric);

    expect(report).toHaveBeenCalledWith(metric);
    // Its own reporter replaces the bridge rather than adding to it.
    expect(window.dataLayer).toBeUndefined();
  });

  it('stays quiet when the library cannot be loaded at all', async () => {
    const failure = new Error('offline');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getLCP.mockImplementationOnce(() => {
      throw failure;
    });

    await expect(reportWebVitals()).resolves.toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
    console.error.mockRestore();
  });
});
