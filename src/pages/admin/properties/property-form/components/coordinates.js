/**
 * The three coordinate rules, in a module with no components in it.
 *
 * They lived in `MapPinPicker.jsx` and were imported from there by
 * `LocationTab` — which meant the tab pulled the whole picker, the Google Maps
 * loader and the fallback iframe into its own chunk just to round a number
 * (prompt 41 §4.2). Split out, the picker is a `React.lazy` boundary and these
 * stay where a form can read them for free.
 *
 * `MapPinPicker` re-exports all three, so the names it published still resolve
 * from it.
 */

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
