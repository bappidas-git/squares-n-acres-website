import { useParams } from 'react-router-dom';

import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import useApi from '../../hooks/useApi';
import { ArticleIndex } from './Articles';
import { AuthorBox } from '../../components/sections/article';
import { PageLoader } from '../../components/common/SkeletonLoaders';

import styles from './AuthorPage.module.css';

/**
 * `/insights/authors/:slug` — who wrote it, and everything they have written.
 *
 * `GET /authors/slug/:slug` is the page's subject, so the author box is its
 * header and carries the `h1`; the grid below is the blog index with
 * `authorSlug` fixed. A slug nobody has written is the API's 404, passed
 * through rather than drawn as an empty archive.
 *
 * `authors[].email` never reaches this page: §5.10 strips it from every public
 * response, which is why the box offers the three social links and no address.
 */
export default function AuthorPage() {
  const { slug = '' } = useParams();

  const {
    data: author,
    loading,
    error,
  } = useApi((signal) => articleService.authorBySlug(slug, { signal }), [slug]);

  if (loading) return <PageLoader />;
  if (error?.status === 404 || (!loading && !author)) {
    return <NotFound title="Author not found" subtitle="Nobody writes here under that name." />;
  }

  return (
    <ArticleIndex
      key={slug}
      fixed={{ authorSlug: slug }}
      paramKeys={['q', 'page', 'sort']}
      breadcrumbs={[
        { label: 'Home', to: PATHS.home },
        { label: 'Insights', to: PATHS.articles },
        { label: author.name },
      ]}
      header={<AuthorBox author={author} variant="hero" className={styles.authorBox} />}
      title={author.name}
      emptyText="Nothing published under this name yet."
      seo={{
        title: `${author.name} — articles and guides`,
        description:
          author.seo?.description ||
          `Articles on Bengaluru property written by ${author.name}${
            author.designation ? `, ${author.designation}` : ''
          }.`,
        canonical: PATHS.author(slug),
      }}
    />
  );
}
