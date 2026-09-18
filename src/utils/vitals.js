import { EVENTS, track } from './analytics';

/**
 * What the visitor's own browser thought of the page.
 *
 * `web-vitals` measures the five field metrics Google ranks on and reports
 * each one once, when it is final — LCP when the visitor first interacts or
 * the tab is hidden, CLS when the page is unloaded, FID on the first input.
 * Every one of them goes through `track()`, which means it lands in
 * `window.dataLayer` and, when GA4 is configured, in GA4 as a `web_vitals`
 * event with the metric's name, value, rating and id (§8.6).
 *
 * The id matters: it identifies the page load, so a report of five metrics is
 * recognisably five readings of one visit rather than five visits.
 *
 * `web-vitals@2` exports `getCLS`/`getFID`/`getLCP`/`getFCP`/`getTTFB` — the
 * v3 `onCLS`/`onINP` names belong to a major this project does not pin (§3.3),
 * so INP is not available here and FID is what stands in for responsiveness.
 *
 * Nothing is reported when no tag is configured either: the pushes accumulate
 * in `window.dataLayer` and a developer can read them in the console, which is
 * exactly how prompt 41's manual QA checks this works.
 *
 * The library is loaded through `import()`, so its couple of kilobytes are not
 * in the entry chunk that the budget is measured on.
 */

/** Google's own thresholds, so a report says "poor" rather than only "3.8". */
const THRESHOLDS = {
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  FID: [100, 300],
  LCP: [2500, 4000],
  TTFB: [800, 1800],
};

/**
 * `good` | `needs-improvement` | `poor` for a metric's value.
 *
 * @param {string} name
 * @param {number} value
 * @returns {string}
 */
export function ratingFor(name, value) {
  const bounds = THRESHOLDS[name];
  if (!bounds || !Number.isFinite(value)) return 'unknown';
  if (value <= bounds[0]) return 'good';
  return value <= bounds[1] ? 'needs-improvement' : 'poor';
}

/**
 * A metric's value, rounded to something worth storing.
 *
 * CLS is a unitless score between 0 and about 1, so it keeps three decimals;
 * everything else is milliseconds, where a tenth is already noise.
 *
 * @param {string} name
 * @param {number} value
 * @returns {number}
 */
export function roundValue(name, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return name === 'CLS' ? Math.round(numeric * 1000) / 1000 : Math.round(numeric);
}

/**
 * One metric, as the event the data layer receives.
 *
 * Exported for the test: the shape is the contract with whoever configures
 * GA4, and a rename here is a renamed dimension in somebody's report.
 *
 * @param {{name: string, value: number, id: string, delta?: number}} metric
 * @returns {{name: string, value: number, id: string, rating: string}}
 */
export function vitalsPayload(metric) {
  const value = roundValue(metric.name, metric.value);
  return { name: metric.name, value, id: metric.id, rating: ratingFor(metric.name, value) };
}

/**
 * Starts reporting this page load's Core Web Vitals.
 *
 * Called once, from `src/index.js`, in an idle slot after the app has mounted:
 * measuring the page must not be part of rendering it.
 *
 * @param {(metric: object) => void} [report] replaces the `track()` bridge —
 *   the parameter CRA's own `reportWebVitals` had, kept for a caller that
 *   wants the raw metric (a console log while tuning, a test)
 * @returns {Promise<void>} resolves once the library is listening
 */
export default function reportWebVitals(report) {
  const send = (metric) => {
    if (typeof report === 'function') {
      report(metric);
      return;
    }
    track(EVENTS.webVitals, vitalsPayload(metric));
  };

  return import('web-vitals')
    .then(({ getCLS, getFCP, getFID, getLCP, getTTFB }) => {
      getCLS(send);
      getFCP(send);
      getFID(send);
      getLCP(send);
      getTTFB(send);
    })
    .catch(() => {
      // A measurement that could not be taken is not worth an error in a
      // visitor's console.
    });
}
