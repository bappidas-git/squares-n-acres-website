import { Icon } from '@iconify/react';
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
 *
 * **What folds, and where (QA-55).** Ten columns did not fit a laptop: at
 * 1,536 px the Updated column — the order the list opens in — sat under the
 * pinned actions, and at 1,280 px three columns did. The author is a line
 * under the category at every width, since nothing sorts by it; below 1,536 px
 * the thumbnail goes and the SEO score folds under the status; below 1,200 px
 * the publication date folds there too. Each comes back as its own column the
 * moment there is room, so a laptop keeps every sortable header it can hold.
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

/**
 * The headline, the star of a featured piece and the address it lives at.
 *
 * The star is the table's only sign of `isFeatured`: the row menu and the bulk
 * bar both feature and unfeature, and without it neither left a trace on a
 * laptop (QA-55).
 */
function TitleCell({ row }) {
  return (
    <span className={styles.titleCell}>
      <span className={styles.titleLine}>
        {row.isFeatured ? (
          <span className={styles.star} role="img" aria-label="Featured" title="Featured">
            <Icon icon="mdi:star" width="16" height="16" aria-hidden="true" />
          </span>
        ) : null}
        <Link className={styles.title} to={PATHS.adminArticleEdit(row.id)}>
          {row.title}
        </Link>
      </span>
      <span className={styles.meta}>/insights/articles/{row.slug}</span>
    </span>
  );
}

/** The category, and under it the byline. */
function FiledCell({ row }) {
  if (!row.category?.name && !row.author?.name) return '—';

  return (
    <span className={styles.stack}>
      {row.category?.name ? (
        <StatusChip tone="info" variant="outline" label={row.category.name} />
      ) : null}
      {row.author?.name ? (
        <span className={styles.authorCell}>
          <Avatar src={row.author.avatarUrl} name={row.author.name} size={20} />
          <span className={styles.meta}>{row.author.name}</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * The status chip, the moment a scheduled article is waiting for, and — where
 * their own columns have folded away — the date it went live and its score.
 */
function Status({ row, folded = false }) {
  const scheduled = row.status === 'scheduled' && row.publishedAt;
  const published = row.status === 'published' && row.publishedAt;

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
      {folded && published ? (
        <span className={[styles.meta, styles.publishedInline].join(' ')}>
          {formatDate(row.publishedAt)}
        </span>
      ) : null}
      {folded ? (
        <span className={styles.seoInline}>
          <SeoScoreChip seo={row.seo} />
        </span>
      ) : null}
    </span>
  );
}

/**
 * When the article went live — or, for one still waiting, when it will: a
 * scheduled row used to print its future date here exactly as a published one
 * does, which read as "published on 31 Oct" (QA-55).
 */
function PublishedCell({ row }) {
  if (!row.publishedAt) return '—';
  if (row.status === 'scheduled') {
    return (
      <span className={styles.meta} title="Scheduled — not on the site until then">
        Due {formatDate(row.publishedAt)}
      </span>
    );
  }
  return formatDate(row.publishedAt);
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
      hideBelow: 'xl',
      mobile: false,
      render: (row) => <Thumbnail row={row} />,
    },
    {
      key: 'title',
      label: 'Article',
      sortable: true,
      primary: true,
      width: '30%',
      render: (row) => <TitleCell row={row} />,
    },
    {
      key: 'category',
      label: 'Category · Author',
      width: '170px',
      mobile: true,
      render: (row) => <FiledCell row={row} />,
    },
    {
      key: 'status',
      label: 'Status',
      width: '150px',
      mobile: true,
      render: (row) => <Status row={row} folded />,
    },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      width: '110px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => <PublishedCell row={row} />,
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      align: 'right',
      width: '80px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => formatNumber(row.viewCount ?? 0),
    },
    {
      key: 'seoScore',
      label: 'SEO',
      width: '132px',
      mobile: false,
      hideBelow: 'xl',
      render: (row) => <SeoScoreChip seo={row.seo} />,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      width: '110px',
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
