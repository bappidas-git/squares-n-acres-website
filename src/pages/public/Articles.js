import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import { articleService } from '../../services/api';
import LeadForm from '../../components/common/LeadForm';
import styles from './Articles.module.css';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'buying-guide', label: 'Buying Guide' },
  { value: 'market-trends', label: 'Market Trends' },
  { value: 'investment', label: 'Investment' },
  { value: 'legal', label: 'Legal' },
  { value: 'interior', label: 'Interior' },
  { value: 'news', label: 'News' },
];

const ARTICLES_PER_PAGE = 6;

const Section = ({ children, className = '', delay = 0 }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.section>
  );
};

const ArticleCard = ({ article, index }) => (
  <motion.article
    className={styles.articleCard}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ delay: index * 0.1, duration: 0.4 }}
  >
    <Link to={`/insights/articles/${article.slug}`} className={styles.cardImageLink}>
      <div className={styles.cardImage}>
        <img src={article.image} alt={article.title} loading="lazy" />
        <span className={styles.categoryBadge}>{formatCategory(article.category)}</span>
      </div>
    </Link>
    <div className={styles.cardBody}>
      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <Icon icon="mdi:account-outline" />
          {article.author}
        </span>
        <span className={styles.metaItem}>
          <Icon icon="mdi:calendar-outline" />
          {formatDate(article.publishedAt)}
        </span>
        {article.readTime && (
          <span className={styles.metaItem}>
            <Icon icon="mdi:clock-outline" />
            {article.readTime} min read
          </span>
        )}
      </div>
      <Link to={`/insights/articles/${article.slug}`} className={styles.cardTitleLink}>
        <h3 className={styles.cardTitle}>{article.title}</h3>
      </Link>
      <p className={styles.cardExcerpt}>{article.excerpt}</p>
      <Link to={`/insights/articles/${article.slug}`} className={styles.readMore}>
        Read More <Icon icon="mdi:arrow-right" />
      </Link>
    </div>
  </motion.article>
);

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCategory(cat) {
  return cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(ARTICLES_PER_PAGE);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await articleService.getAll({ isActive: true });
        setArticles(data);
      } catch (err) {
        // Articles fetch failed — UI shows empty state
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  const filtered = useMemo(() => {
    let result = articles;
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [articles, activeCategory, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const [trendingArticles, setTrendingArticles] = useState([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await articleService.getTrending();
        setTrendingArticles(data.slice(0, 4));
      } catch {
        // Fallback: use latest articles if trending fetch fails
        if (articles.length > 0) {
          setTrendingArticles(
            [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 4)
          );
        }
      }
    };
    fetchTrending();
  }, [articles]);

  const handleLoadMore = () => setVisibleCount((prev) => prev + ARTICLES_PER_PAGE);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setVisibleCount(ARTICLES_PER_PAGE);
  };

  return (
    <>
      <Helmet>
        <title>Real Estate Articles & Insights | H.O.M Advisory</title>
        <meta
          name="description"
          content="Expert articles on Indian real estate — buying guides, market trends, investment tips, legal advice, and interior design ideas from H.O.M Advisory."
        />
      </Helmet>

      <div className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.heroBadge}>
              <Icon icon="mdi:newspaper-variant-outline" /> Insights
            </span>
            <h1 className={styles.heroTitle}>Articles & Insights</h1>
            <p className={styles.heroSubtitle}>
              Stay informed with expert analysis, market trends, buying guides, and the latest news
              from India's real estate market.
            </p>
          </motion.div>
        </section>

        {/* Filters & Content */}
        <Section className={styles.section}>
          <div className={styles.contentLayout}>
            {/* Main content */}
            <div className={styles.mainContent}>
              {/* Search */}
              <div className={styles.searchBar}>
                <Icon icon="mdi:magnify" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(ARTICLES_PER_PAGE);
                  }}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    className={styles.clearSearch}
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                )}
              </div>

              {/* Category chips */}
              <div className={styles.categoryChips}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    className={`${styles.chip} ${activeCategory === cat.value ? styles.chipActive : ''}`}
                    onClick={() => handleCategoryChange(cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Articles grid */}
              {loading ? (
                <div className={styles.loadingGrid}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={styles.skeleton}>
                      <div className={styles.skeletonImage} />
                      <div className={styles.skeletonBody}>
                        <div className={styles.skeletonLine} style={{ width: '60%' }} />
                        <div className={styles.skeletonLine} style={{ width: '90%' }} />
                        <div className={styles.skeletonLine} style={{ width: '75%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className={styles.emptyState}>
                  <Icon icon="mdi:file-search-outline" className={styles.emptyIcon} />
                  <h3>No articles found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <>
                  <div className={styles.articlesGrid}>
                    {visible.map((article, i) => (
                      <ArticleCard key={article.id} article={article} index={i} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className={styles.loadMoreWrap}>
                      <button className={styles.loadMoreBtn} onClick={handleLoadMore}>
                        Load More Articles
                        <Icon icon="mdi:chevron-down" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar (desktop) */}
            <aside className={styles.sidebar}>
              {/* Trending */}
              <div className={styles.sidebarCard}>
                <h4 className={styles.sidebarTitle}>
                  <Icon icon="mdi:trending-up" /> Trending Articles
                </h4>
                <div className={styles.trendingList}>
                  {trendingArticles.map((article, i) => (
                    <Link
                      key={article.id}
                      to={`/insights/articles/${article.slug}`}
                      className={styles.trendingItem}
                    >
                      <span className={styles.trendingNum}>{String(i + 1).padStart(2, '0')}</span>
                      <div className={styles.trendingInfo}>
                        <span className={styles.trendingTitle}>{article.title}</span>
                        <span className={styles.trendingDate}>{formatDate(article.publishedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div className={styles.sidebarCard}>
                <h4 className={styles.sidebarTitle}>
                  <Icon icon="mdi:email-newsletter" /> Newsletter
                </h4>
                <p className={styles.newsletterText}>
                  Get the latest real estate insights delivered to your inbox.
                </p>
                <LeadForm
                  title=""
                  subtitle=""
                  fields={[
                    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your Name' },
                    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address' },
                  ]}
                  source="newsletter_articles"
                  className={styles.newsletterForm}
                />
              </div>
            </aside>
          </div>
        </Section>
      </div>
    </>
  );
};

export default Articles;
