import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';

import styles from './CategoryTabs.module.css';

/**
 * "All" and the four article categories (§6.8), with the number published in
 * each.
 *
 * Two modes, one strip. With `onSelect` the tabs are buttons that set
 * `?categorySlug=` on the index, so the search and the page the reader is on
 * survive the change; without it they are links to `/insights/articles/
 * category/:slug`, which is what a category page — a URL of its own, with its
 * own title and its own place in a sitemap — needs.
 *
 * @param {object} props
 * @param {Array<object>} props.categories
 * @param {string} [props.activeSlug] `''` is "All"
 * @param {(slug: string) => void} [props.onSelect]
 * @param {string} [props.label] the accessible name of the strip
 */
export default function CategoryTabs({
  categories = [],
  activeSlug = '',
  onSelect,
  label = 'Article categories',
  className = '',
}) {
  if (categories.length === 0) return null;

  const tabs = [
    { key: 'all', slug: '', name: 'All', to: PATHS.articles, count: null },
    ...categories.map((category) => ({
      key: category.id,
      slug: category.slug,
      name: category.name,
      to: PATHS.articleCategory(category.slug),
      count: category.articleCount ?? null,
    })),
  ];

  return (
    <nav className={[styles.tabs, className].filter(Boolean).join(' ')} aria-label={label}>
      <ul className={styles.list}>
        {tabs.map((tab) => {
          const active = tab.slug === activeSlug;
          const classes = [styles.tab, active ? styles.active : ''].filter(Boolean).join(' ');
          const content = (
            <>
              {tab.name}
              {tab.count ? <span className={styles.count}>{tab.count}</span> : null}
            </>
          );

          return (
            <li key={tab.key}>
              {onSelect ? (
                <button
                  type="button"
                  className={classes}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(tab.slug)}
                >
                  {content}
                </button>
              ) : (
                <Link to={tab.to} className={classes} aria-current={active ? 'page' : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
