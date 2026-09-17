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
 * The `<link rel="prev">` / `<link rel="next">` that tell a search engine a
 * series belongs together are **not** emitted here: they are part of the head,
 * and since prompt 38 the head has one owner (`<Seo pagination>`, §9.4). A page
 * that draws this control passes the same two URLs to `<Seo>`.
 *
 * @param {object} props
 * @param {number} props.page 1-based
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onChange
 * @param {string} [props.label] accessible name of the navigation
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  onChange,
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
  );
}
