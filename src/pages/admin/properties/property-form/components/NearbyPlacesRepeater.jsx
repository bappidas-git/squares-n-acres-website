import { useMemo } from 'react';
import { Icon } from '@iconify/react';

import SortableList from '../../../../../components/admin/SortableList';
import { Button, IconButton, NumberField, TextField } from '../../../../../components/ui';
import { NEARBY_CATEGORIES } from '../../../../../config/enums';
import { LIMITS } from '../validators/property';

import styles from './Repeaters.module.css';

/**
 * A category's label inside a sentence — "Add to schools", "Add to IT parks &
 * offices": lower case, except for the words that are written in capitals
 * (a plain `toLowerCase` printed "Add to it parks & offices").
 */
export const inSentence = (label) =>
  String(label ?? '')
    .split(' ')
    .map((word) => (/^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(' ');

/**
 * What is around the property, grouped the way the public page groups it.
 *
 * `nearbyPlaces` is one flat, ordered list in the contract (§6.1) — the
 * category lives on the row. The editor, though, thinks in categories: "which
 * schools are near this?", not "which of these twenty rows are schools". So the
 * list is shown grouped and reordered within a group, and every move is
 * translated back into a single move of the flat list, which is what the
 * reducer and the API both expect.
 *
 * @param {object} props
 * @param {Array<object>} props.places the flat `nearbyPlaces` list
 * @param {Record<string, string>} props.errors keyed `nearbyPlaces.<i>.<field>`
 * @param {(category: string) => void} props.onAdd
 * @param {(id: string|number, patch: object) => void} props.onUpdate
 * @param {(id: string|number) => void} props.onRemove
 * @param {(from: number, to: number) => void} props.onMove flat indexes
 */
export default function NearbyPlacesRepeater({
  places = [],
  errors = {},
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}) {
  // Each row keeps the index it has in the stored list, because that is what
  // the error keys and the move action are written in.
  const groups = useMemo(() => {
    const indexed = places.map((place, index) => ({ place, index }));
    return NEARBY_CATEGORIES.entries
      .map((entry) => ({
        ...entry,
        rows: indexed.filter(({ place }) => (place.category ?? 'other') === entry.value),
      }))
      .filter((group) => group.rows.length > 0);
  }, [places]);

  const filled = places.filter((place) => String(place.name ?? '').trim() !== '').length;

  return (
    <div className={styles.wrapper}>
      {groups.length === 0 ? (
        <p className={styles.empty}>
          Nothing is listed yet. Add the schools, metro stations and offices a buyer would ask about
          — each one is a row on the listing page.
        </p>
      ) : (
        <p className={styles.empty}>
          {filled} {filled === 1 ? 'place' : 'places'} across {groups.length}{' '}
          {groups.length === 1 ? 'category' : 'categories'}.
        </p>
      )}

      {groups.map((group) => (
        <section className={styles.group} key={group.value}>
          <div className={styles.groupHead}>
            <h4 className={styles.groupTitle}>
              <Icon icon={group.icon} width="18" height="18" aria-hidden="true" />
              {group.label}
              <span className={styles.groupCount}>({group.rows.length})</span>
            </h4>
            <span className={styles.groupActions}>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onAdd?.(group.value)}
                icon={<Icon icon="mdi:plus" width="16" height="16" />}
              >
                Add to {inSentence(group.label)}
              </Button>
            </span>
          </div>

          <SortableList
            label={`${group.label} in order`}
            items={group.rows}
            disabled={disabled}
            getId={({ place }) => place.id}
            getLabel={({ place }, position) => place.name || `${group.label} ${position + 1}`}
            onReorder={(_next, { from, to }) => {
              const flatFrom = group.rows[from]?.index;
              const flatTo = group.rows[to]?.index;
              if (flatFrom === undefined || flatTo === undefined) return;
              onMove?.(flatFrom, flatTo);
            }}
            renderItem={({ place, index }) => (
              <div className={styles.row}>
                <TextField
                  label="Place"
                  value={place.name ?? ''}
                  error={errors[`nearbyPlaces.${index}.name`]}
                  disabled={disabled}
                  maxLength={LIMITS.placeName}
                  placeholder="e.g. Whitefield Metro Station"
                  onChange={(event) => onUpdate?.(place.id, { name: event.target.value })}
                />
                <NumberField
                  label="Distance (km)"
                  min={0}
                  max={LIMITS.distanceKm}
                  step={0.1}
                  value={place.distanceKm ?? ''}
                  error={errors[`nearbyPlaces.${index}.distanceKm`]}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate?.(place.id, {
                      distanceKm: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
                <NumberField
                  label="Drive (min)"
                  min={0}
                  max={LIMITS.travelTimeMin}
                  step={1}
                  value={place.travelTimeMin ?? ''}
                  error={errors[`nearbyPlaces.${index}.travelTimeMin`]}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate?.(place.id, {
                      travelTimeMin: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
                <span className={styles.rowAction}>
                  <IconButton
                    label={`Remove ${place.name || 'this place'}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => onRemove?.(place.id)}
                  >
                    <Icon icon="mdi:close" width="18" height="18" />
                  </IconButton>
                </span>
              </div>
            )}
          />
        </section>
      ))}

      <div className={styles.actions}>
        {NEARBY_CATEGORIES.entries.map((entry) => (
          <Button
            key={entry.value}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAdd?.(entry.value)}
            icon={<Icon icon={entry.icon} width="16" height="16" />}
          >
            {entry.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
