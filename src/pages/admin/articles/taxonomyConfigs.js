import { Icon } from '@iconify/react';

import Alert from '../../../components/ui/Alert';
import Avatar from '../../../components/ui/Avatar';
import {
  adminCrud,
  articleCategories,
  articleTags,
  authors,
} from '../../../services/masterDataService';
import { formatDate, formatNumber } from '../../../utils/format';
import { schemas } from '../../../services/schemas';

import styles from './taxonomyConfigs.module.css';

/**
 * The three collections an article is classified by, as `MasterDataPage`
 * configurations: categories, tags and authors (00_MASTER_CONTEXT.md §6.8).
 *
 * They differ from the property master data in one way that matters: the count
 * beside each row is the number of **published** articles pointing at it, which
 * is the number that decides whether a delete is refused (D88). A category with
 * four articles cannot be removed until they have been moved, and the guard
 * dialog lists them.
 *
 * They are functions rather than constants so that a page can hand in what only
 * it knows, and every page memoises the call — a configuration rebuilt on every
 * render would reset the dialog mid-edit.
 */

const categoryService = adminCrud(articleCategories);
const tagService = adminCrud(articleTags);
const authorService = adminCrud(authors);

/**
 * `''` for an optional box is not a value the API can store: §6.8 types an
 * author's `email` as an e-mail and `avatarUrl` as a URL, and the empty string
 * is neither. An absent answer is `null` (NEW-31).
 */
const blankToNull = (value) => {
  const text = typeof value === 'string' ? value.trim() : value;
  return text === '' || text === undefined ? null : text;
};

/** A name with a quieter second line under it. */
const NameCell = ({ name, hint }) => (
  <span className={styles.nameCell}>
    <span className={styles.name}>{name}</span>
    {hint ? <span className={styles.hint}>{hint}</span> : null}
  </span>
);

/** "4 articles" — the count the delete guard is decided on. */
const countColumn = (label = 'Articles') => ({
  key: 'articleCount',
  label,
  sortable: true,
  align: 'right',
  width: '110px',
  mobile: true,
  render: (row) => formatNumber(row.articleCount ?? 0),
});

const updatedColumn = {
  key: 'updatedAt',
  label: 'Updated',
  width: '130px',
  hideBelow: 'lg',
  mobile: false,
  render: (row) => formatDate(row.updatedAt),
};

const statusFilter = {
  key: 'isActive',
  type: 'toggle',
  label: 'Status',
  trueLabel: 'Active',
  falseLabel: 'Inactive',
  placeholder: 'Any status',
};

/** Activate / deactivate / delete, with the sentence the confirm needs. */
const bulkActions = (plural) => [
  { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
  { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: `Delete the selected ${plural}?`,
      message: `{count} will be deleted. One an article still points at is refused. This cannot be undone.`,
    },
  },
];

/** The placeholder the full SEO panel replaces (D87). */
const seoPlaceholder = (what) => (
  <Alert
    tone="info"
    title="Search appearance"
    icon={<Icon icon="mdi:magnify" width="20" height="20" />}
  >
    The SEO panel for {what} arrives in a later step. Until then the title and description of the
    page are generated from the name above, and everything this record already holds — the keywords,
    the canonical, the social cards — travels through every save untouched.
  </Alert>
);

/**
 * `PUT` replaces the record (§5.8) and these forms do not edit `seo`; sending
 * the stored object back is what keeps the panel's work out of harm's way.
 */
const carrySeo = (values, record) => ({
  ...values,
  ...(record?.seo ? { seo: record.seo } : {}),
});

/* ------------------------------------------------------------------ *
 * Categories (§6.8, D76)
 * ------------------------------------------------------------------ */

/**
 * Admin → Articles → Categories (`/admin/articles/categories`).
 *
 * A category is a section of the insights archive with a URL and a landing page
 * of its own, so it carries an order (the archive's own navigation reads it), a
 * description (the landing page prints it) and an SEO branch.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const categoriesConfig = ({ onMutated } = {}) => ({
  key: 'articleCategories',
  title: 'Article categories',
  subtitle: 'The sections of the insights archive. Every article belongs to exactly one.',
  singular: 'category',
  service: categoryService,
  onMutated,
  schema: schemas['articleCategory.update'],
  createSchema: schemas['articleCategory.create'],
  slugBase: '/insights/articles/category/',
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,
  reorderHint:
    'Sorted by Order the table becomes this list. Drag a row, or focus it and press Alt + ↑ / ↓, to change the order the archive lists the categories in.',

  columns: [
    {
      key: 'order',
      label: 'Order',
      sortable: true,
      align: 'right',
      width: '96px',
      mobile: false,
      hideBelow: 'md',
      render: (row) => (
        <span className={styles.orderCell}>
          <Icon icon="mdi:drag-vertical" width="16" height="16" aria-hidden="true" />
          {row.order ?? 0}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => (
        <NameCell name={row.name} hint={`/insights/articles/category/${row.slug}`} />
      ),
    },
    {
      key: 'description',
      label: 'Description',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => <span className={styles.clamp}>{row.description || '—'}</span>,
    },
    countColumn(),
    updatedColumn,
  ],

  filters: [
    { key: 'q', type: 'search', label: 'Search', placeholder: 'Category name' },
    statusFilter,
  ],

  bulkActions: bulkActions('categories'),

  formFields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      half: true,
      hint: 'Title case, two to four words — "Market Trends".',
    },
    { name: 'slug', type: 'slug', label: 'URL', source: 'name', half: true },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      hint: 'Up to 500 characters, printed under the heading of the category archive.',
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      min: 0,
      half: true,
      hint: 'Lowest first, in the archive’s own navigation.',
    },
    { name: 'isActive', type: 'switch', label: 'Active', half: true },
  ],

  formFooter: seoPlaceholder('article categories'),

  newValues: { order: 0, isActive: true, description: null },

  toFormValues: (record) => ({
    name: record.name ?? '',
    slug: record.slug ?? '',
    description: record.description ?? null,
    order: record.order ?? 0,
    isActive: record.isActive !== false,
  }),

  toPayload: (values, record) =>
    carrySeo({ ...values, description: blankToNull(values.description) }, record),

  emptyState: {
    title: 'No categories yet',
    text: 'Buying guides, market trends, legal and finance are the four the archive starts with.',
  },
});

/* ------------------------------------------------------------------ *
 * Tags (§6.8)
 * ------------------------------------------------------------------ */

/**
 * Admin → Articles → Tags (`/admin/articles/tags`).
 *
 * A tag is a name and a URL, which is why it has no form of its own worth
 * speaking of and why the article form can create one inline. This screen is
 * where they are renamed, merged by hand and removed once nothing uses them.
 *
 * There is no "active" flag in §6.8 and so no toggle here: a tag nothing points
 * at shows a count of zero and can simply be deleted.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const tagsConfig = ({ onMutated } = {}) => ({
  key: 'articleTags',
  title: 'Article tags',
  subtitle: 'The cross-cutting labels — khata, RERA, home loan. An article may carry several.',
  singular: 'tag',
  service: tagService,
  onMutated,
  schema: schemas['articleTag.update'],
  createSchema: schemas['articleTag.create'],
  slugBase: '/insights/articles/tag/',
  defaultSort: { field: 'name', order: 'asc' },
  activeToggle: false,
  usageGuard: true,

  columns: [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => <NameCell name={row.name} hint={`/insights/articles/tag/${row.slug}`} />,
    },
    countColumn(),
    updatedColumn,
  ],

  filters: [{ key: 'q', type: 'search', label: 'Search', placeholder: 'Tag name' }],

  bulkActions: [
    {
      key: 'delete',
      label: 'Delete',
      icon: 'mdi:delete-outline',
      danger: true,
      confirm: {
        title: 'Delete the selected tags?',
        message:
          '{count} will be deleted. A tag an article still carries is refused. This cannot be undone.',
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      half: true,
      hint: 'Lower case, one idea — "stamp duty", not "Stamp Duty & Registration".',
    },
    { name: 'slug', type: 'slug', label: 'URL', source: 'name', half: true },
  ],

  toFormValues: (record) => ({ name: record.name ?? '', slug: record.slug ?? '' }),

  emptyState: {
    title: 'No tags yet',
    text: 'Tags are usually created from the article form as they are needed.',
  },
});

/* ------------------------------------------------------------------ *
 * Authors (§6.8)
 * ------------------------------------------------------------------ */

/**
 * Admin → Articles → Authors (`/admin/articles/authors`).
 *
 * An author is a public page (`/insights/authors/:slug`) with a photograph, a
 * biography and the articles they have written, which is why the biography is
 * the compact editor and not a textarea — it is prose that will be rendered
 * through `SafeHtml`.
 *
 * **The e-mail is private.** §5.10 strips `authors[].email` from every public
 * response; it is here so an editor can reach the desk, and the hint says so.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const authorsConfig = ({ onMutated } = {}) => ({
  key: 'authors',
  title: 'Authors',
  subtitle: 'Who signs an article, and the page a reader lands on when they click the byline.',
  singular: 'author',
  service: authorService,
  onMutated,
  schema: schemas['author.update'],
  createSchema: schemas['author.create'],
  slugBase: '/insights/authors/',
  defaultSort: { field: 'name', order: 'asc' },
  activeToggle: true,
  usageGuard: true,

  columns: [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => (
        <span className={styles.authorCell}>
          <Avatar src={row.avatarUrl} name={row.name} size={32} />
          <NameCell name={row.name} hint={row.designation || `/insights/authors/${row.slug}`} />
        </span>
      ),
    },
    {
      key: 'email',
      label: 'E-mail',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => <span className={styles.hint}>{row.email || '—'}</span>,
    },
    countColumn(),
    updatedColumn,
  ],

  filters: [
    { key: 'q', type: 'search', label: 'Search', placeholder: 'Name or designation' },
    statusFilter,
  ],

  bulkActions: bulkActions('authors'),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, half: true },
    { name: 'slug', type: 'slug', label: 'URL', source: 'name', half: true },
    {
      name: 'designation',
      type: 'text',
      label: 'Designation',
      half: true,
      hint: 'The role printed under the byline — "Research desk".',
    },
    {
      name: 'email',
      type: 'email',
      label: 'E-mail',
      half: true,
      hint: 'Never published. It is here so the desk can be reached internally.',
    },
    { name: 'avatarUrl', type: 'image', label: 'Photograph', hint: 'avatar' },
    {
      name: 'bio',
      type: 'richtext',
      label: 'Biography',
      hint: 'A paragraph or two: what they cover and what qualifies them to.',
    },
    { name: 'socialLinks.linkedin', type: 'url', label: 'LinkedIn', half: true },
    { name: 'socialLinks.twitter', type: 'url', label: 'X (Twitter)', half: true },
    { name: 'socialLinks.website', type: 'url', label: 'Website', half: true },
    { name: 'isActive', type: 'switch', label: 'Active', half: true },
  ],

  formFooter: seoPlaceholder('authors'),

  newValues: { socialLinks: {}, isActive: true },

  // The three social boxes are one `socialLinks` object on the record and the
  // form edits them by dotted path; `pickFields` cannot read those, so the
  // values a record opens with are assembled here.
  toFormValues: (record) => ({
    name: record.name ?? '',
    slug: record.slug ?? '',
    designation: record.designation ?? null,
    email: record.email ?? null,
    avatarUrl: record.avatarUrl ?? null,
    bio: record.bio ?? '',
    socialLinks: {
      linkedin: record.socialLinks?.linkedin ?? null,
      twitter: record.socialLinks?.twitter ?? null,
      website: record.socialLinks?.website ?? null,
    },
    isActive: record.isActive !== false,
  }),

  /**
   * `PUT` replaces the record (§5.8), so the body is the whole of it: the two
   * networks this form does not offer travel through untouched, the boxes that
   * were emptied become `null`, and the dotted spellings a blank record starts
   * with are dropped in favour of the object they belong to.
   */
  toPayload: (values, record) => {
    const body = Object.fromEntries(Object.entries(values).filter(([key]) => !key.includes('.')));

    return carrySeo(
      {
        ...body,
        ...Object.fromEntries(
          ['designation', 'email', 'avatarUrl'].map((field) => [field, blankToNull(values[field])])
        ),
        socialLinks: {
          ...(record?.socialLinks ?? {}),
          ...(values.socialLinks ?? {}),
        },
      },
      record
    );
  },

  emptyState: {
    title: 'No authors yet',
    text: 'Every article needs a byline. "Editorial Team" is a perfectly good first one.',
  },
});
