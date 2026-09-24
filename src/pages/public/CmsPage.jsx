import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';

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
import { ERRORS } from '../../config/copy';
import { CmsPageSkeleton } from '../../components/common/SkeletonLoaders';
import { HOME_PAGE_SLUG } from '../../config/pages';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

import styles from './CmsPage.module.css';
import usePrerenderReady from '../../hooks/usePrerenderReady';

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

  // The `home` record is the home page's (D81): its address is the site root.
  // At `/home` it was a bare copy of two of the home page's bands, which the
  // admin list linked to as "the home page" (QA-56).
  const isHome = slug === HOME_PAGE_SLUG;

  const {
    data: page,
    loading,
    error,
    refetch,
  } = useApi(
    (signal) =>
      pageService.getBySlug(slug, previewToken ? { preview: previewToken } : undefined, { signal }),
    [slug, previewToken],
    { enabled: Boolean(slug) && !reserved && !isHome }
  );

  // The prerender crawler saves this page once its primary query has settled
  // (§9.9) — settling on an error state counts, so a crawl never hangs on a
  // URL the API cannot answer.
  usePrerenderReady(loading);

  const crumbs = useMemo(() => (page ? buildCrumbs(page) : []), [page]);

  if (isHome) {
    const query = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
    return <Navigate to={`${PATHS.home}${query}`} replace />;
  }
  if (!slug || reserved) return <NotFound />;
  if (loading) return <CmsPageSkeleton />;

  // A failure that is *not* a 404 is an outage, not a missing page: answering
  // "page not found" for an address that exists would be a lie, and it would
  // offer no way back once the API returns. The error state comes first, so
  // only a real 404 — or an answer with no record in it — reaches `NotFound`
  // (prompt 43 §4.1).
  if (error && error.status !== 404) {
    return (
      <div className={styles.error}>
        <ErrorState title={ERRORS.page} text={error.message} onRetry={refetch} />
      </div>
    );
  }

  // The API answers 404 for a slug nobody has written, for a draft with no
  // token and for a token that has expired: all three are the same page.
  if (error?.status === 404 || !page) {
    return <NotFound {...ERRORS.notFound.pages.cms} />;
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
