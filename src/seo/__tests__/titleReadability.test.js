import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import siteIndex from './fixtures/siteIndex.json';
import { runTitleReadabilityTests } from '../analyzers/titleReadability';
import { toSeoInput } from '../entityAdapters';
import { POWER_WORDS, findPowerWord } from '../data/powerWords';

const baseContext = { ...masterData, seoSettings, siteIndex };

const run = (entity, extra = {}) => {
  const context = { ...baseContext, ...extra };
  const results = runTitleReadabilityTests(toSeoInput('property', entity, context), context);
  return Object.fromEntries(results.map((result) => [result.id, result]));
};

const titled = (title, rest = {}) => ({
  ...property,
  ...rest,
  seo: { ...property.seo, title, ...(rest.seo ?? {}) },
});

describe('the group', () => {
  it('runs the five tests of SEO-08', () => {
    const ids = runTitleReadabilityTests(
      toSeoInput('property', property, baseContext),
      baseContext
    ).map((result) => result.id);
    expect(ids).toEqual([
      'keyword-at-start',
      'title-has-number',
      'title-power-word',
      'title-not-all-caps',
      'title-unique-site',
    ]);
  });
});

describe('keyword-at-start', () => {
  it('passes when the title opens with the keyword', () => {
    expect(
      run(titled('3 BHK Apartment in Whitefield, ready to move'))['keyword-at-start'].status
    ).toBe('pass');
  });

  it('warns when the keyword is near the start but not at it', () => {
    expect(
      run(titled('Buy a 3 BHK apartment in Whitefield today'))['keyword-at-start'].status
    ).toBe('warn');
  });

  it('fails when the keyword is in the second half', () => {
    expect(
      run(
        titled('A quiet gated project with a pool, a clubhouse and a 3 BHK apartment in Whitefield')
      )['keyword-at-start'].status
    ).toBe('fail');
  });

  it('fails when the title does not carry the keyword at all', () => {
    expect(run(titled('A very nice place indeed'))['keyword-at-start'].status).toBe('fail');
  });

  it('fails when there is no keyword to look for', () => {
    const record = titled('A title', { seo: { focusKeyword: '' } });
    expect(run(record)['keyword-at-start'].status).toBe('fail');
  });
});

describe('title-has-number', () => {
  it('passes a title with a number', () => {
    expect(run(titled('3 BHK Apartment in Whitefield'))['title-has-number'].status).toBe('pass');
  });

  it('warns a title without one', () => {
    expect(run(titled('Apartment in Whitefield'))['title-has-number'].status).toBe('warn');
  });

  it('fails when there is no title at all', () => {
    expect(run({})['title-has-number'].status).toBe('fail');
  });
});

describe('title-power-word', () => {
  it('passes a title with a real-estate power word', () => {
    const result = run(titled('Ready-to-move 3 BHK apartment in Whitefield'))['title-power-word'];
    expect(result.status).toBe('pass');
    expect(result.message).toContain('ready-to-move');
  });

  it('matches a power word typed with spaces instead of hyphens', () => {
    expect(findPowerWord('A ready to move flat')).toBe('ready-to-move');
  });

  it('counts the current year as a power word', () => {
    expect(findPowerWord('Bengaluru property guide 2026', new Date('2026-03-01'))).toBe('guide');
    expect(findPowerWord('Bengaluru market in 2026', new Date('2026-03-01'))).toBe('2026');
    expect(findPowerWord('Bengaluru market in 2019', new Date('2026-03-01'))).toBeNull();
  });

  it('does not mistake a longer word for a power word', () => {
    expect(findPowerWord('The topography of the site')).toBeNull();
    expect(findPowerWord('Read our guidelines')).toBeNull();
  });

  it('warns a title with none of them', () => {
    expect(run(titled('Flat number 7 in a building'))['title-power-word'].status).toBe('warn');
  });

  it('offers a real-estate list rather than a magazine one', () => {
    expect(POWER_WORDS).toContain('ready-to-move');
    expect(POWER_WORDS).toContain('rera-approved');
    expect(POWER_WORDS).not.toContain('shocking');
  });
});

describe('title-not-all-caps', () => {
  it('passes a title in sentence case', () => {
    expect(run(titled('3 BHK Apartment in Whitefield'))['title-not-all-caps'].status).toBe('pass');
  });

  it('forgives the initialisms a property title is written with', () => {
    expect(
      run(titled('3 BHK flat near the ORR with RERA approval'))['title-not-all-caps'].status
    ).toBe('pass');
  });

  it('warns at more than one shouted word', () => {
    const result = run(titled('A LUXURY SPACIOUS flat in Whitefield'))['title-not-all-caps'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('LUXURY');
  });

  it('fails a title entirely in capitals', () => {
    expect(run(titled('3 BHK APARTMENT IN WHITEFIELD'))['title-not-all-caps'].status).toBe('fail');
  });

  it('fails when there is no title to check', () => {
    expect(run({})['title-not-all-caps'].status).toBe('fail');
  });
});

describe('title-unique-site', () => {
  it('passes a title no other record uses', () => {
    expect(run(titled('A title nothing else on this site uses'))['title-unique-site'].status).toBe(
      'pass'
    );
  });

  it('warns when another record already uses it', () => {
    const clash = titled(siteIndex[1].seo.title, { id: 999 });
    const result = run(clash)['title-unique-site'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain(siteIndex[1].title);
  });

  it('is skipped without the site-wide list', () => {
    expect(run(property, { siteIndex: [] })['title-unique-site'].status).toBe('skip');
  });
});
