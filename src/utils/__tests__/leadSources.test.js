import { LEAD_SOURCES } from '../../config/enums';
import {
  DEFAULT_FIELDS,
  ENTRY_KEYS,
  ENTRY_POINTS,
  budgetToBody,
  entryPoint,
  leadFormProps,
  requirementFields,
  withDefaults,
} from '../leadSources';

/**
 * `ENTRY_POINTS` is the only place a lead source is written down in `src/`, so
 * this suite is what stops BUG-09 from coming back: a page that invents
 * `home_loan` again cannot reach the API through this table.
 */

const FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'select', 'number', 'date'];

describe('ENTRY_POINTS', () => {
  it('covers every entry point with a canonical source', () => {
    expect(ENTRY_KEYS.length).toBeGreaterThan(0);
    for (const key of ENTRY_KEYS) {
      expect(LEAD_SOURCES.has(ENTRY_POINTS[key].source)).toBe(true);
    }
  });

  it('maps every canonical source to at least one entry point', () => {
    // `other` is the CRM's catch-all for a lead somebody files by hand; it is
    // not a place on the site, so nothing here claims it.
    const covered = new Set([...ENTRY_KEYS.map((key) => ENTRY_POINTS[key].source), 'other']);
    expect(LEAD_SOURCES.values.filter((value) => !covered.has(value))).toEqual([]);
  });

  it('gives every entry a heading and a usable set of fields', () => {
    for (const key of ENTRY_KEYS) {
      const entry = ENTRY_POINTS[key];
      expect(typeof entry.defaultTitle).toBe('string');
      expect(entry.defaultTitle.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.fields)).toBe(true);
      expect(entry.fields.length).toBeGreaterThan(0);
    }
  });

  it('describes every field the way LeadForm reads one', () => {
    const fields = ENTRY_KEYS.flatMap((key) =>
      ENTRY_POINTS[key].fields.map((field) => ({ key, field }))
    );

    expect(fields.filter(({ field }) => !field.name || typeof field.name !== 'string')).toEqual([]);
    expect(fields.filter(({ field }) => !field.label || typeof field.label !== 'string')).toEqual(
      []
    );
    expect(
      fields
        .filter(({ field }) => !FIELD_TYPES.includes(field.type))
        .map(({ key, field }) => `${key}.${field.name}: ${field.type}`)
    ).toEqual([]);
  });

  it('gives every select something to choose from', () => {
    const selects = ENTRY_KEYS.flatMap((key) =>
      ENTRY_POINTS[key].fields
        .filter((field) => field.type === 'select')
        .map((field) => ({
          name: `${key}.${field.name}`,
          options: typeof field.options === 'function' ? field.options({}) : field.options,
        }))
    );

    expect(selects.length).toBeGreaterThan(0);
    expect(selects.filter((s) => !Array.isArray(s.options) || s.options.length === 0)).toEqual([]);
  });

  it('asks for a name and a phone number everywhere a lead is filed', () => {
    for (const key of ENTRY_KEYS) {
      const entry = ENTRY_POINTS[key];
      if (entry.subscriber) continue;
      const required = entry.fields.filter((field) => field.required).map((field) => field.name);
      expect(required).toEqual(expect.arrayContaining(['name', 'phone']));
    }
  });

  it('gates only the deliveries that have something to unlock', () => {
    const gated = ENTRY_KEYS.filter((key) => ENTRY_POINTS[key].gated);
    expect(gated.sort()).toEqual(
      ['brochure-download', 'document-request', 'floor-plan-request'].sort()
    );
    for (const key of gated) {
      expect(['floorPlans', 'documents']).toContain(ENTRY_POINTS[key].gated);
    }
  });
});

describe('entryPoint', () => {
  it('returns the entry, or null for a name nothing declares', () => {
    expect(entryPoint('home-loan').source).toBe('home-loan');
    expect(entryPoint('home_loan')).toBeNull();
  });
});

describe('leadFormProps', () => {
  it('spreads the entry as LeadForm props, heading included', () => {
    const props = leadFormProps('faq');
    expect(props.source).toBe('faq');
    expect(props.title).toBe(ENTRY_POINTS.faq.defaultTitle);
    expect(props.fields).toBe(ENTRY_POINTS.faq.fields);
  });

  it('lets a caller override anything, including the heading', () => {
    const props = leadFormProps('faq', { title: 'Ask away', propertyId: 7 });
    expect(props.title).toBe('Ask away');
    expect(props.propertyId).toBe(7);
    expect(props.source).toBe('faq');
  });

  it('keeps the modal-only keys out of the props', () => {
    const props = leadFormProps('brochure-download');
    expect(props).not.toHaveProperty('gated');
    expect(props).not.toHaveProperty('defaultTitle');
  });

  it('opens a named box on a value without touching the others', () => {
    const props = leadFormProps('property-enquiry', { prefill: { message: 'Price for 3 BHK' } });
    expect(props).not.toHaveProperty('prefill');
    const message = props.fields.find((field) => field.name === 'message');
    const name = props.fields.find((field) => field.name === 'name');
    expect(message.defaultValue).toBe('Price for 3 BHK');
    expect(name.defaultValue).toBeUndefined();
  });
});

describe('withDefaults', () => {
  it('leaves the original descriptors alone', () => {
    const patched = withDefaults(DEFAULT_FIELDS, { name: 'Asha' });
    expect(patched[0].defaultValue).toBe('Asha');
    expect(DEFAULT_FIELDS[0].defaultValue).toBeUndefined();
  });
});

describe('requirementFields', () => {
  it('nests every answer under `requirement` (§6.7)', () => {
    for (const field of requirementFields()) {
      expect(field.group).toBe('requirement');
    }
  });

  it('follows the listing type to the right budget scale (D90)', () => {
    const budget = requirementFields().find((field) => field.name === 'budget');
    const sale = budget.options({ listingType: 'sale' });
    const rent = budget.options({ listingType: 'rent' });
    expect(sale).not.toEqual(rent);
    expect(budget.options({ listingType: 'lease' })).toEqual(rent);
  });

  it('offers the master data it was given', () => {
    const fields = requirementFields({
      propertyTypes: [{ id: 3, name: 'Villa' }],
      localities: [{ id: 9, name: 'Whitefield' }],
    });
    expect(fields.find((field) => field.name === 'propertyTypeId').options).toEqual([
      { value: '3', label: 'Villa' },
    ]);
    expect(fields.find((field) => field.name === 'localityId').options).toEqual([
      { value: '9', label: 'Whitefield' },
    ]);
  });
});

describe('budgetToBody', () => {
  it('splits a bucket into the two numbers the API stores', () => {
    expect(budgetToBody('2500000-5000000')).toEqual({ budgetMin: 2500000, budgetMax: 5000000 });
  });

  it('leaves the open-ended top band without a maximum', () => {
    expect(budgetToBody('100000000-')).toEqual({ budgetMin: 100000000, budgetMax: null });
  });
});
