/**
 * Markdown helpers for the handover package (prompt 47).
 *
 * Everything the generator writes goes through here, so a table that renders
 * on GitHub renders the same way in the package: fixed column order, escaped
 * pipes, `—` for "nothing to say" and never the string `undefined`.
 */

/** How wide a column is padded before it is left to overflow. */
const MAX_COLUMN = 48;

/** A GitHub-flavoured table cell: never empty, never a raw `|`, never multi-line. */
function cell(value) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
}

/**
 * A GitHub-flavoured Markdown table.
 *
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 * @returns {string} the table, or a one-line note when there are no rows
 */
function table(headers, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '_None._';

  const body = rows.map((row) => headers.map((_, index) => cell(row[index])));
  // Padded columns are what makes a table readable in a plain editor, but one
  // long cell would pad every other row to its width and treble the file. A
  // cell wider than this simply overflows; Markdown renders it the same.
  const widths = headers.map((header, index) =>
    Math.min(MAX_COLUMN, Math.max(cell(header).length, ...body.map((row) => row[index].length)))
  );

  const line = (values) => `| ${values.map((v, i) => v.padEnd(widths[i])).join(' | ')} |`;

  return [
    line(headers.map(cell)),
    `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`,
    ...body.map(line),
  ].join('\n');
}

/** A fenced code block. `language` may be empty. */
const code = (text, language = '') =>
  `\`\`\`${language}\n${String(text).replace(/\s+$/, '')}\n\`\`\``;

/** Inline code, with backticks in the value neutralised. */
const mono = (value) => `\`${String(value).replace(/`/g, "'")}\``;

/** A bullet list; an empty list becomes the same "_None._" a table uses. */
const list = (items) =>
  items.length === 0 ? '_None._' : items.map((item) => `- ${item}`).join('\n');

/**
 * The GitHub heading anchor of a heading's text — the id the checker and the
 * package's own cross-links use.
 */
const anchor = (heading) =>
  String(heading)
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/** Joins blocks with exactly one blank line between them, dropping empties. */
const blocks = (...parts) =>
  parts
    .flat()
    .filter((part) => typeof part === 'string' && part.trim() !== '')
    .map((part) => part.replace(/\s+$/, ''))
    .join('\n\n');

/** A two-column card: `**Label** value`, which reads better than a table. */
const facts = (entries) =>
  entries
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `- **${label}** ${value}`)
    .join('\n');

module.exports = { anchor, blocks, cell, code, facts, list, mono, table, MAX_COLUMN };
