import { Helmet } from 'react-helmet-async';

import styles from './Pagination.module.css';

/**
 * Build the page list with ellipses: 1 … 4 5 [6] 7 8 … 20.
 * @returns {(number|'gap')[]}
 */
function buildPages(page, totalPages, siblings = 1) {
  const total = Math.max(totalPages, 1);
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const first = 1;
  const last = total;
  const start = Math.max(page - siblings, first + 1);
  const end = Math.min(page + siblings, last - 1);

  const pages = [first];
  if (start > first + 1) pages.push('gap');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < last - 1) pages.push('gap');
  pages.push(last);
  return pages;
}

/**
 * Server-driven pagination.
 *
 * When `prevHref`/`nextHref` are supplied it also emits `<link rel="prev">` and
 * `<link rel="next">`, which is what tells search engines a paginated series
 * belongs together (§9.4).
 *
 * @param {object} props
 * @param {number} props.page 1-based
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onChange
 * @param {string} [props.prevHref] absolute URL of the previous page
 * @param {string} [props.nextHref] absolute URL of the next page
 * @param {string} [props.label] accessible name of the navigation
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  onChange,
  prevHref,
  nextHref,
  siblings = 1,
  label = 'Pagination',
  className = '',
  ...rest
}) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages, siblings);
  const go = (next) => {
    if (next < 1 || next > totalPages || next === page) return;
    onChange?.(next);
  };

  return (
    <>
      {prevHref || nextHref ? (
        <Helmet>
          {prevHref ? <link rel="prev" href={prevHref} /> : null}
          {nextHref ? <link rel="next" href={nextHref} /> : null}
        </Helmet>
      ) : null}
      <nav
        aria-label={label}
        className={[styles.pagination, className].filter(Boolean).join(' ')}
        {...rest}
      >
        <button
          type="button"
          className={styles.page}
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          &lsaquo;
        </button>

        {pages.map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className={styles.ellipsis} aria-hidden="true">
              &hellip;
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={[styles.page, entry === page ? styles.current : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => go(entry)}
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? 'page' : undefined}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.page}
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          &rsaquo;
        </button>
      </nav>
    </>
  );
}
