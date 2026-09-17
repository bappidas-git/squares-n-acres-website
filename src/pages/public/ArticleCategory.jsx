import { useParams } from 'react-router-dom';

import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import useApi from '../../hooks/useApi';
import { ArticleIndex } from './Articles';
import { PageLoader } from '../../components/common/SkeletonLoaders';

/**
 * `/insights/articles/category/:slug` — one category's archive.
 *
 * It is the index with `categorySlug` nailed down by the route, so the search
 * box, the sort, the grid, the paging and the rail behave identically and a
 * category is a URL somebody can link to rather than a filter state (§9.4).
 *
 * The category record itself is fetched for its name, its description and its
 * count — and because a slug nobody has written must answer 404 rather than an
 * empty grid with a heading made from the URL. `GET /article-categories`
 * answers with the whole (short) list, which is one request the rail was going
 * to make anyway.
 */
export default function ArticleCategory() {
  const { slug = '' } = useParams();

  const {
    data: categories,
    loading,
    error,
  } = useApi((signal) => articleService.categories({ perPage: 'all' }, { signal }), [], {
    initialData: [],
  });

  const list = Array.isArray(categories) ? categories : [];
  const category = list.find((record) => record.slug === slug) ?? null;

  if (loading) return <PageLoader />;
  if (error?.status === 404 || (!loading && !category)) {
    return (
      <NotFound
        title="Category not found"
        subtitle="There is no article category at this address. It may have been renamed."
      />
    );
  }

  return (
    <ArticleIndex
      key={slug}
      fixed={{ categorySlug: slug }}
      paramKeys={['q', 'page', 'sort']}
      title={`${category.name} articles`}
      intro={category.description || undefined}
      breadcrumbs={[
        { label: 'Home', to: PATHS.home },
        { label: 'Insights', to: PATHS.articles },
        { label: category.name },
      ]}
      withCategoryTabs
      activeCategorySlug={slug}
      emptyText="Nothing has been published in this category yet. The rest of the archive is one click away."
      seo={{
        title: `${category.name} — Bengaluru property guides`,
        description:
          category.seo?.description ||
          category.description ||
          `${category.name} guides and explainers on Bengaluru property.`,
        canonical: PATHS.articleCategory(slug),
      }}
    />
  );
}
