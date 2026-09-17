import { useParams } from 'react-router-dom';

import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import useApi from '../../hooks/useApi';
import { ArticleIndex } from './Articles';
import { PageLoader } from '../../components/common/SkeletonLoaders';

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
  } = useApi((signal) => articleService.tags({ perPage: 'all' }, { signal }), [], {
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
      breadcrumbs={[
        { label: 'Home', to: PATHS.home },
        { label: 'Insights', to: PATHS.articles },
        { label: tag.name },
      ]}
      activeTagSlug={slug}
      emptyText="Nothing is filed under this tag yet."
      seo={{
        title: `${tag.name} — Bengaluru property articles`,
        description: `Articles tagged ${tag.name} — guides, explainers and market notes on Bengaluru property.`,
        canonical: PATHS.articleTag(slug),
      }}
    />
  );
}
