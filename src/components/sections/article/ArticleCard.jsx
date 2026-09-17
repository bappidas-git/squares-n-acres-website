import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import { Avatar, LazyImage } from '../../ui';
import { formatDate } from '../../../utils/format';

import styles from './ArticleCard.module.css';

/**
 * One article, as every grid on the site shows it: the index, a category, a
 * tag, an author's page, the related row and the home page's "Latest
 * insights". One card means one set of proportions — a 16/9 cover, a
 * three-line excerpt, a byline — so those six places cannot drift apart.
 *
 * The whole card is not one link: the cover and the headline are, which keeps
 * the category chip and the author's name clickable in their own right and
 * gives a screen reader a link named after the article rather than after its
 * entire text.
 *
 * @param {object} props
 * @param {object} props.article a §6.8 `ArticleSummary`
 * @param {'grid'|'compact'} [props.variant] `compact` drops the excerpt and the byline
 * @param {2|3} [props.headingLevel] `3` inside a section that already has an h2
 * @param {'lazy'|'eager'} [props.loading] the cover's loading strategy
 */
export default function ArticleCard({
  article,
  variant = 'grid',
  headingLevel = 3,
  loading = 'lazy',
  className = '',
}) {
  if (!article) return null;

  const Heading = `h${headingLevel}`;
  const href = PATHS.article(article.slug);
  const image = article.featuredImage ?? {};
  const author = article.author ?? null;
  const compact = variant === 'compact';

  return (
    <article
      className={[styles.card, compact ? styles.compact : '', className].filter(Boolean).join(' ')}
    >
      <Link to={href} className={styles.cover} tabIndex={-1} aria-hidden="true">
        <LazyImage
          src={image.url}
          alt=""
          ratio="16/9"
          loading={loading}
          className={styles.coverImage}
        />
      </Link>

      <div className={styles.body}>
        <div className={styles.topline}>
          {article.category?.name ? (
            <Link
              to={PATHS.articleCategory(article.category.slug)}
              className={styles.category}
              onClick={(event) => event.stopPropagation()}
            >
              {article.category.name}
            </Link>
          ) : null}
          {article.readingTimeMinutes ? (
            <span className={styles.readingTime}>{article.readingTimeMinutes} min read</span>
          ) : null}
        </div>

        <Heading className={styles.title}>
          <Link to={href} className={styles.titleLink}>
            {article.title}
          </Link>
        </Heading>

        {!compact && article.excerpt ? <p className={styles.excerpt}>{article.excerpt}</p> : null}

        <div className={styles.footer}>
          {!compact && author?.name ? (
            <span className={styles.author}>
              <Avatar src={author.avatarUrl} name={author.name} size={28} aria-hidden="true" />
              <span className={styles.authorName}>{author.name}</span>
            </span>
          ) : null}
          {article.publishedAt ? (
            <time className={styles.date} dateTime={article.publishedAt}>
              {formatDate(article.publishedAt)}
            </time>
          ) : null}
        </div>
      </div>
    </article>
  );
}
