import { useParams } from 'react-router-dom';

import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import useApi from '../../hooks/useApi';
import { ArticleIndex } from './Articles';
import { breadcrumbsFor } from '../../seo/breadcrumbs';
import { PageLoader } from '../../components/common/SkeletonLoaders';

/**
 * Every category and every tag in one request: both collections are far under
 * the 100 a public route may ask for — `perPage=all` is admin-only (§5.6), and
 * asking for it on a public route quietly truncates the list to one page.
 */
const TAXONOMY_PER_PAGE = 100;

/**
 * `/insights/articles/tag/:slug` — everything filed under one tag.
 *
 * The same engine as the index with `tagSlug` fixed. The tag record is read
 * first because a tag nobody has created is a 404, not an empty archive: the
 * tags come from the editor's own box (§6.8) and a typed URL should say so.
 */
export default function ArticleTag() {
  const { slug = '' } = useParams();

  const {
    data: tags,
    loading,
    error,
  } = useApi((signal) => articleService.tags({ perPage: TAXONOMY_PER_PAGE }, { signal }), [], {
    initialData: [],
  });

  const list = Array.isArray(tags) ? tags : [];
  const tag = list.find((record) => record.slug === slug) ?? null;

  if (loading) return <PageLoader />;
  if (error?.status === 404 || (!loading && !tag)) {
    return (
      <NotFound title="Tag not found" subtitle="Nothing on the site is filed under this tag." />
    );
  }

  return (
    <ArticleIndex
      key={slug}
      fixed={{ tagSlug: slug }}
      paramKeys={['q', 'page', 'sort']}
      title={`Articles tagged ${tag.name}`}
      intro={`Everything we have published on ${tag.name.toLowerCase()}, newest first.`}
      breadcrumbs={breadcrumbsFor('articleTag', tag)}
      activeTagSlug={slug}
      emptyText="Nothing is filed under this tag yet."
      seoType="articleTag"
      seoEntity={tag}
      seo={{
        title: `${tag.name} — Bengaluru property articles`,
        description: `Articles tagged ${tag.name} — guides, explainers and market notes on Bengaluru property.`,
        canonical: PATHS.articleTag(slug),
      }}
    />
  );
}
