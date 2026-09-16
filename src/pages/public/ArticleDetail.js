import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import LeadForm from '../../components/common/LeadForm';
import LegacyHtml from '../../components/common/LegacyHtml';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import styles from './ArticleDetail.module.css';
import useApi from '../../hooks/useApi';
import { ErrorState } from '../../components/ui';
import { SITE } from '../../config/site';
import { formatDate } from '../../utils/format';

/**
 * One article.
 *
 * The body arrives as HTML from the CMS (§6.8), so it is rendered as HTML
 * through `LegacyHtml` instead of the boilerplate's hand-written Markdown
 * renderer — which duplicated tables on every `|` line and turned ordered
 * lists into bullets (ADD-16). Prompt 32 replaces `LegacyHtml` with `SafeHtml`.
 *
 * Related articles come from the editor's own `relatedArticleIds` through
 * `GET /articles?ids=`, which returns them in the given order.
 */

const HEADING_PATTERN = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;

/** Slugs a heading's text the same way the anchors below do. */
const headingId = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The `<h2>`s of the body, for the table of contents. */
function parseHeadings(html) {
  if (!html) return [];
  const headings = [];
  let match = HEADING_PATTERN.exec(html);
  while (match !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ id: headingId(text), text });
    match = HEADING_PATTERN.exec(html);
  }
  HEADING_PATTERN.lastIndex = 0;
  return headings;
}

/** Gives every `<h2>` the id its table-of-contents link points at. */
function withHeadingIds(html) {
  if (!html) return html;
  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (full, attrs, inner) => {
    if (/\bid=/.test(attrs)) return full;
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return `<h2${attrs} id="${headingId(text)}">${inner}</h2>`;
  });
}

const shareLinks = (title, url) => [
  {
    name: 'WhatsApp',
    icon: 'mdi:whatsapp',
    url: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    color: 'var(--color-whatsapp)',
  },
  {
    name: 'Facebook',
    icon: 'mdi:facebook',
    url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    color: 'var(--color-facebook)',
  },
  {
    name: 'X',
    icon: 'mdi:twitter',
    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    color: 'var(--color-x)',
  },
  {
    name: 'LinkedIn',
    icon: 'mdi:linkedin',
    url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    color: 'var(--color-linkedin)',
  },
];

const ArticleDetail = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') || undefined;
  const [copied, setCopied] = useState(false);

  const {
    data: article,
    loading,
    error,
    refetch,
  } = useApi(
    (signal) => articleService.getBySlug(slug, preview ? { preview } : undefined, { signal }),
    [slug, preview]
  );

  const relatedIds = useMemo(
    () => (Array.isArray(article?.relatedArticleIds) ? article.relatedArticleIds : []),
    [article]
  );

  const { data: related } = useApi(
    (signal) => articleService.list({ ids: relatedIds, perPage: relatedIds.length }, { signal }),
    [relatedIds],
    { enabled: relatedIds.length > 0, initialData: [] }
  );

  const headings = useMemo(() => parseHeadings(article?.content), [article]);
  const body = useMemo(() => withHeadingIds(article?.content), [article]);
  const relatedArticles = (Array.isArray(related) ? related : []).slice(0, 3);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the share buttons still work.
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (error && error.status !== 404) {
    return (
      <div className={styles.page}>
        <ErrorState title="We could not load this article" text={error.message} onRetry={refetch} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <Icon icon="mdi:file-alert-outline" className={styles.notFoundIcon} />
          <h1>Article not found</h1>
          <p>This article does not exist, or it is no longer published.</p>
          <Link to={PATHS.articles} className={styles.backLink}>
            <Icon icon="mdi:arrow-left" /> Back to articles
          </Link>
        </div>
      </div>
    );
  }

  const image = article.featuredImage ?? {};

  return (
    <>
      <Helmet>
        <title>{`${article.seo?.title || article.title} | ${SITE.name}`}</title>
        <meta name="description" content={article.seo?.description || article.excerpt} />
        <meta property="og:title" content={article.seo?.title || article.title} />
        <meta property="og:description" content={article.seo?.description || article.excerpt} />
        {image.url ? <meta property="og:image" content={image.url} /> : null}
        <meta property="og:type" content="article" />
      </Helmet>

      <div className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <div className={styles.breadcrumbInner}>
            <Link to={PATHS.home}>Home</Link>
            <Icon icon="mdi:chevron-right" />
            <Link to={PATHS.articles}>Articles</Link>
            {article.category?.slug ? (
              <>
                <Icon icon="mdi:chevron-right" />
                <Link to={PATHS.articleCategory(article.category.slug)}>
                  {article.category.name}
                </Link>
              </>
            ) : null}
            <Icon icon="mdi:chevron-right" />
            <span>{article.title}</span>
          </div>
        </nav>

        {image.url ? (
          <motion.div
            className={styles.featuredImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img src={image.url} alt={image.alt || article.title} />
          </motion.div>
        ) : null}

        <div className={styles.articleLayout}>
          {headings.length > 0 ? (
            <aside className={styles.tocSidebar}>
              <div className={styles.tocCard}>
                <h2 className={styles.tocTitle}>On this page</h2>
                <nav className={styles.tocNav}>
                  {headings.map((heading) => (
                    <a key={heading.id} href={`#${heading.id}`} className={styles.tocLink}>
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          ) : null}

          <motion.article
            className={styles.articleMain}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={styles.articleMeta}>
              {article.category?.name ? (
                <span className={styles.categoryBadge}>{article.category.name}</span>
              ) : null}
              <span className={styles.metaItem}>
                <Icon icon="mdi:calendar-outline" />
                {formatDate(article.publishedAt)}
              </span>
              {article.author?.name ? (
                <span className={styles.metaItem}>
                  <Icon icon="mdi:account-outline" />
                  {article.author.name}
                </span>
              ) : null}
              {article.readingTimeMinutes ? (
                <span className={styles.metaItem}>
                  <Icon icon="mdi:clock-outline" />
                  {article.readingTimeMinutes} min read
                </span>
              ) : null}
            </div>

            <h1 className={styles.articleTitle}>{article.title}</h1>

            <LegacyHtml className={styles.articleContent} html={body} />

            {Array.isArray(article.tags) && article.tags.length > 0 ? (
              <div className={styles.tags}>
                <Icon icon="mdi:tag-outline" />
                {article.tags.map((tag) => (
                  <Link key={tag.id} to={PATHS.articleTag(tag.slug)} className={styles.tag}>
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className={styles.shareSection}>
              <span className={styles.shareLabel}>Share this article:</span>
              <div className={styles.shareButtons}>
                {shareLinks(article.title, currentUrl).map((share) => (
                  <a
                    key={share.name}
                    href={share.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.shareBtn}
                    title={`Share on ${share.name}`}
                    style={{ '--share-color': share.color }}
                  >
                    <Icon icon={share.icon} />
                  </a>
                ))}
                <button
                  className={styles.shareBtn}
                  onClick={handleCopyLink}
                  title="Copy link"
                  type="button"
                  style={{ '--share-color': 'var(--color-text-muted)' }}
                >
                  <Icon icon={copied ? 'mdi:check' : 'mdi:link-variant'} />
                </button>
              </div>
            </div>

            <div className={styles.ctaSection}>
              <div className={styles.ctaInfo}>
                <h2>Want to talk it through?</h2>
                <p>
                  Tell us what you are looking for and an advisor will come back with a shortlist
                  and the trade-offs of each option.
                </p>
              </div>
              <LeadForm
                title="Speak to an advisor"
                subtitle="We will be in touch as soon as we can"
                source="article"
                className={styles.ctaForm}
              />
            </div>
          </motion.article>
        </div>

        {relatedArticles.length > 0 ? (
          <section className={styles.relatedSection}>
            <div className={styles.relatedInner}>
              <h2 className={styles.relatedTitle}>Related articles</h2>
              <div className={styles.relatedGrid}>
                {relatedArticles.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    <Link to={PATHS.article(item.slug)} className={styles.relatedCard}>
                      <div className={styles.relatedImage}>
                        {item.featuredImage?.url ? (
                          <img
                            src={item.featuredImage.url}
                            alt={item.featuredImage.alt || item.title}
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className={styles.relatedBody}>
                        {item.category?.name ? (
                          <span className={styles.relatedCategory}>{item.category.name}</span>
                        ) : null}
                        <h3 className={styles.relatedCardTitle}>{item.title}</h3>
                        <span className={styles.relatedDate}>{formatDate(item.publishedAt)}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
};

export default ArticleDetail;
