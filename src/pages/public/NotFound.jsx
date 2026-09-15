import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import styles from './NotFound.module.css';

const NotFound = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/properties?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Page Not Found | H.O.M Advisory</title>
        <meta name="description" content="The page you're looking for doesn't exist. Browse our properties or return to the homepage." />
      </Helmet>

      <div className={styles.page}>
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 404 Typography */}
          <div className={styles.errorCode}>
            <span className={styles.digit}>4</span>
            <motion.div
              className={styles.houseIcon}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon icon="mdi:home-outline" />
            </motion.div>
            <span className={styles.digit}>4</span>
          </div>

          <h1 className={styles.title}>Page Not Found</h1>
          <p className={styles.subtitle}>
            The page you're looking for doesn't exist or has been moved.
            Don't worry — let's help you find your way.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchWrapper}>
              <Icon icon="mdi:magnify" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search for properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn}>
                Search
              </button>
            </div>
          </form>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Link to="/" className={styles.btnPrimary}>
              <Icon icon="mdi:home" /> Go Back to Home
            </Link>
            <Link to="/properties" className={styles.btnSecondary}>
              <Icon icon="mdi:magnify" /> Browse Properties
            </Link>
          </div>

          {/* Quick Links */}
          <div className={styles.quickLinks}>
            <span className={styles.quickLinksLabel}>Quick links:</span>
            <Link to="/about" className={styles.quickLink}>About Us</Link>
            <Link to="/contact" className={styles.quickLink}>Contact</Link>
            <Link to="/sell-let" className={styles.quickLink}>Sell/Let</Link>
            <Link to="/insights/articles" className={styles.quickLink}>Articles</Link>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default NotFound;
