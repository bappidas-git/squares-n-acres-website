/**
 * Paste cleanup (prompt 32, §7).
 *
 * The rule is asymmetric on purpose: structure survives, presentation does not.
 * A writer pasting three pages out of Word should get their headings, lists and
 * bold back, and none of the stylesheet that came with them.
 */

import { cleanPastedHtml } from '../pasteRules';

/** A paragraph as Word actually writes one. */
const WORD = `
<!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
<style>p.MsoNormal { mso-style-parent: ""; font-family: Calibri; }</style>
<h2 class="MsoHeading1" style="mso-outline-level:1">What it costs</h2>
<p class="MsoNormal" style="margin:0cm;mso-fareast-font-family:Calibri">
  <span style="font-size:11.0pt;mso-bidi-font-size:11.0pt">Stamp duty is </span>
  <b><span style="font-weight:bold">five per cent</span></b>
  <span>.</span>
</p>
<ul style="mso-list:l0 level1 lfo1">
  <li class="MsoListParagraph"><span>Sale deed</span></li>
  <li class="MsoListParagraph"><span>Khata certificate</span></li>
</ul>
<p class="MsoNormal">&nbsp;</p>
<p class="MsoNormal">&nbsp;</p>
`;

describe('cleanPastedHtml', () => {
  it('keeps the structure of a Word paste', () => {
    const clean = cleanPastedHtml(WORD);

    expect(clean).toContain('<h2>What it costs</h2>');
    expect(clean).toContain('Stamp duty is');
    expect(clean).toContain('<b>five per cent</b>');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<li>Sale deed</li>');
    expect(clean).toContain('<li>Khata certificate</li>');
  });

  it('drops the stylesheet, the classes and the spans that came with it', () => {
    const clean = cleanPastedHtml(WORD);

    expect(clean).not.toContain('mso-');
    expect(clean).not.toContain('MsoNormal');
    expect(clean).not.toContain('class=');
    expect(clean).not.toContain('style=');
    expect(clean).not.toContain('<span');
    expect(clean).not.toContain('<style');
    expect(clean).not.toContain('WordDocument');
  });

  it('drops the empty paragraphs a word processor spaces things out with', () => {
    expect(cleanPastedHtml(WORD)).not.toMatch(/<p>\s*(?:&nbsp;)?\s*<\/p>/);
  });

  it('unwraps the faux bold Google Docs wraps a paste in', () => {
    const clean = cleanPastedHtml(
      '<b style="font-weight:normal" id="docs-internal-guid-1"><p>Body</p></b>'
    );
    expect(clean).toContain('<p>Body</p>');
    expect(clean).not.toContain('<b');
  });

  it('keeps links and tables', () => {
    const clean = cleanPastedHtml(
      '<p><a href="https://example.com" style="color:blue">Out</a></p>' +
        '<table class="MsoTableGrid"><tbody><tr><td><p>Cell</p></td></tr></tbody></table>'
    );
    expect(clean).toContain('<a href="https://example.com">Out</a>');
    expect(clean).toContain('<table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>');
  });

  it('strips event handlers rather than trusting the sanitiser alone', () => {
    expect(cleanPastedHtml('<p onclick="steal()">Text</p>')).toBe('<p>Text</p>');
  });

  it('answers with nothing for nothing', () => {
    expect(cleanPastedHtml('')).toBe('');
    expect(cleanPastedHtml(null)).toBe('');
    expect(cleanPastedHtml('   ')).toBe('');
  });
});
