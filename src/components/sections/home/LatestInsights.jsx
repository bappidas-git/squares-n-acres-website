import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import ArticleCard from '../article/ArticleCard';
import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import styles from './LatestInsights.module.css';
import useApi from '../../../hooks/useApi';
import { Container, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';

/**
 * The three newest published articles.
 *
 * `GET /articles?perPage=3&sort=newest` returns them already filtered to
 * published and already ordered (§5.14), so this section neither sorts nor
 * filters — it replaces the "Trending topics" strip, which ranked by view
 * count and therefore showed the same three pieces for months.
 *
 * The cards are the blog's own `ArticleCard` (prompt 34): a card on the home
 * page and a card on `/insights/articles` are the same card, so the ratios,
 * the clamp and the byline cannot drift apart.
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
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
