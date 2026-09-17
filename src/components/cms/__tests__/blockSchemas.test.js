/**
 * The block schemas (prompt 30).
 *
 * `enums.js` owns the vocabulary and `blockSchemas.js` owns how each type is
 * edited, so the one thing that must never drift is that the two agree: a type
 * in the enum with no schema is a block an editor can save and never edit
 * again, and a schema with no enum entry is a block the API would refuse.
 */

import {
  BLOCK_GROUPS,
  BLOCK_SCHEMAS,
  blockSchema,
  blockSummary,
  blocksInGroup,
  defaultData,
  fieldApplies,
  readField,
  validateBlockData,
  writeField,
} from '../BlockEditor/blockSchemas';
import { BLOCK_TYPES } from '../../../config/enums';

/** The field types `BlockForm` knows how to draw. */
const DRAWABLE = new Set([
  'text',
  'textarea',
  'richtext',
  'image',
  'url',
  'select',
  'switch',
  'number',
  'icon',
  'items',
  'stringList',
  'entity',
  'fields',
  'leadSource',
]);

const GROUP_KEYS = new Set(BLOCK_GROUPS.map((group) => group.key));

describe('blockSchemas', () => {
  it('covers every BLOCK_TYPES value, and invents none of its own', () => {
    expect(Object.keys(BLOCK_SCHEMAS).sort()).toEqual([...BLOCK_TYPES.values].sort());
  });

  it.each(BLOCK_TYPES.values)('%s has a label, an icon, a group and a default', (type) => {
    const schema = blockSchema(type);

    // The label is the enum's, not the raw value: `richText` reads "Rich text"
    // on a card, and `makeEnum` keeps labels out of `meta`.
    expect(schema.label).toBe(BLOCK_TYPES.labelOf(type));
    expect(schema.label.length).toBeGreaterThan(0);
    expect(schema.icon).toMatch(/^mdi:[a-z0-9-]+$/);
    expect(schema.description.length).toBeGreaterThan(0);
    expect(GROUP_KEYS.has(schema.group)).toBe(true);
    expect(defaultData(type)).toEqual(expect.any(Object));
  });

  it.each(BLOCK_TYPES.values)('%s only declares fields BlockForm can draw', (type) => {
    for (const field of blockSchema(type).fields) {
      expect(DRAWABLE.has(field.type)).toBe(true);
      expect(field.name.length).toBeGreaterThan(0);
      expect(field.label.length).toBeGreaterThan(0);

      for (const itemField of field.itemFields ?? []) {
        expect(DRAWABLE.has(itemField.type)).toBe(true);
        expect(itemField.name.length).toBeGreaterThan(0);
      }
    }
  });

  it('puts every type in exactly one picker group', () => {
    const grouped = BLOCK_GROUPS.flatMap((group) => blocksInGroup(group.key)).map(
      (schema) => schema.type
    );
    expect(grouped.sort()).toEqual([...BLOCK_TYPES.values].sort());
  });

  it('gives an unknown type no schema at all', () => {
    expect(blockSchema('carousel-of-doom')).toBeNull();
    expect(defaultData('carousel-of-doom')).toEqual({});
    expect(validateBlockData('carousel-of-doom', { anything: true })).toEqual({});
  });

  describe('defaults', () => {
    it('are fresh objects, so two blocks never share a list', () => {
      const first = defaultData('features');
      const second = defaultData('features');
      first.items.push({ title: 'One' });
      expect(second.items).toEqual([]);
    });

    it('open a leadForm on a canonical source', () => {
      expect(defaultData('leadForm').leadSource).toBe('contact-page');
    });
  });

  describe('validateBlockData', () => {
    it('is silent about a complete block', () => {
      expect(
        validateBlockData('features', {
          title: 'Why us',
          items: [{ icon: 'mdi:home', title: 'Local', text: 'One city, properly.' }],
        })
      ).toEqual({});
    });

    it('keys an item error the way a 422 would', () => {
      const errors = validateBlockData('features', {
        items: [{ title: 'Fine' }, { title: '' }],
      });
      expect(errors).toEqual({ 'items.1.title': 'Heading is required.' });
    });

    it('asks for what a required field needs', () => {
      expect(validateBlockData('richText', { html: '' })).toEqual({
        html: 'Content is required.',
      });
    });

    it('refuses a script tag, exactly as the API does', () => {
      expect(validateBlockData('html', { html: '<script>alert(1)</script>' })).toEqual({
        html: 'Script tags are not allowed in page content.',
      });
    });

    it('refuses a lead source that is not one of ours', () => {
      expect(validateBlockData('leadForm', { leadSource: 'home_loan', fields: [] })).toEqual({
        leadSource: 'That is not one of the lead sources this site files enquiries under.',
      });
    });

    it('only asks for the fields the chosen mode actually uses', () => {
      expect(validateBlockData('properties', { mode: 'featured' })).toEqual({});
      expect(validateBlockData('properties', { mode: 'ids', ids: [] })).toEqual({
        ids: 'Listings is required.',
      });
    });
  });

  describe('fieldApplies', () => {
    it('hides the picker unless the block is picking', () => {
      const idsField = blockSchema('properties').fields.find((field) => field.name === 'ids');
      expect(fieldApplies(idsField, { mode: 'featured' })).toBe(false);
      expect(fieldApplies(idsField, { mode: 'ids' })).toBe(true);
    });
  });

  describe('dotted paths', () => {
    it('reads and writes without mutating the block', () => {
      const data = { mode: 'filter', filter: { listingType: 'sale' } };
      expect(readField(data, 'filter.listingType')).toBe('sale');

      const next = writeField(data, 'filter.localityId', 4);
      expect(next.filter).toEqual({ listingType: 'sale', localityId: 4 });
      expect(data.filter.localityId).toBeUndefined();
    });

    it('creates the branch a nested field needs', () => {
      expect(writeField({}, 'filter.listingType', 'rent')).toEqual({
        filter: { listingType: 'rent' },
      });
    });
  });

  describe('blockSummary', () => {
    it('prefers the block’s own heading', () => {
      expect(blockSummary('features', { title: 'Why us', items: [{}] })).toBe('Why us');
    });

    it('counts the items when there is no heading', () => {
      expect(blockSummary('features', { items: [{}, {}] })).toBe('2 items');
      expect(blockSummary('features', { items: [{}] })).toBe('1 item');
    });

    it('falls back to the text of a rich-text block, without its markup', () => {
      expect(blockSummary('richText', { html: '<h2>Our story</h2><p>It began…</p>' })).toBe(
        'Our story It began…'
      );
    });

    it('says nothing about an empty block', () => {
      expect(blockSummary('richText', {})).toBe('');
      expect(blockSummary('unknown-type', {})).toBe('');
    });
  });
});
