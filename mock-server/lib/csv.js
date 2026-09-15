/**
 * CSV building for the lead and subscriber exports (00_MASTER_CONTEXT.md
 * §5.14).
 *
 * Excel reads a UTF-8 file as the system's legacy code page unless it starts
 * with a byte-order mark, which turns Indian names and the rupee sign into
 * mojibake — so every document produced here carries the BOM.
 */

const BOM = '﻿';

/** Reads a dotted path off an object; `undefined` when any step is missing. */
function getPath(source, path) {
  return String(path)
    .split('.')
    .reduce(
      (value, key) => (value === null || value === undefined ? undefined : value[key]),
      source
    );
}

/**
 * One CSV field: quoted when it holds a comma, a quote, a newline or leading
 * or trailing whitespace; embedded quotes are doubled (RFC 4180).
 *
 * @param {*} value arrays are joined with `; `, objects become JSON
 * @returns {string}
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';

  let text;
  if (Array.isArray(value)) text = value.map((entry) => String(entry ?? '')).join('; ');
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);

  if (/[",\r\n]/.test(text) || text !== text.trim()) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Renders rows as a CSV document with a header line.
 *
 * @param {Array<object>} rows
 * @param {Array<{key: string, label?: string}|string>} columns dotted keys, in
 *   the order they should appear; a bare string is its own label
 * @returns {string} CRLF-separated, BOM-prefixed
 */
function toCsv(rows, columns) {
  const fields = (columns ?? []).map((column) =>
    typeof column === 'string'
      ? { key: column, label: column }
      : { ...column, label: column.label ?? column.key }
  );

  const header = fields.map((field) => escapeCell(field.label)).join(',');
  const body = (rows ?? []).map((row) =>
    fields.map((field) => escapeCell(getPath(row, field.key))).join(',')
  );

  return `${BOM}${[header, ...body].join('\r\n')}\r\n`;
}

module.exports = { toCsv, escapeCell, BOM };
