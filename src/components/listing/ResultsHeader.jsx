import { Icon } from '@iconify/react';

import GlobalSearch from '../common/GlobalSearch';
import SortSelect from './SortSelect';
import ViewToggle from './ViewToggle';
import styles from './ListingEngine.module.css';
import { LISTING } from '../../config/copy';
import { formatNumber } from '../../utils/format';

/**
 * The heading, the result count and the three controls above the grid.
 *
 * The count is `aria-live="polite"`: applying a filter changes the page without
 * moving focus, and a screen reader is told "34 properties" rather than being
 * left to discover it (§8.3).
 *
 * @param {object} props
 * @param {string} props.title the `<h1>` — built from the filters by `listingSeo`
 * @param {string} [props.intro]
 * @param {number|null} props.total
 * @param {boolean} props.loading
 * @param {'h1'|'h2'|'h3'|null} [props.headingLevel] an embed never owns the
 *   page's `<h1>`, and `null` leaves the heading to the section around it
 * @param {number} props.activeCount
 * @param {() => void} props.onOpenFilters
 * @param {boolean} [props.showSearch]
 */
export default function ResultsHeader({
  title,
  intro,
  total,
  loading,
  headingLevel = 'h1',
  sort,
  onSortChange,
  view,
  onViewChange,
  activeCount,
  onOpenFilters,
  showSearch = true,
  searchValue,
  onSearch,
}) {
  const Heading = headingLevel;

  return (
    <header className={styles.resultsHeader}>
      <div className={styles.headingBlock}>
        {Heading ? <Heading className={styles.heading}>{title}</Heading> : null}
        {intro ? <p className={styles.intro}>{intro}</p> : null}
        <p className={styles.count} aria-live="polite">
          {loading && total === null
            ? LISTING.searching
            : total === null
              ? ''
              : `${formatNumber(total)} ${total === 1 ? LISTING.resultOne : LISTING.resultMany}`}
        </p>
      </div>

      {showSearch ? (
        <div className={styles.headerSearch}>
          <GlobalSearch variant="compact" value={searchValue} onSearch={onSearch} />
        </div>
      ) : null}

      <div className={styles.controls}>
        <button type="button" className={styles.filtersButton} onClick={onOpenFilters}>
          <Icon icon="mdi:tune-variant" width="18" height="18" aria-hidden="true" />
          {LISTING.filters}
          {activeCount > 0 ? <span className={styles.filtersCount}>{activeCount}</span> : null}
        </button>

        <SortSelect value={sort} onChange={onSortChange} />
        <ViewToggle value={view} onChange={onViewChange} />
      </div>
    </header>
  );
}
