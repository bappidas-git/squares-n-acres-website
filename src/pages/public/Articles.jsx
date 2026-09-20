import { Icon } from '@iconify/react';

import PATHS from '../../routes/paths';
import Seo from '../../components/seo/Seo';
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
import { breadcrumbsFor } from '../../seo/breadcrumbs';

import styles from './Articles.module.css';
import usePrerenderReady from '../../hooks/usePrerenderReady';
import { EMPTY, ERRORS } from '../../config/copy';

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
 * The head is `<Seo>`, with the type each caller names: the index is a `blog`,
 * the three archives are the record they are an archive of, and all four carry
 * the feed as an alternate representation (§9.3).
 */

/** §8.6 and ART-09: twelve cards a page, three across at desktop. */
const PER_PAGE = 12;

/**
 * Every category and every tag in one request: both collections are far under
 * the 100 a public route may ask for — `perPage=all` is admin-only (§5.6), and
 * asking for it on a public route quietly truncates the list to one page.
 */
const TAXONOMY_PER_PAGE = 100;

/** The API hears the last keystroke, not every one (§5.6). */
const SEARCH_DEBOUNCE_MS = 300;

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most read' },
];

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
 * @param {'blog'|'articleCategory'|'articleTag'|'author'} [props.seoType] what
 *   kind of page this is for the head (`components/seo/seoDefaults.js`)
 * @param {object} [props.seoEntity] the record the archive is an archive of,
 *   so its own `seo` branch and its schema reach the head
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
  emptyText = EMPTY.articles.text,
  seo,
  seoType = 'blog',
  seoEntity,
}) {
  const { items, meta, loading, error, params, setFilters, setPage, resetFilters, refetch } =
    useApiList((listParams, options) => articleService.list(listParams, options), {
      syncToUrl: true,
      paramKeys,
      defaults: { page: 1, perPage: PER_PAGE, sort: 'newest' },
      fixedParams: fixed,
      debounceMs: SEARCH_DEBOUNCE_MS,
    });

  // The prerender crawler saves this page once its primary query has settled
  // (§9.9) — settling on an error state counts, so a crawl never hangs on a
  // URL the API cannot answer.
  usePrerenderReady(loading);

  const { data: categories } = useApi(
    (signal) => articleService.categories({ perPage: TAXONOMY_PER_PAGE }, { signal }),
    [],
    { enabled: withCategoryTabs, initialData: [] }
  );

  const { data: tags } = useApi(
    (signal) => articleService.tags({ perPage: TAXONOMY_PER_PAGE }, { signal }),
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
    return `${seo.canonical}${query ? `?${query}` : ''}`;
  };

  // The canonical carries the page number and nothing else: a search or a sort
  // is this visitor's view of the archive, not a page of it (§9.4).
  const canonical = page > 1 ? `${seo.canonical}?page=${page}` : seo.canonical;

  return (
    <>
      <Seo
        type={seoType}
        entity={seoEntity}
        title={seo.title}
        description={seo.description}
        overrides={{ canonical, noindex: Boolean(q) }}
        variables={{ count: total, page }}
        breadcrumbs={breadcrumbs}
        pagination={{
          prev: page > 1 ? pageUrl(page - 1) : null,
          next: page < totalPages ? pageUrl(page + 1) : null,
        }}
        items={items.map((article) => ({
          name: article.title,
          url: PATHS.article(article.slug),
        }))}
      />

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
              <ErrorState title={ERRORS.articles} text={error.message} onRetry={refetch} />
            ) : loading ? (
              <div className={styles.grid} aria-busy="true">
                {Array.from({ length: SKELETONS }, (_, index) => (
                  <Skeleton key={index} variant="rounded" height={360} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Icon icon="mdi:file-search-outline" width="40" height="40" />}
                title={EMPTY.articles.title}
                text={emptyText}
                action={
                  filtered ? (
                    <Button variant="secondary" onClick={resetFilters}>
                      {EMPTY.articles.action}
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
                      {/* `2`, not `3`: the grid is the page's own content,
                          under its `<h1>`. The index draws an `ArticleHero`
                          above it whose title is an h2, so the cards are that
                          heading's siblings — and on the category, tag and
                          author archives, which have no hero, an h3 here left
                          the page jumping h1 → h3 with nothing in between. */}
                      <ArticleCard
                        article={article}
                        headingLevel={2}
                        loading={!hero && index < 3 ? 'eager' : 'lazy'}
                      />
                    </li>
                  ))}
                </ul>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
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
      breadcrumbs={breadcrumbsFor('blog')}
      withHero
      withCategoryTabs
      activeCategorySlug=""
      seoType="blog"
      seo={{
        title: 'Real estate insights and guides for Bengaluru',
        description:
          'Buying guides, market notes, legal explainers and investment thinking on Bengaluru property, from Squares N Acres.',
        canonical: PATHS.articles,
      }}
    />
  );
}
