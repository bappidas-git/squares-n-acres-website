/**
 * Segments as master data (QA-52): what a slug is called and what it behaves
 * as, with and without the collection, and the choices a form offers.
 */

import {
  BUILT_IN_SEGMENT_SLUGS,
  SEGMENT_KIND_OPTIONS,
  isBuiltInSegment,
  knownSegments,
  segmentKind,
  segmentName,
  segmentOptions,
  setKnownSegments,
} from '../segments';
import { SEGMENTS } from '../enums';

const COLLECTION = [
  { id: 2, name: 'Commercial', slug: 'commercial', kind: 'commercial', order: 2 },
  { id: 1, name: 'Homes', slug: 'residential', kind: 'residential', order: 1 },
  { id: 3, name: 'Plots & Land', slug: 'land', kind: 'land', order: 3 },
  { id: 4, name: 'Industrial', slug: 'industrial', kind: 'commercial', order: 4 },
  { id: 5, name: 'Farmland', slug: 'farmland', kind: 'land', order: 5, isActive: false },
];

afterEach(() => setKnownSegments([]));

describe('the built-in segments', () => {
  it('are the three enum values, each its own kind', () => {
    expect(BUILT_IN_SEGMENT_SLUGS).toEqual(SEGMENTS.values);
    for (const slug of SEGMENTS.values) {
      expect(isBuiltInSegment(slug)).toBe(true);
      expect(segmentKind(slug)).toBe(slug);
    }
    expect(isBuiltInSegment('industrial')).toBe(false);
  });

  it('keep their kind whatever a stale collection claims', () => {
    expect(segmentKind('commercial', [{ slug: 'commercial', kind: 'land' }])).toBe('commercial');
  });
});

describe('segmentKind', () => {
  it('reads an added segment from the collection it is handed', () => {
    expect(segmentKind('industrial', COLLECTION)).toBe('commercial');
    expect(segmentKind('farmland', COLLECTION)).toBe('land');
  });

  it('reads the registry when it is handed nothing', () => {
    expect(segmentKind('industrial')).toBeNull();
    setKnownSegments(COLLECTION);
    expect(knownSegments()).toHaveLength(COLLECTION.length);
    expect(segmentKind('industrial')).toBe('commercial');
  });

  it('answers null for a slug nobody knows, or a kind that is not one', () => {
    expect(segmentKind('hangars', COLLECTION)).toBeNull();
    expect(segmentKind('odd', [{ slug: 'odd', kind: 'office' }])).toBeNull();
    expect(segmentKind('', COLLECTION)).toBeNull();
    expect(segmentKind(undefined, COLLECTION)).toBeNull();
  });
});

describe('segmentName', () => {
  it('prefers the name an editor gave, then the enum label, then the slug', () => {
    expect(segmentName('residential', COLLECTION)).toBe('Homes');
    expect(segmentName('residential')).toBe('Residential');
    expect(segmentName('land')).toBe('Plots & Land');
    expect(segmentName('industrial', COLLECTION)).toBe('Industrial');
    expect(segmentName('hangars', COLLECTION)).toBe('hangars');
  });
});

describe('segmentOptions', () => {
  it('offers the active segments in their order', () => {
    expect(segmentOptions(COLLECTION)).toEqual([
      { value: 'residential', label: 'Homes' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'land', label: 'Plots & Land' },
      { value: 'industrial', label: 'Industrial' },
    ]);
  });

  it('keeps a retired segment the record is already in, labelled so', () => {
    expect(segmentOptions(COLLECTION, { current: 'farmland' })).toContainEqual({
      value: 'farmland',
      label: 'Farmland (inactive)',
    });
  });

  it('offers every segment to a filter', () => {
    expect(segmentOptions(COLLECTION, { activeOnly: false }).map((option) => option.value)).toEqual(
      ['residential', 'commercial', 'land', 'industrial', 'farmland']
    );
  });

  it('falls back to the built-ins before the collection has loaded', () => {
    expect(segmentOptions([])).toEqual(SEGMENTS.options);
    expect(segmentOptions(undefined, { current: 'industrial' })).toContainEqual({
      value: 'industrial',
      label: 'industrial',
    });
  });

  it('never drops a current segment the collection does not hold', () => {
    expect(segmentOptions(COLLECTION, { current: 'hangars' })).toContainEqual({
      value: 'hangars',
      label: 'hangars',
    });
  });
});

describe('SEGMENT_KIND_OPTIONS', () => {
  it('offers the three kinds, each with what it gives a listing', () => {
    expect(SEGMENT_KIND_OPTIONS.map((option) => option.value)).toEqual(SEGMENTS.values);
    expect(SEGMENT_KIND_OPTIONS[1].label).toMatch(/^Commercial — .*no rooms/);
  });
});
