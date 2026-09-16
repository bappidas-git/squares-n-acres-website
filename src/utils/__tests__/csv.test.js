/**
 * `utils/csv.js` — the part of an export that has to survive the data
 * (D44, NEW-22).
 */

import { CSV_MIME, csvDateStamp, csvFileName, escapeCsvValue, toCsv } from '../csv';

const COLUMNS = [
  { label: 'ID', value: (row) => row.id },
  { label: 'Title', value: 'title' },
  { label: 'Active', value: (row) => row.isActive },
];

const ROWS = [
  { id: 1, title: 'Lakeview Heights', isActive: true },
  { id: 2, title: 'Nandi Ridge', isActive: false },
];

/** The document without its byte-order mark, split into records. */
const linesOf = (csv) => csv.replace(/^﻿/, '').trimEnd().split('\r\n');

describe('toCsv', () => {
  it('opens with the UTF-8 BOM Excel needs', () => {
    expect(toCsv(ROWS, COLUMNS).startsWith('﻿')).toBe(true);
  });

  it('writes the header and one CRLF-terminated record per row', () => {
    const csv = toCsv(ROWS, COLUMNS);

    expect(linesOf(csv)).toEqual(['ID,Title,Active', '1,Lakeview Heights,Yes', '2,Nandi Ridge,No']);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it('writes the header alone when there is nothing to export', () => {
    expect(linesOf(toCsv([], COLUMNS))).toEqual(['ID,Title,Active']);
    expect(linesOf(toCsv(null, COLUMNS))).toEqual(['ID,Title,Active']);
  });

  it('reads a column by its key when it has no value function', () => {
    const csv = toCsv([{ title: 'Nandi Ridge' }], [{ label: 'Title', key: 'title' }]);
    expect(linesOf(csv)).toEqual(['Title', 'Nandi Ridge']);
  });

  it('keeps a field with a comma, a quote or a line break in one cell', () => {
    const rows = [{ title: 'Whitefield, Bengaluru' }, { title: 'The "Grand" Villa' }];
    const csv = toCsv([...rows, { title: 'Two\nlines' }], [{ label: 'Title', value: 'title' }]);

    expect(linesOf(csv)).toEqual([
      'Title',
      '"Whitefield, Bengaluru"',
      '"The ""Grand"" Villa"',
      '"Two\nlines"',
    ]);
  });
});

describe('escapeCsvValue', () => {
  it('leaves an ordinary value alone', () => {
    expect(escapeCsvValue('Lakeview Heights')).toBe('Lakeview Heights');
    expect(escapeCsvValue(12400000)).toBe('12400000');
  });

  it('writes nothing for a missing value rather than "null"', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('writes a boolean as the Yes/No an editor reads', () => {
    expect(escapeCsvValue(true)).toBe('Yes');
    expect(escapeCsvValue(false)).toBe('No');
  });

  it('quotes a value whose spaces would otherwise be trimmed', () => {
    expect(escapeCsvValue(' padded ')).toBe('" padded "');
  });

  it('stops a spreadsheet from evaluating a value as a formula', () => {
    expect(escapeCsvValue('=1+1')).toBe("'=1+1");
    expect(escapeCsvValue('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvValue('+919880000001')).toBe("'+919880000001");
  });

  it('leaves a negative number a number', () => {
    expect(escapeCsvValue(-500)).toBe('-500');
    expect(escapeCsvValue('-1.5')).toBe('-1.5');
  });
});

describe('csvFileName', () => {
  it('names the file after the day it was taken, in IST', () => {
    // 19:30 UTC is already the next day in Asia/Kolkata (+05:30).
    expect(csvFileName('properties', new Date('2026-09-16T19:30:00Z'))).toBe(
      'properties-2026-09-17.csv'
    );
    expect(csvDateStamp(new Date('2026-09-16T10:00:00Z'))).toBe('2026-09-16');
  });
});

describe('CSV_MIME', () => {
  it('declares the encoding the BOM promises', () => {
    expect(CSV_MIME).toBe('text/csv;charset=utf-8');
  });
});
