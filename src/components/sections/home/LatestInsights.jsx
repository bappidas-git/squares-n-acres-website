import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import styles from './LatestInsights.module.css';
import useApi from '../../../hooks/useApi';
import { Container, LazyImage, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';
import { formatDate } from '../../../utils/format';

/**
 * The three newest published articles.
 *
 * `GET /articles?perPage=3&sort=newest` returns them already filtered to
 * published and already ordered (§5.14), so this section neither sorts nor
 * filters — it replaces the "Trending topics" strip, which ranked by view
 * count and therefore showed the same three pieces for months.
 */

const PARAMS = { perPage: 3, sort: 'newest' };

export default function LatestInsights() {
  const { data, loading } = useApi((signal) => articleService.list(PARAMS, { signal }), [], {
    initialData: [],
  });

  const articles = Array.isArray(data) ? data : [];
  if (loading || articles.length === 0) return null;

  return (
    <Section background="surface" spacing="lg">
      <Container>
        <SectionHeader
          title={HOME.insights.title}
          subtitle={HOME.insights.subtitle}
          action={
            <Link to={PATHS.articles} className={styles.viewAll}>
              {HOME.viewAll}
              <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
            </Link>
          }
        />

        <ul className={styles.grid}>
          {articles.map((article) => (
            <li key={article.id}>
              <Link to={PATHS.article(article.slug)} className={styles.card}>
                <LazyImage
                  src={article.featuredImage?.url}
                  alt={article.featuredImage?.alt || ''}
                  ratio="16/9"
                  className={styles.media}
                />
                <div className={styles.body}>
                  {article.category?.name ? (
                    <span className={styles.category}>{article.category.name}</span>
                  ) : null}
                  <h3 className={styles.title}>{article.title}</h3>
                  {article.excerpt ? <p className={styles.excerpt}>{article.excerpt}</p> : null}
                  <span className={styles.meta}>
                    {article.publishedAt ? <span>{formatDate(article.publishedAt)}</span> : null}
                    {article.readingTimeMinutes ? (
                      <span>{article.readingTimeMinutes} min read</span>
                    ) : null}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
