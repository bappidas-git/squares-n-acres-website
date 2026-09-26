/**
 * No specification reference reaches a screen (prompt 51).
 *
 * The code cites the spec everywhere — "(§9.4)", "(D39)", "(QA-60)" — and that
 * is right in a comment, where the next developer reads it. In a hint, a card
 * description or a test's advice it is noise an editor cannot decode, and a
 * dozen of them had leaked into the admin's copy. This walks every source file,
 * drops the comments, and fails on a reference left in what remains: the
 * strings and the JSX text that are drawn.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

/** Every non-test JS/JSX file under `src/`. */
function sourceFiles(dir = SRC) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name) ? [full] : [];
  });
}

/** The code with its comments removed — JSX ones, block ones, line ones. */
const withoutComments = (code) =>
  code
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const TOKEN = /\((?:§[\d.]+|D\d+[a-z]?|QA-\d+)\)/;

describe('specification references', () => {
  it('stay in comments and never reach user-facing copy', () => {
    const leaks = sourceFiles().flatMap((file) =>
      withoutComments(fs.readFileSync(file, 'utf8'))
        .split('\n')
        .filter((line) => TOKEN.test(line))
        .map((line) => `${path.relative(SRC, file)}: ${line.trim()}`)
    );

    expect(leaks).toEqual([]);
  });
});
