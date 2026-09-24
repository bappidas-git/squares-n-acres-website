import {
  GOING_LIVE,
  PUBLISH_MIN_WORDS,
  goesLive,
  publishGaps,
  publishProblems,
} from '../articleRules';

/**
 * The publish rules, as the form and the API both read them (QA-55): the
 * sentence an editor sees under a field is the sentence a 422 answers with.
 */
describe('articleRules', () => {
  const ready = {
    excerpt: 'What the BBMP asks for, and in what order.',
    featuredImage: { url: 'https://images.test/khata.jpg', alt: 'A khata extract' },
  };

  it('lets a complete article go live', () => {
    expect(publishProblems(ready, PUBLISH_MIN_WORDS)).toEqual({});
  });

  it('names everything an article lacks, keyed the way a 422 keys it', () => {
    expect(publishProblems({ excerpt: '   ', featuredImage: { url: '' } }, 212)).toEqual({
      excerpt: 'An excerpt is required before an article goes live.',
      'featuredImage.url': 'A featured image is required before an article goes live.',
      content: 'An article needs at least 300 words to go live — this one has 212.',
    });
  });

  it('reads a missing image, a missing article and a word count that is not a number', () => {
    expect(Object.keys(publishProblems({ ...ready, featuredImage: null }, 400))).toEqual([
      'featuredImage.url',
    ]);
    expect(Object.keys(publishProblems(undefined, 400))).toEqual(['excerpt', 'featuredImage.url']);
    expect(publishProblems(ready, 'many').content).toBe(
      'An article needs at least 300 words to go live — this one has 0.'
    );
  });

  it('shortens the problems to the phrases a list of several articles prints', () => {
    const problems = publishProblems({}, 212);
    expect(publishGaps(problems, 212)).toEqual([
      'no excerpt',
      'no featured image',
      '212 of 300 words',
    ]);
    expect(publishGaps({}, 900)).toEqual([]);
  });

  it('treats a scheduled article as one going live', () => {
    expect(GOING_LIVE).toEqual(['published', 'scheduled']);
    expect(goesLive('scheduled')).toBe(true);
    expect(goesLive('published')).toBe(true);
    expect(goesLive('draft')).toBe(false);
    expect(goesLive('archived')).toBe(false);
  });
});
