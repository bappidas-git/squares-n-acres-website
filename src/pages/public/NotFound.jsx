import React, { useId } from 'react';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';

import GlobalSearch from '../../components/common/GlobalSearch';
import Logo from '../../components/ui/Logo';
import PATHS from '../../routes/paths';
import Seo from '../../components/seo/Seo';
import usePrerenderReady from '../../hooks/usePrerenderReady';
import { Button } from '../../components/ui';
import { ERRORS, NAV } from '../../config/copy';

import styles from './NotFound.module.css';

/**
 * The 404 page — the route fallback, and what a public detail page renders
 * when the API answers 404 for the slug in the address.
 *
 * Branded rather than decorative (§8.2): the monogram, the site's own search
 * box and the five pages a lost visitor most often wanted. The search is the
 * real `GlobalSearch`, so it suggests localities, projects and builders as the
 * visitor types instead of only forwarding a term — a mistyped address is very
 * often one character away from a page that exists. It submits to `?q=`, the
 * contract's search parameter (§5.7); the boilerplate sent `search`, which the
 * listing has never read (BUG-10).
 *
 * `title` and `subtitle` let a page say what was not found ("Property not
 * found") instead of the generic sentence; everything else is the same page
 * either way. `<Seo type="notFound">` is `noindex, follow` (§9.3), so a wrong
 * address is never indexed while the links out of it still carry weight.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.description] the meta description
 */
const NotFound = ({
  title = ERRORS.notFound.title,
  subtitle = ERRORS.notFound.subtitle,
  description = ERRORS.notFound.description,
}) => {
  const searchId = useId();

  // A 404 has no query to wait for, so it is ready the moment it renders. That
  // matters to the prerender crawl (§9.9): a sitemap that has gone stale would
  // otherwise cost the full timeout on every URL whose record has gone.
  usePrerenderReady(false);

  return (
    <>
      <Seo type="notFound" title={title} description={description} />

      <div className={styles.page}>
        <m.div
          className={styles.content}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.mark}>
            <Logo variant="monogram" height={72} alt="" />
            <span className={styles.code} aria-hidden="true">
              404
            </span>
          </div>

          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>

          {/* The label is visible rather than a placeholder standing in for one
              (§8.3); `GlobalSearch` takes the id so the two are tied. */}
          <div className={styles.search}>
            <label htmlFor={searchId} className={styles.searchLabel}>
              {ERRORS.notFound.searchLabel}
            </label>
            <GlobalSearch inputId={searchId} placeholder={ERRORS.notFound.searchPlaceholder} />
          </div>

          <div className={styles.actions}>
            <Button to={PATHS.properties}>{ERRORS.notFound.browse}</Button>
            <Button variant="outline" to={PATHS.home}>
              {ERRORS.notFound.goHome}
            </Button>
          </div>

          <nav className={styles.popular} aria-label={ERRORS.notFound.popular}>
            <span className={styles.popularLabel}>{ERRORS.notFound.popular}</span>
            <ul className={styles.popularList}>
              {POPULAR.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={styles.popularLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </m.div>
      </div>
    </>
  );
};

/** Where a lost visitor most often meant to be (§4.3 of prompt 43). */
const POPULAR = [
  { label: NAV.buy, to: PATHS.buy },
  { label: NAV.rent, to: PATHS.rent },
  { label: NAV.localities, to: PATHS.localities },
  { label: NAV.insights, to: PATHS.articles },
  { label: NAV.contact, to: PATHS.contact },
];

export default NotFound;
