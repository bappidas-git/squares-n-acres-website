import { Icon } from '@iconify/react';

import NewsletterSection from '../../common/NewsletterSection';
import TagCloud from './TagCloud';
import TrendingList from './TrendingList';
import { Button } from '../../ui';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';

import styles from './BlogSidebar.module.css';

/**
 * The rail beside every blog listing: what is being read, what the archive is
 * indexed by, the newsletter and a way to talk to somebody.
 *
 * It is one component rather than four copies in four pages, so the index, a
 * category, a tag and an author's page cannot end up offering different
 * things. Each part answers for itself when it has nothing to show.
 *
 * @param {object} props
 * @param {Array<object>} [props.tags] passed down when the page already has them
 * @param {string} [props.activeTagSlug]
 */
export default function BlogSidebar({ tags, activeTagSlug = '', className = '' }) {
  const { openLeadModal } = useLeadCapture();

  return (
    <aside className={[styles.sidebar, className].filter(Boolean).join(' ')}>
      <TrendingList className={styles.card} />

      <TagCloud tags={tags} activeSlug={activeTagSlug} className={styles.card} />

      <NewsletterSection compact className={styles.newsletter} />

      <section className={[styles.card, styles.lead].filter(Boolean).join(' ')}>
        <Icon
          icon="mdi:comment-question-outline"
          width="28"
          height="28"
          className={styles.leadIcon}
          aria-hidden="true"
        />
        <h2 className={styles.leadTitle}>Need advice on a purchase?</h2>
        <p className={styles.leadText}>
          Tell an advisor what you are weighing up and get the trade-offs in writing, with no
          obligation.
        </p>
        <Button onClick={() => openLeadModal({ entry: 'article' })}>Talk to an advisor</Button>
      </section>
    </aside>
  );
}
