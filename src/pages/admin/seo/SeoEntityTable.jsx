import { Icon } from '@iconify/react';

import SeoScoreChip from '../../../components/seo/SeoScoreChip';
import StatusChip from '../../../components/admin/StatusChip';
import { EMPTY, formatRelative } from '../../../utils/format';
import { isPublished, typeLabel } from './seoEntityServices';

import styles from './SeoDashboardPage.module.css';

/**
 * The columns of the SEO desk's table (§4.2 of prompt 37).
 *
 * A row is one optimisable record of any of the eight types, so the first
 * column has to say *which* — the title alone is ambiguous the moment a
 * locality and an article are both called "Whitefield". Type and slug sit under
 * the title rather than in columns of their own, which is what keeps six
 * columns readable at 1 280 px.
 *
 * The row actions are exported as a builder rather than declared here because
 * what an editor may do to a record depends on the permission the host screen
 * holds, and the table must not decide that for itself.
 *
 * @param {object} options
 * @param {(row: object) => void} options.onEdit opens the SEO dialog
 */
export function buildSeoColumns() {
  return [
    {
      key: 'title',
      label: 'Record',
      sortable: true,
      primary: true,
      render: (row) => (
        <span className={styles.recordCell}>
          <span className={styles.recordTitle}>{row.title || 'Untitled'}</span>
          <span className={styles.recordMeta}>
            <StatusChip tone="neutral" label={typeLabel(row.type)} variant="outline" />
            <span className={styles.recordSlug}>{row.slug ? `/${row.slug}` : 'No slug yet'}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'focusKeyword',
      label: 'Focus keyword',
      hideBelow: 'lg',
      render: (row) =>
        row.seo?.focusKeyword ? (
          <span className={styles.keyword}>{row.seo.focusKeyword}</span>
        ) : (
          <span className={styles.missing}>
            <Icon icon="mdi:alert-outline" width="15" height="15" aria-hidden="true" />
            Not set
          </span>
        ),
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      width: '9rem',
      render: (row) => <SeoScoreChip seo={row.seo} />,
    },
    {
      key: 'index',
      label: 'Index',
      hideBelow: 'md',
      width: '8rem',
      render: (row) =>
        row.seo?.robots?.index === false ? (
          <StatusChip tone="neutral" label="Noindex" icon="mdi:eye-off-outline" />
        ) : (
          <StatusChip tone="success" label="Indexed" icon="mdi:eye-outline" />
        ),
    },
    {
      key: 'published',
      label: 'Live',
      hideBelow: 'lg',
      width: '7rem',
      render: (row) =>
        isPublished(row) ? (
          <StatusChip tone="success" label="Live" variant="outline" />
        ) : (
          <StatusChip tone="warning" label="Draft" variant="outline" />
        ),
    },
    {
      key: 'updatedAt',
      label: 'Last analysed',
      sortable: true,
      hideBelow: 'md',
      width: '10rem',
      render: (row) =>
        row.seo?.lastAnalyzedAt ? (
          <span title={row.seo.lastAnalyzedAt}>{formatRelative(row.seo.lastAnalyzedAt)}</span>
        ) : (
          <span className={styles.missing}>Never</span>
        ),
    },
  ];
}

/**
 * The phone presentation of a row: the title, the score and the keyword.
 *
 * @param {object} row
 */
export function renderSeoCard(row) {
  return (
    <div className={styles.mobileCard}>
      <div className={styles.mobileTop}>
        <span className={styles.recordTitle}>{row.title || 'Untitled'}</span>
        <SeoScoreChip seo={row.seo} />
      </div>
      <div className={styles.recordMeta}>
        <StatusChip tone="neutral" label={typeLabel(row.type)} variant="outline" />
        {row.seo?.robots?.index === false ? (
          <StatusChip tone="neutral" label="Noindex" />
        ) : (
          <StatusChip tone="success" label="Indexed" />
        )}
      </div>
      <p className={styles.mobileKeyword}>
        {row.seo?.focusKeyword ? `Focus keyword: ${row.seo.focusKeyword}` : 'No focus keyword'}
      </p>
      <p className={styles.mobileKeyword}>
        {row.seo?.lastAnalyzedAt
          ? `Analysed ${formatRelative(row.seo.lastAnalyzedAt)}`
          : 'Never analysed'}
      </p>
    </div>
  );
}

/** The one place a row's title is rendered outside the table (duplicates, issues). */
export function RowSummary({ row }) {
  return (
    <span className={styles.recordCell}>
      <span className={styles.recordTitle}>{row.title || 'Untitled'}</span>
      <span className={styles.recordMeta}>
        <StatusChip tone="neutral" label={typeLabel(row.type)} variant="outline" />
        <span className={styles.recordSlug}>{row.slug ? `/${row.slug}` : EMPTY}</span>
      </span>
    </span>
  );
}
