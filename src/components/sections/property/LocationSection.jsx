import { Icon } from '@iconify/react';

import { Button } from '../../ui';
import MapEmbed, { hasCoordinates } from '../../common/MapEmbed';
import { NEARBY_CATEGORIES } from '../../../config/enums';
import PATHS from '../../../routes/paths';
import SectionShell from './SectionShell';
import { formatNumber } from '../../../utils/format';
import { useLocalities } from '../../../hooks/useMasterData';

import styles from './LocationSection.module.css';

/** Zoom levels: the plot itself, or the neighbourhood it sits in. */
const EXACT_ZOOM = 16;
const AREA_ZOOM = 13;

const filled = (value) => value !== null && value !== undefined && String(value).trim() !== '';

/**
 * The nearby places grouped by category, in `NEARBY_CATEGORIES` order, with
 * anything of an unknown category collected under "Other".
 *
 * Exported for the unit test.
 *
 * @param {Array<{name: string, category?: string, distanceKm?: number, travelTimeMin?: number, order?: number}>} places
 * @returns {Array<{value: string, label: string, icon: string, items: Array<object>}>}
 */
export function groupNearby(places) {
  const list = (Array.isArray(places) ? places : [])
    .filter((place) => place && filled(place.name))
    .map((place, index) => ({ place, index }))
    .sort((a, b) => {
      const order = (entry) =>
        entry.place.order === null || entry.place.order === undefined
          ? null
          : Number(entry.place.order);
      if (order(a) !== null && order(b) !== null && order(a) !== order(b)) {
        return order(a) - order(b);
      }
      return a.index - b.index;
    })
    .map((entry) => entry.place);

  return NEARBY_CATEGORIES.entries
    .map((category) => ({
      value: category.value,
      label: category.label,
      icon: category.icon,
      items: list.filter((place) =>
        category.value === 'other'
          ? !NEARBY_CATEGORIES.has(place.category)
          : place.category === category.value
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** "2.5 km · 8 min", or whichever half the record carries. */
function distanceLine(place) {
  const parts = [];
  if (Number.isFinite(Number(place.distanceKm))) {
    parts.push(`${formatNumber(place.distanceKm, { maximumFractionDigits: 1 })} km`);
  }
  if (Number.isFinite(Number(place.travelTimeMin))) {
    parts.push(`${formatNumber(place.travelTimeMin)} min`);
  }
  return parts.join(' · ');
}

/**
 * What is around the property: schools, metro stations, hospitals and the rest,
 * with how far away each one is.
 *
 * A separate section from the map because `sectionVisibility` keeps separate
 * switches for `nearby` and `location` (§6.1) and the page's sub-navigation
 * must offer exactly the sections that render.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export function NearbySection({ property, background = 'bg' }) {
  const groups = groupNearby(property?.nearbyPlaces);
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  if (total === 0) return null;

  return (
    <SectionShell
      id="nearby"
      title="What is nearby"
      subtitle="Distances are approximate and measured by road."
      background={background}
    >
      <div className={styles.nearbyGroups}>
        {groups.map((group) => (
          <div key={group.value} className={styles.nearbyGroup}>
            <h3 className={styles.groupTitle}>
              <Icon icon={group.icon} className={styles.groupIcon} aria-hidden="true" />
              {group.label}
            </h3>
            <ul className={styles.places}>
              {group.items.map((place) => (
                <li key={place.id ?? place.name} className={styles.place}>
                  <span className={styles.placeName}>{place.name}</span>
                  {distanceLine(place) ? (
                    <span className={styles.placeDistance}>{distanceLine(place)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/**
 * Where the property is.
 *
 * A seller who has not agreed to publish the door number gets a map of the
 * locality rather than a pin on their roof: the coordinates are the locality's,
 * the zoom is wider, and the section says so. A listing with neither its own
 * coordinates nor a locality that has any renders no map at all, rather than
 * the boilerplate's grey box promising one on the live site (BUG-05).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function LocationSection({ property, background = 'bg' }) {
  const localities = useLocalities();

  const location = property?.location ?? {};
  const exact = location.showExactLocation === true;
  const localityRef = location.locality ?? null;
  const locality =
    localities.find((record) => String(record.id) === String(location.localityId ?? '')) ??
    localityRef;

  const own = exact && hasCoordinates(location.latitude, location.longitude);
  const area = !own && hasCoordinates(locality?.latitude, locality?.longitude);

  const place = [localityRef?.name ?? locality?.name, location.city?.name]
    .filter(Boolean)
    .join(', ');
  const address = exact
    ? [location.address, location.landmark, place, location.pincode].filter(Boolean).join(', ')
    : place;

  if (!own && !area && !address) return null;

  return (
    <SectionShell id="location" title="Location" background={background}>
      {address ? (
        <p className={styles.address}>
          <Icon icon="mdi:map-marker-outline" className={styles.addressIcon} aria-hidden="true" />
          {address}
        </p>
      ) : null}

      {own || area ? (
        <>
          <MapEmbed
            latitude={own ? location.latitude : locality.latitude}
            longitude={own ? location.longitude : locality.longitude}
            zoom={own ? EXACT_ZOOM : AREA_ZOOM}
            title={`Map of ${place || property?.title || 'the property'}`}
            className={styles.map}
          />
          {own ? null : (
            <p className={styles.note}>Approximate location — exact address shared on request.</p>
          )}
        </>
      ) : null}

      {locality?.slug ? (
        <Button
          variant="outline"
          size="sm"
          to={PATHS.locality(locality.slug)}
          className={styles.guide}
          iconRight={<Icon icon="mdi:arrow-right" aria-hidden="true" />}
        >
          {locality.name} locality guide
        </Button>
      ) : null}
    </SectionShell>
  );
}
