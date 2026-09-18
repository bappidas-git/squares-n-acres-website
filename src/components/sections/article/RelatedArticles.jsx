import ArticleCard from './ArticleCard';
import articleService from '../../../services/articleService';
import useApi from '../../../hooks/useApi';
import { Skeleton } from '../../ui';

import styles from './RelatedArticles.module.css';
import { BLOG } from '../../../config/copy';

/** Three is what the row has space for at every width it is drawn at. */
const LIMIT = 3;

/**
 * "Read next" — the articles the editor chose, or the rest of the category.
 *
 * `relatedArticleIds` wins because somebody decided it: `GET /articles?ids=`
 * returns the ids in the order they were given (§5.7), so the editor's
 * ordering survives. With none chosen the row falls back to the same category,
 * newest first, minus this article — which is why it asks for one more than it
 * shows.
 *
 * @param {object} props
 * @param {number|string} props.articleId the article being read, never listed
 * @param {Array<number|string>} [props.relatedIds]
 * @param {string} [props.categorySlug] the fallback's filter
 * @param {string} [props.title]
 */
export default function RelatedArticles({
  articleId,
  relatedIds = [],
  categorySlug = '',
  title = BLOG.relatedArticles,
  className = '',
}) {
  const chosen = relatedIds.filter(Boolean);
  const key = chosen.join(',');
  const enabled = chosen.length > 0 || Boolean(categorySlug);

  const { data, loading } = useApi(
    (signal) =>
      key
        ? articleService.list({ ids: key, perPage: chosen.length }, { signal })
        : articleService.list({ categorySlug, sort: 'newest', perPage: LIMIT + 1 }, { signal }),
    [key, categorySlug],
    { enabled, initialData: [] }
  );

  if (!enabled) return null;

  if (loading) {
    return (
      <section className={[styles.related, className].filter(Boolean).join(' ')} aria-busy="true">
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.grid}>
          {Array.from({ length: LIMIT }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={320} />
          ))}
        </div>
      </section>
    );
  }

  const articles = (Array.isArray(data) ? data : [])
    .filter((article) => String(article.id) !== String(articleId))
    .slice(0, LIMIT);

  if (articles.length === 0) return null;

  return (
    <section className={[styles.related, className].filter(Boolean).join(' ')}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.grid}>
        {articles.map((article) => (
          <li key={article.id}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </section>
  );
}
