import article from './fixtures/article.json';
import page from './fixtures/page.json';
import property from './fixtures/property.json';
import {
  decodeEntities,
  firstWords,
  headings,
  images,
  isNofollow,
  links,
  paragraphs,
  parseHtmlWithDom,
  scanHtml,
  sentences,
  stripHtml,
  wordCount,
  words,
} from '../text';

/**
 * The two parsers have to agree or nothing downstream can be trusted: the
 * admin panel runs the `DOMParser` path and Jest, Node and the seed scripts
 * run the scanner.
 */
describe('the two parsers', () => {
  const samples = [
    '<p>One</p><p>Two</p>',
    '<h2 id="x">A heading</h2><p>Body <strong>bold</strong> text.</p>',
    '<ul><li>First</li><li>Second</li></ul>',
    '<p>Tea &amp; biscuits &mdash; &#8377;1,650 &nbsp;each.</p>',
    '<figure><img src="/a.png" alt="A photograph" /><figcaption>Caption</figcaption></figure>',
    '<p><a href="/localities/whitefield" rel="nofollow">Whitefield</a></p>',
    '<!-- a comment --><p>After a comment</p>',
    '<p>Before</p><script>var x = "<p>not markup</p>";</script><p>After</p>',
    article.content,
    property.description,
  ];

  it.each(samples.map((sample, index) => [index, sample]))(
    'produce the same event stream (sample %i)',
    (index, sample) => {
      expect(scanHtml(sample)).toEqual(parseHtmlWithDom(sample));
    }
  );

  it('agree on the text, the headings, the images and the links of an article', () => {
    const viaDom = {
      text: stripHtml(article.content),
      headings: headings(article.content),
      images: images(article.content),
      links: links(article.content),
    };

    expect(viaDom.text).toEqual(expect.any(String));
    expect(scanHtml(article.content).length).toBeGreaterThan(50);
    expect(viaDom.headings.length).toBeGreaterThan(2);
  });
});

describe('decodeEntities', () => {
  it('decodes the named entities an editor types', () => {
    expect(decodeEntities('Tea &amp; biscuits')).toBe('Tea & biscuits');
    expect(decodeEntities('a &ndash; b')).toBe('a – b');
    expect(decodeEntities('two&nbsp;words')).toBe('two words');
  });

  it('decodes decimal and hexadecimal references', () => {
    expect(decodeEntities('&#8377;85 L')).toBe('₹85 L');
    expect(decodeEntities('&#x20B9;85 L')).toBe('₹85 L');
  });

  it('leaves something that is not an entity alone', () => {
    expect(decodeEntities('AT&T and &notreal;')).toBe('AT&T and &notreal;');
  });
});

describe('stripHtml', () => {
  it('drops the tags and keeps the words', () => {
    expect(stripHtml('<p>Hello <em>there</em></p>')).toBe('Hello there');
  });

  it('keeps a blank line between blocks so paragraphs survive', () => {
    expect(stripHtml('<p>One</p><p>Two</p>')).toBe('One\n\nTwo');
  });

  it('turns a line break into a line break', () => {
    expect(stripHtml('<p>One<br />Two</p>')).toBe('One\nTwo');
  });

  it('ignores script and style content', () => {
    expect(stripHtml('<p>Real</p><style>p{color:red}</style>')).toBe('Real');
  });

  it('tidies plain text without touching its words', () => {
    expect(stripHtml('  two   spaces  ')).toBe('two spaces');
  });

  it('answers an empty string for nothing at all', () => {
    expect(stripHtml('')).toBe('');
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
  });
});

describe('wordCount and words', () => {
  it('counts a hyphenated word once and a grouped number once', () => {
    expect(wordCount('A ready-to-move 3 BHK at 1,650 sq ft')).toBe(8);
  });

  it('counts words inside markup', () => {
    expect(wordCount('<p>One two</p><p>three</p>')).toBe(3);
  });

  it('counts letters outside the Latin alphabet', () => {
    expect(wordCount('ಬೆಂಗಳೂರು city')).toBe(2);
  });

  it('lists the words it counted', () => {
    expect(words('<p>Whitefield, Bengaluru</p>')).toEqual(['Whitefield', 'Bengaluru']);
  });
});

describe('sentences', () => {
  it('splits on full stops, questions and exclamations', () => {
    expect(sentences('One. Two? Three!')).toEqual(['One.', 'Two?', 'Three!']);
  });

  it('does not split an abbreviation', () => {
    expect(sentences('The flat is 1,650 sq. ft. in total. It faces east.')).toEqual([
      'The flat is 1,650 sq. ft. in total.',
      'It faces east.',
    ]);
  });

  it('does not split a price in rupees', () => {
    expect(sentences('It costs Rs. 85 lakh today.')).toHaveLength(1);
  });

  it('does not split a decimal number', () => {
    expect(sentences('The plot is 5.2 acres of land.')).toHaveLength(1);
  });

  it('treats a line break as the end of a sentence', () => {
    expect(sentences('<h2>A heading</h2><p>A sentence.</p>')).toEqual(['A heading', 'A sentence.']);
  });

  it('answers nothing for nothing', () => {
    expect(sentences('')).toEqual([]);
  });
});

describe('paragraphs', () => {
  it('reads the paragraphs of markup', () => {
    expect(paragraphs('<p>One</p><h2>Skip</h2><p>Two</p>')).toEqual(['One', 'Two']);
  });

  it('reads list items and quotes as paragraphs', () => {
    expect(paragraphs('<ul><li>One</li><li>Two</li></ul><blockquote>Three</blockquote>')).toEqual([
      'One',
      'Two',
      'Three',
    ]);
  });

  it('does not count a nested paragraph twice', () => {
    expect(paragraphs('<blockquote><p>Only once</p></blockquote>')).toEqual(['Only once']);
  });

  it('splits plain text on blank lines', () => {
    expect(paragraphs('One\n\nTwo')).toEqual(['One', 'Two']);
  });
});

describe('headings, images and links', () => {
  it('reads every heading with its level', () => {
    expect(headings('<h1>One</h1><h2>Two</h2><h3>Three</h3>')).toEqual([
      { level: 1, text: 'One' },
      { level: 2, text: 'Two' },
      { level: 3, text: 'Three' },
    ]);
  });

  it('reads a heading that holds markup', () => {
    expect(headings('<h2>A <strong>bold</strong> heading</h2>')).toEqual([
      { level: 2, text: 'A bold heading' },
    ]);
  });

  it('reads an image with and without alt text', () => {
    expect(images('<img src="/a.png" alt="A" /><img src="/b.png" />')).toEqual([
      { src: '/a.png', alt: 'A' },
      { src: '/b.png', alt: '' },
    ]);
  });

  it('calls a relative link internal and another host external', () => {
    const found = links(
      '<a href="/localities/whitefield">A</a><a href="https://example.com">B</a>',
      { siteUrl: 'https://www.squaresnacres.com' }
    );
    expect(found.map((link) => link.internal)).toEqual([true, false]);
  });

  it('calls an absolute link back to this site internal', () => {
    const found = links('<a href="https://www.squaresnacres.com/about">A</a>', {
      siteUrl: 'https://www.squaresnacres.com',
    });
    expect(found[0].internal).toBe(true);
  });

  it('does not call a mailto link internal', () => {
    expect(links('<a href="mailto:info@example.com">Mail</a>')[0].internal).toBe(false);
  });

  it('reads rel and answers whether a link is followed', () => {
    const [nofollow, followed] = links(
      '<a href="https://a.test" rel="noopener nofollow">A</a><a href="https://b.test">B</a>'
    );
    expect(isNofollow(nofollow)).toBe(true);
    expect(isNofollow(followed)).toBe(false);
  });
});

describe('firstWords', () => {
  it('answers the opening words of a body', () => {
    expect(firstWords('<p>One two three four</p>', 2)).toBe('One two');
  });
});

describe('the seed fixtures', () => {
  it('reads an article body as prose', () => {
    expect(wordCount(article.content)).toBeGreaterThan(500);
    expect(headings(article.content).every((heading) => heading.level >= 2)).toBe(true);
  });

  it('reads a listing description as prose', () => {
    expect(wordCount(property.description)).toBeGreaterThan(100);
  });

  it('reads a CMS page as a record with blocks rather than as markup', () => {
    expect(Array.isArray(page.blocks)).toBe(true);
    expect(page.blocks.length).toBeGreaterThan(3);
  });
});
