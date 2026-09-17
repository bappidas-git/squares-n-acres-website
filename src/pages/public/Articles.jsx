import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';

import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import useApi from '../../hooks/useApi';
import useApiList from '../../hooks/useApiList';
import {
  ArticleCard,
  ArticleHero,
  BlogSidebar,
  CategoryTabs,
} from '../../components/sections/article';
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from '../../components/ui';
import { SITE } from '../../config/site';
import { buildUrl } from '../../services/http';
import { endpoints } from '../../services/endpoints';

import styles from './Articles.module.css';

/**
 * `/insights/articles` and the three archives that are the same page with one
 * filter nailed down (ART-09).
 *
 * The list, the search box, the category strip and the sort all live in the
 * query string, so a shared link reproduces the view, the back button walks it
 * back and the API — not the browser — does the filtering, the sorting and the
 * paging (§5.6, BUG-18/BUG-19). The boilerplate asked for everything and
 * narrowed it here.
 *
 * The `<Helmet>` blocks on this page and on the three archives are temporary:
 * prompt 38 replaces them with `<Seo type="article|articleCategory|author">`.
 */

/** §8.6 and ART-09: twelve cards a page, three across at desktop. */
const PER_PAGE = 12;

/** The API hears the last keystroke, not every one (§5.6). */
const SEARCH_DEBOUNCE_MS = 300;

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most read' },
];

/** The absolute address of the feed, built from the API base the app talks to. */
export const RSS_URL = buildUrl(endpoints.sitemap.rss);

/** How many skeleton cards stand in for a page while it loads. */
const SKELETONS = 6;

/**
 * The blog listing, whatever is fixed about it.
 *
 * One engine draws `/insights/articles`, a category, a tag and an author's
 * archive: they differ by the filter their route nails down (`fixed`), by what
 * they call themselves and by what sits above the grid. Writing it four times
 * is how the search box ends up on three of them.
 *
 * @param {object} props
 * @param {object} [props.fixed] filters the visitor cannot remove
 * @param {string[]} [props.paramKeys] what this page keeps in the query string
 * @param {string} props.title the page's `h1`
 * @param {string} [props.intro]
 * @param {Array<{label: string, to?: string}>} props.breadcrumbs
 * @param {React.ReactNode} [props.header] drawn in place of the title block
 * @param {React.ReactNode} [props.aboveGrid]
 * @param {boolean} [props.withHero] the featured article, on page one only
 * @param {string} [props.activeCategorySlug] the tab to mark, and the strip's mode
 * @param {boolean} [props.withCategoryTabs]
 * @param {string} [props.activeTagSlug]
 * @param {string} [props.emptyText]
 * @param {{title: string, description: string, canonical: string}} props.seo
 */
export function ArticleIndex({
  fixed,
  paramKeys = ['q', 'categorySlug', 'page', 'sort'],
  title,
  intro,
  breadcrumbs,
  header,
  aboveGrid,
  withHero = false,
  activeCategorySlug = '',
  withCategoryTabs = false,
  activeTagSlug = '',
  emptyText = 'Try another category, or a different search.',
  seo,
}) {
  const { items, meta, loading, error, params, setFilters, setPage, resetFilters, refetch } =
    useApiList((listParams, options) => articleService.list(listParams, options), {
      syncToUrl: true,
      paramKeys,
      defaults: { page: 1, perPage: PER_PAGE, sort: 'newest' },
      fixedParams: fixed,
      debounceMs: SEARCH_DEBOUNCE_MS,
    });

  const { data: categories } = useApi(
    (signal) => articleService.categories({ perPage: 'all' }, { signal }),
    [],
    { enabled: withCategoryTabs, initialData: [] }
  );

  const { data: tags } = useApi(
    (signal) => articleService.tags({ perPage: 'all' }, { signal }),
    [],
    { initialData: [] }
  );

  const q = params.q ?? '';
  const sort = params.sort ?? 'newest';
  const page = params.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? items.length;
  const filtered = Boolean(q) || Boolean(params.categorySlug) || Boolean(params.tagSlug);

  // On the index the strip is a filter and the active tab is whatever the URL
  // says; on a category page the route has already decided.
  const activeTab = activeCategorySlug || params.categorySlug || '';

  // The editor's pick belongs at the top of the archive itself, not on page
  // four of a search: it is fetched only where it is drawn.
  const heroEnabled = withHero && page === 1 && !filtered;

  const { data: featured } = useApi(
    (signal) => articleService.list({ isFeatured: true, sort: 'newest', perPage: 1 }, { signal }),
    [],
    { enabled: heroEnabled, initialData: [] }
  );

  const hero = heroEnabled ? ((Array.isArray(featured) ? featured : [])[0] ?? null) : null;
  const cards = hero ? items.filter((article) => article.id !== hero.id) : items;

  const pageUrl = (target) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (params.categorySlug) search.set('categorySlug', params.categorySlug);
    if (sort !== 'newest') search.set('sort', sort);
    if (target > 1) search.set('page', String(target));
    const query = search.toString();
    return `${SITE.url}${seo.canonical}${query ? `?${query}` : ''}`;
  };

  return (
    <>
      {/* TEMPORARY — `<Seo>` replaces this Helmet in prompt 38. */}
      <Helmet>
        <title>{`${seo.title} | ${SITE.name}`}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={`${SITE.url}${seo.canonical}`} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${SITE.name} — insights`}
          href={RSS_URL}
        />
      </Helmet>

      <div className={styles.page}>
        <header className={styles.header}>
          <Container>
            <Breadcrumbs items={breadcrumbs} className={styles.crumbs} />
            {header ?? (
              <>
                <h1 className={styles.title}>{title}</h1>
                {intro ? <p className={styles.intro}>{intro}</p> : null}
              </>
            )}
          </Container>
        </header>

        {withCategoryTabs ? (
          <Container>
            <CategoryTabs
              categories={Array.isArray(categories) ? categories : []}
              activeSlug={activeTab}
              onSelect={
                paramKeys.includes('categorySlug')
                  ? (slug) => setFilters({ categorySlug: slug })
                  : undefined
              }
              className={styles.tabs}
            />
          </Container>
        ) : null}

        <Container className={styles.layout}>
          <div className={styles.main}>
            {aboveGrid}

            <div className={styles.toolbar}>
              <div className={styles.search}>
                <label className={styles.srOnly} htmlFor="article-search">
                  Search articles
                </label>
                <Icon
                  icon="mdi:magnify"
                  width="20"
                  height="20"
                  className={styles.searchIcon}
                  aria-hidden="true"
                />
                <input
                  id="article-search"
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search guides and explainers"
                  value={q}
                  onChange={(event) => setFilters({ q: event.target.value })}
                />
              </div>

              <div className={styles.sort}>
                <label className={styles.sortLabel} htmlFor="article-sort">
                  Sort by
                </label>
                <select
                  id="article-sort"
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(event) => setFilters({ sort: event.target.value })}
                >
                  {SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? (
              <ErrorState
                title="We could not load the articles"
                text={error.message}
                onRetry={refetch}
              />
            ) : loading ? (
              <div className={styles.grid} aria-busy="true">
                {Array.from({ length: SKELETONS }, (_, index) => (
                  <Skeleton key={index} variant="rounded" height={360} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Icon icon="mdi:file-search-outline" width="40" height="40" />}
                title="No articles found"
                text={emptyText}
                action={
                  filtered ? (
                    <Button variant="secondary" onClick={resetFilters}>
                      Clear the filters
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {hero ? <ArticleHero article={hero} className={styles.hero} /> : null}

                <p className={styles.count}>
                  {total} {total === 1 ? 'article' : 'articles'}
                  {q ? ` matching “${q}”` : ''}
                </p>

                <ul className={styles.grid}>
                  {cards.map((article, index) => (
                    <li key={article.id}>
                      <ArticleCard
                        article={article}
                        headingLevel={3}
                        loading={!hero && index < 3 ? 'eager' : 'lazy'}
                      />
                    </li>
                  ))}
                </ul>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                  prevHref={page > 1 ? pageUrl(page - 1) : undefined}
                  nextHref={page < totalPages ? pageUrl(page + 1) : undefined}
                  label="Article pages"
                  className={styles.pagination}
                />
              </>
            )}
          </div>

          <BlogSidebar
            tags={Array.isArray(tags) ? tags : undefined}
            activeTagSlug={activeTagSlug}
            className={styles.sidebar}
          />
        </Container>
      </div>
    </>
  );
}

/** `/insights/articles` — the whole archive. */
export default function Articles() {
  return (
    <ArticleIndex
      title="Real estate insights & guides"
      intro="What we have learned about buying, selling and renting in Bengaluru — the rules, the paperwork, the localities and the numbers, written plainly and with the caveats left in."
      breadcrumbs={[{ label: 'Home', to: PATHS.home }, { label: 'Insights' }]}
      withHero
      withCategoryTabs
      activeCategorySlug=""
      seo={{
        title: 'Real estate insights and guides for Bengaluru',
        description:
          'Buying guides, market notes, legal explainers and investment thinking on Bengaluru property, from Squares N Acres.',
        canonical: PATHS.articles,
      }}
    />
  );
}
