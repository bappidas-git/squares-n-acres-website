import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { articleService } from '../../../services/api';
import styles from './TrendingTopics.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: 'easeOut' },
  }),
};

const TrendingTopics = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await articleService.getTrending();
        setArticles(data);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) return null;
  if (!articles.length) return null;

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Trending Topics</h2>
        </motion.div>

        <div className={styles.grid}>
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              className={styles.card}
              custom={i}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants}
            >
              <span className={styles.number}>{i + 1}</span>
              <div className={styles.cardImageWrap}>
                <img
                  src={article.image}
                  alt={article.title}
                  className={styles.cardImage}
                  loading="lazy"
                />
              </div>
              <div className={styles.cardBody}>
                <h4 className={styles.cardTitle}>{article.title}</h4>
                <Link
                  to={`/insights/articles/${article.slug}`}
                  className={styles.readMore}
                >
                  Read More
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
