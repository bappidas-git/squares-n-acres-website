import { Icon } from '@iconify/react';

import styles from './MapEmbed.module.css';

/**
 * A map at one point, with no API key and no dependency (decision D42).
 *
 * Google's `output=embed` endpoint renders a map for a `lat,lng` pair inside an
 * iframe, which is all a locality guide, a property's location section, the
 * contact page and the admin coordinate preview need. The keyed Maps JS API —
 * and the draggable pin it buys — arrives only where a key exists, in the
 * property form.
 *
 * Coordinates that are missing, unparseable or out of range render the
 * placeholder rather than a map of the Gulf of Guinea: `0,0` is what a broken
 * record looks like, not a place we have listings in.
 *
 * @param {object} props
 * @param {number|string|null} [props.latitude]
 * @param {number|string|null} [props.longitude]
 * @param {number} [props.zoom]
 * @param {string} [props.title] the iframe's accessible name
 * @param {string} [props.placeholder] shown when there are no coordinates
 */
export default function MapEmbed({
  latitude,
  longitude,
  zoom = 15,
  title = 'Map',
  placeholder = 'Add a latitude and a longitude to see the map.',
  className = '',
  ...rest
}) {
  const lat = coordinate(latitude, 90);
  const lng = coordinate(longitude, 180);

  if (lat === null || lng === null) {
    return (
      <div className={[styles.map, styles.placeholder, className].filter(Boolean).join(' ')}>
        <Icon icon="mdi:map-marker-off-outline" width="28" height="28" aria-hidden="true" />
        <p className={styles.placeholderText}>{placeholder}</p>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      className={[styles.map, className].filter(Boolean).join(' ')}
      src={`https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      {...rest}
    />
  );
}

/** A finite number inside `±limit`, or `null` — which is what hides the map. */
function coordinate(value, limit) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > limit) return null;
  return number;
}

/**
 * Whether a pair of coordinates would render a map — what a page asks before
 * it draws the heading above one.
 *
 * @param {number|string|null} latitude
 * @param {number|string|null} longitude
 * @returns {boolean}
 */
export const hasCoordinates = (latitude, longitude) =>
  coordinate(latitude, 90) !== null && coordinate(longitude, 180) !== null;
