import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import useApi from '../../../hooks/useApi';
import { Skeleton } from '../../ui';

import styles from './TagCloud.module.css';

/** Enough tags to describe the archive without becoming a wall of pills. */
const LIMIT = 20;

/**
 * The tags the archive is indexed by, each a link to its own page.
 *
 * A tag nothing published carries is left out: §5.14 counts only published
 * articles into `articleCount`, so a zero is a page that would open on an
 * empty state.
 *
 * @param {object} props
 * @param {Array<object>} [props.tags] pass them in to skip the request
 * @param {string} [props.activeSlug] the tag whose page this is
 * @param {number} [props.limit]
 * @param {string} [props.title]
 */
export default function TagCloud({
  tags,
  activeSlug = '',
  limit = LIMIT,
  title = 'Browse by topic',
  className = '',
}) {
  const provided = Array.isArray(tags);

  const { data, loading } = useApi(
    (signal) => articleService.tags({ perPage: 'all' }, { signal }),
    [],
    { enabled: !provided, initialData: [] }
  );

  const items = (provided ? tags : Array.isArray(data) ? data : [])
    .filter((tag) => (tag.articleCount ?? 0) > 0 || tag.slug === activeSlug)
    .slice(0, limit);

  if (!provided && loading) {
    return (
      <section className={[styles.cloud, className].filter(Boolean).join(' ')} aria-busy="true">
        <h2 className={styles.title}>{title}</h2>
        <Skeleton variant="rounded" height={96} />
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={[styles.cloud, className].filter(Boolean).join(' ')}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {items.map((tag) => (
          <li key={tag.id}>
            <Link
              to={PATHS.articleTag(tag.slug)}
              className={[styles.tag, tag.slug === activeSlug ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
              aria-current={tag.slug === activeSlug ? 'page' : undefined}
            >
              {tag.name}
              {tag.articleCount ? <span className={styles.count}>{tag.articleCount}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
