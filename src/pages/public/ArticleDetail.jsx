import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import SafeHtml from '../../components/editor/SafeHtml';
import Seo from '../../components/seo/Seo';
import articleService from '../../services/articleService';
import sanitizeHtml from '../../components/editor/sanitize';
import useApi from '../../hooks/useApi';
import { Breadcrumbs, Container, ErrorState, LazyImage } from '../../components/ui';
import { PageLoader } from '../../components/common/SkeletonLoaders';
import { SITE } from '../../config/site';
import { breadcrumbsFor } from '../../seo/breadcrumbs';
import { buildToc, tocIds } from '../../utils/toc';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  ArticleCta,
  ArticleFaqs,
  ArticleMeta,
  ArticlePrevNext,
  ArticleShareBar,
  AuthorBox,
  RelatedArticles,
  RelatedProperties,
  TableOfContents,
  useActiveHeading,
} from '../../components/sections/article';

import styles from './ArticleDetail.module.css';

/**
 * One article (ART-09).
 *
 * The body arrives as HTML from the editor (§6.8) and is rendered through
 * `SafeHtml`, which sanitises it against the allow-list `RichTextEditor`
 * writes with and turns the three `data-sna-block` placeholders into live
 * components — so a call to action opens the real enquiry dialog, a listings
 * block shows today's prices and a FAQ block is the same accordion as
 * everywhere else. The boilerplate's hand-written lightweight-markup renderer,
 * which duplicated tables on every `|` line, is long gone (ADD-16).
 *
 * The contents list is built by `utils/toc` from the **sanitised** body, which
 * is the same string `SafeHtml` writes the heading ids onto: one id rule, one
 * set of anchors, no link in the list that points at nothing.
 *
 * An article has **one** list of questions: the ones the record carries
 * (§6.8 `faqs`) and the ones an editor dropped into the body as FAQ blocks,
 * merged into the accordion below the article. `faqBlocks={false}` is what
 * stops the body printing its own copy of the same questions on the way past —
 * `SafeHtml` still reports them through `onFaqItems`, which is also what
 * prompt 38's `FAQPage` structured data is built from.
 *
 * The head is `<Seo type="article">`: it adds the social card and the
 * `BlogPosting` + `BreadcrumbList` + `FAQPage` graph from the same record, and
 * the questions it publishes are the ones this page shows — the article's own
 * plus the ones its body carries (§9.3).
 */

/** Below this many headings a contents list is longer than what it indexes. */
const MIN_TOC_HEADINGS = 3;

/** A FAQ item the accordion can key on, whatever the source gave it. */
const withKeys = (items, prefix) =>
  items
    .filter((item) => item?.question && item?.answer)
    .map((item, index) => ({ id: item.id ?? `${prefix}-${index}`, ...item }));

export default function ArticleDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAdminAuth();

  const preview = searchParams.get('preview') || '';
  const [blockFaqs, setBlockFaqs] = useState([]);

  const {
    data: article,
    loading,
    error,
    refetch,
  } = useApi(
    (signal) => articleService.getBySlug(slug, preview ? { preview } : undefined, { signal }),
    [slug, preview]
  );

  // Sanitised once here and handed to `SafeHtml` already clean: the contents
  // list has to be built from the very markup the page renders, or a heading
  // the sanitiser dropped would still be in the list.
  const body = useMemo(() => sanitizeHtml(article?.content ?? ''), [article]);
  const toc = useMemo(() => buildToc(body), [body]);
  const showToc = (article?.tableOfContents ?? true) && tocIds(toc).length >= MIN_TOC_HEADINGS;
  const activeHeading = useActiveHeading(showToc ? tocIds(toc) : []);

  const { data: neighbours } = useApi(
    (signal) => articleService.prevNext(article, { signal }),
    [article?.id, article?.categoryId],
    { enabled: Boolean(article?.id) }
  );

  const onFaqItems = useCallback((items) => setBlockFaqs(items), []);

  const faqs = useMemo(
    () => [
      ...withKeys(Array.isArray(article?.faqs) ? article.faqs : [], 'article-faq'),
      ...withKeys(blockFaqs, 'block-faq'),
    ],
    [article, blockFaqs]
  );

  if (loading) return <PageLoader />;

  // The API answers 404 for an unknown slug, for a draft or a scheduled piece
  // with no token, and for a token that has expired: all three are this page.
  if (error?.status === 404 || (!loading && !article)) {
    return (
      <NotFound
        title="Article not found"
        subtitle="There is nothing published at this address. It may have moved, or never existed."
      />
    );
  }

  if (error) {
    return (
      <Container className={styles.errorWrap}>
        <ErrorState title="We could not load this article" text={error.message} onRetry={refetch} />
      </Container>
    );
  }

  const image = article.featuredImage ?? {};
  const seo = article.seo ?? {};
  const previewing = Boolean(preview);
  const unpublished = article.status !== 'published';
  const description = seo.description || article.excerpt || article.title;
  const crumbs = breadcrumbsFor('article', article);
  // The share bar needs an absolute address a visitor can paste anywhere; the
  // canonical in the head is `<Seo>`'s, resolved from the runtime settings.
  const url = `${SITE.url}${PATHS.article(article.slug)}`;

  return (
    <>
      <Seo
        type="article"
        entity={article}
        description={description}
        breadcrumbs={crumbs}
        faqs={faqs}
        overrides={unpublished ? { noindex: true } : undefined}
      />

      {previewing ? (
        <div className={styles.previewBanner} role="status">
          <Icon icon="mdi:eye-outline" aria-hidden="true" />
          <span>
            {unpublished
              ? `Preview — this article is ${article.status}. Visitors see a 404 at this address.`
              : 'Preview — this article is published; visitors see the same page.'}
          </span>
          {isAuthenticated ? (
            <Link to={PATHS.adminArticleEdit(article.id)} className={styles.previewLink}>
              Back to the form
            </Link>
          ) : null}
        </div>
      ) : null}

      <article className={styles.page}>
        <header className={styles.header}>
          <Container>
            <div className={styles.shell}>
              <Breadcrumbs className={styles.crumbs} items={crumbs} />

              <h1 className={styles.title}>{article.title}</h1>
              {article.excerpt ? <p className={styles.lede}>{article.excerpt}</p> : null}
              <ArticleMeta article={article} className={styles.meta} />
            </div>
          </Container>
        </header>

        {image.url ? (
          <Container className={styles.figureWrap}>
            <figure className={[styles.shell, styles.figure].join(' ')}>
              <LazyImage
                src={image.url}
                alt={image.alt || ''}
                ratio="16/9"
                sizes="(max-width: 899px) 100vw, 760px"
                priority
                className={styles.figureImage}
              />
              {image.caption ? (
                <figcaption className={styles.caption}>{image.caption}</figcaption>
              ) : null}
            </figure>
          </Container>
        ) : null}

        <Container>
          <div className={styles.layout}>
            <div className={styles.body}>
              <SafeHtml
                html={body}
                onFaqItems={onFaqItems}
                faqBlocks={false}
                className={styles.content}
              />

              {Array.isArray(article.tags) && article.tags.length > 0 ? (
                <div className={styles.tags}>
                  <span className={styles.tagsLabel}>Filed under</span>
                  <ul className={styles.tagList}>
                    {article.tags.map((tag) => (
                      <li key={tag.id}>
                        <Link to={PATHS.articleTag(tag.slug)} className={styles.tag}>
                          {tag.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <ArticleShareBar title={article.title} url={url} className={styles.share} />

              {article.author ? (
                <AuthorBox author={article.author} className={styles.author} />
              ) : null}
            </div>

            {showToc ? (
              <TableOfContents items={toc} activeId={activeHeading} className={styles.toc} />
            ) : null}
          </div>
        </Container>

        <Container>
          <div className={styles.sections}>
            <ArticleFaqs items={faqs} />

            <RelatedProperties ids={article.relatedPropertyIds ?? []} />

            <ArticleCta articleId={article.id} />

            <ArticlePrevNext prev={neighbours?.prev ?? null} next={neighbours?.next ?? null} />
          </div>
        </Container>

        <Container className={styles.relatedWrap}>
          <div className={styles.shell}>
            <RelatedArticles
              articleId={article.id}
              relatedIds={article.relatedArticleIds ?? []}
              categorySlug={article.category?.slug ?? ''}
            />
          </div>
        </Container>
      </article>
    </>
  );
}
