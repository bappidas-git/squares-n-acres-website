import { useEffect, useMemo, useRef, useState } from 'react';

import FilterGroups from './FilterGroups';
import styles from './filters.module.css';
import useDebounce from '../../hooks/useDebounce';
import { Button } from '../ui';
import { LISTING, fill } from '../../config/copy';
import { serializeFilters } from '../../utils/listingFilters';

/** How long the rail waits after the last click before it asks the API. */
export const APPLY_DELAY = 300;

/**
 * The desktop filter rail: 280 px, sticky, and applied as you go.
 *
 * Every control writes into a draft; 300 ms after the last one the draft
 * becomes the URL and the URL becomes a request. Three ticked boxes are one
 * search, not three, and a mistyped budget never reaches the server.
 *
 * There is no Apply button here on purpose — the results are already the
 * answer — but there is always a Reset, because a filter you cannot undo is
 * worse than a filter you never applied. The mobile sheet, where the results
 * are hidden behind the sheet, keeps its Apply.
 *
 * @param {object} props
 * @param {object} props.params the applied params
 * @param {object} props.fixed the route's own filters (rendered as locked chips instead)
 * @param {object} [props.facets] `meta.facets`
 * @param {(draft: object) => void} props.onApply
 * @param {() => void} props.onReset
 * @param {number} props.activeCount
 */
export default function FilterRail({ params, fixed, facets, onApply, onReset, activeCount }) {
  const [draft, setDraft] = useState(params);

  const paramsKey = useMemo(() => JSON.stringify(serializeFilters(params)), [params]);
  const draftKey = useMemo(() => JSON.stringify(serializeFilters(draft)), [draft]);
  const settledKey = useDebounce(draftKey, APPLY_DELAY);

  const latest = useRef({ params, draft, onApply });
  latest.current = { params, draft, onApply };

  // Whether the draft is the visitor's doing. Without it, a chip removed while
  // a stale draft is in hand would be put straight back by the next commit.
  const touched = useRef(false);

  // Anything that changes the params from outside the rail — a chip removed, a
  // sort, the back button — is the new truth the controls must show.
  useEffect(() => {
    touched.current = false;
    setDraft(latest.current.params);
  }, [paramsKey]);

  useEffect(() => {
    // Not the rail's doing, still moving, or already applied: nothing to send.
    if (!touched.current || settledKey !== draftKey || settledKey === paramsKey) return;
    touched.current = false;
    latest.current.onApply(latest.current.draft);
  }, [settledKey, draftKey, paramsKey]);

  const change = (patch) => {
    touched.current = true;
    setDraft((current) => ({ ...current, ...patch }));
  };

  return (
    <aside className={styles.rail} aria-label={LISTING.filtersLandmark}>
      <div className={styles.railScroll}>
        <FilterGroups value={draft} fixed={fixed} facets={facets} onChange={change} />
      </div>

      <div className={styles.railFooter}>
        <span className={styles.railCount}>
          {activeCount > 0
            ? fill(activeCount === 1 ? LISTING.filtersAppliedOne : LISTING.filtersAppliedMany, {
                count: activeCount,
              })
            : LISTING.noFilters}
        </span>
        <Button variant="outline" size="sm" onClick={onReset} disabled={activeCount === 0}>
          {LISTING.reset}
        </Button>
      </div>
    </aside>
  );
}
