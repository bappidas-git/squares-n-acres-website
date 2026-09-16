import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import styles from './TrendingTopics.module.css';
import useApi from '../../../hooks/useApi';
import useInView from '../../../hooks/useInView';

/**
 * The most-read articles. `GET /articles/trending` already ranks them by view
 * count among published pieces (§5.14), so this section neither sorts nor
 * filters — and it is the only place on the page that calls that endpoint.
 */

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: Math.min(index, 4) * 0.1, ease: 'easeOut' },
  }),
};

const TrendingTopics = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const { data, loading } = useApi((signal) => articleService.trending(undefined, { signal }), [], {
    initialData: [],
  });

  const articles = Array.isArray(data) ? data : [];
  if (loading || articles.length === 0) return null;

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Trending topics</h2>
        </motion.div>

        <div className={styles.grid}>
          {articles.map((article, index) => (
            <motion.div
              key={article.id}
              className={styles.card}
              custom={index}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants}
            >
              <span className={styles.number}>{index + 1}</span>
              <div className={styles.cardImageWrap}>
                {article.featuredImage?.url ? (
                  <img
                    src={article.featuredImage.url}
                    alt={article.featuredImage.alt || article.title}
                    className={styles.cardImage}
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{article.title}</h3>
                <Link to={PATHS.article(article.slug)} className={styles.readMore}>
                  Read more
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingTopics;
