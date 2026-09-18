import { Icon } from '@iconify/react';

import styles from './ListingEngine.module.css';
import { Button, EmptyState } from '../ui';
import { EMPTY, LISTING, fill } from '../../config/copy';
import {
  clearAllFilters,
  clearGroups,
  hasValue,
  widenSuggestions,
} from '../../utils/listingFilters';
import { useMasterData } from '../../contexts/MasterDataContext';

/**
 * Nothing matched — so say which filter to drop, not just that nothing matched.
 *
 * `widenSuggestions` orders the active filters by how much each one excludes
 * (§4), and every suggestion is one click: the budget goes, the search runs
 * again. A locality still gets its own way out, because "show me everything in
 * Whitefield" is what somebody who filtered a neighbourhood usually wants next.
 *
 * @param {object} props
 * @param {object} props.params
 * @param {object} props.fixed
 * @param {(patch: object) => void} props.onWiden
 * @param {() => void} props.onClear
 */
export default function ListingEmpty({ params, fixed = {}, onWiden, onClear }) {
  const master = useMasterData();
  const suggestions = widenSuggestions(params, { fixed });

  const localityIds = Array.isArray(params.localityId) ? params.localityId : [];
  const locality =
    localityIds.length === 1
      ? (master.localities ?? []).find((row) => String(row.id) === String(localityIds[0]))
      : null;

  const viewAllInLocality = () =>
    onWiden({ ...clearAllFilters(), localityId: localityIds, page: 1 });

  return (
    <EmptyState
      className={styles.empty}
      icon={<Icon icon="mdi:home-search-outline" width="40" height="40" />}
      title={EMPTY.listing.title}
      text={suggestions.length > 0 ? EMPTY.listing.widen : EMPTY.listing.text}
      action={
        <div className={styles.emptyActions}>
          {suggestions.length > 0 ? (
            <ul className={styles.emptySuggestions}>
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => onWiden(clearGroups([suggestion.id]))}
                  >
                    <Icon
                      icon="mdi:filter-remove-outline"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    />
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={styles.emptyButtons}>
            {locality ? (
              <Button variant="outline" onClick={viewAllInLocality}>
                {fill(EMPTY.listing.viewAllIn, { locality: locality.name })}
              </Button>
            ) : null}
            <Button
              variant={locality ? 'ghost' : 'outline'}
              onClick={onClear}
              disabled={!hasSomethingToClear(params, fixed)}
            >
              {LISTING.clearAll}
            </Button>
          </div>
        </div>
      }
    />
  );
}

/** Whether "Clear all" would change anything the visitor can change. */
function hasSomethingToClear(params, fixed) {
  return Object.entries(clearAllFilters()).some(
    ([key]) => key !== 'page' && hasValue(params[key]) && !hasValue(fixed[key])
  );
}
