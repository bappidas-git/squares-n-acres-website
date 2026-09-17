import article from './fixtures/article.json';
import {
  MAX_PARAGRAPH_WORDS,
  countSyllables,
  fleschLabel,
  fleschReadingEase,
  isPassiveSentence,
  paragraphStats,
  passiveVoice,
  readability,
  sentenceStats,
  subheadingDistribution,
  transitionWords,
} from '../readability';

describe('countSyllables', () => {
  it('counts a short word as one', () => {
    expect(countSyllables('flat')).toBe(1);
    expect(countSyllables('the')).toBe(1);
  });

  it('counts vowel groups', () => {
    expect(countSyllables('apartment')).toBe(3);
    expect(countSyllables('registration')).toBe(4);
  });

  it('drops a silent final e', () => {
    expect(countSyllables('house')).toBe(1);
  });

  it('reads a number digit by digit', () => {
    expect(countSyllables('2026')).toBe(4);
  });

  it('counts nothing as nothing', () => {
    expect(countSyllables('')).toBe(0);
    expect(countSyllables('—')).toBe(0);
  });
});

describe('fleschReadingEase', () => {
  it('scores plain English high', () => {
    const easy = 'The flat is new. It has three rooms. The park is close. We can see it today.';
    expect(fleschReadingEase(easy)).toBeGreaterThan(80);
  });

  it('scores a dense legal sentence low', () => {
    const hard =
      'Notwithstanding the aforementioned registration requirements, the promoter shall, subject to the applicable regulatory determinations, maintain proportionate allocations within a designated project account.';
    expect(fleschReadingEase(hard)).toBeLessThan(30);
  });

  it('answers null when there is nothing to score', () => {
    expect(fleschReadingEase('')).toBeNull();
  });

  it('describes the number in words', () => {
    expect(fleschLabel(90)).toBe('very easy');
    expect(fleschLabel(65)).toBe('plain English');
    expect(fleschLabel(55)).toBe('fairly hard');
    expect(fleschLabel(40)).toBe('hard');
    expect(fleschLabel(10)).toBe('very hard');
    expect(fleschLabel(null)).toBe('not measurable');
  });
});

describe('sentenceStats', () => {
  it('counts sentences and averages their length', () => {
    const stats = sentenceStats('One two three. Four five.');
    expect(stats.count).toBe(2);
    expect(stats.words).toBe(5);
    expect(stats.averageWords).toBe(2.5);
  });

  it('counts the sentences that run past the limit', () => {
    const long = `${'word '.repeat(30)}. Short one.`;
    expect(sentenceStats(long).long).toBe(1);
  });

  it('answers zero for nothing', () => {
    expect(sentenceStats('').count).toBe(0);
  });
});

describe('paragraphStats', () => {
  it('measures each paragraph', () => {
    const stats = paragraphStats('<p>One two</p><p>Three</p>');
    expect(stats.count).toBe(2);
    expect(stats.longest).toBe(2);
    expect(stats.long).toBe(0);
  });

  it('flags a paragraph past the limit', () => {
    const stats = paragraphStats(`<p>${'word '.repeat(MAX_PARAGRAPH_WORDS + 10)}</p>`);
    expect(stats.long).toBe(1);
  });
});

describe('subheadingDistribution', () => {
  it('measures the text between the headings', () => {
    const stats = subheadingDistribution('<p>Intro words here</p><h2>One</h2><p>Two words</p>');
    expect(stats.sections).toEqual([
      { heading: null, words: 3 },
      { heading: 'One', words: 2 },
    ]);
    expect(stats.longest).toBe(3);
    expect(stats.over).toBe(0);
  });

  it('counts a body with no headings as one long section', () => {
    const stats = subheadingDistribution(`<p>${'word '.repeat(400)}</p>`);
    expect(stats.sections).toHaveLength(1);
    expect(stats.over).toBe(1);
  });

  it('answers nothing for nothing', () => {
    expect(subheadingDistribution('').sections).toEqual([]);
  });
});

describe('the passive-voice heuristic', () => {
  it('finds an auxiliary followed by a past participle', () => {
    expect(isPassiveSentence('The plan was approved by the authority.')).toBe(true);
    expect(isPassiveSentence('The escrow account is maintained separately.')).toBe(true);
  });

  it('finds an irregular participle', () => {
    expect(isPassiveSentence('The flat was sold last year.')).toBe(true);
  });

  it('leaves the active voice alone', () => {
    expect(isPassiveSentence('The authority approved the plan.')).toBe(false);
    expect(isPassiveSentence('The promoter files the plan every quarter.')).toBe(false);
  });

  it('does not mistake an adjective that ends in -ed or -en for a participle', () => {
    expect(isPassiveSentence('The door is red.')).toBe(false);
    expect(isPassiveSentence('The kitchen is open.')).toBe(false);
  });

  it('reports the share of a body', () => {
    const stats = passiveVoice('The plan was approved. The authority approved the plan.');
    expect(stats.passive).toBe(1);
    expect(stats.count).toBe(2);
    expect(stats.percent).toBe(50);
  });
});

describe('transition words', () => {
  it('counts the sentences that carry one', () => {
    const stats = transitionWords('However, the plan changed. The plan changed.');
    expect(stats.withTransition).toBe(1);
    expect(stats.percent).toBe(50);
  });

  it('counts none when there are none', () => {
    expect(transitionWords('One thing. Another thing.').withTransition).toBe(0);
  });

  it('does not mistake a longer word for a transition word', () => {
    expect(transitionWords('Soften the blow. Thereabouts lies the answer.').withTransition).toBe(0);
  });
});

describe('readability over a seed article', () => {
  const measured = readability(article.content);

  it('measures every dimension at once', () => {
    expect(measured.words).toBeGreaterThan(500);
    expect(measured.sentences.count).toBeGreaterThan(20);
    expect(measured.paragraphs.count).toBeGreaterThan(5);
    expect(measured.subheadings.sections.length).toBeGreaterThan(2);
    expect(typeof measured.flesch).toBe('number');
    expect(measured.passive.ratio).toBeLessThan(1);
    expect(measured.transitions.ratio).toBeGreaterThan(0);
  });
});
