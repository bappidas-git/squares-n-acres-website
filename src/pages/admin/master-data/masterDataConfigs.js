import { Icon } from '@iconify/react';

import Alert from '../../../components/ui/Alert';
import Chip from '../../../components/ui/Chip';
import LazyImage from '../../../components/ui/LazyImage';
import { AMENITY_CATEGORIES, BADGE_TONES, SEGMENTS } from '../../../config/enums';
import { ICON_ID_PATTERN } from '../../../utils/validation';
import {
  adminCrud,
  amenities,
  badges,
  banks,
  propertyTypes,
} from '../../../services/masterDataService';
import { formatNumber } from '../../../utils/format';
import { schemas } from '../../../services/schemas';
import { toneStyles } from '../../../components/ui/tones';

import styles from './masterDataConfigs.module.css';

/**
 * The four master-data collections of prompt 15 as `MasterDataPage`
 * configurations: property types, amenities, badges and banks
 * (00_MASTER_CONTEXT.md §6.3, §6.4, §6.6).
 *
 * They are functions rather than constants because each screen hands in its
 * own `onMutated` — `MasterDataContext.refresh`, so a badge created here shows
 * up on `/properties` in the same session (D93) — and because a configuration
 * that is rebuilt on every render would reset the dialog's form mid-edit.
 * Every page memoises the call.
 *
 *   const config = useMemo(() => badgesConfig({ onMutated: refresh }), [refresh]);
 *
 * What the four have in common lives at the top of this file; what makes each
 * of them itself is the configuration below it, read top to bottom.
 */

const propertyTypeService = adminCrud(propertyTypes);
const amenityService = adminCrud(amenities);
const badgeService = adminCrud(badges);
const bankService = adminCrud(banks);

/** Each segment gets its own tone so a long list reads at a glance. */
const SEGMENT_TONE = { residential: 'info', commercial: 'primary', land: 'success' };

/** The plural of each usage type a pre-save warning can name. */
const USAGE_NOUNS = {
  property: ['property', 'properties'],
  faq: ['FAQ', 'FAQs'],
  lead: ['lead', 'leads'],
};

/**
 * "Used by 12 properties and 1 FAQ" — the sentence a 409 would have sent, said
 * before the write instead of after it.
 *
 * @param {Array<{type: string}>} usedBy
 * @returns {string} empty when nothing points at the record
 */
export function usedBySentence(usedBy = []) {
  const counts = new Map();
  for (const usage of usedBy) counts.set(usage.type, (counts.get(usage.type) ?? 0) + 1);

  const parts = [...counts].map(([type, count]) => {
    const [one, many] = USAGE_NOUNS[type] ?? [type, `${type}s`];
    return `${count} ${count === 1 ? one : many}`;
  });

  if (parts.length === 0) return '';
  if (parts.length === 1) return `Used by ${parts[0]}`;
  return `Used by ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The icon of a row — or a muted placeholder, because an id Iconify cannot
 * resolve renders as nothing at all and an empty cell says the wrong thing.
 */
const IconCell = ({ icon }) => (
  <span className={styles.icon} aria-hidden="true">
    <Icon
      icon={ICON_ID_PATTERN.test(String(icon ?? '')) ? icon : 'mdi:help-rhombus-outline'}
      width="22"
      height="22"
      className={ICON_ID_PATTERN.test(String(icon ?? '')) ? undefined : styles.iconUnknown}
    />
  </span>
);

/** A badge's tone, painted from the tokens the chip itself uses (§2.4). */
const ToneSwatch = ({ tone }) => {
  const palette = toneStyles(BADGE_TONES.values.includes(tone) ? tone : 'neutral');

  return (
    <span
      className={styles.swatch}
      style={{ background: palette.background, borderColor: palette.border, color: palette.color }}
    >
      <span
        className={styles.swatchDot}
        style={{ background: palette.border }}
        aria-hidden="true"
      />
      {BADGE_TONES.labelOf(tone) || 'Neutral'}
    </span>
  );
};

/** A name with its slug or category underneath it. */
const NameCell = ({ name, hint }) => (
  <span className={styles.nameCell}>
    <span className={styles.name}>{name}</span>
    {hint ? <span className={styles.hint}>{hint}</span> : null}
  </span>
);

/** The `Active` / `Order` half of every form below. */
const STATE_FIELDS = [
  { name: 'order', type: 'number', label: 'Order', min: 0, half: true, hint: 'Lowest first.' },
  { name: 'isActive', type: 'switch', label: 'Active', half: true },
];

/** The two filters every one of the four screens offers. */
const statusFilter = {
  key: 'isActive',
  type: 'toggle',
  label: 'Status',
  trueLabel: 'Active',
  falseLabel: 'Inactive',
  placeholder: 'Any status',
};

const searchFilter = { key: 'q', type: 'search', label: 'Search', placeholder: 'Name' };

/** Activate / deactivate / delete, with the sentence the confirm needs. */
const bulkActions = (plural, guarded = true) => [
  { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
  { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: `Delete the selected ${plural}?`,
      message: guarded
        ? `{count} will be deleted. One a property still points at is refused. This cannot be undone.`
        : `{count} will be deleted. This cannot be undone.`,
    },
  },
];

/**
 * The icon rule, as a `useForm` extra: the schema knows the field is a string,
 * only this knows it has to be an Iconify MDI id (§3.1).
 *
 * @param {boolean} required
 */
const iconRule = (required) => (values) => {
  const icon = String(values.icon ?? '').trim();
  if (!icon) return required ? { icon: 'Choose an icon.' } : {};
  if (ICON_ID_PATTERN.test(icon)) return {};
  return { icon: 'Use an Iconify MDI id in lower case, like mdi:home-city-outline.' };
};

/* ------------------------------------------------------------------ *
 * Property types (§6.3, D25)
 * ------------------------------------------------------------------ */

/**
 * Admin → Master data → Property types.
 *
 * The slug is the **plural URL form** (D25): it is the segment of `/buy/:slug`,
 * `/rent/:slug` and `/commercial/:slug`, so renaming one moves a public page.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const propertyTypesConfig = ({ onMutated } = {}) => ({
  key: 'propertyTypes',
  title: 'Property types',
  subtitle: 'Shown in the search filters, on every card and in the property form.',
  singular: 'property type',
  service: propertyTypeService,
  onMutated,
  schema: schemas['propertyType.update'],
  createSchema: schemas['propertyType.create'],
  slugBase: '/buy/',
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,

  columns: [
    {
      key: 'icon',
      label: 'Icon',
      width: '72px',
      align: 'center',
      mobile: false,
      hideBelow: 'md',
      render: (row) => <IconCell icon={row.icon} />,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => <NameCell name={row.name} hint={`/buy/${row.slug}`} />,
    },
    {
      key: 'segment',
      label: 'Segment',
      mobile: true,
      render: (row) => (
        <Chip tone={SEGMENT_TONE[row.segment] ?? 'neutral'}>{SEGMENTS.labelOf(row.segment)}</Chip>
      ),
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
      key: 'order',
      label: 'Order',
      sortable: true,
      align: 'right',
      width: '90px',
      mobile: false,
      hideBelow: 'lg',
      render: (row) => formatNumber(row.order ?? 0),
    },
  ],

  filters: [
    searchFilter,
    {
      key: 'segment',
      type: 'select',
      label: 'Segment',
      placeholder: 'All segments',
      options: SEGMENTS.options,
    },
    statusFilter,
  ],

  bulkActions: bulkActions('property types'),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, hint: 'Plural, e.g. "Villas".' },
    { name: 'slug', type: 'slug', label: 'URL', source: 'name' },
    {
      name: 'segment',
      type: 'select',
      label: 'Segment',
      required: true,
      options: SEGMENTS.options,
    },
    { name: 'icon', type: 'icon', label: 'Icon', required: true },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      hint: 'Up to 500 characters, shown on the type’s landing page.',
    },
    ...STATE_FIELDS,
  ],

  formFooter: (
    <Alert tone="info" title="Search appearance">
      The SEO panel for property types arrives in prompt 36. Until then the title and description
      the type’s landing page uses are generated from its name.
    </Alert>
  ),

  newValues: { segment: 'residential', order: 0, isActive: true },

  validate: iconRule(true),

  // `PUT` replaces the record (§5.8) and this form does not edit `seo`; sending
  // the stored object back is what keeps prompt 36's panel out of harm's way.
  toPayload: (values, record) => ({ ...values, ...(record?.seo ? { seo: record.seo } : {}) }),

  /**
   * Moving a type to another segment is allowed, but the listings that already
   * carry it keep their own `segment` (§6.1) — so the ones on screen now would
   * stop matching their type. That is worth a sentence before the save (D88).
   */
  confirmSave: async (values, record) => {
    if (!record?.id || values.segment === record.segment) return null;

    const { data } = await propertyTypeService.get(record.id, { params: { withUsage: true } });
    const usedBy = data?.usedBy ?? [];
    if (usedBy.length === 0) return null;

    return {
      heading: 'Change the segment?',
      title: record.name,
      confirmLabel: 'Change segment',
      message: `“${record.name}” moves from ${SEGMENTS.labelOf(record.segment)} to ${SEGMENTS.labelOf(
        values.segment
      )}. ${usedBySentence(usedBy)} — each keeps its own segment, so any that should move have to be edited too.`,
      hint: '',
      usedBy,
    };
  },

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <IconCell icon={row.icon} />
      <span className={styles.name}>{row.name}</span>
      <span className={styles.hint}>
        {SEGMENTS.labelOf(row.segment)} · {formatNumber(row.propertyCount ?? 0)}{' '}
        {row.propertyCount === 1 ? 'property' : 'properties'}
      </span>
    </span>
  ),

  emptyState: {
    title: 'No property types yet',
    text: 'Add the kinds of property you list — they drive the URLs, the filters and the forms.',
  },
});

/* ------------------------------------------------------------------ *
 * Amenities (§6.4)
 * ------------------------------------------------------------------ */

/**
 * Admin → Master data → Amenities.
 *
 * Sorted by category — the default — the table carries a heading row per
 * category, which is how the property form and the details page group them
 * too. Sorting by `Order` turns it into the drag list; filtering to one
 * category first is how an editor reorders inside that category.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const amenitiesConfig = ({ onMutated } = {}) => ({
  key: 'amenities',
  title: 'Amenities',
  subtitle: 'Shown in the search filters, on the property form and on every listing page.',
  singular: 'amenity',
  service: amenityService,
  onMutated,
  schema: schemas['amenity.update'],
  createSchema: schemas['amenity.create'],
  slugBase: '',
  defaultSort: { field: 'category', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,

  groupSort: 'category',
  groupBy: (row) => ({
    key: row.category ?? 'other',
    label: AMENITY_CATEGORIES.labelOf(row.category) || 'Uncategorised',
  }),

  reorderHint:
    'Drag a row, or focus it and press Alt + ↑ / ↓, to change the order they appear in. Filter to one category first to reorder inside it; sort by anything else to go back to the table.',

  columns: [
    {
      key: 'icon',
      label: 'Icon',
      width: '72px',
      align: 'center',
      mobile: false,
      hideBelow: 'md',
      render: (row) => <IconCell icon={row.icon} />,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => <NameCell name={row.name} hint={row.slug} />,
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      mobile: true,
      render: (row) => <Chip tone="neutral">{AMENITY_CATEGORIES.labelOf(row.category)}</Chip>,
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
      key: 'order',
      label: 'Order',
      sortable: true,
      align: 'right',
      width: '90px',
      mobile: false,
      hideBelow: 'lg',
      render: (row) => formatNumber(row.order ?? 0),
    },
  ],

  filters: [
    searchFilter,
    {
      key: 'category',
      type: 'select',
      label: 'Category',
      placeholder: 'All categories',
      options: AMENITY_CATEGORIES.options,
    },
    statusFilter,
  ],

  bulkActions: bulkActions('amenities'),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'slug', type: 'slug', label: 'Slug', source: 'name' },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      options: AMENITY_CATEGORIES.options,
      hint: 'The block this amenity appears in on a listing page.',
    },
    { name: 'icon', type: 'icon', label: 'Icon', required: true },
    ...STATE_FIELDS,
  ],

  newValues: { category: 'basic', order: 0, isActive: true },

  validate: iconRule(true),

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <IconCell icon={row.icon} />
      <span className={styles.name}>{row.name}</span>
      <span className={styles.hint}>{AMENITY_CATEGORIES.labelOf(row.category)}</span>
    </span>
  ),

  emptyState: {
    title: 'No amenities yet',
    text: 'Add what a project can offer — the property form ticks these, the filters search them.',
  },
});

/* ------------------------------------------------------------------ *
 * Badges (§6.4)
 * ------------------------------------------------------------------ */

/**
 * Admin → Master data → Badges.
 *
 * A badge stores a **tone name**, never a hex value (§2.4): the swatch here and
 * the chip on a card are painted from the same token, so the two can never
 * drift apart.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const badgesConfig = ({ onMutated } = {}) => ({
  key: 'badges',
  title: 'Badges',
  subtitle: 'Shown on property cards and at the top of every listing page.',
  singular: 'badge',
  service: badgeService,
  onMutated,
  schema: schemas['badge.update'],
  createSchema: schemas['badge.create'],
  slugBase: '',
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,

  columns: [
    {
      key: 'color',
      label: 'Swatch',
      width: '130px',
      mobile: false,
      hideBelow: 'md',
      render: (row) => <ToneSwatch tone={row.color} />,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      // The cell is the badge itself: what a card will show, in its own tone.
      render: (row) => (
        <Chip
          tone={BADGE_TONES.values.includes(row.color) ? row.color : 'neutral'}
          icon={row.icon ? <Icon icon={row.icon} width="14" height="14" /> : null}
        >
          {row.name}
        </Chip>
      ),
    },
    { key: 'slug', label: 'Slug', hideBelow: 'md', mobile: false },
    {
      key: 'icon',
      label: 'Icon',
      hideBelow: 'md',
      mobile: false,
      render: (row) => (row.icon ? <NameCell name={row.icon} /> : '—'),
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
      key: 'order',
      label: 'Order',
      sortable: true,
      align: 'right',
      width: '90px',
      mobile: false,
      hideBelow: 'lg',
      render: (row) => formatNumber(row.order ?? 0),
    },
  ],

  filters: [searchFilter, statusFilter],

  bulkActions: bulkActions('badges'),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, half: true },
    { name: 'slug', type: 'slug', label: 'Slug', source: 'name', half: true },
    { name: 'color', type: 'tone', label: 'Colour', required: true },
    { name: 'icon', type: 'icon', label: 'Icon', hint: 'Optional — an Iconify MDI id.' },
    ...STATE_FIELDS,
  ],

  newValues: { color: 'primary', icon: null, order: 0, isActive: true },

  validate: iconRule(false),

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <Chip
        tone={BADGE_TONES.values.includes(row.color) ? row.color : 'neutral'}
        icon={row.icon ? <Icon icon={row.icon} width="14" height="14" /> : null}
      >
        {row.name}
      </Chip>
      <span className={styles.hint}>
        {formatNumber(row.propertyCount ?? 0)} {row.propertyCount === 1 ? 'property' : 'properties'}
      </span>
    </span>
  ),

  emptyState: {
    title: 'No badges yet',
    text: 'Add the labels a listing can carry — "New Launch", "Price Drop", "RERA Approved".',
  },
});

/* ------------------------------------------------------------------ *
 * Banks (§6.6)
 * ------------------------------------------------------------------ */

/** A finite number, or `null` for a box that is simply empty. */
const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** "8.35% – 8.95%", or the single rate when the two are the same. */
const rateRange = (row) => {
  const min = Number(row.interestRateMin);
  const max = Number(row.interestRateMax);
  if (!Number.isFinite(min)) return '—';
  const low = `${formatNumber(min, { maximumFractionDigits: 2 })}%`;
  if (!Number.isFinite(max) || max === min) return low;
  return `${low} – ${formatNumber(max, { maximumFractionDigits: 2 })}%`;
};

/**
 * Admin → Master data → Banks.
 *
 * Nothing points at a bank — it is the reference table behind the EMI
 * calculator and the finance section — so there is no delete guard, and an
 * empty list hides the finance section rather than falling back to invented
 * lenders (§6.6).
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const banksConfig = ({ onMutated } = {}) => ({
  key: 'banks',
  title: 'Banks',
  subtitle: 'Shown in the finance section of a listing and behind the EMI calculator.',
  singular: 'bank',
  service: bankService,
  onMutated,
  schema: schemas['bank.update'],
  createSchema: schemas['bank.create'],
  slugBase: '',
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  // A bank is referenced by nothing, so a delete can never strand a record.
  usageGuard: false,

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
          ratio="5/2"
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
      render: (row) => <NameCell name={row.name} hint={row.processingFeeNote} />,
    },
    {
      key: 'interestRateMin',
      label: 'Rate',
      sortable: true,
      align: 'right',
      width: '140px',
      mobile: true,
      render: rateRange,
    },
    {
      key: 'maxTenureYears',
      label: 'Max tenure',
      align: 'right',
      width: '120px',
      hideBelow: 'md',
      render: (row) => (row.maxTenureYears ? `${formatNumber(row.maxTenureYears)} yrs` : '—'),
    },
    {
      key: 'maxLtvPercent',
      label: 'Max LTV',
      align: 'right',
      width: '110px',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => (row.maxLtvPercent ? `${formatNumber(row.maxLtvPercent)}%` : '—'),
    },
    {
      key: 'order',
      label: 'Order',
      sortable: true,
      align: 'right',
      width: '90px',
      mobile: false,
      hideBelow: 'lg',
      render: (row) => formatNumber(row.order ?? 0),
    },
  ],

  filters: [searchFilter, statusFilter],

  bulkActions: bulkActions('banks', false),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, half: true },
    { name: 'slug', type: 'slug', label: 'Slug', source: 'name', half: true },
    { name: 'logoUrl', type: 'image', label: 'Logo', hint: 'logo' },
    {
      name: 'interestRateMin',
      type: 'number',
      label: 'Interest rate from (% p.a.)',
      required: true,
      min: 5,
      max: 20,
      step: 0.05,
      half: true,
    },
    {
      name: 'interestRateMax',
      type: 'number',
      label: 'Interest rate up to (% p.a.)',
      required: true,
      min: 5,
      max: 20,
      step: 0.05,
      half: true,
    },
    {
      name: 'processingFeeNote',
      type: 'text',
      label: 'Processing fee',
      hint: 'A short note, e.g. “0.35% of the loan, minimum ₹10,000 — indicative”.',
    },
    {
      name: 'maxTenureYears',
      type: 'number',
      label: 'Maximum tenure (years)',
      required: true,
      min: 5,
      max: 40,
      half: true,
    },
    {
      name: 'maxLtvPercent',
      type: 'number',
      label: 'Maximum funding (% of value)',
      required: true,
      min: 50,
      max: 95,
      half: true,
    },
    { name: 'minLoanAmount', type: 'number', label: 'Minimum loan (₹)', min: 0, half: true },
    { name: 'maxLoanAmount', type: 'number', label: 'Maximum loan (₹)', min: 0, half: true },
    {
      name: 'features',
      type: 'tags',
      label: 'Features',
      placeholder: 'Type a feature and press Enter',
      hint: 'One line each — what this lender offers a buyer.',
      onCreate: (label) => {
        const text = String(label ?? '').trim();
        return text ? { value: text, label: text } : undefined;
      },
    },
    { name: 'applyUrl', type: 'url', label: 'Apply link' },
    ...STATE_FIELDS,
  ],

  newValues: {
    interestRateMin: null,
    interestRateMax: null,
    maxTenureYears: 20,
    maxLtvPercent: 80,
    order: 0,
    isActive: true,
  },

  /**
   * A range that runs backwards is a typo, and the server has no opinion about
   * it. A range with an end missing is not backwards — it is incomplete, which
   * is the schema's `required` to report, not this rule's.
   */
  validate: (values) => {
    const errors = {};
    const min = toNumber(values.interestRateMin);
    const max = toNumber(values.interestRateMax);

    if (min !== null && max !== null && max < min) {
      errors.interestRateMax = 'The highest rate cannot be below the lowest one.';
    }

    const low = toNumber(values.minLoanAmount);
    const high = toNumber(values.maxLoanAmount);
    if (low !== null && high !== null && high < low) {
      errors.maxLoanAmount = 'The largest loan cannot be below the smallest one.';
    }

    return errors;
  },

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <span className={styles.name}>{row.name}</span>
      <span className={styles.hint}>
        {rateRange(row)} · up to {formatNumber(row.maxLtvPercent ?? 0)}%
      </span>
    </span>
  ),

  emptyState: {
    title: 'No banks yet',
    text: 'Add the lenders to show on a listing. With none active the finance section stays hidden.',
  },
});
