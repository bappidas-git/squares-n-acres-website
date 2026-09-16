import { Icon } from '@iconify/react';

import {
  AREA_UNITS,
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  FACING,
  FURNISHING,
  OWNERSHIP,
} from '../../../config/enums';
import { formatArea, formatBhk, formatMonthYear, formatNumber } from '../../../utils/format';

import styles from './KeyFacts.module.css';

/** A value the record actually carries — `0` counts, `''` and `null` do not. */
const has = (value) => value !== null && value !== undefined && value !== '';

const areaLabel = (unit) => AREA_UNITS.labelOf(unit) || 'sq ft';

/**
 * The facts the listing carries, in the order the grid prints them.
 *
 * Exported so the rule — "a fact with nothing behind it is not a row" — can be
 * asserted without a render. Every entry is `{ key, label, value, icon }` and
 * `value` is already formatted: nothing downstream has to know that an area
 * has a unit or that a possession date is shown to the month.
 *
 * @param {object} property a record of §6.1
 * @returns {Array<{key: string, label: string, value: string, icon: string}>}
 */
export function keyFacts(property) {
  if (!property || typeof property !== 'object') return [];

  const configuration = property.configuration ?? {};
  const area = property.area ?? {};
  const unit = areaLabel(area.areaUnit);
  const facts = [];

  const add = (key, label, value, icon) => {
    if (has(value)) facts.push({ key, label, value: String(value), icon });
  };

  add('propertyType', 'Property type', property.propertyType?.name, 'mdi:home-city-outline');
  add(
    'constructionStatus',
    'Status',
    CONSTRUCTION_STATUS.labelOf(property.constructionStatus),
    'mdi:progress-clock'
  );
  add(
    'bedrooms',
    'Configuration',
    has(configuration.bedrooms) ? formatBhk(configuration.bedrooms) : null,
    'mdi:bed-outline'
  );
  add(
    'bathrooms',
    'Bathrooms',
    has(configuration.bathrooms) ? formatNumber(configuration.bathrooms) : null,
    'mdi:shower'
  );
  add(
    'balconies',
    'Balconies',
    has(configuration.balconies) ? formatNumber(configuration.balconies) : null,
    'mdi:balcony'
  );
  add(
    'superBuiltUpArea',
    'Super built-up area',
    has(area.superBuiltUpArea) ? formatArea(area.superBuiltUpArea, unit) : null,
    'mdi:ruler-square'
  );
  add(
    'builtUpArea',
    'Built-up area',
    has(area.builtUpArea) ? formatArea(area.builtUpArea, unit) : null,
    'mdi:ruler-square'
  );
  add(
    'carpetArea',
    'Carpet area',
    has(area.carpetArea) ? formatArea(area.carpetArea, unit) : null,
    'mdi:ruler-square'
  );
  add(
    'plotArea',
    'Plot area',
    has(area.plotArea) ? formatArea(area.plotArea, unit) : null,
    'mdi:texture-box'
  );
  add(
    'plotDimensions',
    'Plot dimensions',
    has(area.plotLength) && has(area.plotWidth)
      ? `${formatNumber(area.plotLength)} × ${formatNumber(area.plotWidth)} ${areaLabel(area.plotDimensionUnit) === 'sq m' ? 'm' : 'ft'}`
      : null,
    'mdi:vector-rectangle'
  );
  add(
    'floor',
    'Floor',
    has(property.floorNumber)
      ? has(property.totalFloors)
        ? `${formatNumber(property.floorNumber)} of ${formatNumber(property.totalFloors)}`
        : formatNumber(property.floorNumber)
      : null,
    'mdi:stairs'
  );
  add('facing', 'Facing', FACING.labelOf(property.facing), 'mdi:compass-outline');
  add('furnishing', 'Furnishing', FURNISHING.labelOf(property.furnishing), 'mdi:sofa-outline');

  // A finished home has an age; one still being built has a promise.
  if (has(property.possessionDate) && property.constructionStatus !== 'ready-to-move') {
    add('possession', 'Possession', formatMonthYear(property.possessionDate), 'mdi:calendar-clock');
  } else if (has(property.ageOfPropertyYears)) {
    const years = Number(property.ageOfPropertyYears);
    add(
      'age',
      'Age of property',
      years <= 0 ? 'Newly built' : `${formatNumber(years)} year${years === 1 ? '' : 's'} old`,
      'mdi:calendar-check-outline'
    );
  }

  add('ownership', 'Ownership', OWNERSHIP.labelOf(property.ownership), 'mdi:file-document-outline');

  const covered = Number(configuration.parkingCovered ?? 0);
  const open = Number(configuration.parkingOpen ?? 0);
  if (covered > 0 || open > 0) {
    add(
      'parking',
      'Parking',
      [covered > 0 ? `${covered} covered` : null, open > 0 ? `${open} open` : null]
        .filter(Boolean)
        .join(' + '),
      'mdi:car-outline'
    );
  }

  add(
    'availability',
    'Availability',
    AVAILABILITY.labelOf(property.availability),
    'mdi:key-outline'
  );

  return facts;
}

/**
 * The headline facts of a listing as a definition grid.
 *
 * Only the facts the record carries are printed: an apartment shows its floor
 * and a plot shows its dimensions, and neither shows an em dash where the other
 * one has data (BUG-05).
 *
 * @param {object} props
 * @param {object} props.property
 */
export default function KeyFacts({ property }) {
  const facts = keyFacts(property);
  if (facts.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="key-facts-heading">
      <h2 className={styles.heading} id="key-facts-heading">
        Key facts
      </h2>
      <dl className={styles.grid}>
        {facts.map((fact) => (
          <div key={fact.key} className={styles.fact}>
            <dt className={styles.label}>
              <Icon icon={fact.icon} className={styles.icon} aria-hidden="true" />
              {fact.label}
            </dt>
            <dd className={styles.value}>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
