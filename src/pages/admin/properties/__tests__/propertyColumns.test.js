/**
 * What the property export writes (D44) — the columns a spreadsheet reads.
 */

import { PROPERTY_CSV_COLUMNS } from '../propertyColumns';
import { toCsv } from '../../../../utils/csv';

const valueOf = (row, label) =>
  PROPERTY_CSV_COLUMNS.find((column) => column.label === label).value(row);

describe('PROPERTY_CSV_COLUMNS', () => {
  it('writes the segment as the label the filter shows, not the stored value', () => {
    expect(valueOf({ segment: 'land' }, 'Segment')).toBe('Plots & Land');
    expect(valueOf({ segment: 'residential' }, 'Segment')).toBe('Residential');
  });

  it('carries the area of a plot, which has no built-up or carpet area', () => {
    const plot = { segment: 'land', area: { plotArea: 2.5, areaUnit: 'acre' } };

    expect(valueOf(plot, 'Plot area')).toBe(2.5);
    expect(valueOf(plot, 'Super built-up area')).toBe('');
    expect(valueOf(plot, 'Area unit')).toMatch(/acre/i);
  });

  it('puts the plot area beside the other areas in the file', () => {
    const csv = toCsv([{ id: 7, title: 'Plot', area: { plotArea: 1500 } }], PROPERTY_CSV_COLUMNS);
    const [header, line] = csv.replace(/^﻿/, '').split(/\r?\n/);
    const columns = header.split(',');

    expect(columns.indexOf('Plot area')).toBe(columns.indexOf('Carpet area') + 1);
    expect(line.split(',')[columns.indexOf('Plot area')]).toBe('1500');
  });
});
