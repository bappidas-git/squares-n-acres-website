import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { articleService } from '../../services/api';
import LeadForm from '../../components/common/LeadForm';
import styles from './ArticleDetail.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCategory(cat) {
  return cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseHeadings(content) {
  const headingRegex = /^##\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const id = match[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    headings.push({ id, text: match[1] });
  }
  return headings;
}

function renderContent(content) {
  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className={styles.contentList}>
          {listItems.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Heading h2
    if (trimmed.startsWith('## ')) {
      flushList();
      const text = trimmed.replace(/^##\s+/, '');
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      elements.push(
        <h2 key={`h2-${i}`} id={id} className={styles.contentH2}>
          {text}
        </h2>
      );
      return;
    }

    // Heading h3
    if (trimmed.startsWith('### ')) {
      flushList();
      const text = trimmed.replace(/^###\s+/, '');
      elements.push(
        <h3 key={`h3-${i}`} className={styles.contentH3}>
          {text}
        </h3>
      );
      return;
    }

    // List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(renderInlineFormatting(trimmed.replace(/^[-*]\s+/, '')));
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      inList = true;
      listItems.push(renderInlineFormatting(trimmed.replace(/^\d+\.\s+/, '')));
      return;
    }

    // Table (simple handling)
    if (trimmed.startsWith('|')) {
      flushList();
      // Collect table rows
      const tableLines = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j].trim());
        j++;
      }
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .filter(Boolean)
          .map((c) => c.trim());
        const bodyRows = tableLines.slice(2).map((row) =>
          row
            .split('|')
            .filter(Boolean)
            .map((c) => c.trim())
        );
        elements.push(
          <div key={`table-${i}`} className={styles.tableWrapper}>
            <table className={styles.contentTable}>
              <thead>
                <tr>
                  {headerCells.map((cell, ci) => (
                    <th key={ci}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return;
    }

    // Skip table separator rows
    if (/^\|[-|:\s]+\|$/.test(trimmed)) {
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className={styles.contentParagraph}>
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

function renderInlineFormatting(text) {
  // Simple bold handling: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const shareLinks = (title, url) => [
  {
    name: 'WhatsApp',
    icon: 'mdi:whatsapp',
    url: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    color: '#25D366',
  },
  {
    name: 'Facebook',
    icon: 'mdi:facebook',
    url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    color: '#1877F2',
  },
  {
    name: 'Twitter',
    icon: 'mdi:twitter',
    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    color: '#1DA1F2',
  },
  {
    name: 'LinkedIn',
    icon: 'mdi:linkedin',
    url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    color: '#0A66C2',
  },
];

const ArticleDetail = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const data = await articleService.getBySlug(slug);
        setArticle(data);
        if (data) {
          // Use admin-selected related articles if available
          if (data.relatedArticleIds && data.relatedArticleIds.length > 0) {
            try {
              const selected = await articleService.getByIds(data.relatedArticleIds);
              const activeRelated = selected.filter((a) => a.isActive !== false);
              setRelatedArticles(activeRelated.slice(0, 3));
            } catch {
              // Fallback to category-based if getByIds fails
              setRelatedArticles(await getFallbackRelated(data));
            }
          } else {
            // Fallback: auto-suggest based on category
            setRelatedArticles(await getFallbackRelated(data));
          }
        }
      } catch (err) {
        // Article fetch failed — UI shows error state
      } finally {
        setLoading(false);
      }
    };

    const getFallbackRelated = async (data) => {
      const all = await articleService.getAll({ isActive: true });
      const related = all
        .filter((a) => a.id !== data.id && a.category === data.category)
        .slice(0, 3);
      if (related.length < 3) {
        const extra = all
          .filter((a) => a.id !== data.id && !related.find((r) => r.id === a.id))
          .slice(0, 3 - related.length);
        related.push(...extra);
      }
      return related;
    };

    fetchArticle();
    window.scrollTo(0, 0);
  }, [slug]);

  const headings = useMemo(() => (article ? parseHeadings(article.content) : []), [article]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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

  if (!article) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <Icon icon="mdi:file-alert-outline" className={styles.notFoundIcon} />
          <h2>Article Not Found</h2>
          <p>The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/insights/articles" className={styles.backLink}>
            <Icon icon="mdi:arrow-left" /> Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.seoTitle || article.title} | H.O.M Advisory</title>
        <meta name="description" content={article.seoDescription || article.excerpt} />
        <meta property="og:title" content={article.seoTitle || article.title} />
        <meta property="og:description" content={article.seoDescription || article.excerpt} />
        <meta property="og:image" content={article.image} />
        <meta property="og:type" content="article" />
      </Helmet>

      <div className={styles.page}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <div className={styles.breadcrumbInner}>
            <Link to="/">Home</Link>
            <Icon icon="mdi:chevron-right" />
            <Link to="/insights/articles">Insights</Link>
            <Icon icon="mdi:chevron-right" />
            <Link to="/insights/articles">Articles</Link>
            <Icon icon="mdi:chevron-right" />
            <span>{article.title}</span>
          </div>
        </nav>

        {/* Featured Image */}
        <motion.div
          className={styles.featuredImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img src={article.image} alt={article.title} />
        </motion.div>

        {/* Content Layout */}
        <div className={styles.articleLayout}>
          {/* TOC Sidebar (desktop) */}
          {headings.length > 0 && (
            <aside className={styles.tocSidebar}>
              <div className={styles.tocCard}>
                <h4 className={styles.tocTitle}>Table of Contents</h4>
                <nav className={styles.tocNav}>
                  {headings.map((h) => (
                    <a key={h.id} href={`#${h.id}`} className={styles.tocLink}>
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Article Content */}
          <motion.article
            className={styles.articleMain}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Meta */}
            <div className={styles.articleMeta}>
              <span className={styles.categoryBadge}>{formatCategory(article.category)}</span>
              <span className={styles.metaItem}>
                <Icon icon="mdi:calendar-outline" />
                {formatDate(article.publishedAt)}
              </span>
              <span className={styles.metaItem}>
                <Icon icon="mdi:account-outline" />
                {article.author}
              </span>
              {article.readTime && (
                <span className={styles.metaItem}>
                  <Icon icon="mdi:clock-outline" />
                  {article.readTime} min read
                </span>
              )}
            </div>

            <h1 className={styles.articleTitle}>{article.title}</h1>

            {/* Article body */}
            <div className={styles.articleContent}>{renderContent(article.content)}</div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className={styles.tags}>
                <Icon icon="mdi:tag-outline" />
                {article.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share */}
            <div className={styles.shareSection}>
              <span className={styles.shareLabel}>Share this article:</span>
              <div className={styles.shareButtons}>
                {shareLinks(article.title, currentUrl).map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.shareBtn}
                    title={`Share on ${s.name}`}
                    style={{ '--share-color': s.color }}
                  >
                    <Icon icon={s.icon} />
                  </a>
                ))}
                <button
                  className={styles.shareBtn}
                  onClick={handleCopyLink}
                  title="Copy link"
                  style={{ '--share-color': '#6B7280' }}
                >
                  <Icon icon={copied ? 'mdi:check' : 'mdi:link-variant'} />
                </button>
              </div>
            </div>

            {/* CTA */}
            <div className={styles.ctaSection}>
              <div className={styles.ctaInfo}>
                <h3>Want expert guidance?</h3>
                <p>
                  Our real estate advisors are here to help you make informed decisions. Get
                  personalized advice tailored to your needs.
                </p>
              </div>
              <LeadForm
                title="Contact Our Experts"
                subtitle="We'll get back to you within 24 hours"
                source="article_detail"
                className={styles.ctaForm}
              />
            </div>
          </motion.article>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className={styles.relatedSection}>
            <div className={styles.relatedInner}>
              <h2 className={styles.relatedTitle}>Related Articles</h2>
              <div className={styles.relatedGrid}>
                {relatedArticles.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                  >
                    <Link to={`/insights/articles/${a.slug}`} className={styles.relatedCard}>
                      <div className={styles.relatedImage}>
                        <img src={a.image} alt={a.title} loading="lazy" />
                      </div>
                      <div className={styles.relatedBody}>
                        <span className={styles.relatedCategory}>{formatCategory(a.category)}</span>
                        <h4 className={styles.relatedCardTitle}>{a.title}</h4>
                        <span className={styles.relatedDate}>{formatDate(a.publishedAt)}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default ArticleDetail;
