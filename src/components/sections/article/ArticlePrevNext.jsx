import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';

import styles from './ArticlePrevNext.module.css';
import { BLOG } from '../../../config/copy';

/**
 * Where to go from the end of an article: the pieces published either side of
 * this one in the same category (`GET /articles/:id/adjacent`).
 *
 * "Previous" is the older article and "Next" the newer one, so walking the
 * pair forwards reads the category in the order it was written. At either end
 * of a category only one side is drawn, and a category of one draws nothing.
 *
 * @param {object} props
 * @param {object} [props.prev] the article published before this one
 * @param {object} [props.next] the article published after it
 */
export default function ArticlePrevNext({ prev, next, className = '' }) {
  if (!prev && !next) return null;

  return (
    <nav
      className={[styles.nav, className].filter(Boolean).join(' ')}
      aria-label={BLOG.moreInCategory}
    >
      {prev ? (
        <Link to={PATHS.article(prev.slug)} className={[styles.link, styles.prev].join(' ')}>
          <span className={styles.direction}>
            <Icon icon="mdi:arrow-left" width="18" height="18" aria-hidden="true" />
            Previous article
          </span>
          <span className={styles.title}>{prev.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <Link to={PATHS.article(next.slug)} className={[styles.link, styles.next].join(' ')}>
          <span className={styles.direction}>
            Next article
            <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
          </span>
          <span className={styles.title}>{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
