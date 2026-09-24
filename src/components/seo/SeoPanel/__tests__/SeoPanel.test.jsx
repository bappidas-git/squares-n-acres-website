import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import SeoPanel from '../SeoPanel';
import renderWith from '../../../../test-utils';
import { analyze } from '../../../../seo';
import { resetSeoCaches } from '../useSiteSeoIndex';

jest.mock('../../../../services/seoService', () => ({
  __esModule: true,
  default: {
    settings: () => Promise.resolve({ data: SETTINGS }),
    overview: () => Promise.resolve({ data: INDEX }),
  },
}));

const SETTINGS = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  titleTemplates: {
    default: '%title% %sep% %sitename%',
    property: '%bhk% %propertytype% %listingtype% in %locality%, %city% – %price% %sep% %sitename%',
  },
  defaults: { metaDescription: 'The site-wide description.', robots: { index: true } },
  knowledgeGraph: { name: 'Squares N Acres' },
};

const INDEX = [
  {
    id: 99,
    type: 'article',
    title: 'Another page',
    slug: 'another-page',
    seo: { focusKeyword: 'taken phrase', description: 'Somebody else wrote this.', title: 'Other' },
  },
];

const PROPERTY = {
  id: 1,
  title: 'Lakeview Heights',
  slug: 'lakeview-heights',
  listingType: 'sale',
  segment: 'residential',
  isActive: true,
  shortDescription: 'A three-bedroom apartment beside the lake.',
  description: '<p>A quiet three bedroom apartment in Whitefield, Bengaluru.</p>',
  pricing: { price: 14200000 },
  configuration: { bedrooms: 3 },
  location: { locality: { id: 4, name: 'Whitefield' }, city: { id: 1, name: 'Bengaluru' } },
  images: [{ url: 'https://example.com/a.jpg', alt: 'Lakeview Heights', isCover: true }],
  faqs: [],
  seo: null,
};

/** The panel as a host form holds it: `seo` is state, `onChange` merges a patch. */
function Host({ entityType = 'property', entity = PROPERTY, onFocusField, ...rest }) {
  const [seo, setSeo] = useState(entity.seo ?? undefined);

  return (
    <SeoPanel
      entityType={entityType}
      entity={{ ...entity, seo }}
      seo={seo}
      seoSettings={SETTINGS}
      onChange={(patch) => setSeo((current) => ({ ...(current ?? {}), ...patch }))}
      onFocusField={onFocusField}
      {...rest}
    />
  );
}

beforeEach(() => resetSeoCaches());

/** The analysis is 400 ms behind the last keystroke, so every check waits for it. */
const settle = () =>
  waitFor(() => expect(screen.getByRole('img', { name: /SEO score/i })).toBeInTheDocument());

/** The score the gauge is showing. */
const scoreNow = () =>
  Number(
    screen
      .getByRole('img', { name: /SEO score/i })
      .getAttribute('aria-label')
      .match(/\d+/)[0]
  );

/**
 * The biggest record this application holds — twenty images, a forty-section
 * body, eight FAQs — or `scale` times it.
 *
 * @param {number} scale
 * @returns {object}
 */
const heavyListing = (scale) => ({
  ...PROPERTY,
  images: Array.from({ length: 20 * scale }, (_row, index) => ({
    url: `https://example.com/${index}.jpg`,
    alt: index % 3 === 0 ? 'Lakeview Heights apartment' : '',
    isCover: index === 0,
  })),
  description: Array.from(
    { length: 40 * scale },
    (_row, index) =>
      `<h2>Section ${index}</h2><p>A three bedroom apartment in Whitefield, Bengaluru with a lake view, covered parking, a clubhouse and a garden that the residents share. ${'The project is close to the tech parks of the eastern corridor. '.repeat(3)}</p>`
  ).join(''),
  faqs: Array.from({ length: 8 * scale }, (_row, index) => ({
    question: `Question ${index}?`,
    answer: 'An answer of a sentence or two.',
  })),
  seo: { focusKeyword: '3 bhk apartment in whitefield', title: 'Lakeview Heights' },
});

/**
 * Milliseconds on the main thread's own CPU clock where Node has one
 * (`process.threadCpuUsage`, in recent releases), so another process on the
 * machine — a parallel test run, the e2e suite — cannot make the analysis look
 * slow; the wall clock otherwise.
 */
const threadClock =
  typeof process.threadCpuUsage === 'function'
    ? () => {
        const { user, system } = process.threadCpuUsage();
        return (user + system) / 1000;
      }
    : () => performance.now();

/**
 * What analysing each record costs: the fastest of `runs` timings after a
 * warm-up. The records take turns, so whatever else the machine is doing falls
 * on each alike; a slower run measured that, and only a real regression makes
 * every run slower.
 *
 * @param {Array<object>} records
 * @param {number} [runs]
 * @returns {Array<number>} milliseconds, one per record
 */
function fastestAnalyses(records, runs = 5) {
  const context = { seoSettings: SETTINGS, siteIndex: INDEX };
  records.forEach((record) => analyze('property', record, context)); // warm the parsers

  const fastest = records.map(() => Infinity);
  for (let run = 0; run < runs; run += 1) {
    records.forEach((record, index) => {
      const started = threadClock();
      analyze('property', record, context);
      fastest[index] = Math.min(fastest[index], threadClock() - started);
    });
  }
  return fastest;
}

describe('SeoPanel', () => {
  it('analyses the record and re-analyses when a field changes', async () => {
    renderWith(<Host />);
    await settle();

    const before = scoreNow();
    expect(screen.getByText(/tests passed$/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Focus keyword'), 'apartment in whitefield');
    await waitFor(() => expect(scoreNow()).toBeGreaterThan(before), { timeout: 3000 });
  });

  it('asks the host to focus a field the panel does not own', async () => {
    const onFocusField = jest.fn();
    // A keyword the body never uses fails `keyword-in-content`, whose hint
    // points at `content` — a field of the host form, not of the panel.
    renderWith(
      <Host
        onFocusField={onFocusField}
        entity={{ ...PROPERTY, seo: { focusKeyword: 'penthouse in hebbal' } }}
      />
    );
    await settle();

    const hint = await screen.findByText(/Use “penthouse in hebbal” where it reads naturally/);
    await userEvent.click(hint);

    await waitFor(() => expect(onFocusField).toHaveBeenCalledWith('content'));
  });

  it('keeps a hint for one of its own fields inside the panel', async () => {
    const onFocusField = jest.fn();
    renderWith(<Host onFocusField={onFocusField} />);
    await settle();

    const hint = screen
      .getAllByRole('button')
      .find((button) => /open graph|share image|1200/i.test(button.textContent));
    expect(hint).toBeDefined();

    await userEvent.click(hint);

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Social/ })).toHaveAttribute('aria-selected', 'true')
    );
    expect(onFocusField).not.toHaveBeenCalled();
  });

  it('puts the cursor in a field on the sub-tab that is already open', async () => {
    const { rerender } = renderWith(<Host focusRequest={null} />);
    await settle();

    // General is open, and the field is on it: an effect keyed on the tab
    // alone ran nothing and left the cursor where it was.
    rerender(<Host focusRequest={{ path: 'seo.description', nonce: 1 }} />);
    await waitFor(() => expect(screen.getByLabelText('Meta description')).toHaveFocus());

    // Asked again for the same field — after the cursor moved on — it moves back.
    screen.getByLabelText('Focus keyword').focus();
    rerender(<Host focusRequest={{ path: 'seo.description', nonce: 2 }} />);
    await waitFor(() => expect(screen.getByLabelText('Meta description')).toHaveFocus());
  });

  it('opens the sub-tab a host request names and focuses the control', async () => {
    const { rerender } = renderWith(<Host focusRequest={null} />);
    await settle();

    rerender(<Host focusRequest={{ path: 'seo.og.imageUrl', nonce: 1 }} />);

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Social/ })).toHaveAttribute('aria-selected', 'true')
    );
    await waitFor(() => expect(screen.getByLabelText('Share image')).toHaveFocus());
  });

  it('still analyses the page for a read-only user, without writing the result back', async () => {
    const onChange = jest.fn();
    renderWith(
      <SeoPanel
        entityType="property"
        entity={PROPERTY}
        seo={PROPERTY.seo}
        seoSettings={SETTINGS}
        onChange={onChange}
        disabled
      />
    );

    // The score card used to sit on its skeleton for good.
    await settle();
    expect(screen.getByText(/tests passed$/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('inserts a template variable at the caret and resolves it in the preview', async () => {
    renderWith(<Host />);
    await settle();

    const [insert] = screen.getAllByRole('button', { name: 'Insert variable' });
    await userEvent.click(insert);
    await userEvent.click(screen.getByRole('menuitem', { name: /%price%/ }));

    await waitFor(() => expect(screen.getByLabelText('SEO title')).toHaveValue('%price%'));
    // The preview resolves against the form's values, not the saved record.
    await waitFor(() => expect(screen.getAllByText(/₹1\.42 Cr/).length).toBeGreaterThan(0));
  });

  it('shows the tests that do not apply as a count rather than as rows', async () => {
    renderWith(<Host />);
    await settle();

    // Content readability is skipped for a property in its entirety (§9.1):
    // the group is drawn, the rows are not, and the count says how many.
    expect(screen.getByText('Content readability')).toBeInTheDocument();
    expect(screen.getByText(/9 tests do not apply to this kind of record/i)).toBeInTheDocument();
    expect(screen.queryByText(/Flesch/i)).not.toBeInTheDocument();
  });

  it('writes the score and the analysis back through onChange', async () => {
    const onChange = jest.fn();
    renderWith(
      <SeoPanel
        entityType="property"
        entity={PROPERTY}
        seo={PROPERTY.seo}
        seoSettings={SETTINGS}
        onChange={onChange}
      />
    );
    await settle();

    const stored = onChange.mock.calls.map(([patch]) => patch).find((patch) => 'score' in patch);
    expect(stored).toMatchObject({
      scoreBand: expect.any(String),
      testsPassed: expect.any(Number),
      testsTotal: expect.any(Number),
      lastAnalyzedAt: expect.any(String),
    });
    expect(stored.analysis.basic.length).toBeGreaterThan(0);
  });

  it('works on a record with no slug and no title', async () => {
    renderWith(<Host entity={{ id: null, seo: null }} />);
    await settle();

    expect(screen.getByRole('img', { name: /SEO score 0 of 100/i })).toBeInTheDocument();
    expect(screen.getByLabelText('SEO title')).toHaveValue('');
  });

  it('renders the compact variant with the other tabs folded away', async () => {
    renderWith(
      <Host
        entityType="locality"
        entity={{ id: 2, name: 'Whitefield', slug: 'whitefield', seo: null }}
        variant="compact"
      />
    );
    await settle();

    expect(screen.queryByRole('tab', { name: /Social/ })).not.toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus keyword')).toBeInTheDocument();
  });

  it('analyses a heavy listing fast enough to run on every keystroke', () => {
    // Twenty images and a long body is the biggest record this application
    // holds; the panel re-analyses 400 ms after the last keystroke, so this has
    // to be over long before the next one lands (§7). It is timed on the main
    // thread's own clock, as the fastest of several runs: one wall-clock
    // reading failed at 101 ms while the e2e suite shared the machine, with
    // nothing in the analysis changed (QA-61).
    const [cost] = fastestAnalyses([heavyListing(1)]);

    expect(cost).toBeLessThan(100);
  });

  it('grows in step with the listing, not faster', () => {
    // Four times the listing is about four times the work: the analysis is
    // linear. A pass over every pair of sections or images grows sixteen-fold
    // instead, so once it is a fair share of the cost this fails — on any
    // machine, however fast, while the heaviest listing is still inside the
    // budget above (QA-61).
    const [single, quadruple] = fastestAnalyses([heavyListing(1), heavyListing(4)]);

    expect(quadruple / single).toBeLessThan(8);
  });
});
