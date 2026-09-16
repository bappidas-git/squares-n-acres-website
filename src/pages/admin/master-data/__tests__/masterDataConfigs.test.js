import {
  amenitiesConfig,
  badgesConfig,
  banksConfig,
  propertyTypesConfig,
  usedBySentence,
} from '../masterDataConfigs';
import { AMENITY_CATEGORIES, BADGE_TONES, SEGMENTS } from '../../../../config/enums';
import { schemas } from '../../../../services/schemas';

/**
 * The four configurations of prompt 15, checked against the write schemas of
 * `src/services/schemas` — the model both the form and the API validate
 * against. A field the schema does not know is a field the API will drop.
 */
const CONFIGS = [
  { entity: 'propertyType', key: 'propertyTypes', config: propertyTypesConfig() },
  { entity: 'amenity', key: 'amenities', config: amenitiesConfig() },
  { entity: 'badge', key: 'badges', config: badgesConfig() },
  { entity: 'bank', key: 'banks', config: banksConfig() },
];

/** Columns that are computed by the API rather than stored (§5.5). */
const READ_ONLY_COLUMNS = new Set(['propertyCount', 'createdAt', 'updatedAt']);

/** Filters every screen offers that are not fields of the record. */
const GENERIC_FILTERS = new Set(['q', 'isActive']);

describe.each(CONFIGS)('$key config', ({ entity, key, config }) => {
  const createSchema = schemas[`${entity}.create`];

  it('names its collection and its service', () => {
    expect(config.key).toBe(key);
    expect(typeof config.title).toBe('string');
    expect(typeof config.singular).toBe('string');
    expect(typeof config.service.list).toBe('function');
    expect(typeof config.service.create).toBe('function');
    expect(typeof config.service.patch).toBe('function');
    expect(typeof config.service.remove).toBe('function');
  });

  it('carries the entity’s own schemas', () => {
    expect(config.schema).toBe(schemas[`${entity}.update`]);
    expect(config.createSchema).toBe(createSchema);
  });

  it('only edits fields the schema knows', () => {
    const unknown = config.formFields
      .map((field) => field.name)
      .filter((name) => !Object.prototype.hasOwnProperty.call(createSchema, name));

    expect(unknown).toEqual([]);
  });

  it('offers a control for every required field', () => {
    const required = Object.entries(createSchema)
      .filter(([, descriptor]) => descriptor.required)
      .map(([name]) => name);
    const edited = new Set(config.formFields.map((field) => field.name));

    expect(required.filter((name) => !edited.has(name))).toEqual([]);
  });

  it('starts a new record on values the schema accepts', () => {
    const unknown = Object.keys(config.newValues ?? {}).filter(
      (name) => !Object.prototype.hasOwnProperty.call(createSchema, name)
    );

    expect(unknown).toEqual([]);
  });

  it('shows columns that exist on the record', () => {
    const unknown = config.columns
      .map((column) => column.key)
      .filter(
        (name) =>
          !READ_ONLY_COLUMNS.has(name) && !Object.prototype.hasOwnProperty.call(createSchema, name)
      );

    expect(unknown).toEqual([]);
  });

  it('has exactly one primary column, so a row has a name', () => {
    expect(config.columns.filter((column) => column.primary)).toHaveLength(1);
  });

  it('filters on fields the record has', () => {
    const unknown = config.filters
      .map((filter) => filter.key)
      .filter(
        (name) =>
          !GENERIC_FILTERS.has(name) && !Object.prototype.hasOwnProperty.call(createSchema, name)
      );

    expect(unknown).toEqual([]);
  });

  it('can be reordered and toggled from the list', () => {
    expect(config.orderable).toBe(true);
    expect(config.activeToggle).toBe(true);
    expect(config.defaultSort).toEqual(expect.objectContaining({ order: 'asc' }));
  });

  it('explains where the data is used', () => {
    expect(config.subtitle).toEqual(expect.any(String));
    expect(config.subtitle.length).toBeGreaterThan(20);
  });
});

describe('property types', () => {
  const config = propertyTypesConfig();

  it('hangs its slug off the buy route (D25)', () => {
    expect(config.slugBase).toBe('/buy/');
  });

  it('offers every segment', () => {
    const segment = config.formFields.find((field) => field.name === 'segment');
    expect(segment.options).toEqual(SEGMENTS.options);
  });

  it('refuses an icon id that is not an Iconify MDI id', () => {
    expect(config.validate({ icon: 'mdi:home-city-outline' })).toEqual({});
    expect(config.validate({ icon: 'Home' })).toHaveProperty('icon');
    expect(config.validate({ icon: 'mdi:Home_City' })).toHaveProperty('icon');
    expect(config.validate({ icon: '' })).toHaveProperty('icon');
  });

  it('sends the stored SEO back so a rename cannot wipe it', () => {
    const seo = { title: 'Villas in Bengaluru', slug: 'villas' };
    expect(config.toPayload({ name: 'Villas' }, { id: 2, seo })).toEqual({
      name: 'Villas',
      seo,
    });
    expect(config.toPayload({ name: 'Villas' }, {})).toEqual({ name: 'Villas' });
  });

  it('asks before moving a type that listings already carry', async () => {
    const usedBy = [
      { type: 'property', id: 1, title: 'Lakeview Heights' },
      { type: 'property', id: 2, title: 'Nandi Ridge' },
    ];
    jest.spyOn(config.service, 'get').mockResolvedValue({ data: { usedBy } });

    const warning = await config.confirmSave(
      { segment: 'commercial' },
      { id: 2, name: 'Villas', segment: 'residential' }
    );

    expect(config.service.get).toHaveBeenCalledWith(2, { params: { withUsage: true } });
    expect(warning.usedBy).toEqual(usedBy);
    expect(warning.message).toContain('Used by 2 properties');
    expect(warning.confirmLabel).toBe('Change segment');
  });

  it('says nothing when the segment is unchanged or nothing points at the type', async () => {
    jest.spyOn(config.service, 'get').mockResolvedValue({ data: { usedBy: [] } });

    await expect(
      config.confirmSave({ segment: 'residential' }, { id: 2, segment: 'residential' })
    ).resolves.toBeNull();
    await expect(
      config.confirmSave({ segment: 'land' }, { id: 2, name: 'Villas', segment: 'residential' })
    ).resolves.toBeNull();
    await expect(config.confirmSave({ segment: 'land' }, {})).resolves.toBeNull();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});

describe('amenities', () => {
  const config = amenitiesConfig();

  it('groups the table by category, and only in that sort', () => {
    expect(config.groupSort).toBe('category');
    expect(config.defaultSort.field).toBe('category');
    expect(config.groupBy({ category: 'kids' })).toEqual({
      key: 'kids',
      label: AMENITY_CATEGORIES.labelOf('kids'),
    });
  });

  it('names a category the enum does not know rather than dropping the row', () => {
    expect(config.groupBy({}).label).toBe('Uncategorised');
  });

  it('refuses an invalid icon id', () => {
    expect(config.validate({ icon: 'mdi:dog' })).toEqual({});
    expect(config.validate({ icon: 'dog' })).toHaveProperty('icon');
  });
});

describe('badges', () => {
  const config = badgesConfig();

  it('stores a tone token, never a colour', () => {
    const colour = config.formFields.find((field) => field.name === 'color');
    expect(colour.type).toBe('tone');
    expect(BADGE_TONES.values).toContain(config.newValues.color);
  });

  it('allows a badge with no icon at all', () => {
    expect(config.validate({ icon: '' })).toEqual({});
    expect(config.validate({ icon: null })).toEqual({});
    expect(config.validate({ icon: 'nope' })).toHaveProperty('icon');
  });
});

describe('banks', () => {
  const config = banksConfig();

  it('deletes without a usage guard, because nothing points at a bank', () => {
    expect(config.usageGuard).toBe(false);
  });

  it('refuses a rate range that runs backwards', () => {
    expect(config.validate({ interestRateMin: 8.35, interestRateMax: 8.95 })).toEqual({});
    expect(config.validate({ interestRateMin: 9, interestRateMax: 8 })).toHaveProperty(
      'interestRateMax'
    );
    expect(config.validate({ interestRateMin: 8, interestRateMax: null })).toEqual({});
  });

  it('refuses a loan range that runs backwards', () => {
    expect(config.validate({ minLoanAmount: 5000000, maxLoanAmount: 1000000 })).toHaveProperty(
      'maxLoanAmount'
    );
  });

  it('keeps the rate and tenure controls inside the documented bounds', () => {
    const byName = Object.fromEntries(config.formFields.map((field) => [field.name, field]));

    expect(byName.interestRateMin).toEqual(expect.objectContaining({ min: 5, max: 20 }));
    expect(byName.interestRateMax).toEqual(expect.objectContaining({ min: 5, max: 20 }));
    expect(byName.maxTenureYears).toEqual(expect.objectContaining({ min: 5, max: 40 }));
    expect(byName.maxLtvPercent).toEqual(expect.objectContaining({ min: 50, max: 95 }));
  });
});

describe('usedBySentence', () => {
  it('counts each kind of usage', () => {
    expect(usedBySentence([{ type: 'property' }])).toBe('Used by 1 property');
    expect(usedBySentence([{ type: 'property' }, { type: 'property' }])).toBe(
      'Used by 2 properties'
    );
    expect(usedBySentence([{ type: 'property' }, { type: 'faq' }])).toBe(
      'Used by 1 property and 1 FAQ'
    );
    expect(usedBySentence([])).toBe('');
  });
});
