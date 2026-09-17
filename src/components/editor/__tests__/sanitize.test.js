/**
 * The allow-list (prompt 32, ART-04).
 *
 * Two things are being asserted here and they matter equally: that nothing
 * dangerous survives, and that everything the editor writes does. A sanitiser
 * that eats figures, tables or the `data-sna-block` placeholders is a sanitiser
 * that silently deletes an editor's work on the way to the database.
 */

import sanitizeHtml, { isAllowedEmbedUrl } from '../sanitize';

describe('sanitizeHtml — what it keeps', () => {
  it('keeps the whole editor vocabulary', () => {
    const html =
      '<h2>Heading</h2><h3>Sub</h3><h4>Sub-sub</h4>' +
      '<p><strong>Bold</strong> <em>italic</em> <u>underline</u> <s>struck</s> <code>code</code>' +
      ' <mark>marked</mark> <sup>1</sup><sub>2</sub></p>' +
      '<blockquote><p>Quoted</p></blockquote><ul><li>One</li></ul><ol><li>Two</li></ol><hr>';

    expect(sanitizeHtml(html)).toBe(html);
  });

  it('keeps a figure with its caption, alignment and width', () => {
    const html =
      '<figure class="sna-figure" data-align="center" data-width="wide">' +
      '<img src="https://example.com/a.png" alt="A plan" loading="lazy" width="1200" height="700">' +
      '<figcaption>The plan</figcaption></figure>';

    const clean = sanitizeHtml(html);
    expect(clean).toContain('<figure class="sna-figure" data-align="center" data-width="wide">');
    expect(clean).toContain('alt="A plan"');
    expect(clean).toContain('loading="lazy"');
    expect(clean).toContain('<figcaption>The plan</figcaption>');
  });

  it('keeps a table', () => {
    const html =
      '<table><thead><tr><th colspan="2">Head</th></tr></thead>' +
      '<tbody><tr><td rowspan="2">Cell</td></tr></tbody></table>';

    expect(sanitizeHtml(html)).toBe(html);
  });

  it('keeps a YouTube embed', () => {
    const html =
      '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/abc123" ' +
      'width="640" height="360" allowfullscreen="true" frameborder="0"></iframe></div>';

    const clean = sanitizeHtml(html);
    expect(clean).toContain('youtube-nocookie.com/embed/abc123');
    expect(clean).toContain('data-youtube-video');
  });

  it('keeps every data-sna-block placeholder with its payload', () => {
    const cta =
      '<div data-sna-block="cta" data-title="Need help?" data-text="Talk to us." ' +
      'data-button-label="Talk to us" data-button-href="/contact" data-lead-source="article"></div>';
    const properties = '<div data-sna-block="properties" data-ids="1,3"></div>';
    const faq =
      '<div data-sna-block="faq" data-items="[{&quot;question&quot;:&quot;Q?&quot;,' +
      '&quot;answer&quot;:&quot;&lt;p&gt;A&lt;/p&gt;&quot;}]"></div>';

    const clean = sanitizeHtml(`${cta}${properties}${faq}`);
    expect(clean).toContain('data-sna-block="cta"');
    expect(clean).toContain('data-lead-source="article"');
    expect(clean).toContain('data-sna-block="properties"');
    expect(clean).toContain('data-ids="1,3"');
    expect(clean).toContain('data-sna-block="faq"');
    expect(clean).toContain('data-items');
  });

  it('keeps our own class names and drops everyone else’s', () => {
    const clean = sanitizeHtml(
      '<p class="sna-note prose-lead MsoNormal western">Text</p><p class="MsoNormal">More</p>'
    );
    expect(clean).toContain('class="sna-note prose-lead"');
    expect(clean).toContain('<p>More</p>');
  });
});

describe('sanitizeHtml — what it drops', () => {
  it('strips a script, contents and all', () => {
    const clean = sanitizeHtml('<p>Before</p><script>window.alert(1)</script><p>After</p>');
    expect(clean).toBe('<p>Before</p><p>After</p>');
    expect(clean).not.toContain('alert');
  });

  it('strips event handlers', () => {
    const clean = sanitizeHtml('<p onclick="steal()" onmouseover="steal()">Text</p>');
    expect(clean).toBe('<p>Text</p>');
  });

  it('strips javascript: and data: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">Tap</a>')).toBe('<a>Tap</a>');
    expect(sanitizeHtml('<img src="data:image/png;base64,AAAA" alt="x">')).toBe('<img alt="x">');
  });

  it('strips an iframe pointing anywhere we do not embed from', () => {
    expect(sanitizeHtml('<iframe src="https://evil.example.com/x"></iframe>')).toBe('');
    expect(sanitizeHtml('<iframe src="https://www.google.com/search?q=x"></iframe>')).toBe('');
    expect(sanitizeHtml('<iframe></iframe>')).toBe('');
  });

  it('keeps the embeds the contract does allow', () => {
    expect(isAllowedEmbedUrl('https://www.youtube.com/embed/abc')).toBe(true);
    expect(isAllowedEmbedUrl('https://www.youtube-nocookie.com/embed/abc')).toBe(true);
    expect(isAllowedEmbedUrl('https://player.vimeo.com/video/1')).toBe(true);
    expect(isAllowedEmbedUrl('https://www.google.com/maps?q=12.9,77.5&output=embed')).toBe(true);
    expect(isAllowedEmbedUrl('http://www.youtube.com/embed/abc')).toBe(false);
    expect(isAllowedEmbedUrl('https://youtube.com.evil.example/embed/abc')).toBe(false);
  });

  it('strips inline styles and unknown tags while keeping their words', () => {
    const clean = sanitizeHtml(
      '<p style="mso-fareast-font-family:Calibri;color:red">Words</p><marquee>Move</marquee>'
    );
    expect(clean).toContain('<p>Words</p>');
    expect(clean).not.toContain('style');
    expect(clean).toContain('Move');
  });

  it('strips data attributes it does not know', () => {
    const clean = sanitizeHtml('<div data-sna-block="cta" data-evil="1" data-ids="2"></div>');
    expect(clean).toContain('data-sna-block="cta"');
    expect(clean).toContain('data-ids="2"');
    expect(clean).not.toContain('data-evil');
  });

  it('forces rel="noopener" on a link that opens a new tab, keeping nofollow', () => {
    expect(sanitizeHtml('<a href="https://example.com" target="_blank">Out</a>')).toContain(
      'rel="noopener"'
    );

    const kept = sanitizeHtml(
      '<a href="https://example.com" target="_blank" rel="nofollow">Out</a>'
    );
    expect(kept).toContain('nofollow');
    expect(kept).toContain('noopener');
  });

  it('answers with an empty string for nothing at all', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('   ')).toBe('');
  });
});
