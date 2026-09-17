import { Link } from 'react-router-dom';

import Avatar from '../../../components/ui/Avatar';
import LazyImage from '../../../components/ui/LazyImage';
import PATHS from '../../../routes/paths';
import SeoScoreChip from '../../../components/seo/SeoScoreChip';
import StatusChip from '../../../components/admin/StatusChip';
import { ARTICLE_STATUS } from '../../../config/enums';
import { formatDate, formatDateTime, formatNumber } from '../../../utils/format';

import styles from './ArticlesListPage.module.css';

/**
 * What the admin article table shows (00_MASTER_CONTEXT.md §5.14, §6.8).
 *
 * The four sortable headers are exactly the four orders the API answers for an
 * admin article list — `title`, `publishedAt`, `viewCount` and `updatedAt` — so
 * a header that is offered is a header that works.
 *
 * A **scheduled** article is the one row whose status is not the whole story:
 * the chip says "Scheduled" and the line under it says when, because an editor
 * scanning the list needs to know whether the moment has passed (the API
 * promotes a scheduled article to published as soon as it has).
 */

/** The 56 × 36 thumbnail of §6, with the empty box when there is no image. */
function Thumbnail({ row }) {
  return (
    <LazyImage
      className={styles.thumb}
      src={row?.featuredImage?.url}
      alt=""
      ratio="14 / 9"
      sizes="56px"
      loading="lazy"
    />
  );
}

/** The status chip, plus the moment a scheduled article is waiting for. */
function Status({ row }) {
  const scheduled = row.status === 'scheduled' && row.publishedAt;

  return (
    <span className={styles.stack}>
      <StatusChip
        tone={ARTICLE_STATUS.meta[row.status]?.tone ?? 'neutral'}
        label={ARTICLE_STATUS.labelOf(row.status) || 'Draft'}
      />
      {scheduled ? (
        <span className={styles.meta}>
          <span aria-hidden="true">· </span>
          {formatDateTime(row.publishedAt)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The table's columns.
 *
 * @returns {Array<object>} `DataTable` columns
 */
export function buildArticleColumns() {
  return [
    {
      key: 'thumbnail',
      label: 'Image',
      width: '72px',
      mobile: false,
      render: (row) => <Thumbnail row={row} />,
    },
    {
      key: 'title',
      label: 'Article',
      sortable: true,
      primary: true,
      width: '28%',
      render: (row) => (
        <span className={styles.titleCell}>
          <Link className={styles.title} to={PATHS.adminArticleEdit(row.id)}>
            {row.title}
          </Link>
          <span className={styles.meta}>/insights/articles/{row.slug}</span>
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '150px',
      mobile: true,
      render: (row) =>
        row.category?.name ? (
          <StatusChip tone="info" variant="outline" label={row.category.name} />
        ) : (
          '—'
        ),
    },
    {
      key: 'author',
      label: 'Author',
      width: '170px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) =>
        row.author?.name ? (
          <span className={styles.authorCell}>
            <Avatar src={row.author.avatarUrl} name={row.author.name} size={24} />
            <span>{row.author.name}</span>
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '160px',
      mobile: true,
      render: (row) => <Status row={row} />,
    },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      width: '120px',
      hideBelow: 'md',
      mobile: false,
      render: (row) => (row.publishedAt ? formatDate(row.publishedAt) : '—'),
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      align: 'right',
      width: '90px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => formatNumber(row.viewCount ?? 0),
    },
    {
      key: 'seoScore',
      label: 'SEO',
      width: '132px',
      mobile: false,
      hideBelow: 'lg',
      render: (row) => <SeoScoreChip seo={row.seo} />,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      width: '120px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => formatDate(row.updatedAt),
    },
  ];
}

/**
 * One row as a card, for the phone layout (§8.1).
 *
 * @param {object} row
 * @returns {React.ReactNode}
 */
export function renderArticleCard(row) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <Thumbnail row={row} />
        <div className={styles.cardHeading}>
          <Link className={styles.title} to={PATHS.adminArticleEdit(row.id)}>
            {row.title}
          </Link>
          <span className={styles.meta}>
            {[row.category?.name, row.author?.name].filter(Boolean).join(' · ') || row.slug}
          </span>
        </div>
      </div>
      <div className={styles.cardChips}>
        <Status row={row} />
        {row.isFeatured ? <StatusChip tone="warning" icon="mdi:star" label="Featured" /> : null}
        <span className={styles.meta}>
          {formatNumber(row.viewCount ?? 0)} {row.viewCount === 1 ? 'view' : 'views'}
        </span>
      </div>
    </div>
  );
}
