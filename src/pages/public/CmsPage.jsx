import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

// `NotFound` leads the component imports because a 404 is what this page
// renders most often for an unknown slug, and `mini-css-extract-plugin`
// refuses to emit a stylesheet two chunks disagree about the order of.
import NotFound from './NotFound';
import PATHS, { isReservedPath } from '../../routes/paths';
import PageRenderer from '../../components/cms/PageRenderer';
import Seo from '../../components/seo/Seo';
import pageService from '../../services/pageService';
import useApi from '../../hooks/useApi';
import { ErrorState } from '../../components/ui';
import { breadcrumbsFor } from '../../seo/breadcrumbs';
import { PageLoader } from '../../components/common/SkeletonLoaders';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

import styles from './CmsPage.module.css';

/**
 * Every page an editor writes (00_MASTER_CONTEXT.md §6.10, D11).
 *
 * One component answers `/about`, `/contact`, `/buyer-assistance/home-loan`,
 * `/privacy-policy` and anything else the CMS holds. It reads the slug three
 * ways: a fixed `slug` prop from a spelled-out route, a `prefix` plus the route
 * parameter (`/buyer-assistance/:slug`), or — from the catch-all, registered
 * after every static route so a reserved prefix can never reach here — the
 * whole remaining path, separators and all.
 *
 * `GET /pages/slug/:slug` answers published pages only; a `?preview=<token>`
 * from the admin form also returns drafts for twenty-four hours (D28). Anything
 * else — a slug nobody has written, a draft without a token, an expired one —
 * is a 404, which is the same answer the API gave.
 *
 * The head is `<Seo type="page">`, reading the same `seo` branch through the
 * §9.5 templates, and its trail is the one `PageRenderer` draws (§9.3).
 */

/**
 * Home › [parent] › Title, from the one place that builds a trail (§9.3).
 *
 * Exported for the unit test, and kept as a named function rather than inlined
 * so the page and its test name the same thing.
 *
 * @param {{slug?: string, title?: string, seo?: object}} page
 * @returns {Array<{name: string, path?: string}>}
 */
export function buildCrumbs(page) {
  return breadcrumbsFor('page', page ?? {});
}

/**
 * The page slug a route's parameters describe.
 *
 * Exported for the unit test: the catch-all is `/:slug/*`, so a nested path
 * arrives as two parameters and has to be put back together.
 *
 * @param {{slug?: string, '*'?: string}} params `useParams()`
 * @param {string} [prefix] the segment a prefixed route already consumed
 * @returns {string}
 */
export function slugFromParams(params = {}, prefix = '') {
  return [prefix, params.slug, params['*']]
    .filter(Boolean)
    .join('/')
    .split('/')
    .filter(Boolean)
    .join('/');
}

/**
 * @param {object} props
 * @param {string} [props.slug] fixed by a spelled-out route
 * @param {string} [props.prefix] prepended to the route's own `:slug`
 */
export default function CmsPage({ slug: fixedSlug, prefix = '' }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAdminAuth();

  const slug = fixedSlug ?? slugFromParams(params, prefix);
  const previewToken = searchParams.get('preview') ?? '';

  // Reported by the testimonials block once it has fetched them (§9.3).
  const [testimonials, setTestimonials] = useState([]);

  // A path the catch-all picked up whose first segment belongs to a static
  // route is never a CMS page: `/properties/…`, `/buy/…` and `/admin/…` answer
  // for themselves, and a slug that shadowed one would be unreachable anyway
  // (D11). A route that passes its own `slug` or `prefix` has already decided.
  const reserved = !fixedSlug && !prefix && isReservedPath(slug);

  const {
    data: page,
    loading,
    error,
    refetch,
  } = useApi(
    (signal) =>
      pageService.getBySlug(slug, previewToken ? { preview: previewToken } : undefined, { signal }),
    [slug, previewToken],
    { enabled: Boolean(slug) && !reserved }
  );

  const crumbs = useMemo(() => (page ? buildCrumbs(page) : []), [page]);

  if (!slug || reserved) return <NotFound />;
  if (loading) return <PageLoader />;

  // The API answers 404 for a slug nobody has written, for a draft with no
  // token and for a token that has expired: all three are the same page.
  if (error?.status === 404 || (!loading && !page)) {
    return (
      <NotFound
        title="Page not found"
        subtitle="There is nothing published at this address. It may have moved, or never existed."
      />
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <ErrorState title="We could not load this page" text={error.message} onRetry={refetch} />
      </div>
    );
  }

  const previewing = Boolean(previewToken);
  const draft = page.status !== 'published';
  const seo = page.seo ?? {};
  const description = seo.description || page.blocks?.[0]?.data?.subtitle || page.title;

  return (
    <>
      <Seo
        type="page"
        entity={page}
        description={description}
        breadcrumbs={crumbs}
        testimonials={testimonials}
        overrides={draft ? { noindex: true } : undefined}
      />

      {previewing ? (
        <div className={styles.previewBanner} role="status">
          <Icon icon="mdi:eye-outline" aria-hidden="true" />
          <span>
            {draft
              ? 'Preview — this page is a draft. Visitors see a 404 at this address.'
              : 'Preview — this page is published; visitors see the same page.'}
          </span>
          {isAuthenticated ? (
            <Link to={PATHS.adminPageEdit(page.id)} className={styles.previewLink}>
              Back to the form
            </Link>
          ) : null}
        </div>
      ) : null}

      <PageRenderer page={page} breadcrumbs={crumbs} onTestimonials={setTestimonials} />
    </>
  );
}
