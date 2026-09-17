import article from './fixtures/article.json';
import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import siteIndex from './fixtures/siteIndex.json';
import { CONTENT_LENGTH, runBasicTests } from '../analyzers/basic';
import { toSeoInput } from '../entityAdapters';

const baseContext = { ...masterData, seoSettings, siteIndex };

/** The basic group as a lookup, for one record. */
const run = (entityType, entity, extra = {}) => {
  const context = { ...baseContext, ...extra };
  const results = runBasicTests(toSeoInput(entityType, entity, context), context);
  return Object.fromEntries(results.map((result) => [result.id, result]));
};

const withSeo = (record, seo) => ({ ...record, seo: { ...record.seo, ...seo } });

/** Prose of an exact length, so a length test measures prose rather than `aaaa`. */
const filler = (length) =>
  'property in whitefield bengaluru with a pool and a clubhouse nearby '.repeat(6).slice(0, length);

describe('the shape of a result', () => {
  it('carries an id, a group, a status, a message, a hint field and a weight', () => {
    const results = runBasicTests(toSeoInput('property', property, baseContext), baseContext);
    for (const result of results) {
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          group: 'basic',
          status: expect.stringMatching(/^(pass|warn|fail|skip)$/),
          message: expect.any(String),
          hint: expect.any(String),
          field: expect.any(String),
          weight: expect.any(Number),
        })
      );
    }
  });

  it('runs all ten basic tests', () => {
    expect(runBasicTests(toSeoInput('property', property, baseContext), baseContext)).toHaveLength(
      10
    );
  });
});

describe('focus-keyword-set', () => {
  it('passes when there is one', () => {
    const result = run('property', property)['focus-keyword-set'];
    expect(result.status).toBe('pass');
    expect(result.message).toContain('3 bhk apartment in whitefield');
  });

  it('fails when there is not', () => {
    const result = run('property', withSeo(property, { focusKeyword: '' }))['focus-keyword-set'];
    expect(result.status).toBe('fail');
    expect(result.field).toBe('seo.focusKeyword');
  });
});

describe('keyword-in-title, -description, -slug', () => {
  it('passes each when the keyword is in the title, the description and the slug', () => {
    const record = {
      ...property,
      slug: '3-bhk-apartment-in-whitefield-lakeview-heights',
      seo: {
        ...property.seo,
        slug: '3-bhk-apartment-in-whitefield-lakeview-heights',
        description:
          'A 3 BHK apartment in Whitefield, Bengaluru: 1,650 sq ft, ready to move, with two covered parking bays and a podium clubhouse.',
      },
    };
    const results = run('property', record);
    expect(results['keyword-in-title'].status).toBe('pass');
    expect(results['keyword-in-description'].status).toBe('pass');
    expect(results['keyword-in-slug'].status).toBe('pass');
  });

  it('fails the description and the slug of the seed listing, which say the words apart', () => {
    // The seed reads "3 BHK Apartment **at** Lakeview Heights, Whitefield" and
    // its slug leads with the project: the phrase people search for is in
    // neither, and the analyser is right to say so.
    const results = run('property', property);
    expect(results['keyword-in-title'].status).toBe('pass');
    expect(results['keyword-in-description'].status).toBe('fail');
    expect(results['keyword-in-slug'].status).toBe('fail');
  });

  it('fails each when the keyword is somewhere else', () => {
    const changed = withSeo(property, { focusKeyword: 'villas in hebbal' });
    const results = run('property', changed);
    expect(results['keyword-in-title'].status).toBe('fail');
    expect(results['keyword-in-description'].status).toBe('fail');
    expect(results['keyword-in-slug'].status).toBe('fail');
  });

  it('fails all three when there is no keyword to look for', () => {
    const results = run('property', withSeo(property, { focusKeyword: '' }));
    expect(results['keyword-in-title'].status).toBe('fail');
    expect(results['keyword-in-description'].status).toBe('fail');
    expect(results['keyword-in-slug'].status).toBe('fail');
  });

  it('fails the description test when there is no description at all', () => {
    const result = run('property', withSeo(property, { description: '' }))[
      'keyword-in-description'
    ];
    expect(result.status).toBe('fail');
    expect(result.message).toBe('No meta description.');
  });
});

describe('keyword-in-content and keyword-in-first-10-percent', () => {
  it('pass when the body opens with the keyword', () => {
    const record = {
      ...property,
      description: `<p>A 3 BHK apartment in Whitefield.</p>${'<p>More words about it.</p>'.repeat(10)}`,
    };
    const results = run('property', record);
    expect(results['keyword-in-content'].status).toBe('pass');
    expect(results['keyword-in-first-10-percent'].status).toBe('pass');
  });

  it('fail when the body never uses the keyword', () => {
    const record = { ...property, description: '<p>Nothing relevant here at all.</p>' };
    const results = run('property', record);
    expect(results['keyword-in-content'].status).toBe('fail');
    expect(results['keyword-in-first-10-percent'].status).toBe('fail');
  });

  it('flag a keyword that only turns up at the end of a long body', () => {
    const record = {
      ...property,
      description: `${'<p>Filler words in a paragraph here.</p>'.repeat(20)}<p>A 3 BHK apartment in Whitefield.</p>`,
    };
    const results = run('property', record);
    expect(results['keyword-in-content'].status).toBe('pass');
    expect(results['keyword-in-first-10-percent'].status).toBe('fail');
  });

  it('are skipped for a record with no body of its own', () => {
    const results = run('articleCategory', { id: 1, name: 'Buying Guides', slug: 'buying-guides' });
    expect(results['keyword-in-content'].status).toBe('skip');
    expect(results['keyword-in-first-10-percent'].status).toBe('skip');
    expect(results['keyword-in-content'].weight).toBe(0);
  });
});

describe('content-length', () => {
  const body = (words) => `<p>${'word '.repeat(words)}</p>`;

  it('passes a listing at the threshold of its type', () => {
    const result = run('property', {
      ...property,
      description: body(CONTENT_LENGTH.property.good),
    })['content-length'];
    expect(result.status).toBe('pass');
  });

  it('warns a listing between the two thresholds', () => {
    const result = run('property', { ...property, description: body(200) })['content-length'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('200 words');
  });

  it('fails a listing under the lower threshold', () => {
    const result = run('property', { ...property, description: body(50) })['content-length'];
    expect(result.status).toBe('fail');
  });

  it('asks an article for more than a listing', () => {
    expect(CONTENT_LENGTH.article.good).toBeGreaterThan(CONTENT_LENGTH.property.good);
    expect(run('article', { ...article, content: body(400) })['content-length'].status).toBe(
      'warn'
    );
    expect(run('article', article)['content-length'].status).toBe('pass');
  });

  it('is skipped for a taxonomy record (§4.3)', () => {
    expect(
      run('author', { id: 1, name: 'Editorial Team', slug: 'editorial-team' })['content-length']
        .status
    ).toBe('skip');
  });
});

describe('title-length', () => {
  const at = (length) => withSeo(property, { title: filler(length) });

  it('passes a title of 50 to 60 characters', () => {
    expect(run('property', at(55))['title-length'].status).toBe('pass');
    expect(run('property', at(50))['title-length'].status).toBe('pass');
    expect(run('property', at(60))['title-length'].status).toBe('pass');
  });

  it('warns just outside the guide', () => {
    expect(run('property', at(45))['title-length'].status).toBe('warn');
    expect(run('property', at(63))['title-length'].status).toBe('warn');
  });

  it('fails well outside it', () => {
    expect(run('property', at(20))['title-length'].status).toBe('fail');
    expect(run('property', at(90))['title-length'].status).toBe('fail');
  });

  it('reports both the characters and the pixels', () => {
    const result = run('property', at(55))['title-length'];
    expect(result.message).toMatch(/55 characters, \d+ px of the 580 px/);
  });

  it('fails a record with no title at all', () => {
    const untitled = { ...property, title: '', seo: { ...property.seo, title: '' } };
    expect(run('property', untitled)['title-length'].status).toBe('fail');
  });
});

describe('description-length', () => {
  const at = (length) => withSeo(property, { description: filler(length) });

  it('passes 120 to 160 characters', () => {
    expect(run('property', at(130))['description-length'].status).toBe('pass');
  });

  it('warns when a description inside the character guide runs past 920 px', () => {
    const result = run('property', at(160))['description-length'];
    expect(result.status).toBe('warn');
    expect(result.hint).toContain('cut this description off');
  });

  it('warns just outside the guide', () => {
    expect(run('property', at(110))['description-length'].status).toBe('warn');
    expect(run('property', at(170))['description-length'].status).toBe('warn');
  });

  it('fails well outside it', () => {
    expect(run('property', at(40))['description-length'].status).toBe('fail');
    expect(run('property', at(260))['description-length'].status).toBe('fail');
  });

  it('fails when there is no description', () => {
    const result = run('property', at(0))['description-length'];
    expect(result.status).toBe('fail');
    expect(result.message).toBe('No meta description.');
  });
});

describe('description-unique', () => {
  it('passes a description no other record uses', () => {
    const changed = withSeo(property, {
      description: 'A description that belongs to this listing and to nothing else on the site.',
    });
    expect(run('property', changed)['description-unique'].status).toBe('pass');
  });

  it('warns when another record already uses it', () => {
    const stolen = withSeo({ ...property, id: 999 }, { description: siteIndex[1].seo.description });
    const result = run('property', stolen)['description-unique'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain(siteIndex[1].title);
  });

  it('reads a description that differs only in case as identical (§7)', () => {
    const shouted = withSeo(
      { ...property, id: 999 },
      { description: siteIndex[1].seo.description.toUpperCase() }
    );
    expect(run('property', shouted)['description-unique'].status).toBe('warn');
  });

  it('does not accuse a record of copying itself', () => {
    expect(run('property', property)['description-unique'].status).toBe('pass');
  });

  it('is skipped when the site-wide list has not been loaded', () => {
    expect(run('property', property, { siteIndex: [] })['description-unique'].status).toBe('skip');
  });

  it('fails when there is no description to compare', () => {
    expect(
      run('property', withSeo(property, { description: '' }))['description-unique'].status
    ).toBe('fail');
  });
});

describe('an empty record', () => {
  it('fails or skips every basic test, and never warns', () => {
    const results = Object.values(run('property', {}));
    expect(results.every((result) => result.status === 'fail' || result.status === 'skip')).toBe(
      true
    );
  });
});
