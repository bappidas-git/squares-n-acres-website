/**
 * The Nginx export (prompt 37 §4.7).
 *
 * The snippet is pasted into a production server, so what it must never do is
 * more interesting than what it does: match more than the exact path it was
 * written for, or let a note or a strange path break out of its line.
 */

import { NGINX_FILENAME, nginxSnippet } from '../nginxSnippet';

const rule = (overrides = {}) => ({
  fromPath: '/old-properties',
  toPath: '/properties',
  statusCode: 301,
  isActive: true,
  note: null,
  ...overrides,
});

const body = (rows, options) => nginxSnippet(rows, { header: false, ...options });

describe('nginxSnippet', () => {
  it('writes one exact-match location per rule', () => {
    expect(body([rule()]).trim()).toBe('location = /old-properties { return 301 /properties; }');
  });

  it('keeps the status code the rule carries', () => {
    expect(body([rule({ statusCode: 302 })])).toContain('return 302 /properties;');
  });

  it('falls back to 301 for anything that is not 302', () => {
    expect(body([rule({ statusCode: 307 })])).toContain('return 301 ');
    expect(body([rule({ statusCode: undefined })])).toContain('return 301 ');
  });

  it('takes an absolute target as it is', () => {
    expect(body([rule({ toPath: 'https://example.com/moved' })])).toContain(
      'return 301 https://example.com/moved;'
    );
  });

  it('comments an inactive rule out rather than dropping it', () => {
    const output = body([rule({ isActive: false })]);
    expect(output).toContain('# (inactive) location = /old-properties');
    expect(output).not.toMatch(/^location = \/old-properties/m);
  });

  it('writes a note as a comment on its own line', () => {
    const output = body([rule({ note: 'Merged into the Whitefield listing' })]);
    expect(output).toContain('# Merged into the Whitefield listing');
  });

  it('cannot be broken out of by a note containing newlines', () => {
    const output = body([rule({ note: 'first\nreturn 500;' })]);
    expect(output).toContain('# first return 500;');
    expect(output.split('\n').filter((line) => line.includes('return 500'))).toHaveLength(1);
    expect(output).not.toMatch(/^return 500;/m);
  });

  it('quotes a path that holds anything Nginx would parse', () => {
    const output = body([rule({ fromPath: '/old properties;{}' })]);
    expect(output).toContain('location = "/old properties;{}"');
  });

  it('skips a row that could never be stored', () => {
    const output = body([
      rule({ fromPath: 'old-properties' }),
      rule({ fromPath: '/a', toPath: '' }),
    ]);
    expect(output).toContain('# No redirects are configured yet.');
  });

  it('says so when there is nothing to export', () => {
    expect(nginxSnippet([])).toContain('# No redirects are configured yet.');
  });

  it('writes a dated header unless asked not to', () => {
    const output = nginxSnippet([rule()], { generatedAt: new Date('2026-09-17T00:00:00Z') });
    expect(output).toContain('# Squares N Acres — redirects');
    expect(output).toContain('on 2026-09-17');
    expect(output).toContain('location = /old-properties');
  });

  it('ends with a newline, as a configuration file must', () => {
    expect(nginxSnippet([rule()]).endsWith('\n')).toBe(true);
  });

  it('names the file the download offers', () => {
    expect(NGINX_FILENAME).toBe('redirects.nginx.conf');
  });
});
