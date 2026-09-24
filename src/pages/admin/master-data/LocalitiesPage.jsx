import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import PATHS from '../../../routes/paths';
import SeoScoreChip from '../../../components/seo/SeoScoreChip';
import { LazyImage } from '../../../components/ui';
import { LOCALITY_ZONES } from '../../../config/enums';
import { adminCrud, localities } from '../../../services/masterDataService';
import { formatDate, formatNumber } from '../../../utils/format';
import { useMasterData } from '../../../contexts/MasterDataContext';

import styles from './LocalitiesPage.module.css';

const localityService = adminCrud(localities);

/**
 * Admin → Master data → Localities (`/admin/master-data/localities`).
 *
 * The list is a `MasterDataPage` configuration; the form is a screen of its
 * own (`LocalityFormPage`) because a locality carries a guide, coordinates,
 * highlights and connectivity — far more than a dialog can hold — so "Add" and
 * "Edit" navigate rather than opening one.
 *
 * Sorted by `order`, the table becomes a drag-to-reorder list: that is the
 * order the home strip and `/localities` read, and it is the only sort in
 * which moving a row means anything.
 */
export default function LocalitiesPage() {
  const navigate = useNavigate();
  // The seven public lists are loaded once and cached (D93); a write here is
  // what makes that cache wrong, so it is refreshed from here.
  const { refresh } = useMasterData();

  const config = useMemo(
    () => ({
      key: 'localities',
      title: 'Localities',
      subtitle: 'The neighbourhoods listings sit in — one guide page each at /localities.',
      singular: 'locality',
      service: localityService,
      formMode: 'page',
      onCreate: () => navigate(PATHS.adminLocalityNew),
      onEdit: (row) => navigate(PATHS.adminLocalityEdit(row.id)),
      onMutated: refresh,
      defaultSort: { field: 'order', order: 'asc' },
      orderable: true,
      activeToggle: true,
      featuredToggle: true,
      usageGuard: true,

      columns: [
        {
          key: 'heroImageUrl',
          label: 'Image',
          width: '96px',
          mobile: false,
          hideBelow: 'md',
          render: (row) => (
            <LazyImage
              src={row.heroImageUrl}
              alt=""
              ratio="4/3"
              sizes="72px"
              className={styles.thumb}
              onErrorFallback={<span className={styles.thumbEmpty} aria-hidden="true" />}
            />
          ),
        },
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          primary: true,
          render: (row) => (
            <span className={styles.nameCell}>
              <span className={styles.name}>{row.name}</span>
              <span className={styles.slug}>/localities/{row.slug}</span>
            </span>
          ),
        },
        {
          key: 'zone',
          label: 'Zone',
          hideBelow: 'md',
          render: (row) => (row.zone ? LOCALITY_ZONES.labelOf(row.zone) : '—'),
        },
        {
          key: 'avgPricePerSqft',
          label: 'Avg ₹/sq ft',
          align: 'right',
          hideBelow: 'lg',
          mobile: false,
          render: (row) => (row.avgPricePerSqft ? `₹${formatNumber(row.avgPricePerSqft)}` : '—'),
        },
        {
          key: 'propertyCount',
          label: 'Properties',
          sortable: true,
          align: 'right',
          width: '110px',
          render: (row) => formatNumber(row.propertyCount ?? 0),
        },
        {
          key: 'seoScore',
          label: 'SEO',
          width: '132px',
          hideBelow: 'lg',
          mobile: false,
          render: (row) => <SeoScoreChip seo={row.seo} />,
        },
        {
          key: 'updatedAt',
          label: 'Updated',
          hideBelow: 'lg',
          mobile: false,
          render: (row) => formatDate(row.updatedAt),
        },
      ],

      filters: [
        { key: 'q', type: 'search', label: 'Search', placeholder: 'Name or description' },
        {
          key: 'zone',
          type: 'select',
          label: 'Zone',
          placeholder: 'All zones',
          options: LOCALITY_ZONES.options,
        },
        {
          key: 'isFeatured',
          type: 'toggle',
          label: 'Featured',
          trueLabel: 'Featured',
          falseLabel: 'Not featured',
          placeholder: 'Any',
        },
        {
          key: 'isActive',
          type: 'toggle',
          label: 'Status',
          trueLabel: 'Active',
          falseLabel: 'Inactive',
          placeholder: 'Any status',
        },
      ],

      bulkActions: [
        { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
        { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
        { key: 'feature', label: 'Feature', icon: 'mdi:star-outline' },
        { key: 'unfeature', label: 'Unfeature', icon: 'mdi:star-off-outline' },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          confirm: {
            title: 'Delete the selected localities?',
            message:
              '{count} will be deleted. If a property still points at any of them, none is deleted and you are told which. This cannot be undone.',
          },
        },
      ],

      // An inactive locality's page answers 404, so there is nothing to view
      // (QA-60); switched back on, the link comes back with it.
      extraRowActions: (row) =>
        row.isActive === false || !row.slug
          ? []
          : [
              {
                key: 'view',
                label: `View ${row.name} on the site`,
                icon: 'mdi:open-in-new',
                href: PATHS.locality(row.slug),
              },
            ],

      renderOrderItem: (row) => (
        <span className={styles.orderRow}>
          <span className={styles.name}>{row.name}</span>
          <span className={styles.orderMeta}>
            {row.zone ? LOCALITY_ZONES.labelOf(row.zone) : 'No zone'} ·{' '}
            {formatNumber(row.propertyCount ?? 0)}{' '}
            {row.propertyCount === 1 ? 'property' : 'properties'}
            {/* The home strip is the featured ones in this order, so which of
                them are featured is part of reading it (QA-60). */}
            {row.isFeatured ? ' · Featured' : ''}
          </span>
        </span>
      ),

      emptyState: {
        title: 'No localities yet',
        text: 'Add the neighbourhoods your listings sit in — they carry the guide pages and the home strip.',
      },
    }),
    [navigate, refresh]
  );

  return <MasterDataPage config={config} />;
}
