import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import LeadForm from '../../components/common/LeadForm';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import styles from './Articles.module.css';
import useApi from '../../hooks/useApi';
import useApiList from '../../hooks/useApiList';
import { ErrorState, Pagination, Section } from '../../components/ui';
import { SITE } from '../../config/site';
import { formatDate } from '../../utils/format';

/**
 * The articles index. The list, the category chips and the search box all live
 * in the query string (`?page=`, `?categorySlug=`, `?q=`), so a shared link
 * reproduces the view and the back button works (§5.6).
 *
 * The categories come from `GET /article-categories` rather than a hardcoded
 * list, and trending is fetched once — the old page fired
 * `GET /articles/trending` on every change to `articles` (NEW-07).
 */

const PER_PAGE = 9;

const LIST_DEFAULTS = { page: 1, perPage: PER_PAGE, categorySlug: '', q: '' };
const LIST_PARAM_KEYS = { page: 'int', categorySlug: 'string', q: 'string' };

const ArticleCard = ({ article, index }) => (
  <motion.article
    className={styles.articleCard}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ delay: Math.min(index, 5) * 0.06, duration: 0.4 }}
  >
    <Link to={PATHS.article(article.slug)} className={styles.cardImageLink}>
      <div className={styles.cardImage}>
        {article.featuredImage?.url ? (
          <img
            src={article.featuredImage.url}
            alt={article.featuredImage.alt || article.title}
            loading="lazy"
          />
        ) : null}
        {article.category?.name ? (
          <span className={styles.categoryBadge}>{article.category.name}</span>
        ) : null}
      </div>
    </Link>
    <div className={styles.cardBody}>
      <div className={styles.cardMeta}>
        {article.author?.name ? (
          <span className={styles.metaItem}>
            <Icon icon="mdi:account-outline" />
            {article.author.name}
          </span>
        ) : null}
        <span className={styles.metaItem}>
          <Icon icon="mdi:calendar-outline" />
          {formatDate(article.publishedAt)}
        </span>
        {article.readingTimeMinutes ? (
          <span className={styles.metaItem}>
            <Icon icon="mdi:clock-outline" />
            {article.readingTimeMinutes} min read
          </span>
        ) : null}
      </div>
      <Link to={PATHS.article(article.slug)} className={styles.cardTitleLink}>
        <h2 className={styles.cardTitle}>{article.title}</h2>
      </Link>
      <p className={styles.cardExcerpt}>{article.excerpt}</p>
      <Link to={PATHS.article(article.slug)} className={styles.readMore}>
        Read more <Icon icon="mdi:arrow-right" />
      </Link>
    </div>
  </motion.article>
);

const Articles = () => {
  const { items, meta, loading, error, params, setPage, setFilters, refetch } = useApiList(
    (listParams, options) => articleService.list(listParams, options),
    {
      syncToUrl: true,
      paramKeys: LIST_PARAM_KEYS,
      defaults: LIST_DEFAULTS,
      debounceMs: 300,
    }
  );

  const { data: categories } = useApi(
    (signal) => articleService.categories({ perPage: 50 }, { signal }),
    [],
    { initialData: [] }
  );

  const { data: trending } = useApi(
    (signal) => articleService.trending(undefined, { signal }),
    [],
    {
      initialData: [],
    }
  );

  const categoryOptions = Array.isArray(categories) ? categories : [];
  const trendingArticles = (Array.isArray(trending) ? trending : []).slice(0, 4);
  const totalPages = meta?.totalPages ?? 1;

  return (
    <>
      <Helmet>
        <title>{`Articles and insights | ${SITE.name}`}</title>
        <meta
          name="description"
          content={`Buying guides, market notes, legal explainers and investment thinking on Bengaluru property, from ${SITE.name}.`}
        />
      </Helmet>

      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.heroBadge}>
              <Icon icon="mdi:newspaper-variant-outline" /> Insights
            </span>
            <h1 className={styles.heroTitle}>Articles and insights</h1>
            <p className={styles.heroSubtitle}>
              What we have learned about buying, selling and renting in Bengaluru — written plainly,
              with the caveats left in.
            </p>
          </motion.div>
        </section>

        <Section className={styles.section}>
          <div className={styles.contentLayout}>
            <div className={styles.mainContent}>
              <div className={styles.searchBar}>
                <Icon icon="mdi:magnify" className={styles.searchIcon} />
                <label className={styles.srOnly} htmlFor="article-search">
                  Search articles
                </label>
                <input
                  id="article-search"
                  type="text"
                  placeholder="Search articles"
                  value={params.q ?? ''}
                  onChange={(event) => setFilters({ q: event.target.value })}
                  className={styles.searchInput}
                />
                {params.q ? (
                  <button
                    className={styles.clearSearch}
                    onClick={() => setFilters({ q: '' })}
                    aria-label="Clear search"
                    type="button"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                ) : null}
              </div>

              <div className={styles.categoryChips}>
                <button
                  className={`${styles.chip} ${!params.categorySlug ? styles.chipActive : ''}`}
                  onClick={() => setFilters({ categorySlug: '' })}
                  type="button"
                >
                  All
                </button>
                {categoryOptions.map((category) => (
                  <button
                    key={category.id}
                    className={`${styles.chip} ${
                      params.categorySlug === category.slug ? styles.chipActive : ''
                    }`}
                    onClick={() => setFilters({ categorySlug: category.slug })}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {error ? (
                <ErrorState
                  title="We could not load the articles"
                  text={error.message}
                  onRetry={refetch}
                />
              ) : loading ? (
                <div className={styles.loadingGrid}>
                  {[1, 2, 3].map((key) => (
                    <div key={key} className={styles.skeleton}>
                      <div className={styles.skeletonImage} />
                      <div className={styles.skeletonBody}>
                        <div className={styles.skeletonLine} style={{ width: '60%' }} />
                        <div className={styles.skeletonLine} style={{ width: '90%' }} />
                        <div className={styles.skeletonLine} style={{ width: '75%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className={styles.emptyState}>
                  <Icon icon="mdi:file-search-outline" className={styles.emptyIcon} />
                  <h2>No articles found</h2>
                  <p>Try another category, or a different search.</p>
                </div>
              ) : (
                <>
                  <div className={styles.articlesGrid}>
                    {items.map((article, index) => (
                      <ArticleCard key={article.id} article={article} index={index} />
                    ))}
                  </div>

                  {totalPages > 1 ? (
                    <Pagination
                      page={params.page ?? 1}
                      totalPages={totalPages}
                      onChange={setPage}
                      className={styles.loadMoreWrap}
                    />
                  ) : null}
                </>
              )}
            </div>

            <aside className={styles.sidebar}>
              {trendingArticles.length > 0 ? (
                <div className={styles.sidebarCard}>
                  <h2 className={styles.sidebarTitle}>
                    <Icon icon="mdi:trending-up" /> Trending articles
                  </h2>
                  <div className={styles.trendingList}>
                    {trendingArticles.map((article, index) => (
                      <Link
                        key={article.id}
                        to={PATHS.article(article.slug)}
                        className={styles.trendingItem}
                      >
                        <span className={styles.trendingNum}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className={styles.trendingInfo}>
                          <span className={styles.trendingTitle}>{article.title}</span>
                          <span className={styles.trendingDate}>
                            {formatDate(article.publishedAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={styles.sidebarCard}>
                <h2 className={styles.sidebarTitle}>
                  <Icon icon="mdi:email-newsletter" /> Newsletter
                </h2>
                <p className={styles.newsletterText}>
                  Locality notes and practical guidance, once a month.
                </p>
                <LeadForm
                  title=""
                  subtitle=""
                  fields={[
                    {
                      name: 'name',
                      label: 'Name',
                      type: 'text',
                      required: true,
                      placeholder: 'Your name',
                    },
                    {
                      name: 'email',
                      label: 'Email',
                      type: 'email',
                      required: true,
                      placeholder: 'Email address',
                    },
                  ]}
                  source="newsletter"
                  className={styles.newsletterForm}
                />
              </div>
            </aside>
          </div>
        </Section>
      </div>
    </>
  );
};

export default Articles;
