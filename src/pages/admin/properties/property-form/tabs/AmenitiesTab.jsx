import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import PATHS from '../../../../../routes/paths';
import { segmentKind } from '../../../../../config/segments';
import { useAmenitiesGrouped } from '../../../../../hooks/useMasterData';
import { useMasterData } from '../../../../../contexts/MasterDataContext';
import { useToast } from '../../../../../components/common/ToastProvider';
import { propertyFieldId } from '../fieldFocus';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './AmenitiesTab.module.css';

/**
 * `ids` in master-data order — group order first, then the order inside it.
 *
 * An id master data no longer holds (an amenity switched off after it was
 * chosen) keeps its place at the end rather than being dropped: the form must
 * not quietly strip what a listing already promises.
 *
 * @param {Array<number|string>} ids
 * @param {Array<number|string>} orderedIds every amenity id, in display order
 * @returns {Array<number|string>}
 */
export function sortAmenityIds(ids = [], orderedIds = []) {
  const rank = new Map(orderedIds.map((id, index) => [String(id), index]));
  const unique = [...new Set(ids.map((id) => String(id)))];

  return unique
    .sort((left, right) => {
      const a = rank.has(left) ? rank.get(left) : Number.MAX_SAFE_INTEGER;
      const b = rank.has(right) ? rank.get(right) : Number.MAX_SAFE_INTEGER;
      return a - b || left.localeCompare(right);
    })
    .map((id) => (/^\d+$/.test(id) ? Number(id) : id));
}

/**
 * The groups a commercial listing reads first.
 *
 * A warehouse's editor wants Conference Room and Loading Dock before Kids Pool;
 * the categories are otherwise left in `AMENITY_CATEGORIES` order, because that
 * order is what the public page prints. "Commercial" is the segment's kind, so
 * a segment an editor added with that layout reads the same way (QA-52).
 */
export function orderGroupsForSegment(groups = [], segment) {
  if (segmentKind(segment) !== 'commercial') return groups;
  return [
    ...groups.filter((group) => group.category === 'commercial'),
    ...groups.filter((group) => group.category !== 'commercial'),
  ];
}

/** A checkbox that can also be "some of these" — the state HTML has no attribute for. */
function TriStateCheckbox({ checked, indeterminate, label, disabled, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.groupCheckbox}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange?.(event.target.checked)}
    />
  );
}

/**
 * Tab 7 — Amenities.
 *
 * Every amenity is master data (§6.4): this tab writes `amenityIds[]` and
 * nothing else, which is why the same swimming pool is one record on forty
 * listings and renaming it renames it everywhere. The legacy tab stored copies
 * of `{ icon, name, category }` on each property, so a typo lived forever.
 *
 * Forty-odd checkboxes are a wall, so the tab does three things to make it
 * readable: a search across every group, a select-all per group with the
 * in-between state a partly-chosen group deserves, and a count that says how
 * many of the group are on.
 */
export default function AmenitiesTab() {
  const { values, setField, disabled } = usePropertyFormContext();
  const allGroups = useAmenitiesGrouped({ activeOnly: false });
  const [query, setQuery] = useState('');

  const chosen = useMemo(
    () => new Set((values.amenityIds ?? []).map((id) => String(id))),
    [values.amenityIds]
  );

  // The active amenities, and any switched-off one this listing still claims:
  // hidden, it was counted in "N selected" and saved on every write, with no
  // box on the tab to untick it.
  const groups = useMemo(
    () =>
      allGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => item.isActive !== false || chosen.has(String(item.id))
          ),
        }))
        .filter((group) => group.items.length > 0),
    [allGroups, chosen]
  );

  // Ids master data no longer holds at all — deleted after they were chosen.
  const orphans = useMemo(() => {
    const known = new Set(allGroups.flatMap((group) => group.items.map((item) => String(item.id))));
    return [...chosen].filter((id) => !known.has(id));
  }, [allGroups, chosen]);

  const orderedIds = useMemo(
    () =>
      orderGroupsForSegment(groups, values.segment).flatMap((group) =>
        group.items.map((item) => item.id)
      ),
    [groups, values.segment]
  );

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const ordered = orderGroupsForSegment(groups, values.segment);
    if (!needle) return ordered;
    return ordered
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          String(item.name ?? '')
            .toLowerCase()
            .includes(needle)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, values.segment, needle]);

  const write = (ids) => setField('amenityIds', sortAmenityIds(ids, orderedIds));

  const toggle = (id, on) => {
    const next = new Set(chosen);
    if (on) next.add(String(id));
    else next.delete(String(id));
    write([...next]);
  };

  const toggleGroup = (group, on) => {
    const next = new Set(chosen);
    group.items.forEach((item) => {
      if (on) next.add(String(item.id));
      else next.delete(String(item.id));
    });
    write([...next]);
  };

  const total = chosen.size;

  return (
    <>
      <FormSection
        title="Amenities"
        description="Tick what this property actually offers. Every amenity is a master-data record, so the name and the icon are the same on every listing that claims it."
      >
        <FormColumn>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Icon
                icon="mdi:magnify"
                width="18"
                height="18"
                className={styles.searchIcon}
                aria-hidden="true"
              />
              <input
                // "Fewer than eight amenities" from the SEO tab lands here.
                id={propertyFieldId('amenityIds')}
                type="search"
                className={styles.search}
                value={query}
                placeholder="Search amenities…"
                aria-label="Search amenities"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <p className={styles.total} role="status">
              {total} selected
            </p>
          </div>
        </FormColumn>

        {orphans.length > 0 ? (
          <FormColumn>
            <p className={styles.orphans}>
              <span>
                {orphans.length === 1
                  ? 'One amenity this listing had has since been deleted from master data.'
                  : `${orphans.length} amenities this listing had have since been deleted from master data.`}{' '}
                The site no longer shows {orphans.length === 1 ? 'it' : 'them'}.
              </span>
              <button
                type="button"
                className={styles.link}
                disabled={disabled}
                onClick={() => write([...chosen].filter((id) => !orphans.includes(id)))}
              >
                Remove {orphans.length === 1 ? 'it' : 'them'} from this listing
              </button>
            </p>
          </FormColumn>
        ) : null}
      </FormSection>

      {groups.length === 0 ? (
        <FormSection>
          <FormColumn>
            <p className={styles.empty}>
              No amenities exist yet. Create them in{' '}
              <a
                className={styles.link}
                href={PATHS.adminAmenities}
                target="_blank"
                rel="noreferrer"
              >
                Master data → Amenities
              </a>
              , then <RefreshAmenities />.
            </p>
          </FormColumn>
        </FormSection>
      ) : null}

      {visible.map((group) => {
        const selected = group.items.filter((item) => chosen.has(String(item.id)));
        const all = selected.length === group.items.length && group.items.length > 0;

        return (
          <FormSection
            key={group.category}
            title={group.label}
            description={`${selected.length} of ${group.items.length} selected`}
            action={
              <label className={styles.selectAll}>
                <TriStateCheckbox
                  checked={all}
                  indeterminate={selected.length > 0}
                  disabled={disabled}
                  label={`Select all in ${group.label}`}
                  onChange={(on) => toggleGroup(group, on)}
                />
                <span>Select all</span>
              </label>
            }
          >
            <FormColumn>
              <div className={styles.chips}>
                {group.items.map((item) => {
                  const on = chosen.has(String(item.id));
                  return (
                    <label
                      key={item.id}
                      className={[styles.chip, on ? styles.chipOn : ''].filter(Boolean).join(' ')}
                    >
                      <input
                        type="checkbox"
                        className={styles.chipInput}
                        checked={on}
                        disabled={disabled}
                        onChange={(event) => toggle(item.id, event.target.checked)}
                      />
                      <Icon
                        icon={item.icon || 'mdi:check-circle-outline'}
                        width="20"
                        height="20"
                        aria-hidden="true"
                        className={styles.chipIcon}
                      />
                      <span className={styles.chipName}>
                        {item.name}
                        {item.isActive === false ? (
                          <span className={styles.chipInactive}> (switched off)</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormColumn>
          </FormSection>
        );
      })}

      {groups.length > 0 && visible.length === 0 ? (
        <FormSection>
          <FormColumn>
            <p className={styles.empty}>No amenity matches “{query.trim()}”.</p>
          </FormColumn>
        </FormSection>
      ) : null}

      {groups.length > 0 ? (
        <FormSection>
          <FormColumn>
            <p className={styles.footerNote}>
              Missing an amenity? Add it in{' '}
              <a
                className={styles.link}
                href={PATHS.adminAmenities}
                target="_blank"
                rel="noreferrer"
              >
                Master data → Amenities
              </a>{' '}
              — it opens in a new tab, so nothing here is lost — then <RefreshAmenities />.
            </p>
          </FormColumn>
        </FormSection>
      ) : null}
    </>
  );
}

/**
 * "Refresh list" — reads the amenities again, for one added in another tab
 * a moment ago. Other tabs hear about a refresh on their own
 * (`MasterDataContext`); this is the button for when an editor does not wait.
 */
function RefreshAmenities() {
  const { refresh } = useMasterData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={styles.link}
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={async () => {
        setBusy(true);
        try {
          await refresh('amenities');
          toast.success('The amenities list is up to date.');
        } finally {
          setBusy(false);
        }
      }}
    >
      Refresh list
    </button>
  );
}
