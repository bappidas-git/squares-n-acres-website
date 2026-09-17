import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import { Avatar } from '../../ui';
import { formatDate } from '../../../utils/format';

import styles from './article.module.css';

/**
 * The line under an article's headline: who wrote it, when it was published,
 * when it was last revised, how long it takes to read and what it is about.
 *
 * Every part is optional, because every part of the record is: §6.8 gives an
 * article an author and a category it may not have been given yet, and a row
 * that printed "by —" or an empty chip would be worse than a shorter row.
 *
 * @param {object} props
 * @param {object} props.article a §6.8 article or summary
 * @param {boolean} [props.withAvatar]
 * @param {boolean} [props.withCategory]
 * @param {boolean} [props.linkAuthor] `false` on the author's own page
 */
export default function ArticleMeta({
  article,
  withAvatar = true,
  withCategory = true,
  linkAuthor = true,
  className = '',
}) {
  if (!article) return null;

  const author = article.author ?? null;
  const category = article.category ?? null;
  const updated = article.updatedAtDisplay ?? null;

  return (
    <div className={[styles.meta, className].filter(Boolean).join(' ')}>
      {withCategory && category?.slug ? (
        <Link to={PATHS.articleCategory(category.slug)} className={styles.metaCategory}>
          {category.name}
        </Link>
      ) : null}

      {author?.name ? (
        <span className={styles.metaItem}>
          {withAvatar ? (
            <Avatar src={author.avatarUrl} name={author.name} size={28} aria-hidden="true" />
          ) : (
            <Icon icon="mdi:account-outline" width="16" height="16" aria-hidden="true" />
          )}
          {linkAuthor && author.slug ? (
            <Link to={PATHS.author(author.slug)} className={styles.metaLink}>
              {author.name}
            </Link>
          ) : (
            <span>{author.name}</span>
          )}
        </span>
      ) : null}

      {article.publishedAt ? (
        <span className={styles.metaItem}>
          <Icon icon="mdi:calendar-outline" width="16" height="16" aria-hidden="true" />
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </span>
      ) : null}

      {updated ? (
        <span className={styles.metaItem}>
          <Icon icon="mdi:update" width="16" height="16" aria-hidden="true" />
          <span>
            Updated on <time dateTime={updated}>{formatDate(updated)}</time>
          </span>
        </span>
      ) : null}

      {article.readingTimeMinutes ? (
        <span className={styles.metaItem}>
          <Icon icon="mdi:clock-outline" width="16" height="16" aria-hidden="true" />
          {article.readingTimeMinutes} min read
        </span>
      ) : null}
    </div>
  );
}
