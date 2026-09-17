/*
 * `@testing-library/user-event` is pinned at 13.5 (§3.1), which — unlike v14 —
 * does not wrap its own interactions in `act`. The wrappers below are what keep
 * the state updates that follow a click inside the click's `act` scope, so the
 * rule that assumes v14 is switched off for this file rather than the tests
 * being rewritten around a version this project does not use.
 */
/* eslint-disable testing-library/no-unnecessary-act, testing-library/no-node-access */
/**
 * The SEO desk's two site-wide runs (prompt 37 §4.4, §7).
 *
 * Two promises are worth a test rather than a comment: a run of sixty records
 * reports where it has got to and can be stopped, and "auto-generate missing"
 * never touches a value somebody wrote unless it was explicitly told to.
 */

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SeoBulkTools, { planGeneration, planReanalysis } from '../SeoBulkTools';
import renderWith from '../../../../test-utils';

jest.mock('../seoEntityServices', () => ({
  __esModule: true,
  serviceFor: jest.fn(),
  typeLabel: (type) => type,
}));

const { serviceFor } = require('../seoEntityServices');

/**
 * A click and everything it sets in motion, inside one `act`.
 *
 * These buttons start an asynchronous run: the state updates that follow the
 * click land in later microtasks, and React only counts them as part of the
 * click when the await is inside the same `act` scope.
 */
const click = (element) =>
  act(async () => {
    await userEvent.click(element);
  });

const SEO_SETTINGS = {
  separator: '|',
  siteUrl: 'https://www.squaresnacres.com',
  titleTemplates: { property: '%title% %sep% %sitename%' },
  knowledgeGraph: { name: 'Squares N Acres' },
};

/** A listing with a body, which is what the generator writes a description from. */
const property = (id, seo = {}) => ({
  id,
  slug: `listing-${id}`,
  title: `Lakeview Heights ${id}`,
  description: '<p>A three-bedroom apartment beside the lake in Whitefield, Bengaluru.</p>',
  location: { localityId: 1, cityId: 1 },
  seo,
});

const row = (id) => ({ key: `property:${id}`, id, type: 'property', title: `Lakeview ${id}` });

/** A service whose reads answer from a table and whose writes are recorded. */
function stubService(records) {
  const patch = jest.fn(() => Promise.resolve({ data: null }));
  const get = jest.fn((id) => Promise.resolve({ data: records[String(id)] }));
  serviceFor.mockImplementation(() => ({ get, patch, adminPath: () => '/admin' }));
  return { get, patch };
}

const WRITTEN = {
  title: 'A title somebody wrote',
  description: 'A description somebody wrote, which is already exactly what this page needs.',
  focusKeyword: 'apartment in whitefield',
};

describe('SeoBulkTools — auto-generate missing', () => {
  it('fills the records that have nothing and skips the ones that do', async () => {
    const { patch } = stubService({
      1: property(1),
      2: property(2, WRITTEN),
      3: property(3),
    });

    const onFinished = jest.fn();
    renderWith(
      <SeoBulkTools
        rows={[row(1), row(2), row(3)]}
        seoSettings={SEO_SETTINGS}
        context={{ seoSettings: SEO_SETTINGS }}
        onFinished={onFinished}
      />
    );

    await click(screen.getByRole('button', { name: /auto-generate missing/i }));

    await waitFor(() => expect(onFinished).toHaveBeenCalled());

    // Two records were written; the one that already said everything was not.
    expect(patch).toHaveBeenCalledTimes(2);
    expect(patch.mock.calls.map(([id]) => id)).toEqual([1, 3]);

    const summary = onFinished.mock.calls[0][0];
    expect(summary).toMatchObject({ done: 3, changed: 2, skipped: 1, failed: 0 });

    expect(screen.getByText('3 of 3 records — finished')).toBeInTheDocument();
    expect(screen.getByText('1').closest('li')).toHaveTextContent('already fine');
  });

  it('asks before it overwrites what an editor wrote', async () => {
    const { patch } = stubService({ 1: property(1, WRITTEN) });

    renderWith(
      <SeoBulkTools
        rows={[row(1)]}
        seoSettings={SEO_SETTINGS}
        context={{ seoSettings: SEO_SETTINGS }}
      />
    );

    await click(screen.getByRole('checkbox', { name: /overwrite/i }));
    await click(screen.getByRole('button', { name: /auto-generate missing/i }));

    // Nothing is written until the question is answered.
    expect(
      screen.getByText(/overwrite the titles and descriptions that are already written/i)
    ).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();

    await click(screen.getByRole('button', { name: /overwrite 1 records/i }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    expect(patch.mock.calls[0][1].seo.title).toBe('Lakeview Heights 1 | Squares N Acres');
  });
});

describe('SeoBulkTools — re-analyse all', () => {
  it('reports progress and stores the score of every record', async () => {
    const { get, patch } = stubService({ 1: property(1), 2: property(2) });

    const onFinished = jest.fn();
    renderWith(
      <SeoBulkTools
        rows={[row(1), row(2)]}
        seoSettings={SEO_SETTINGS}
        context={{ seoSettings: SEO_SETTINGS }}
        onFinished={onFinished}
      />
    );

    await click(screen.getByRole('button', { name: /re-analyse all \(2\)/i }));

    const bar = await screen.findByRole('progressbar', { name: /records processed/i });
    expect(bar).toHaveAttribute('aria-valuemax', '2');

    await waitFor(() => expect(onFinished).toHaveBeenCalled());

    expect(get).toHaveBeenCalledTimes(2);
    expect(patch).toHaveBeenCalledTimes(2);
    expect(patch.mock.calls[0][1].seo.score).toEqual(expect.any(Number));
    expect(onFinished.mock.calls[0][0]).toMatchObject({ done: 2, changed: 2, failed: 0 });
  });

  it('counts a record that could not be saved without stopping the run', async () => {
    const records = { 1: property(1), 2: property(2) };
    const patch = jest.fn((id) =>
      id === 1 ? Promise.reject(new Error('Nope')) : Promise.resolve({ data: null })
    );
    serviceFor.mockImplementation(() => ({
      get: (id) => Promise.resolve({ data: records[String(id)] }),
      patch,
      adminPath: () => '/admin',
    }));

    const onFinished = jest.fn();
    renderWith(
      <SeoBulkTools
        rows={[row(1), row(2)]}
        seoSettings={SEO_SETTINGS}
        context={{ seoSettings: SEO_SETTINGS }}
        onFinished={onFinished}
      />
    );

    await click(screen.getByRole('button', { name: /re-analyse all/i }));
    await waitFor(() => expect(onFinished).toHaveBeenCalled());

    expect(onFinished.mock.calls[0][0]).toMatchObject({ done: 2, changed: 1, failed: 1 });
    expect(screen.getByText(/these records were not saved/i)).toBeInTheDocument();
  });
});

describe('SeoBulkTools — stopping a run', () => {
  it('keeps what it has already written and does not reach the rest', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });

    const records = { 1: property(1), 2: property(2), 3: property(3) };
    const patch = jest.fn(() => Promise.resolve({ data: null }));
    const get = jest.fn(async (id) => {
      if (String(id) === '2') await gate;
      return { data: records[String(id)] };
    });
    serviceFor.mockImplementation(() => ({ get, patch, adminPath: () => '/admin' }));

    const onFinished = jest.fn();
    renderWith(
      <SeoBulkTools
        rows={[row(1), row(2), row(3)]}
        seoSettings={SEO_SETTINGS}
        context={{ seoSettings: SEO_SETTINGS }}
        onFinished={onFinished}
      />
    );

    await click(screen.getByRole('button', { name: /re-analyse all/i }));
    await screen.findByRole('progressbar', { name: /records processed/i });

    // While the run is going the dialog offers exactly one way out, and it is
    // not a dismissal: closing it mid-run would hide writes that keep going.
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    await click(screen.getByRole('button', { name: 'Stop' }));
    await act(async () => {
      release();
      await gate;
    });

    await waitFor(() => expect(onFinished).toHaveBeenCalled());

    // The first two records are written; the third was never read.
    expect(onFinished.mock.calls[0][0]).toMatchObject({ done: 2, changed: 2 });
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByText('2 of 3 records — stopped')).toBeInTheDocument();
    // The dialog is dismissible again — by the footer button and by the
    // header's own close control, which is only rendered once the run is over.
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(2);
  });
});

describe('the plans the runs are built from', () => {
  it('writes nothing when the stored analysis already matches', () => {
    const record = property(1);
    const first = planReanalysis('property', record, { seoSettings: SEO_SETTINGS });
    expect(first).not.toBeNull();

    const analysed = { ...record, seo: { ...record.seo, ...first } };
    expect(planReanalysis('property', analysed, { seoSettings: SEO_SETTINGS })).toBeNull();
  });

  it('never replaces a written value without overwrite', () => {
    const record = property(1, WRITTEN);
    expect(planGeneration('property', record, SEO_SETTINGS, { overwrite: false })).toBeNull();

    const forced = planGeneration('property', record, SEO_SETTINGS, { overwrite: true });
    expect(forced.title).toBe('Lakeview Heights 1 | Squares N Acres');
  });
});
