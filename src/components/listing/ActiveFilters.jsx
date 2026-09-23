import { Icon } from '@iconify/react';

import styles from './ListingEngine.module.css';
import { LISTING } from '../../config/copy';
import { hasValue } from '../../utils/listingFilters';
import { formatArea, formatMonthYear, formatPriceRange } from '../../utils/format';
import { useMasterData } from '../../contexts/MasterDataContext';
import {
  AREA_UNITS,
  AVAILABILITY,
  BEDROOM_OPTIONS,
  CONSTRUCTION_STATUS,
  FACING,
  FURNISHING,
  LISTING_TYPES,
} from '../../config/enums';
import { segmentName } from '../../config/segments';

/**
 * What the search is currently narrowed to, as chips.
 *
 * Two kinds. A chip the visitor added carries a × and removes its own
 * parameter. A chip the **route** added carries a lock and does not: on
 * `/localities/whitefield` the locality is what the page is, and removing it
 * would leave a page that is no longer about anything (§7).
 */

const nameOf = (records, id) =>
  (Array.isArray(records) ? records : []).find((row) => String(row.id) === String(id))?.name ??
  null;

const list = (value) => (Array.isArray(value) ? value : hasValue(value) ? [value] : []);

/**
 * Every active parameter as a chip, in the order the rail shows the groups.
 *
 * @param {object} params the visitor's parameters
 * @param {object} fixed the route's
 * @param {object} master the master-data collections
 * @returns {Array<{id: string, label: string, patch: object|null}>} `patch === null` means locked
 */
function buildChips(params, fixed, master) {
  const chips = [];
  const listingType = fixed.listingType ?? params.listingType;
  const rental = listingType === 'rent' || listingType === 'lease';

  const push = (source, id, label, patch) => {
    if (!label) return;
    chips.push({ id, label, patch: source === 'fixed' ? null : patch });
  };

  const each = (key, label) => {
    for (const source of ['fixed', 'params']) {
      const values = list((source === 'fixed' ? fixed : params)[key]);
      values.forEach((value) => {
        const text = label(value);
        const rest = list(params[key]).filter((entry) => String(entry) !== String(value));
        push(source, `${key}-${value}`, text, { [key]: rest.length > 0 ? rest : undefined });
      });
    }
  };

  const single = (key, label) => {
    for (const source of ['fixed', 'params']) {
      const value = (source === 'fixed' ? fixed : params)[key];
      if (!hasValue(value)) continue;
      push(source, `${key}-${value}`, label(value), { [key]: undefined });
    }
  };

  single('listingType', (value) => LISTING_TYPES.labelOf(value));
  // A segment an editor added has a name in master data and none in the enum.
  single('segment', (value) => segmentName(value, master.segments));
  each('propertyTypeId', (value) => nameOf(master.propertyTypes, value));
  each('localityId', (value) => nameOf(master.localities, value));

  if (hasValue(params.minPrice) || hasValue(params.maxPrice)) {
    chips.push({
      id: 'price',
      label: formatPriceRange(params.minPrice ?? null, params.maxPrice ?? null, {
        listingType: rental ? 'rent' : 'sale',
      }),
      patch: { minPrice: undefined, maxPrice: undefined },
    });
  }

  each('bedrooms', (value) => BEDROOM_OPTIONS.labelOf(Number(value)));
  each('constructionStatus', (value) => CONSTRUCTION_STATUS.labelOf(value));

  if (hasValue(params.minArea) || hasValue(params.maxArea)) {
    const unit = AREA_UNITS.labelOf(params.areaUnit || 'sqft');
    const low = hasValue(params.minArea) ? formatArea(params.minArea, unit) : null;
    const high = hasValue(params.maxArea) ? formatArea(params.maxArea, unit) : null;
    chips.push({
      id: 'area',
      label: low && high ? `${low} – ${high}` : (low ?? high),
      patch: { minArea: undefined, maxArea: undefined },
    });
  }

  each('furnishing', (value) => FURNISHING.labelOf(value));
  each('facing', (value) => FACING.labelOf(value));
  each('amenityIds', (value) => nameOf(master.amenities, value));
  each('badgeIds', (value) => nameOf(master.badges, value));
  single('developerId', (value) => nameOf(master.developers, value));
  single('availability', (value) => AVAILABILITY.labelOf(value));
  single('isFeatured', () => 'Featured');
  single('reraRegistered', () => 'RERA registered');
  single('possessionBy', (value) => `By ${formatMonthYear(value)}`);
  single('q', (value) => `“${value}”`);

  return chips;
}

/**
 * @param {object} props
 * @param {object} props.params
 * @param {object} props.fixed
 * @param {(patch: object) => void} props.onRemove
 * @param {() => void} props.onClear
 */
export default function ActiveFilters({ params, fixed = {}, onRemove, onClear }) {
  const master = useMasterData();
  const chips = buildChips(params, fixed, master);
  const removable = chips.filter((chip) => chip.patch !== null);

  if (chips.length === 0) return null;

  return (
    <div className={styles.chips}>
      <span className={styles.chipsLabel}>{LISTING.filtersChipLabel}</span>
      <ul className={styles.chipList}>
        {chips.map((chip) =>
          chip.patch === null ? (
            <li key={chip.id} className={`${styles.filterChip} ${styles.filterChipLocked}`}>
              <Icon icon="mdi:lock-outline" width="14" height="14" aria-hidden="true" />
              <span>{chip.label}</span>
              <span className={styles.srOnly}>{LISTING.filtersLocked}</span>
            </li>
          ) : (
            <li key={chip.id}>
              <button
                type="button"
                className={styles.filterChip}
                onClick={() => onRemove(chip.patch)}
              >
                <span>{chip.label}</span>
                <Icon icon="mdi:close" width="14" height="14" aria-hidden="true" />
                <span className={styles.srOnly}>Remove filter</span>
              </button>
            </li>
          )
        )}
      </ul>

      {removable.length > 0 ? (
        <button type="button" className={styles.clearAll} onClick={onClear}>
          Clear all
        </button>
      ) : null}
    </div>
  );
}

export { buildChips };
