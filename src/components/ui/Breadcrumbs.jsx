import { Link } from 'react-router-dom';

import styles from './Breadcrumbs.module.css';

/**
 * `<nav aria-label="Breadcrumb">` with an ordered list; the last item carries
 * `aria-current="page"` and is never a link. The matching `BreadcrumbList`
 * structured data is emitted by `<Seo>` from the same array — one trail, drawn
 * once and published once (§9.3).
 *
 * Both spellings are accepted: `{ label, to }`, which the route tables have
 * used since prompt 26, and `{ name, path }`, which is what
 * `seo/breadcrumbs.js` produces and what schema.org's `ListItem` calls them. A
 * page hands the same array to this component and to `<Seo breadcrumbs>`.
 *
 * @param {object} props
 * @param {Array<{label?: string, to?: string, name?: string, path?: string}>} props.items
 * @param {boolean} [props.onDark]
 */
export default function Breadcrumbs({ items = [], onDark = false, className = '', ...rest }) {
  const trail = (Array.isArray(items) ? items : [])
    .map((item) => ({ label: item?.label ?? item?.name, to: item?.to ?? item?.path }))
    .filter((item) => item.label);

  if (!trail.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={[styles.nav, onDark ? styles.onDark : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <ol className={styles.list}>
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
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
