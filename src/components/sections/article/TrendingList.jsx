import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import useApi from '../../../hooks/useApi';
import { Skeleton } from '../../ui';
import { formatDate } from '../../../utils/format';

import styles from './TrendingList.module.css';

/** `GET /articles/trending` answers with six; the sidebar shows all of them. */
const LIMIT = 6;

/**
 * The most-read articles, numbered 01–06.
 *
 * The ranking is `viewCount` measured by the API (§5.14), not a flag an editor
 * sets: the boilerplate's "trending" was a tag somebody had to remember to
 * move, so the same three pieces were trending for months (BUG-18).
 *
 * @param {object} props
 * @param {Array<object>} [props.articles] pass them in to skip the request
 * @param {number} [props.limit]
 * @param {string} [props.title]
 */
export default function TrendingList({
  articles,
  limit = LIMIT,
  title = 'Most read',
  className = '',
}) {
  const provided = Array.isArray(articles);

  const { data, loading } = useApi(
    (signal) => articleService.trending({ perPage: limit }, { signal }),
    [limit],
    { enabled: !provided, initialData: [] }
  );

  const items = (provided ? articles : Array.isArray(data) ? data : []).slice(0, limit);

  if (!provided && loading) {
    return (
      <section className={[styles.trending, className].filter(Boolean).join(' ')} aria-busy="true">
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} variant="text" height={44} />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={[styles.trending, className].filter(Boolean).join(' ')}>
      <h2 className={styles.title}>{title}</h2>
      <ol className={styles.list}>
        {items.map((article, index) => (
          <li key={article.id} className={styles.item}>
            <span className={styles.rank} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className={styles.body}>
              <Link to={PATHS.article(article.slug)} className={styles.link}>
                {article.title}
              </Link>
              {article.publishedAt ? (
                <time className={styles.date} dateTime={article.publishedAt}>
                  {formatDate(article.publishedAt)}
                </time>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
