import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import ArticleMeta from './ArticleMeta';
import PATHS from '../../../routes/paths';
import { LazyImage } from '../../ui';

import styles from './ArticleHero.module.css';

/**
 * The editor's pick at the top of the blog index: the newest article carrying
 * `isFeatured` (§6.8), given a wide cover and room for its excerpt.
 *
 * It is drawn on the first page of the unfiltered index only, and the grid
 * below leaves it out — a hero and the first card being the same piece is how
 * an index looks like it has one fewer article than it has.
 *
 * The cover is a 21/9 crop rather than the cards' 16/9: across the full width
 * of the listing column, 16/9 is most of a laptop screen before the headline
 * has been reached.
 *
 * @param {object} props
 * @param {object} props.article
 */
export default function ArticleHero({ article, className = '' }) {
  if (!article) return null;

  const href = PATHS.article(article.slug);
  const image = article.featuredImage ?? {};

  return (
    <article className={[styles.hero, className].filter(Boolean).join(' ')}>
      <Link to={href} className={styles.media} tabIndex={-1} aria-hidden="true">
        <LazyImage
          src={image.url}
          alt=""
          ratio="21/9"
          loading="eager"
          fetchPriority="high"
          className={styles.image}
        />
      </Link>

      <div className={styles.body}>
        <span className={styles.badge}>
          <Icon icon="mdi:star-outline" width="16" height="16" aria-hidden="true" />
          Editor&rsquo;s pick
        </span>

        <h2 className={styles.title}>
          <Link to={href} className={styles.titleLink}>
            {article.title}
          </Link>
        </h2>

        {article.excerpt ? <p className={styles.excerpt}>{article.excerpt}</p> : null}

        <ArticleMeta article={article} className={styles.meta} />

        <Link to={href} className={styles.cta}>
          Read the guide
          <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
