import { useEffect, useMemo, useRef, useState } from 'react';

import FilterGroups from './FilterGroups';
import propertyService from '../../services/propertyService';
import styles from './filters.module.css';
import useDebounce from '../../hooks/useDebounce';
import { BottomSheet, Button } from '../ui';
import { formatNumber } from '../../utils/format';
import { isCanceled } from '../../services/apiError';
import { serializeFilters } from '../../utils/listingFilters';

/** The same 300 ms the rail waits, here spent counting rather than applying. */
const COUNT_DELAY = 300;

/**
 * The phone's filter sheet: the rail's groups in a sheet, applied on demand.
 *
 * Because the results are behind the sheet, the visitor cannot see what a
 * choice did — so the footer says it: a count request with `perPage=1` asks the
 * API how many listings the draft would return and the button reads "Show 34
 * results". That is one small request per settled change, not a page of cards.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object} props.params
 * @param {object} props.fixed
 * @param {object} [props.facets]
 * @param {(draft: object) => void} props.onApply
 * @param {() => void} props.onReset
 * @param {number} props.activeCount
 */
export default function FilterSheet({
  open,
  onClose,
  params,
  fixed,
  facets,
  onApply,
  onReset,
  activeCount,
}) {
  const [draft, setDraft] = useState(params);
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);

  const paramsKey = useMemo(() => JSON.stringify(serializeFilters(params)), [params]);
  const draftKey = useMemo(() => JSON.stringify(serializeFilters(draft)), [draft]);
  const settledKey = useDebounce(draftKey, COUNT_DELAY);

  const latest = useRef({ params, draft, fixed });
  latest.current = { params, draft, fixed };

  // Opening the sheet — and anything applied while it is shut — starts the
  // draft from what the listing is actually showing.
  useEffect(() => {
    setDraft(latest.current.params);
  }, [open, paramsKey]);

  useEffect(() => {
    if (!open || settledKey !== draftKey) return undefined;

    const controller = new AbortController();
    setCounting(true);

    propertyService
      .list(
        { ...latest.current.draft, ...latest.current.fixed, page: 1, perPage: 1 },
        { signal: controller.signal }
      )
      .then(({ meta }) => {
        setCount(Number.isFinite(meta?.total) ? meta.total : null);
        setCounting(false);
      })
      .catch((error) => {
        if (isCanceled(error)) return;
        setCount(null);
        setCounting(false);
      });

    return () => controller.abort();
  }, [open, settledKey, draftKey]);

  const label = counting || count === null ? 'Show results' : `Show ${formatNumber(count)} results`;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
      footer={
        <div className={styles.sheetFooter}>
          <Button variant="outline" onClick={onReset} disabled={activeCount === 0}>
            Reset
          </Button>
          <Button
            fullWidth
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            disabled={counting || count === 0}
          >
            {count === 0 ? 'No results' : label}
          </Button>
        </div>
      }
    >
      <FilterGroups
        value={draft}
        fixed={fixed}
        facets={facets}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      />
    </BottomSheet>
  );
}
