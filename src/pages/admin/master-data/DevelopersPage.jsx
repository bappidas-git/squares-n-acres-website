import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import PATHS from '../../../routes/paths';
import SeoScoreChip from '../../../components/seo/SeoScoreChip';
import { LazyImage } from '../../../components/ui';
import { adminCrud, developers } from '../../../services/masterDataService';
import { formatDate, formatNumber } from '../../../utils/format';
import { useMasterData } from '../../../contexts/MasterDataContext';

import styles from './DevelopersPage.module.css';

const developerService = adminCrud(developers);

/**
 * Admin → Master data → Developers (`/admin/master-data/developers`).
 *
 * The list is a `MasterDataPage` configuration; the form is a screen of its
 * own (`DeveloperFormPage`), because a builder carries a profile, a logo, a
 * cover, counts, registrations and highlights — far more than a dialog can
 * hold — so "Add" and "Edit" navigate rather than opening one.
 *
 * Sorted by `order`, the table becomes a drag-to-reorder list: that is the
 * order `/builders` and the home row read, and the only sort in which moving a
 * row means anything.
 */
export default function DevelopersPage() {
  const navigate = useNavigate();
  // The seven public lists are loaded once and cached (D93); a write here is
  // what makes that cache wrong, so it is refreshed from here.
  const { refresh } = useMasterData();

  const config = useMemo(
    () => ({
      key: 'developers',
      title: 'Developers',
      subtitle: 'The builders behind the projects — one page each at /builders.',
      singular: 'developer',
      service: developerService,
      formMode: 'page',
      onCreate: () => navigate(PATHS.adminDeveloperNew),
      onEdit: (row) => navigate(PATHS.adminDeveloperEdit(row.id)),
      onMutated: refresh,
      defaultSort: { field: 'order', order: 'asc' },
      orderable: true,
      activeToggle: true,
      featuredToggle: true,
      usageGuard: true,

      columns: [
        {
          key: 'logoUrl',
          label: 'Logo',
          width: '96px',
          mobile: false,
          hideBelow: 'md',
          render: (row) => (
            <LazyImage
              src={row.logoUrl}
              alt=""
              ratio="2/1"
              fit="contain"
              sizes="88px"
              className={styles.logo}
              onErrorFallback={<span className={styles.logoEmpty} aria-hidden="true" />}
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
              <span className={styles.slug}>/builders/{row.slug}</span>
              {row.headquarters ? <span className={styles.meta}>{row.headquarters}</span> : null}
            </span>
          ),
        },
        {
          key: 'propertyCount',
          label: 'Projects',
          sortable: true,
          align: 'right',
          width: '110px',
          render: (row) => formatNumber(row.propertyCount ?? 0),
        },
        {
          key: 'establishedYear',
          label: 'Established',
          align: 'right',
          width: '120px',
          hideBelow: 'lg',
          mobile: false,
          render: (row) => (row.establishedYear ? String(row.establishedYear) : '—'),
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
        { key: 'q', type: 'search', label: 'Search', placeholder: 'Name, summary or city' },
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
            title: 'Delete the selected developers?',
            message:
              '{count} will be deleted. If a property still points at any of them, none is deleted and you are told which. This cannot be undone.',
          },
        },
      ],

      // An inactive developer's page answers 404, so there is nothing to view
      // (QA-60); switched back on, the link comes back with it.
      extraRowActions: (row) =>
        row.isActive === false || !row.slug
          ? []
          : [
              {
                key: 'view',
                label: `View ${row.name} on the site`,
                icon: 'mdi:open-in-new',
                href: PATHS.builder(row.slug),
              },
            ],

      renderOrderItem: (row) => (
        <span className={styles.orderRow}>
          <span className={styles.name}>{row.name}</span>
          <span className={styles.orderMeta}>
            {row.headquarters || 'No headquarters'} · {formatNumber(row.propertyCount ?? 0)}{' '}
            {row.propertyCount === 1 ? 'project' : 'projects'}
            {/* The home row is the featured ones in this order (QA-60). */}
            {row.isFeatured ? ' · Featured' : ''}
          </span>
        </span>
      ),

      emptyState: {
        title: 'No developers yet',
        text: 'Add the builders behind your listings — they carry the builder pages and the "About the builder" section of every property.',
      },
    }),
    [navigate, refresh]
  );

  return <MasterDataPage config={config} />;
}
