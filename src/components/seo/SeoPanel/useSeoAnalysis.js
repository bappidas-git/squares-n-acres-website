import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { analyze } from '../../../seo';

/** How long the panel waits after the last keystroke before it re-analyses (§4.1). */
export const ANALYSIS_DEBOUNCE_MS = 400;

/** The §9.6 fields the analysis *writes*; reading them back would be a loop. */
const COMPUTED = ['score', 'scoreBand', 'testsPassed', 'testsTotal', 'analysis', 'lastAnalyzedAt'];

/** A record without the fields the analysis put there. */
function withoutComputed(entity) {
  if (!entity || typeof entity !== 'object') return entity;
  const seo = entity.seo;
  if (!seo || typeof seo !== 'object') return entity;

  const trimmed = { ...seo };
  for (const key of COMPUTED) delete trimmed[key];
  return { ...entity, seo: trimmed };
}

/** What two analyses have to differ in for the record to be worth rewriting. */
const signatureOf = (result) =>
  result
    ? [
        result.score,
        result.band,
        result.testsPassed,
        result.testsTotal,
        Object.values(result.groups ?? {})
          .flat()
          .map((test) => `${test.id}:${test.status}:${test.message}`)
          .join('|'),
      ].join('~')
    : '';

/**
 * The analysis of the record the panel is editing, kept current.
 *
 * Three things make this harder than calling `analyze` in a `useMemo`:
 *
 * 1. **It must not run on every keystroke.** A property with twenty images and
 *    a long description is a few milliseconds of work; a debounce of 400 ms
 *    turns "on every keystroke" into "when they stop typing" (§4.1).
 * 2. **It must not loop.** The result is written back onto the same record it
 *    analysed, which would re-trigger it forever. Two guards: the analysis
 *    input ignores the six computed fields (`withoutComputed`), and the write
 *    only happens when the answer actually changed (`signatureOf`).
 * 3. **It must not shift the layout.** A re-analysis replaces the previous
 *    result in one go; `analysing` is true only until the first one lands, so
 *    the skeleton rows appear once and never again (§6).
 *
 * @param {object} options
 * @param {string} options.entityType
 * @param {object} options.entity the record, as the host form holds it
 * @param {object} [options.context] `{ siteIndex, seoSettings, banksAvailable, … }`
 * @param {(patch: object) => void} [options.onResult] given the §9.6 fields to
 *   store, only when they changed
 * @param {boolean} [options.enabled]
 * @param {number} [options.delay]
 * @returns {{analysis: object, analysing: boolean, lastAnalyzedAt: string|null,
 *   reanalyse: () => void}}
 */
export default function useSeoAnalysis({
  entityType,
  entity,
  context,
  onResult,
  enabled = true,
  delay = ANALYSIS_DEBOUNCE_MS,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(null);

  // Read by the timer without becoming a dependency of it: a new inline
  // `onResult` arrow on every render must not restart the debounce.
  const latest = useRef({});
  latest.current = { entityType, entity, context, onResult };

  const lastSignature = useRef('');

  // The analysis input as one string. Everything the analysers read is in here
  // and nothing they write is, so a result being stored does not schedule the
  // next analysis. The record is a few kilobytes of JSON — the same cost the
  // property form already pays once a render to answer "is this dirty?".
  const inputKey = useMemo(() => JSON.stringify(withoutComputed(entity) ?? null), [entity]);

  // The site index arrives after the first analysis and decides three tests, so
  // its length is part of what "the same question" means.
  const contextKey = useMemo(
    () => `${context?.siteIndex?.length ?? 0}:${context?.seoSettings?.siteUrl ?? ''}`,
    [context?.siteIndex?.length, context?.seoSettings?.siteUrl]
  );

  const run = useCallback(() => {
    const current = latest.current;
    const result = analyze(current.entityType, current.entity ?? {}, current.context ?? {});
    const at = new Date().toISOString();

    setAnalysis(result);
    setLastAnalyzedAt(at);

    const signature = signatureOf(result);
    if (signature === lastSignature.current) return result;
    lastSignature.current = signature;

    current.onResult?.({
      score: result.score,
      scoreBand: result.band,
      testsPassed: result.testsPassed,
      testsTotal: result.testsTotal,
      analysis: result.groups,
      lastAnalyzedAt: at,
    });
    return result;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    // `inputKey` and `contextKey` are what "the question changed" means; the
    // effect reads everything else through the ref.
    const timer = setTimeout(run, delay);
    return () => clearTimeout(timer);
  }, [inputKey, contextKey, delay, enabled, run]);

  /** "Re-analyse" — the same work, without the wait. */
  const reanalyse = useCallback(() => {
    run();
  }, [run]);

  return { analysis, analysing: analysis === null, lastAnalyzedAt, reanalyse };
}
