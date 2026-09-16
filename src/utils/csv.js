/**
 * CSV for the admin exports (D44).
 *
 * The export of a filtered admin table is built in the browser out of the rows
 * the API already answered with (`perPage=all`), so there is no second export
 * endpoint to keep in step with the filters. This module is the part that has
 * to be right whatever the data contains:
 *
 *   - a UTF-8 **BOM**, or Excel reads `₹` and `–` as mojibake;
 *   - **CRLF** records, because a lone LF splits a row in Excel;
 *   - quoting around anything holding a quote, a comma, a line break or an
 *     edge space — a lead's message with a newline in it broke every later
 *     column of the boilerplate's export (NEW-22);
 *   - a guard on the leading characters a spreadsheet reads as a formula.
 *
 *   const csv = toCsv(rows, [
 *     { label: 'ID', value: (row) => row.id },
 *     { label: 'Title', value: 'title' },
 *   ]);
 */

/** The media type every export blob carries. */
export const CSV_MIME = 'text/csv;charset=utf-8';

/** Excel only reads a file as UTF-8 when it opens with the byte-order mark. */
const BOM = '﻿';

/** The record separator of RFC 4180, and the one Excel agrees with. */
const EOL = '\r\n';

/** A quote, a comma, a line break or an outer space forces a quoted field. */
const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;

/**
 * What a spreadsheet would evaluate rather than display. A leading `-` is left
 * alone for anything that is simply a negative number, which is the far more
 * common case in this data.
 */
const FORMULA_START = /^[=+@\t\r-]/;
const PLAIN_NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;

/**
 * One cell as text.
 *
 * `null` and `undefined` are an empty cell rather than the strings "null" and
 * "undefined"; a boolean is the Yes/No an editor expects to read; a number
 * stays a number, without Indian grouping, so the spreadsheet can add it up.
 */
function textOf(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return String(value);
}

/** The value a column reads out of a row: a function, or a property name. */
function valueOf(row, column) {
  if (typeof column?.value === 'function') return column.value(row);
  const key = column?.value ?? column?.key;
  return key === undefined ? '' : row?.[key];
}

/**
 * One field, escaped for RFC 4180 and safe to open in a spreadsheet.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeCsvValue(value) {
  let text = textOf(value);

  if (FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
  if (!NEEDS_QUOTES.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * A CSV document, header row first.
 *
 * With no rows the answer is the header alone — an empty export is a file with
 * the columns in it, not a file the spreadsheet refuses to open.
 *
 * @param {Array<object>} rows
 * @param {Array<{label: string, key?: string, value?: string|((row: object) => unknown)}>} columns
 * @returns {string} ready for `new Blob([csv], { type: CSV_MIME })`
 */
export function toCsv(rows = [], columns = []) {
  const header = columns.map((column) => escapeCsvValue(column.label ?? column.key));
  const body = (Array.isArray(rows) ? rows : []).map((row) =>
    columns.map((column) => escapeCsvValue(valueOf(row, column)))
  );

  return `${BOM}${[header, ...body].map((cells) => cells.join(',')).join(EOL)}${EOL}`;
}

/** `2026-09-16` in IST, so the file is named after the day it was taken (D22). */
export function csvDateStamp(date = new Date()) {
  // `en-CA` formats a date as `yyyy-mm-dd`, which is what the file name wants.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

/**
 * `properties-2026-09-16.csv`.
 *
 * @param {string} prefix
 * @param {Date} [date]
 * @returns {string}
 */
export const csvFileName = (prefix, date = new Date()) => `${prefix}-${csvDateStamp(date)}.csv`;

const csv = { CSV_MIME, csvDateStamp, csvFileName, escapeCsvValue, toCsv };

export default csv;
