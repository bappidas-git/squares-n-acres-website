import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import useApi from '../../../hooks/useApi';
import { Container, LazyImage, Section, SectionHeader } from '../../ui';
import { formatDate } from '../../../utils/format';

import styles from './blocks.module.css';

/**
 * Article cards (§6.10 `articles`): the newest, a hand-picked set, or one
 * category. The same card the home page's insights band uses, so a guide looks
 * the same wherever it is linked from.
 */

/** Three across is what the grid is built for (§8.6 caps a request anyway). */
const PER_PAGE = 3;

export default function ArticlesBlock({ data = {}, background = 'surface' }) {
  const mode = data.mode || 'latest';
  const idsKey = (Array.isArray(data.ids) ? data.ids : []).join(',');

  const params = useMemo(() => {
    if (mode === 'ids') return { ids: idsKey, perPage: idsKey.split(',').filter(Boolean).length };
    if (mode === 'category') return { categoryId: data.categoryId, perPage: PER_PAGE };
    return { sort: 'newest', perPage: PER_PAGE };
  }, [mode, idsKey, data.categoryId]);

  const enabled = mode !== 'ids' || Boolean(idsKey);

  const { data: fetched } = useApi((signal) => articleService.list(params, { signal }), [params], {
    enabled,
    initialData: [],
  });

  const articles = Array.isArray(fetched) ? fetched : [];
  if (articles.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <SectionHeader
          title={data.title || 'From our insights'}
          align="left"
          action={
            <Link to={PATHS.articles} className={styles.viewAll}>
              View all
              <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
            </Link>
          }
        />

        <ul className={styles.articleGrid}>
          {articles.map((article) => (
            <li key={article.id}>
              <Link to={PATHS.article(article.slug)} className={styles.articleCard}>
                <LazyImage
                  src={article.featuredImage?.url}
                  alt={article.featuredImage?.alt || ''}
                  ratio="16/9"
                  className={styles.articleMedia}
                />
                <span className={styles.articleBody}>
                  {article.category?.name ? (
                    <span className={styles.articleCategory}>{article.category.name}</span>
                  ) : null}
                  <span className={styles.articleTitle}>{article.title}</span>
                  {article.excerpt ? (
                    <span className={styles.articleExcerpt}>{article.excerpt}</span>
                  ) : null}
                  <span className={styles.articleMeta}>
                    {article.publishedAt ? <span>{formatDate(article.publishedAt)}</span> : null}
                    {article.readingTimeMinutes ? (
                      <span>{article.readingTimeMinutes} min read</span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

ArticlesBlock.isEmpty = (data) =>
  (data?.mode === 'ids' && (Array.isArray(data?.ids) ? data.ids : []).length === 0) ||
  (data?.mode === 'category' && !data?.categoryId);
