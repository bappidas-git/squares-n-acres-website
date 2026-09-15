import { Link } from 'react-router-dom';

import styles from './Breadcrumbs.module.css';

/**
 * `<nav aria-label="Breadcrumb">` with an ordered list; the last item carries
 * `aria-current="page"` and is never a link. The matching `BreadcrumbList`
 * structured data is emitted by `<Seo>` from the same `items` array.
 *
 * @param {object} props
 * @param {{ label: string, to?: string }[]} props.items
 * @param {boolean} [props.onDark]
 */
export default function Breadcrumbs({ items = [], onDark = false, className = '', ...rest }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={[styles.nav, onDark ? styles.onDark : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {isLast || !item.to ? (
                <span className={styles.current} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              )}
              {isLast ? null : (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
