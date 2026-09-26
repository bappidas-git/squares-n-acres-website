import article from './fixtures/article.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import siteIndex from './fixtures/siteIndex.json';
import { runContentReadabilityTests } from '../analyzers/contentReadability';
import { toSeoInput } from '../entityAdapters';

const baseContext = { ...masterData, seoSettings, siteIndex };

const run = (entityType, entity, extra = {}) => {
  const context = { ...baseContext, ...extra };
  const results = runContentReadabilityTests(toSeoInput(entityType, entity, context), context);
  return Object.fromEntries(results.map((result) => [result.id, result]));
};

const body = (content) => ({ ...article, content });

/** A body of `n` plain sentences, so a single dimension can be measured alone. */
const sentences = (n, words = 8) =>
  `<p>${Array.from({ length: n }, () => `${'word '.repeat(words)}.`).join(' ')}</p>`;

describe('the group', () => {
  it('runs the nine tests of SEO-09, including heading-hierarchy (§7)', () => {
    const ids = runContentReadabilityTests(
      toSeoInput('article', article, baseContext),
      baseContext
    ).map((result) => result.id);
    expect(ids).toEqual([
      'toc-present',
      'short-paragraphs',
      'has-media',
      'flesch-reading-ease',
      'sentence-length',
      'subheading-distribution',
      'passive-voice',
      'transition-words',
      'heading-hierarchy',
    ]);
  });

  it('is skipped in full for a listing, which is a specification and not an essay', () => {
    const results = run('property', property);
    expect(Object.values(results).every((result) => result.status === 'skip')).toBe(true);
  });
});

describe('toc-present', () => {
  it('passes an article with three H2s and the contents list on', () => {
    expect(run('article', article)['toc-present'].status).toBe('pass');
  });

  it('fails an article with three H2s and the contents list off', () => {
    expect(run('article', { ...article, tableOfContents: false })['toc-present'].status).toBe(
      'fail'
    );
  });

  it('is skipped for an article too short to need one', () => {
    const short = { ...article, content: '<h2>One</h2><p>Body.</p><h2>Two</h2><p>Body.</p>' };
    const result = run('article', short)['toc-present'];
    expect(result.status).toBe('skip');
    expect(result.message).toContain('2 H2 headings');
  });

  it('is skipped for a page, which has no contents list', () => {
    expect(run('page', { slug: 'about', title: 'About', blocks: [] })['toc-present'].status).toBe(
      'skip'
    );
  });
});

describe('short-paragraphs', () => {
  it('passes a body of short paragraphs', () => {
    expect(
      run('article', body('<p>One two three.</p><p>Four five.</p>'))['short-paragraphs'].status
    ).toBe('pass');
  });

  it('warns when a minority of the paragraphs run long', () => {
    const long = `<p>${'word '.repeat(200)}</p>${'<p>short</p>'.repeat(9)}`;
    expect(run('article', body(long))['short-paragraphs'].status).toBe('warn');
  });

  it('fails when most of them do', () => {
    const long = `<p>${'word '.repeat(200)}</p><p>${'word '.repeat(200)}</p><p>short</p>`;
    expect(run('article', body(long))['short-paragraphs'].status).toBe('fail');
  });

  it('fails when there is nothing to read', () => {
    expect(run('article', body(''))['short-paragraphs'].status).toBe('fail');
  });
});

describe('has-media', () => {
  it('passes a body with an image in it', () => {
    expect(
      run('article', body('<p>Text</p><img src="/a.png" alt="A" />'))['has-media'].status
    ).toBe('pass');
  });

  it('warns when the only image is the cover', () => {
    expect(run('article', body('<p>Only text here.</p>'))['has-media'].status).toBe('warn');
  });

  it('fails when there is no image anywhere', () => {
    const bare = { ...article, featuredImage: null, content: '<p>Only text.</p>' };
    expect(run('article', bare)['has-media'].status).toBe('fail');
  });
});

describe('flesch-reading-ease', () => {
  it('passes plain English and shows the number', () => {
    const easy = body('<p>The flat is new. It has three rooms. The park is close by.</p>');
    const result = run('article', easy)['flesch-reading-ease'];
    expect(result.status).toBe('pass');
    expect(result.message).toMatch(/Flesch Reading Ease [\d.-]+/);
    expect(typeof result.value).toBe('number');
  });

  it('warns at a hard read rather than failing it', () => {
    const hard = body(
      '<p>Notwithstanding the aforementioned registration requirements, the promoter shall, subject to applicable regulatory determinations, maintain proportionate allocations within a designated project account.</p>'
    );
    expect(run('article', hard)['flesch-reading-ease'].status).toBe('warn');
  });

  it('fails when there is nothing to score', () => {
    expect(run('article', body(''))['flesch-reading-ease'].status).toBe('fail');
  });
});

describe('sentence-length', () => {
  it('passes sentences under twenty-five words', () => {
    expect(run('article', body(sentences(4, 10)))['sentence-length'].status).toBe('pass');
  });

  it('warns just past the limit', () => {
    expect(run('article', body(sentences(4, 28)))['sentence-length'].status).toBe('warn');
  });

  it('fails well past it', () => {
    expect(run('article', body(sentences(4, 45)))['sentence-length'].status).toBe('fail');
  });
});

describe('subheading-distribution', () => {
  it('passes a body with a subheading every few hundred words', () => {
    const content = `<h2>One</h2><p>${'word '.repeat(200)}</p><h2>Two</h2><p>${'word '.repeat(200)}</p>`;
    const result = run('article', body(content))['subheading-distribution'];
    expect(result.status).toBe('pass');
    expect(result.value).toBe(200);
  });

  it('warns at a long stretch and fails at a very long one', () => {
    expect(
      run('article', body(`<p>${'word '.repeat(400)}</p>`))['subheading-distribution'].status
    ).toBe('warn');
    expect(
      run('article', body(`<p>${'word '.repeat(700)}</p>`))['subheading-distribution'].status
    ).toBe('fail');
  });
});

describe('passive-voice', () => {
  it('passes a body written in the active voice', () => {
    const active = body(
      '<p>The authority approves the plan. The promoter files it each quarter.</p>'
    );
    expect(run('article', active)['passive-voice'].status).toBe('pass');
  });

  it('warns rather than fails when too much of it is passive', () => {
    const passive = body(
      '<p>The plan was approved. The account is maintained separately. The flat was sold quickly.</p>'
    );
    const result = run('article', passive)['passive-voice'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('%');
  });
});

describe('transition-words', () => {
  it('passes a body that joins its sentences up', () => {
    const joined = body(
      '<p>However, the rule changed. Because of that, buyers wait. In practice, the wait is short. Therefore the market moved.</p>'
    );
    expect(run('article', joined)['transition-words'].status).toBe('pass');
  });

  it('warns at a thin share and fails at none', () => {
    const thin = body(
      `<p>However, one thing happened. ${'Another thing happened. '.repeat(7)}</p>`
    );
    expect(run('article', thin)['transition-words'].status).toBe('warn');
    expect(run('article', body(sentences(6, 6)))['transition-words'].status).toBe('fail');
  });
});

describe('heading-hierarchy (§7)', () => {
  it('passes an outline that starts at H2 and skips nothing', () => {
    const content = '<h2>One</h2><p>Body.</p><h3>Under it</h3><p>Body.</p><h2>Two</h2><p>Body.</p>';
    expect(run('article', body(content))['heading-hierarchy'].status).toBe('pass');
  });

  it('warns at an H1 inside the body', () => {
    const result = run('article', body('<h1>A title</h1><p>Body.</p>'))['heading-hierarchy'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('H1');
    // The spec reference stays in the code; the hint an editor reads says what to do (prompt 51).
    expect(result.hint).toBe('The page title is the H1. Demote these to H2.');
  });

  it('warns when the outline jumps a level', () => {
    const result = run('article', body('<h2>One</h2><p>Body.</p><h4>Too deep</h4><p>Body.</p>'))[
      'heading-hierarchy'
    ];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Too deep');
  });

  it('warns when the body opens below H2', () => {
    expect(run('article', body('<h3>Opening</h3><p>Body.</p>'))['heading-hierarchy'].status).toBe(
      'warn'
    );
  });

  it('fails a body with no headings at all', () => {
    expect(run('article', body('<p>Body with no headings.</p>'))['heading-hierarchy'].status).toBe(
      'fail'
    );
  });
});

describe('a locality guide', () => {
  it('is measured like an article, minus the contents list', () => {
    const results = run('locality', locality);
    expect(results['toc-present'].status).toBe('skip');
    expect(results['flesch-reading-ease'].status).toMatch(/pass|warn/);
    expect(results['heading-hierarchy'].status).toMatch(/pass|warn|fail/);
  });
});
