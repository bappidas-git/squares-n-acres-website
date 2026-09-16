import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import MapEmbed from '../../../../../components/common/MapEmbed';
import { Alert, Button } from '../../../../../components/ui';
import loadScript from '../../../../../utils/loadScript';

import styles from './MapPinPicker.module.css';

/** Bengaluru city centre — where the pin starts when a listing has none (§14). */
export const DEFAULT_CENTRE = { latitude: 12.9716, longitude: 77.5946 };

/** Six decimals is about 11 cm; beyond that it is noise nobody typed on purpose. */
export const roundCoordinate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 1e6) / 1e6;
};

/** Whether a pair is a place rather than an empty field or a broken record. */
export const hasPin = (latitude, longitude) =>
  latitude !== null &&
  latitude !== undefined &&
  latitude !== '' &&
  longitude !== null &&
  longitude !== undefined &&
  longitude !== '' &&
  Number.isFinite(Number(latitude)) &&
  Number.isFinite(Number(longitude));

const mapsUrl = (key) =>
  `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;

/**
 * The map beside the coordinates (decision D42).
 *
 * With a Maps key the pin is draggable and writes the coordinates back, which
 * is the only humane way to place a building whose address is "opposite the
 * water tank". Without a key — and after a key whose script fails to load — it
 * falls back to the keyless `output=embed` iframe plus whatever the editor
 * types, which is the map every other screen of the product uses.
 *
 * @param {object} props
 * @param {string} [props.apiKey] `settings.integrations.googleMapsApiKey` or the env key
 * @param {number|string|null} props.latitude
 * @param {number|string|null} props.longitude
 * @param {(coords: {latitude: number, longitude: number}) => void} props.onChange
 * @param {() => void} [props.onUseLocalityCentre] renders the fallback's button
 * @param {string} [props.localityName] names that button's locality
 * @param {(message: string) => void} [props.onScriptError] told once, for the toast
 */
export default function MapPinPicker({
  apiKey,
  latitude,
  longitude,
  onChange,
  onUseLocalityCentre,
  localityName,
  onScriptError,
  disabled = false,
}) {
  const container = useRef(null);
  const marker = useRef(null);
  const map = useRef(null);

  // The two callbacks are read at the moment they fire, so neither becomes a
  // reason to re-inject the script or rebuild the map.
  const latest = useRef({});
  latest.current = { onChange, onScriptError };

  const [status, setStatus] = useState(apiKey ? 'loading' : 'keyless');

  const placed = hasPin(latitude, longitude);
  const lat = placed ? Number(latitude) : DEFAULT_CENTRE.latitude;
  const lng = placed ? Number(longitude) : DEFAULT_CENTRE.longitude;

  useEffect(() => {
    if (!apiKey) {
      setStatus('keyless');
      return undefined;
    }

    let live = true;
    setStatus('loading');

    loadScript(mapsUrl(apiKey), { id: 'sna-google-maps' })
      .then(() => {
        if (!live) return;
        if (!window.google?.maps) throw new Error('The Maps API loaded without its namespace.');
        setStatus('ready');
      })
      .catch(() => {
        if (!live) return;
        setStatus('failed');
        latest.current.onScriptError?.(
          'The Google map could not be loaded. Type the coordinates instead — the preview still works.'
        );
      });

    return () => {
      live = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (status !== 'ready' || !container.current || !window.google?.maps) return;
    const position = { lat, lng };

    if (!map.current) {
      map.current = new window.google.maps.Map(container.current, {
        center: position,
        zoom: placed ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      marker.current = new window.google.maps.Marker({
        position,
        map: map.current,
        draggable: !disabled,
        title: 'Drag to place this property',
      });

      const write = (event) => {
        latest.current.onChange?.({
          latitude: roundCoordinate(event.latLng.lat()),
          longitude: roundCoordinate(event.latLng.lng()),
        });
      };

      marker.current.addListener('dragend', write);
      map.current.addListener('click', (event) => {
        if (marker.current.getDraggable() === false) return;
        marker.current.setPosition(event.latLng);
        write(event);
      });
      return;
    }

    marker.current.setDraggable(!disabled);

    // The editor typed a coordinate, so the pin follows the field. A drag has
    // already written the same pair, which makes this a no-op rather than a loop.
    const current = marker.current.getPosition();
    const moved =
      roundCoordinate(current.lat()) !== roundCoordinate(lat) ||
      roundCoordinate(current.lng()) !== roundCoordinate(lng);
    if (moved) {
      marker.current.setPosition(position);
      map.current.panTo(position);
    }
  }, [status, lat, lng, placed, disabled]);

  if (status === 'loading' || status === 'ready') {
    return (
      <div className={styles.wrapper}>
        <div
          className={styles.map}
          ref={container}
          role="application"
          aria-label="Property location map"
        >
          {status === 'loading' ? <p className={styles.loading}>Loading the map…</p> : null}
        </div>
        <p className={styles.hint}>
          <Icon icon="mdi:cursor-move" width="16" height="16" aria-hidden="true" />
          Drag the pin — or click the map — to set the coordinates.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {status === 'failed' ? (
        <Alert tone="warning" title="The interactive map is unavailable">
          The Google Maps script did not load. The preview below still works, and the coordinates
          can be typed or taken from the locality.
        </Alert>
      ) : null}

      <MapEmbed
        latitude={latitude}
        longitude={longitude}
        title="Property location preview"
        className={styles.map}
        placeholder="Add a latitude and a longitude — or use the locality centre — to see the map."
      />

      {onUseLocalityCentre ? (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onUseLocalityCentre}
          icon={<Icon icon="mdi:map-marker-radius-outline" width="16" height="16" />}
        >
          {localityName ? `Use the centre of ${localityName}` : 'Use locality centre'}
        </Button>
      ) : null}
    </div>
  );
}
