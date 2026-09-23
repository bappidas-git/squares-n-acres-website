/**
 * `fromRecord` ∘ `toPayload` is stable over the whole seed (prompt 44).
 *
 * The form's two translators are the only code between a stored property and
 * the body that replaces it. `toPayload.test.js` and `fromRecord.test.js` each
 * prove one of them against hand-written values; this suite proves the pair
 * against all forty seed records, which is where the shapes the fixtures never
 * thought of live — a plot with no configuration, a lease with no price, a
 * project whose timeline is empty, a listing whose images arrive out of order.
 *
 * Two properties are asserted for each record:
 *
 *   1. **Idempotence.** `fromRecord(toPayload(fromRecord(record)))` equals
 *      `fromRecord(record)`. Opening a listing, saving it untouched and opening
 *      it again must give the editor the form they had. Anything that fails
 *      here is a field the form silently rewrites on every save.
 *   2. **Fidelity.** The first payload's editable fields still say what the
 *      record said — a save that has quietly dropped a unit, a document or an
 *      amenity is a data-loss bug the round-trip alone would not notice,
 *      because the second pass would drop it just as happily.
 *
 * The records come from `db.json` through `fs`, so the suite tracks the seed
 * rather than a copy of it.
 *
 * Two values are allowed to differ between the passes, by design:
 *
 *   - a `tmp-<n>` row id, a React key this browser invented for a row the API
 *     has never seen. `toPayload` strips them and `fromRecord` mints fresh
 *     ones, so comparing them would assert the counter rather than the data.
 *     Every id that *is* data — an integer the API assigned — is compared as
 *     it stands.
 *   - a field the form hides for this listing, which the save leaves out —
 *     the age of a plot. The expected value below names it exactly.
 *
 * `pricing.pricePerSqft` used to be the second exemption: the first save
 * stored the derived rate (D33), and the next open read the stored figure as
 * one typed by hand — so the rate stopped following the price after one save.
 * `fromRecord` now reads a stored rate that *is* the division as "following",
 * which makes the pair exact with no allowance at all.
 */

import fs from 'fs';
import path from 'path';

import fromRecord from '../fromRecord';
import toPayload from '../toPayload';
import { derivedPricePerSqft, showsAge } from '../fieldRules';
import { isTmpId } from '../initialState';

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'db.json'), {
    encoding: 'utf-8',
  })
);

const properties = seed.properties;

/** Every `tmp-<n>` collapsed to one token, so a comparison ignores the counter. */
const withoutTmpIds = (value) => {
  if (Array.isArray(value)) return value.map(withoutTmpIds);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === 'id' && isTmpId(entry) ? 'tmp' : withoutTmpIds(entry),
    ])
  );
};

/** The lists whose length a save must never change. */
const COUNTED_LISTS = [
  'highlights',
  'amenityIds',
  'badgeIds',
  'specifications',
  'constructionSpecs',
  'unitConfigurations',
  'floorPlans',
  'images',
  'documents',
  'nearbyPlaces',
  'constructionTimeline',
  'faqs',
  'similarPropertyIds',
];

/** The scalars a save must carry through untouched. */
const CARRIED_SCALARS = [
  'title',
  'slug',
  'listingType',
  'segment',
  'propertyTypeId',
  'constructionStatus',
  'availability',
  'possessionDate',
  'reraRegistered',
  'description',
  'shortDescription',
  'isActive',
  'isFeatured',
  'isVerified',
  'priorityOrder',
];

describe('the property form round-trips every seed record', () => {
  it('has a seed worth testing against', () => {
    expect(properties.length).toBeGreaterThanOrEqual(30);
  });

  it.each(properties.map((property) => [property.slug, property.id]))(
    '%s (#%i) survives fromRecord → toPayload → fromRecord unchanged',
    (slug) => {
      const record = properties.find((row) => row.slug === slug);

      const first = fromRecord(record);
      const second = fromRecord({ ...toPayload(first), id: record.id });

      // The one thing a save may change: a field the form does not show for
      // this listing is not sent — a plot has no building age, so the seed's
      // `0` on the five plots comes back empty.
      const expected = {
        ...first,
        ageOfPropertyYears: showsAge(first) ? first.ageOfPropertyYears : null,
      };

      expect(withoutTmpIds(second)).toEqual(withoutTmpIds(expected));
    }
  );

  it.each(properties.map((property) => [property.slug, property.id]))(
    '%s (#%i) keeps every editable field on the way to the API',
    (slug) => {
      const record = properties.find((row) => row.slug === slug);
      const payload = toPayload(fromRecord(record));

      for (const key of CARRIED_SCALARS) {
        const expected = record[key] === undefined ? null : record[key];
        // `possessionDate` and friends are nullable strings; the form holds
        // `''` for "nothing" and the payload turns that back into `null`.
        expect({ key, value: payload[key] ?? null }).toEqual({ key, value: expected ?? null });
      }

      for (const key of COUNTED_LISTS) {
        expect({ key, length: payload[key].length }).toEqual({
          key,
          length: (record[key] ?? []).length,
        });
      }

      expect(payload.pricing.price).toEqual(record.pricing?.price ?? null);
      expect(payload.pricing.rentPerMonth).toEqual(record.pricing?.rentPerMonth ?? null);
      expect(payload.pricing.priceOnRequest).toBe(record.pricing?.priceOnRequest === true);
      expect(payload.area.areaUnit).toBe(record.area?.areaUnit ?? 'sqft');
      expect(payload.location.localityId).toBe(record.location?.localityId ?? null);
      expect(payload.location.cityId).toBe(record.location?.cityId ?? null);
      expect(payload.project.developerId).toBe(record.project?.developerId ?? null);
      expect(payload.configuration.bedrooms).toEqual(record.configuration?.bedrooms ?? null);

      // D34: the entity slug and `seo.slug` leave the form as one string.
      expect(payload.seo.slug).toBe(payload.slug);

      // A `tmp-` id is this browser's React key and never the API's business.
      expect(JSON.stringify(payload)).not.toContain('tmp-');
    }
  );

  it.each(properties.filter((property) => (property.images ?? []).length > 0).map((p) => [p.slug]))(
    '%s keeps exactly one cover image',
    (slug) => {
      const record = properties.find((row) => row.slug === slug);
      const payload = toPayload(fromRecord(record));

      expect(payload.images.filter((image) => image.isCover)).toHaveLength(1);
      expect(payload.images.map((image) => image.order)).toEqual(
        payload.images.map((_, index) => index + 1)
      );
    }
  );

  it('stores the derived rate, and reads it back as still following the price', () => {
    const record = properties.find(
      (row) =>
        row.listingType === 'sale' &&
        row.pricing?.price &&
        row.pricing?.pricePerSqft == null &&
        derivedPricePerSqft(fromRecord(row)) !== null
    );
    expect(record).toBeDefined();

    const payload = toPayload(fromRecord(record));
    // D33: the API keeps the rate the form worked out…
    expect(payload.pricing.pricePerSqft).toBe(derivedPricePerSqft(fromRecord(record)));
    // …and the form does not mistake it for one somebody typed.
    expect(fromRecord({ ...payload, id: record.id }).pricing.pricePerSqft).toBeNull();
  });

  it('is stable from the second save on, whatever the first one derived', () => {
    const record = properties.find((row) => row.pricing?.pricePerSqft == null) ?? properties[0];

    const saved = fromRecord({ ...toPayload(fromRecord(record)), id: record.id });
    const savedAgain = fromRecord({ ...toPayload(saved), id: record.id });

    expect(withoutTmpIds(savedAgain)).toEqual(withoutTmpIds(saved));
  });

  it('drops the read-only embeds the API adds (§5.5)', () => {
    const record = properties.find((row) => row.amenityIds?.length > 0);
    const payload = toPayload(
      fromRecord({ ...record, propertyType: { id: 1, name: 'Apartment' } })
    );

    for (const key of ['propertyType', 'amenities', 'badges', 'viewCount', 'enquiryCount']) {
      expect(payload).not.toHaveProperty(key);
    }
    expect(payload.location).not.toHaveProperty('locality');
    expect(payload.project).not.toHaveProperty('developer');
  });
});
