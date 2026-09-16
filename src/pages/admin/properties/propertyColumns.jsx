import { Link } from 'react-router-dom';

import LazyImage from '../../../components/ui/LazyImage';
import PATHS from '../../../routes/paths';
import SeoScoreChip from '../../../components/seo/SeoScoreChip';
import StatusChip from '../../../components/admin/StatusChip';
import {
  AREA_UNITS,
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  LISTING_TYPES,
} from '../../../config/enums';
import {
  formatArea,
  formatBhk,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPrice,
} from '../../../utils/format';

import styles from './PropertiesListPage.module.css';

/**
 * What the admin property table shows, and what an export of it writes
 * (§5.7, §6.1).
 *
 * The columns are a function rather than a constant because three of them are
 * controls: the Active / Featured / Verified chips write, and they need the
 * list's own `PATCH` and its busy ids to do it (§5.8). A sales user gets the
 * same chips as plain labels — read-only is the absence of a handler here,
 * not a different table (§7).
 */

/** The cover image, or the first one when no image is marked as the cover. */
const coverOf = (row) => {
  const images = Array.isArray(row?.images) ? row.images : [];
  return images.find((image) => image?.isCover) ?? images[0] ?? null;
};

const localityNameOf = (row) => row?.location?.locality?.name ?? '';
const cityNameOf = (row) => row?.location?.city?.name ?? '';
const developerNameOf = (row) => row?.project?.developer?.name ?? '';

const joinMeta = (parts) => parts.filter(Boolean).join(' · ');

/** The area a listing is measured by, in the order §5.7 reads them. */
const areaValueOf = (row) =>
  row?.area?.superBuiltUpArea ?? row?.area?.carpetArea ?? row?.area?.plotArea ?? null;

const areaUnitLabelOf = (row) => AREA_UNITS.labelOf(row?.area?.areaUnit ?? 'sqft');

/** The number a listing is advertised at: rent for a let, price for a sale. */
const priceValueOf = (row) => {
  const pricing = row?.pricing ?? {};
  const rental = row?.listingType === 'rent' || row?.listingType === 'lease';
  const value = rental ? pricing.rentPerMonth : pricing.price;
  return Number.isFinite(value) ? value : null;
};

/**
 * `₹1.24 Cr`, `₹45,000/month`, or "On request".
 *
 * A listing with no number is on request whether or not the flag says so: the
 * table has nothing else to print, and a blank cell reads as a bug.
 */
function priceLabelOf(row) {
  const value = priceValueOf(row);
  if (value === null) return 'On request';
  return formatPrice(value, { listingType: row?.listingType });
}

/** `3 BHK · 1,650 sq ft` — whichever half the record actually has. */
function configurationLabelOf(row) {
  const bedrooms = row?.configuration?.bedrooms;
  const area = areaValueOf(row);

  return (
    joinMeta([
      Number.isFinite(bedrooms) ? formatBhk(bedrooms) : '',
      area === null ? '' : formatArea(area, areaUnitLabelOf(row)),
    ]) || '—'
  );
}

/** The three flags of §6.1, in the order the chips appear. */
const FLAGS = [
  { field: 'isActive', on: 'Active', off: 'Inactive', tone: 'success', icon: 'mdi:eye-outline' },
  {
    field: 'isFeatured',
    on: 'Featured',
    off: 'Not featured',
    tone: 'warning',
    icon: 'mdi:star-outline',
  },
  {
    field: 'isVerified',
    on: 'Verified',
    off: 'Unverified',
    tone: 'info',
    icon: 'mdi:check-decagram-outline',
  },
];

/**
 * One flag as a chip, and — for a role that may edit — as the control that
 * changes it. The click is stopped from reaching the row, and the chip spins
 * and stops accepting clicks until the `PATCH` answers (§8.2).
 */
function FlagChip({ row, flag, canEdit, busy, onToggle }) {
  const on = row?.[flag.field] === true;
  const label = on ? flag.on : flag.off;
  const interactive = canEdit && typeof onToggle === 'function';

  return (
    <StatusChip
      tone={on ? flag.tone : 'neutral'}
      variant={on ? 'soft' : 'outline'}
      label={label}
      icon={busy ? 'mdi:loading' : flag.icon}
      selected={on}
      className={busy ? styles.flagBusy : undefined}
      {...(interactive
        ? {
            'aria-label': `${label} — ${row.title}`,
            'aria-busy': busy || undefined,
            disabled: busy || undefined,
            onClick: (event) => {
              event.stopPropagation();
              onToggle(row, flag.field, !on);
            },
          }
        : { title: `${label}${busy ? ' — saving…' : ''}` })}
    />
  );
}

/** The Active / Featured / Verified group, shared by the table and the cards. */
function FlagChips({ row, canEdit, busy, onToggle }) {
  return (
    <span className={styles.flags}>
      {FLAGS.map((flag) => (
        <FlagChip
          key={flag.field}
          row={row}
          flag={flag}
          canEdit={canEdit}
          busy={busy}
          onToggle={onToggle}
        />
      ))}
    </span>
  );
}

/** A 48 × 36 cover, with the monogram in the box when there is no image. */
function Cover({ row }) {
  const image = coverOf(row);
  return (
    <LazyImage
      className={styles.cover}
      src={image?.url}
      alt=""
      ratio="4/3"
      sizes="48px"
      loading="lazy"
    />
  );
}

/**
 * The table's columns.
 *
 * The sortable keys are exactly the six the API sorts an admin property list
 * by (§5.7): `title`, `price`, `viewCount`, `priorityOrder`, `seoScore` and
 * `updatedAt` — a header that cannot be answered is not offered.
 *
 * @param {object} [options]
 * @param {boolean} [options.canEdit] false renders the flags as labels
 * @param {Array<string>} [options.busyIds] the rows with a `PATCH` in flight
 * @param {(row: object, field: string, value: boolean) => void} [options.onToggleFlag]
 * @returns {Array<object>} `DataTable` columns
 */
export function buildPropertyColumns({ canEdit = false, busyIds = [], onToggleFlag } = {}) {
  const isBusy = (row) => busyIds.includes(String(row?.id));

  return [
    {
      key: 'cover',
      label: 'Cover',
      width: '72px',
      mobile: false,
      render: (row) => <Cover row={row} />,
    },
    {
      key: 'title',
      label: 'Property',
      sortable: true,
      primary: true,
      width: '26%',
      render: (row) => (
        <span className={styles.titleCell}>
          <Link className={styles.title} to={PATHS.adminPropertyEdit(row.id)}>
            {row.title}
          </Link>
          <span className={styles.meta}>
            {joinMeta([localityNameOf(row), row.propertyType?.name]) || row.slug}
          </span>
        </span>
      ),
    },
    {
      key: 'listingType',
      label: 'Listing',
      width: '96px',
      render: (row) => (
        <StatusChip tone="info" label={LISTING_TYPES.labelOf(row.listingType) || '—'} />
      ),
    },
    {
      key: 'constructionStatus',
      label: 'Status',
      mobile: true,
      render: (row) => (
        <span className={styles.stack}>
          <StatusChip label={CONSTRUCTION_STATUS.labelOf(row.constructionStatus) || '—'} />
          {row.availability && row.availability !== 'available' ? (
            <StatusChip
              tone={AVAILABILITY.meta[row.availability]?.tone ?? 'neutral'}
              label={AVAILABILITY.labelOf(row.availability)}
            />
          ) : null}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      sortable: true,
      render: (row) => <span className={styles.price}>{priceLabelOf(row)}</span>,
    },
    {
      key: 'configuration',
      label: 'Configuration',
      hideBelow: 'lg',
      render: (row) => <span className={styles.config}>{configurationLabelOf(row)}</span>,
    },
    {
      key: 'flags',
      label: 'Flags',
      width: '280px',
      mobile: false,
      render: (row) => (
        <FlagChips row={row} canEdit={canEdit} busy={isBusy(row)} onToggle={onToggleFlag} />
      ),
    },
    {
      key: 'seoScore',
      label: 'SEO',
      sortable: true,
      width: '132px',
      mobile: false,
      render: (row) => <SeoScoreChip seo={row.seo} />,
    },
    {
      key: 'viewCount',
      label: 'Views / Enquiries',
      align: 'right',
      sortable: true,
      width: '132px',
      mobile: false,
      render: (row) => (
        <span className={styles.counts}>
          <span title="Views">{formatNumber(row.viewCount ?? 0)}</span>
          <span className={styles.countsSeparator} aria-hidden="true">
            /
          </span>
          <span title="Enquiries">{formatNumber(row.enquiryCount ?? 0)}</span>
        </span>
      ),
    },
    {
      key: 'priorityOrder',
      label: 'Priority',
      align: 'right',
      sortable: true,
      width: '96px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => formatNumber(row.priorityOrder ?? 0),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      hideBelow: 'lg',
      mobile: false,
      render: (row) => formatDate(row.updatedAt),
    },
  ];
}

/**
 * One row as a card, for the phone layout (§8.1).
 *
 * The kebab beside it is `DataTable`'s own, built from the same row actions as
 * the table, so a card can do everything a row can.
 *
 * @param {object} row
 * @param {{canEdit?: boolean, busyIds?: Array<string>, onToggleFlag?: Function}} [options]
 * @returns {React.ReactNode}
 */
export function renderPropertyCard(row, { canEdit = false, busyIds = [], onToggleFlag } = {}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <Cover row={row} />
        <div className={styles.cardHeading}>
          <Link className={styles.title} to={PATHS.adminPropertyEdit(row.id)}>
            {row.title}
          </Link>
          <span className={styles.meta}>
            {joinMeta([localityNameOf(row), row.propertyType?.name]) || row.slug}
          </span>
          <span className={styles.price}>{priceLabelOf(row)}</span>
        </div>
      </div>
      <FlagChips
        row={row}
        canEdit={canEdit}
        busy={busyIds.includes(String(row?.id))}
        onToggle={onToggleFlag}
      />
    </div>
  );
}

/**
 * The export's columns, in the order §4 of prompt 22 lists them (D44).
 *
 * Money, areas and counts are written as bare numbers so the spreadsheet can
 * add them up; the labels are the ones the admin reads on screen.
 */
export const PROPERTY_CSV_COLUMNS = [
  { label: 'ID', value: (row) => row.id },
  { label: 'Title', value: (row) => row.title },
  { label: 'Slug', value: (row) => row.slug },
  { label: 'Listing type', value: (row) => LISTING_TYPES.labelOf(row.listingType) },
  { label: 'Segment', value: (row) => row.segment },
  { label: 'Property type', value: (row) => row.propertyType?.name ?? '' },
  { label: 'Status', value: (row) => CONSTRUCTION_STATUS.labelOf(row.constructionStatus) },
  { label: 'Availability', value: (row) => AVAILABILITY.labelOf(row.availability) },
  { label: 'Locality', value: localityNameOf },
  { label: 'City', value: cityNameOf },
  {
    label: 'Price',
    value: (row) => row.pricing?.price ?? (row.pricing?.priceOnRequest ? 'On request' : ''),
  },
  { label: 'Rent', value: (row) => row.pricing?.rentPerMonth ?? '' },
  { label: 'Bedrooms', value: (row) => row.configuration?.bedrooms ?? '' },
  { label: 'Super built-up area', value: (row) => row.area?.superBuiltUpArea ?? '' },
  { label: 'Carpet area', value: (row) => row.area?.carpetArea ?? '' },
  { label: 'Area unit', value: areaUnitLabelOf },
  { label: 'Developer', value: developerNameOf },
  { label: 'Active', value: (row) => row.isActive === true },
  { label: 'Featured', value: (row) => row.isFeatured === true },
  { label: 'Verified', value: (row) => row.isVerified === true },
  { label: 'SEO score', value: (row) => (Number.isFinite(row.seo?.score) ? row.seo.score : '') },
  { label: 'Views', value: (row) => row.viewCount ?? 0 },
  { label: 'Enquiries', value: (row) => row.enquiryCount ?? 0 },
  {
    label: 'Published at',
    value: (row) => (row.publishedAt ? formatDateTime(row.publishedAt) : ''),
  },
  { label: 'Updated at', value: (row) => (row.updatedAt ? formatDateTime(row.updatedAt) : '') },
];
