import { useId, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import styles from './filters.module.css';
import { SelectField, SwitchField } from '../ui';
import { hasValue } from '../../utils/listingFilters';
import {
  useAmenities,
  useDevelopers,
  useLocalities,
  usePropertyTypes,
} from '../../hooks/useMasterData';
import { useMasterData } from '../../contexts/MasterDataContext';
import {
  AREA_UNITS,
  BEDROOM_OPTIONS,
  CONSTRUCTION_STATUS,
  FACING,
  FURNISHING,
  LISTING_TYPES,
  PRICE_BUCKETS_RENT,
  PRICE_BUCKETS_SALE,
} from '../../config/enums';

/**
 * The filter groups themselves — one set of controls, two hosts.
 *
 * The desktop rail and the mobile sheet render exactly the same groups against
 * the same draft object, so a filter can never exist on one and not the other
 * (ADD-11: the boilerplate's panel applied live on desktop and needed an Apply
 * on mobile, with different controls on each).
 *
 * Counts come from `meta.facets` (§5.7), computed on the result set after the
 * other filters: "Whitefield 12" means twelve of the listings you are looking
 * at. A choice the facets do not mention keeps its label and shows no count —
 * a zero would claim the option is dead when removing another filter may well
 * bring it back.
 */

/** `{ '4': 12 }` from a facet array keyed by `id` or by `value`. */
const countsOf = (rows) =>
  new Map((Array.isArray(rows) ? rows : []).map((row) => [String(row.id ?? row.value), row.count]));

/** The csv list with `id` added or taken out; `undefined` when nothing is left. */
export function toggleCsv(list, id) {
  const next = new Set((Array.isArray(list) ? list : []).map(String));
  const key = String(id);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next.size > 0 ? [...next] : undefined;
}

const includes = (list, id) => (Array.isArray(list) ? list : []).map(String).includes(String(id));

/** A collapsible block with its own heading button (§8.3). */
function FilterGroup({ title, children, hint, defaultOpen = true }) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={styles.group}>
      <h3 className={styles.groupHeading}>
        <button
          type="button"
          className={styles.groupToggle}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.groupTitle}>{title}</span>
          <Icon
            icon="mdi:chevron-down"
            className={[styles.groupChevron, open ? styles.groupChevronOpen : '']
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div className={styles.groupPanel} id={panelId} hidden={!open}>
        {hint ? <p className={styles.groupHint}>{hint}</p> : null}
        {children}
      </div>
    </section>
  );
}

/** One checkbox or radio row: label on the left, facet count on the right. */
function OptionRow({ type = 'checkbox', name, checked, onChange, label, count }) {
  return (
    <label className={[styles.option, checked ? styles.optionOn : ''].filter(Boolean).join(' ')}>
      <input
        className={styles.optionInput}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className={styles.optionLabel}>{label}</span>
      {Number.isFinite(count) ? <span className={styles.optionCount}>{count}</span> : null}
    </label>
  );
}

/** A long list: a search box, the first `limit` rows, and "Show all". */
function SearchableOptions({
  items,
  selected,
  onToggle,
  placeholder,
  counts,
  type = 'checkbox',
  name,
  limit = 8,
}) {
  const [term, setTerm] = useState('');
  const [expanded, setExpanded] = useState(false);

  const needle = term.trim().toLowerCase();
  const matches = useMemo(
    () => (needle ? items.filter((item) => item.label.toLowerCase().includes(needle)) : items),
    [items, needle]
  );

  // A chosen option is always on screen, wherever it sorts: a filter you cannot
  // see is a filter you cannot remove.
  const chosen = matches.filter((item) => selected(item));
  const rest = matches.filter((item) => !selected(item));
  const ordered = [...chosen, ...rest];
  const shown = expanded || needle ? ordered : ordered.slice(0, Math.max(limit, chosen.length));

  return (
    <>
      <div className={styles.searchRow}>
        <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          value={term}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      <div className={styles.optionList}>
        {shown.map((item) => (
          <OptionRow
            key={item.value}
            type={type}
            name={name}
            label={item.label}
            count={counts?.get(String(item.value))}
            checked={selected(item)}
            onChange={() => onToggle(item)}
          />
        ))}
        {shown.length === 0 ? <p className={styles.noMatch}>No match</p> : null}
      </div>

      {!needle && ordered.length > shown.length ? (
        <button type="button" className={styles.moreButton} onClick={() => setExpanded(true)}>
          Show all {ordered.length}
        </button>
      ) : null}
      {!needle && expanded && ordered.length > limit ? (
        <button type="button" className={styles.moreButton} onClick={() => setExpanded(false)}>
          Show fewer
        </button>
      ) : null}
    </>
  );
}

/** Two numbers side by side — a budget, or an area. */
function RangeInputs({ label, minValue, maxValue, onChange, minKey, maxKey, prefix, step = 1 }) {
  const minId = useId();
  const maxId = useId();

  const read = (event) => {
    const raw = event.target.value;
    const parsed = raw === '' ? undefined : Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return (
    <div className={styles.rangeRow} role="group" aria-label={label}>
      <div className={styles.rangeField}>
        <label className={styles.rangeLabel} htmlFor={minId}>
          Min{prefix ? ` (${prefix})` : ''}
        </label>
        <input
          id={minId}
          className={styles.rangeInput}
          type="number"
          inputMode="numeric"
          min="0"
          step={step}
          value={minValue ?? ''}
          onChange={(event) => onChange({ [minKey]: read(event) })}
        />
      </div>
      <span className={styles.rangeDash} aria-hidden="true">
        –
      </span>
      <div className={styles.rangeField}>
        <label className={styles.rangeLabel} htmlFor={maxId}>
          Max{prefix ? ` (${prefix})` : ''}
        </label>
        <input
          id={maxId}
          className={styles.rangeInput}
          type="number"
          inputMode="numeric"
          min="0"
          step={step}
          value={maxValue ?? ''}
          onChange={(event) => onChange({ [maxKey]: read(event) })}
        />
      </div>
    </div>
  );
}

/**
 * Every filter group, driven by a draft rather than by the URL.
 *
 * @param {object} props
 * @param {object} props.value the draft params
 * @param {(patch: object) => void} props.onChange
 * @param {object} [props.facets] `meta.facets`
 * @param {object} [props.fixed] the route's own filters — their groups are hidden
 */
export default function FilterGroups({ value, onChange, facets, fixed = {} }) {
  const propertyTypes = usePropertyTypes();
  const localities = useLocalities();
  const amenities = useAmenities();
  const developers = useDevelopers();
  const { badges } = useMasterData();

  const typeCounts = countsOf(facets?.propertyType);
  const localityCounts = countsOf(facets?.locality);
  const bedroomCounts = countsOf(facets?.bedrooms);
  const statusCounts = countsOf(facets?.constructionStatus);

  const listingType = fixed.listingType ?? value.listingType;
  const isRental = listingType === 'rent' || listingType === 'lease';
  const buckets = isRental ? PRICE_BUCKETS_RENT : PRICE_BUCKETS_SALE;

  const bucketSelected = (bucket) =>
    Number(value.minPrice ?? 0) === (bucket.min ?? 0) &&
    (bucket.max === null ? !hasValue(value.maxPrice) : Number(value.maxPrice) === bucket.max);

  const chooseBucket = (bucket) => {
    if (bucketSelected(bucket)) return onChange({ minPrice: undefined, maxPrice: undefined });
    return onChange({ minPrice: bucket.min || undefined, maxPrice: bucket.max ?? undefined });
  };

  const options = (records) =>
    records.map((record) => ({ value: String(record.id), label: record.name }));

  return (
    <div className={styles.groups}>
      {hasValue(fixed.listingType) ? null : (
        <FilterGroup title="Listing type">
          <div className={styles.chipRow}>
            {LISTING_TYPES.entries.map((entry) => {
              const on = value.listingType === entry.value;
              return (
                <button
                  key={entry.value}
                  type="button"
                  className={[styles.chip, on ? styles.chipOn : ''].filter(Boolean).join(' ')}
                  aria-pressed={on}
                  onClick={() => onChange({ listingType: on ? undefined : entry.value })}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {hasValue(fixed.propertyTypeId) ? null : (
        <FilterGroup title="Property type">
          <SearchableOptions
            items={options(propertyTypes)}
            counts={typeCounts}
            placeholder="Search property types"
            selected={(item) => includes(value.propertyTypeId, item.value)}
            onToggle={(item) =>
              onChange({ propertyTypeId: toggleCsv(value.propertyTypeId, item.value) })
            }
          />
        </FilterGroup>
      )}

      {hasValue(fixed.localityId) ? null : (
        <FilterGroup title="Locality">
          <SearchableOptions
            items={options(localities)}
            counts={localityCounts}
            placeholder="Search localities"
            selected={(item) => includes(value.localityId, item.value)}
            onToggle={(item) => onChange({ localityId: toggleCsv(value.localityId, item.value) })}
          />
        </FilterGroup>
      )}

      <FilterGroup title={isRental ? 'Monthly rent' : 'Budget'}>
        <div className={styles.optionList}>
          {buckets.map((bucket) => (
            <OptionRow
              key={bucket.label}
              type="radio"
              name="listing-budget"
              label={bucket.label}
              checked={bucketSelected(bucket)}
              onChange={() => chooseBucket(bucket)}
            />
          ))}
        </div>
        <RangeInputs
          label={isRental ? 'Custom monthly rent' : 'Custom budget'}
          prefix="₹"
          step={isRental ? 1000 : 100000}
          minKey="minPrice"
          maxKey="maxPrice"
          minValue={value.minPrice}
          maxValue={value.maxPrice}
          onChange={onChange}
        />
      </FilterGroup>

      <FilterGroup title="Bedrooms">
        <div className={styles.chipRow}>
          {BEDROOM_OPTIONS.entries.map((entry) => {
            const on = includes(value.bedrooms, entry.value);
            const count = bedroomCounts.get(String(entry.value));
            return (
              <button
                key={entry.value}
                type="button"
                className={[styles.chip, on ? styles.chipOn : ''].filter(Boolean).join(' ')}
                aria-pressed={on}
                onClick={() => onChange({ bedrooms: toggleCsv(value.bedrooms, entry.value) })}
              >
                {entry.label}
                {Number.isFinite(count) ? <span className={styles.chipCount}>{count}</span> : null}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {hasValue(fixed.constructionStatus) ? null : (
        <FilterGroup title="Construction status">
          <div className={styles.optionList}>
            {CONSTRUCTION_STATUS.entries.map((entry) => (
              <OptionRow
                key={entry.value}
                label={entry.label}
                count={statusCounts.get(String(entry.value))}
                checked={includes(value.constructionStatus, entry.value)}
                onChange={() =>
                  onChange({
                    constructionStatus: toggleCsv(value.constructionStatus, entry.value),
                  })
                }
              />
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Area" defaultOpen={false}>
        <RangeInputs
          label="Area"
          minKey="minArea"
          maxKey="maxArea"
          minValue={value.minArea}
          maxValue={value.maxArea}
          onChange={onChange}
        />
        <SelectField
          label="Unit"
          value={value.areaUnit ?? 'sqft'}
          options={AREA_UNITS.options}
          onChange={(event) => onChange({ areaUnit: event.target.value })}
        />
      </FilterGroup>

      <FilterGroup title="Furnishing" defaultOpen={false}>
        <div className={styles.optionList}>
          {FURNISHING.entries.map((entry) => (
            <OptionRow
              key={entry.value}
              label={entry.label}
              checked={includes(value.furnishing, entry.value)}
              onChange={() => onChange({ furnishing: toggleCsv(value.furnishing, entry.value) })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Facing" defaultOpen={false}>
        <div className={styles.optionList}>
          {FACING.entries.map((entry) => (
            <OptionRow
              key={entry.value}
              label={entry.label}
              checked={includes(value.facing, entry.value)}
              onChange={() => onChange({ facing: toggleCsv(value.facing, entry.value) })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Amenities"
        defaultOpen={false}
        hint="A listing must have every amenity you pick."
      >
        <SearchableOptions
          items={options(amenities)}
          placeholder="Search amenities"
          selected={(item) => includes(value.amenityIds, item.value)}
          onToggle={(item) => onChange({ amenityIds: toggleCsv(value.amenityIds, item.value) })}
        />
      </FilterGroup>

      {badges.length > 0 ? (
        <FilterGroup title="Badges" defaultOpen={false}>
          <div className={styles.optionList}>
            {badges.map((badge) => (
              <OptionRow
                key={badge.id}
                label={badge.name}
                checked={includes(value.badgeIds, badge.id)}
                onChange={() => onChange({ badgeIds: toggleCsv(value.badgeIds, badge.id) })}
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {hasValue(fixed.developerId) ? null : (
        <FilterGroup title="Builder" defaultOpen={false}>
          <SearchableOptions
            type="radio"
            name="listing-developer"
            items={options(developers)}
            placeholder="Search builders"
            selected={(item) => String(value.developerId ?? '') === item.value}
            onToggle={(item) =>
              onChange({
                developerId:
                  String(value.developerId ?? '') === item.value ? undefined : item.value,
              })
            }
          />
        </FilterGroup>
      )}

      <FilterGroup title="More" defaultOpen={false}>
        <SwitchField
          label="Featured listings only"
          checked={value.isFeatured === true}
          onChange={(checked) => onChange({ isFeatured: checked ? true : undefined })}
        />
        <SwitchField
          label="RERA registered"
          checked={value.reraRegistered === true}
          onChange={(checked) => onChange({ reraRegistered: checked ? true : undefined })}
        />
        <div className={styles.monthField}>
          <label className={styles.rangeLabel} htmlFor="listing-possession-by">
            Possession by
          </label>
          <input
            id="listing-possession-by"
            className={styles.rangeInput}
            type="month"
            value={value.possessionBy ?? ''}
            onChange={(event) => onChange({ possessionBy: event.target.value || undefined })}
          />
        </div>
      </FilterGroup>
    </div>
  );
}

export { FilterGroup, OptionRow };
