import { useMemo } from 'react';

import { AMENITY_CATEGORIES } from '../config/enums';
import { useMasterData } from '../contexts/MasterDataContext';

/**
 * The seven master-data lists, in the shape each screen actually wants
 * (00_MASTER_CONTEXT.md §6.2–§6.6, D93).
 *
 * `MasterDataContext` holds the raw collections; these hooks are the reading
 * of them — active only, in `order`, grouped, or indexed by id — so that a
 * filter panel, a property form and a card all agree on what "the amenities"
 * are without each writing its own sort.
 *
 *   const types = usePropertyTypes({ segment: 'residential' });
 *   const groups = useAmenitiesGrouped();
 *   const badges = useBadgeMap();
 *
 * Every hook returns a memoised value, so the arrays are stable between
 * renders and safe to pass straight into a dependency list.
 */

/** `order` first, then the name — the order an editor arranged them in. */
const byOrder = (left, right) =>
  (left?.order ?? 0) - (right?.order ?? 0) ||
  String(left?.name ?? '').localeCompare(String(right?.name ?? ''));

/** An inactive record is invisible to the public site unless asked for. */
const isVisible = (record, activeOnly) => (activeOnly ? record?.isActive !== false : true);

/** `records`, narrowed and sorted, without touching the context's array. */
const arrange = (records, activeOnly, extra) =>
  records
    .filter((record) => isVisible(record, activeOnly) && (extra ? extra(record) : true))
    .sort(byOrder);

/**
 * Property types for a segment, in `order`.
 *
 * @param {object} [options]
 * @param {'residential'|'commercial'|'land'} [options.segment] all three when absent
 * @param {boolean} [options.activeOnly]
 * @returns {Array<object>}
 */
export function usePropertyTypes({ segment, activeOnly = true } = {}) {
  const { propertyTypes } = useMasterData();

  return useMemo(
    () => arrange(propertyTypes, activeOnly, segment ? (row) => row.segment === segment : null),
    [propertyTypes, segment, activeOnly]
  );
}

/**
 * Amenities grouped by category, the groups in `AMENITY_CATEGORIES` order and
 * the items inside each in `order`.
 *
 * A category nothing belongs to is left out: the property form and the details
 * page both render one block per group, and an empty block is a heading over
 * nothing.
 *
 * @param {object} [options]
 * @param {boolean} [options.activeOnly]
 * @returns {Array<{category: string, label: string, icon: string, items: Array<object>}>}
 */
export function useAmenitiesGrouped({ activeOnly = true } = {}) {
  const { amenities } = useMasterData();

  return useMemo(() => {
    const rows = arrange(amenities, activeOnly);

    return AMENITY_CATEGORIES.entries
      .map((entry) => ({
        category: entry.value,
        label: entry.label,
        icon: entry.icon,
        items: rows.filter((row) => row.category === entry.value),
      }))
      .filter((group) => group.items.length > 0);
  }, [amenities, activeOnly]);
}

/**
 * Amenities in `order`, ungrouped — for a filter list or a multi-select.
 *
 * @param {object} [options]
 * @param {string} [options.category]
 * @param {boolean} [options.activeOnly]
 * @returns {Array<object>}
 */
export function useAmenities({ category, activeOnly = true } = {}) {
  const { amenities } = useMasterData();

  return useMemo(
    () => arrange(amenities, activeOnly, category ? (row) => row.category === category : null),
    [amenities, category, activeOnly]
  );
}

/**
 * Every badge by id, **keyed as a string** — `map.get(String(id))` — because
 * the ids a component holds come from a record, a form value or a URL, and
 * only one of those three is a number.
 *
 * A property read from the API already embeds its badges (§5.5); this is for
 * the screens that hold `badgeIds` and nothing else.
 *
 * @returns {Map<string, object>}
 */
export function useBadgeMap() {
  const { badges } = useMasterData();

  return useMemo(() => new Map(badges.map((badge) => [String(badge.id), badge])), [badges]);
}

/**
 * Home-loan partners in `order` (§6.6). Empty when no bank is active, which is
 * what hides the finance section rather than inventing a default lender.
 *
 * @param {object} [options]
 * @param {boolean} [options.activeOnly]
 * @returns {Array<object>}
 */
export function useBanks({ activeOnly = true } = {}) {
  const { banks } = useMasterData();

  return useMemo(() => arrange(banks, activeOnly), [banks, activeOnly]);
}

/**
 * Localities in `order`.
 *
 * @param {object} [options]
 * @param {boolean} [options.featuredOnly] the home strip's six
 * @param {boolean} [options.activeOnly]
 * @returns {Array<object>}
 */
export function useLocalities({ featuredOnly = false, activeOnly = true } = {}) {
  const { localities } = useMasterData();

  return useMemo(
    () => arrange(localities, activeOnly, featuredOnly ? (row) => row.isFeatured === true : null),
    [localities, featuredOnly, activeOnly]
  );
}

/**
 * Developers in `order`.
 *
 * @param {object} [options]
 * @param {boolean} [options.featuredOnly]
 * @param {boolean} [options.activeOnly]
 * @returns {Array<object>}
 */
export function useDevelopers({ featuredOnly = false, activeOnly = true } = {}) {
  const { developers } = useMasterData();

  return useMemo(
    () => arrange(developers, activeOnly, featuredOnly ? (row) => row.isFeatured === true : null),
    [developers, featuredOnly, activeOnly]
  );
}

/**
 * Cities, by name — the collection has no `order` of its own (§6.2).
 *
 * @param {object} [options]
 * @param {boolean} [options.activeOnly]
 * @returns {Array<object>}
 */
export function useCities({ activeOnly = true } = {}) {
  const { cities } = useMasterData();

  return useMemo(
    () =>
      cities
        .filter((row) => isVisible(row, activeOnly))
        .sort((left, right) => String(left.name ?? '').localeCompare(String(right.name ?? ''))),
    [cities, activeOnly]
  );
}

/** `[{ value: id, label: name }]` — master data as a `<select>` reads it. */
export const toOptions = (records = []) =>
  records.map((record) => ({ value: record.id, label: record.name }));
