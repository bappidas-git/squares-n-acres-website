import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import Switch from '@mui/material/Switch';

import Alert from '../../../components/ui/Alert';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import LazyImage from '../../../components/ui/LazyImage';
import PATHS from '../../../routes/paths';
import Rating from '../../../components/ui/Rating';
import propertyService from '../../../services/propertyService';
import userService from '../../../services/userService';
import { FAQ_CATEGORIES, PARTNER_CATEGORIES } from '../../../config/enums';
import {
  adminCrud,
  faqs,
  partners,
  propertyTypes,
  team,
  testimonials,
} from '../../../services/masterDataService';
import { FORMS } from '../../../config/adminCopy';
import { formatDate, formatNumber } from '../../../utils/format';
import { schemas } from '../../../services/schemas';

import styles from './contentConfigs.module.css';

/**
 * The four content collections of prompt 17 as `MasterDataPage`
 * configurations: FAQs, testimonials, team members and partners
 * (00_MASTER_CONTEXT.md §6.9).
 *
 * They are functions rather than constants for the same reason the master-data
 * ones are: each screen hands in what only it knows — the property types a FAQ
 * can be tied to, the refresh its writes invalidate — and a configuration
 * rebuilt on every render would reset the dialog mid-edit. Every page memoises
 * the call.
 *
 * All four are `orderable`: sorted by `Order` the table becomes a drag list,
 * and a move is one `PATCH { order }` on the row that travelled — correct
 * under a filter, because the API settles the rest of the collection (§5.8).
 */

const faqService = adminCrud(faqs);
const testimonialService = adminCrud(testimonials);
const teamService = adminCrud(team);
const partnerService = adminCrud(partners);

/* ------------------------------------------------------------------ *
 * Shared pieces
 * ------------------------------------------------------------------ */

/** Elements whose content is markup rather than prose. */
const NON_PROSE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** The five predefined entities plus the ones an editor produces routinely. */
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
};

/**
 * The plain text of an HTML fragment — what a table cell previews and what the
 * "long enough to be an answer" rule measures.
 *
 * Deliberately shallow: the input is HTML the editor produced, not markup from
 * the web, and no parser may be added (§3.3). The public side renders the same
 * HTML through `SafeHtml`.
 *
 * @param {string} html
 * @returns {string} single-spaced and trimmed; `''` for anything but a string
 */
export function stripHtml(html) {
  if (typeof html !== 'string' || html === '') return '';

  return html
    .replace(NON_PROSE_RE, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * `''` for an optional box is not a value the API can store: §6.9 types
 * `email` as an e-mail and `photoUrl` as a URL, and the empty string is
 * neither. An absent answer is `null` (NEW-31).
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

/**
 * The listings a testimonial's picker has to name without having searched for
 * them — the one it was saved with (QA-61). One request, by id (§5.7).
 *
 * @param {Array<string|number>} ids
 * @param {{signal?: AbortSignal}} [opts]
 */
const resolveProperties = (ids, opts) =>
  propertyService.adminList({ ids: ids.join(','), perPage: ids.length }, opts);

/** A property type's name, from the types the site lists; its id when it is not one of them. */
const typeNameOf = (types, id) =>
  (Array.isArray(types) ? types : []).find((type) => String(type.id) === String(id))?.name ??
  `Property type #${id}`;

/**
 * The `Order` / `Active` half of every form below. The number is a position:
 * the API places the record there and moves the rest (QA-59).
 */
const STATE_FIELDS = [
  { name: 'order', type: 'number', label: 'Order', min: 0, half: true, hint: FORMS.orderHint },
  { name: 'isActive', type: 'switch', label: 'Active', half: true },
];

/**
 * Where a new testimonial, team member or partner goes: first, as it always
 * has (QA-60 kept content lists at "created first") — but said as the 1 the
 * hint under the box calls first. The box read 0 beside "1 is first" (QA-61).
 */
const FIRST = 1;

/**
 * An emptied Order box, said in the words of the hint under it. The schema's
 * own sentence was "The order must be an integer." — QA-59 fixed that for the
 * FAQs, and the three content forms beside them still said it (QA-61).
 *
 * @param {object} values
 * @returns {Record<string, string>}
 */
const orderErrors = (values) =>
  values.order === null || values.order === undefined || values.order === ''
    ? { order: 'Give it a place in the list: 1 is first.' }
    : {};

const searchFilter = (placeholder) => ({
  key: 'q',
  type: 'search',
  label: 'Search',
  placeholder,
});

const statusFilter = {
  key: 'isActive',
  type: 'toggle',
  label: 'Status',
  trueLabel: 'Active',
  falseLabel: 'Inactive',
  placeholder: 'Any status',
};

/**
 * Activate / deactivate / delete, with the sentence the confirm needs.
 *
 * @param {string} plural
 * @param {{heldBy?: string}} [options] what refuses a delete — "a page still
 *   shows" by default; a team member is also held by a listing that names
 *   them as its advisor, which the sentence left out (QA-61)
 */
const bulkActions = (plural, { heldBy = 'a page still shows' } = {}) => [
  { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
  { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: `Delete the selected ${plural}?`,
      // It read "One a page still points at is refused", and the API refuses
      // the whole batch, not the one (QA-59).
      message: `{count} will be deleted. If ${heldBy} any of them, none is deleted and you are told which. This cannot be undone.`,
    },
  },
];

/**
 * A column that flips one boolean of one record.
 *
 * The switch writes through the list's own `patchField`, so the change shows
 * at once and goes back if the API disagrees — the behaviour the `Active`
 * column has had since prompt 13, offered to any field worth a toggle.
 *
 * @param {{key: string, label: string, describe: (row: object) => string}} options
 */
const toggleColumn = ({ key, label, describe, width = '96px' }) => ({
  key,
  label,
  width,
  align: 'center',
  mobile: true,
  render: (row, { patchField, busy, canEdit } = {}) => (
    <Switch
      size="small"
      disableRipple
      checked={Boolean(row[key])}
      disabled={canEdit === false || busy}
      onClick={(event) => event.stopPropagation()}
      onChange={() => patchField?.(row, key, !row[key])}
      slotProps={{ input: { role: 'switch', 'aria-label': describe(row) } }}
    />
  ),
});

/** The `Order` cell: the number, with the handle that says it can be dragged. */
const orderColumn = {
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
};

/**
 * What the drag list says above itself. It used to explain the API ("the
 * position is saved on the record that moved") to people who only want to know
 * how to move a row (QA-59).
 */
const REORDER_HINT =
  'Drag a row by its handle, or use its arrows, to change the order the site shows them in. A filtered list moves only the rows it shows, and the others keep their places. With the keyboard: focus a row and press Alt + ↑ / ↓.';

/* ------------------------------------------------------------------ *
 * FAQs (§6.9, §6.17)
 * ------------------------------------------------------------------ */

/**
 * Admin → FAQs (`/admin/faqs`).
 *
 * One collection feeds four places: `/insights/faqs`, the home section
 * (`showOnHome`), the FAQ block of a property page (`propertyTypeId`) and the
 * CMS `faq` block. The category decides which tab a question appears under and
 * the order decides where inside it.
 *
 * @param {{onMutated?: (collection: string) => void, propertyTypes?: Array<object>}} [options]
 */
export const faqsConfig = ({ onMutated, propertyTypes: knownTypes = [] } = {}) => ({
  key: 'faqs',
  title: 'FAQs',
  subtitle: 'Answered on /insights/faqs, on the home page and on property pages.',
  singular: 'FAQ',
  // "No faqs match", "3 faqs will be deleted" (QA-59).
  plural: 'FAQs',
  service: faqService,
  onMutated,
  schema: schemas['faq.update'],
  createSchema: schemas['faq.create'],
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,
  reorderHint: REORDER_HINT,

  columns: [
    orderColumn,
    {
      key: 'question',
      label: 'Question',
      sortable: true,
      primary: true,
      render: (row) => (
        <span className={styles.nameCell}>
          <span className={styles.name}>{row.question}</span>
          <span className={`${styles.hint} ${styles.clamp}`}>{stripHtml(row.answer)}</span>
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      mobile: true,
      width: '150px',
      // The property type a question is tied to was set in the form and shown
      // nowhere else, so which FAQs a listing type carries could only be
      // learned by opening every one of them (QA-59).
      render: (row) => (
        <span className={styles.nameCell}>
          <Chip tone={FAQ_CATEGORIES.meta[row.category]?.tone ?? 'neutral'}>
            {FAQ_CATEGORIES.labelOf(row.category) || 'General'}
          </Chip>
          {row.propertyTypeId ? (
            <span className={styles.hint}>{typeNameOf(knownTypes, row.propertyTypeId)}</span>
          ) : null}
        </span>
      ),
    },
    toggleColumn({
      key: 'showOnHome',
      label: 'Home',
      describe: (row) => `Show “${row.question}” on the home page`,
    }),
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      width: '130px',
      mobile: false,
      hideBelow: 'lg',
      render: (row) => formatDate(row.updatedAt),
    },
  ],

  filters: [
    searchFilter('Question or answer'),
    {
      key: 'category',
      type: 'select',
      label: 'Category',
      placeholder: 'All categories',
      options: FAQ_CATEGORIES.options,
    },
    {
      key: 'showOnHome',
      type: 'toggle',
      label: 'Home page',
      trueLabel: 'On the home page',
      falseLabel: 'Not on the home page',
      placeholder: 'Anywhere',
    },
    // The API has always filtered by it (§5.14); the screen never asked.
    ...(knownTypes.length > 0
      ? [
          {
            key: 'propertyTypeId',
            type: 'select',
            label: 'Property type',
            placeholder: 'Any type',
            options: knownTypes.map((type) => ({ value: String(type.id), label: type.name })),
          },
        ]
      : []),
    statusFilter,
  ],

  bulkActions: bulkActions('FAQs'),

  formFields: [
    {
      name: 'question',
      type: 'text',
      label: 'Question',
      required: true,
      hint: 'Ask it the way a buyer would, in 10 to 200 characters.',
    },
    {
      name: 'answer',
      type: 'richtext',
      label: 'Answer',
      required: true,
      hint: 'Paragraphs, lists and links. Keep it to what the question actually asks.',
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      options: FAQ_CATEGORIES.options,
      half: true,
      hint: 'The tab this question appears under.',
    },
    {
      name: 'propertyTypeId',
      type: 'entity',
      label: 'Property type',
      multiple: false,
      // Beside the category, rather than a row of its own under a half-width
      // select with nothing next to it (QA-59).
      half: true,
      fetcher: (params, opts) => propertyTypes.list(params, opts),
      selectedRecords: knownTypes,
      hint: 'Optional. Tie the question to one type and it also appears on those listings.',
    },
    {
      name: 'showOnHome',
      type: 'switch',
      label: 'Show on the home page',
      half: true,
      hint: 'The home section shows the questions ticked here.',
    },
    ...STATE_FIELDS,
  ],

  /**
   * The body the API receives: the question without the spaces a paste
   * leaves around it (QA-59) — the list, the site and the `FAQPage` markup
   * all printed them.
   */
  toPayload: (values) => ({
    ...values,
    question: typeof values.question === 'string' ? values.question.trim() : values.question,
  }),

  newValues: {
    category: 'general',
    propertyTypeId: null,
    showOnHome: false,
    order: 0,
    isActive: true,
  },

  /**
   * The editorial rules the storage contract has no opinion about: a question
   * long enough to be one, and an answer long enough to be worth opening.
   */
  validate: (values) => {
    const errors = {};
    const question = String(values.question ?? '').trim();
    if (question.length > 0 && question.length < 10) {
      errors.question = 'Write the whole question — at least 10 characters.';
    }
    if (question.length > 200) {
      errors.question = 'Keep the question under 200 characters; the detail belongs in the answer.';
    }

    const answer = stripHtml(values.answer);
    if (answer.length > 0 && answer.length < 20) {
      errors.answer = 'An answer needs at least 20 characters of text.';
    }
    // An empty bullet, an empty heading: markup, but no answer (QA-59). The
    // schema's `required` only sees that the string is not empty, and the API
    // answers the same sentence.
    if (answer.length === 0 && typeof values.answer === 'string' && values.answer.trim() !== '') {
      errors.answer = 'The answer field is required.';
    }

    // An emptied box read "The order must be an integer." (QA-59).
    if (values.order === null || values.order === undefined || values.order === '') {
      errors.order = 'Give it a place in the list: 0 or more.';
    }

    return errors;
  },

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <span className={styles.name}>{row.question}</span>
      <span className={styles.hint}>
        {[
          FAQ_CATEGORIES.labelOf(row.category) || 'General',
          row.propertyTypeId ? typeNameOf(knownTypes, row.propertyTypeId) : null,
          row.showOnHome ? 'on the home page' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </span>
  ),

  emptyState: {
    title: 'No FAQs yet',
    text: 'Add the questions buyers ask most often — they answer visitors and they rank.',
  },
});

/* ------------------------------------------------------------------ *
 * Testimonials (§6.9, D41)
 * ------------------------------------------------------------------ */

/**
 * Admin → Testimonials (`/admin/testimonials`).
 *
 * The seed ships sample quotes so the layouts have something to show; every
 * one of them carries `isSample`, and a production build drops those (D41).
 * The flag is a column, a filter and a switch on the form, because "which of
 * these are still placeholders" is the question this screen exists to answer
 * before go-live.
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const testimonialsConfig = ({ onMutated } = {}) => ({
  key: 'testimonials',
  title: 'Testimonials',
  subtitle: 'Client quotes for the home page, the About page and the CMS blocks.',
  singular: 'testimonial',
  service: testimonialService,
  onMutated,
  schema: schemas['testimonial.update'],
  createSchema: schemas['testimonial.create'],
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  featuredToggle: true,
  usageGuard: true,
  reorderHint: REORDER_HINT,

  columns: [
    {
      key: 'avatarUrl',
      label: 'Photo',
      width: '72px',
      align: 'center',
      mobile: false,
      hideBelow: 'md',
      render: (row) => <Avatar src={row.avatarUrl} name={row.name} size={36} />,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => (
        <NameCell
          name={row.name}
          hint={[row.designation, row.location].filter(Boolean).join(' · ')}
        />
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      width: '130px',
      mobile: true,
      render: (row) => <Rating value={row.rating ?? 0} showValue={false} />,
    },
    {
      key: 'message',
      label: 'Quote',
      hideBelow: 'lg',
      mobile: false,
      render: (row) => <span className={styles.clamp}>{row.message}</span>,
    },
    {
      key: 'isSample',
      label: 'Sample',
      width: '110px',
      mobile: true,
      render: (row) =>
        row.isSample ? (
          <Chip tone="warning">Sample</Chip>
        ) : (
          <span className={styles.hint}>Real</span>
        ),
    },
    orderColumn,
  ],

  filters: [
    searchFilter('Name, quote or location'),
    {
      key: 'isFeatured',
      type: 'toggle',
      label: 'Featured',
      trueLabel: 'Featured',
      falseLabel: 'Not featured',
      placeholder: 'Any',
    },
    {
      key: 'isSample',
      type: 'toggle',
      label: 'Sample',
      trueLabel: 'Sample copy',
      falseLabel: 'Real quotes',
      placeholder: 'Any',
    },
    statusFilter,
  ],

  bulkActions: bulkActions('testimonials'),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, half: true },
    {
      name: 'designation',
      type: 'text',
      label: 'Designation',
      half: true,
      hint: 'Optional, e.g. “Home buyer” or a job title.',
    },
    {
      name: 'location',
      type: 'text',
      label: 'Location',
      half: true,
      hint: 'Optional, e.g. “Whitefield, Bengaluru”.',
    },
    { name: 'rating', type: 'rating', label: 'Rating', required: true, half: true },
    {
      name: 'message',
      type: 'textarea',
      label: 'Quote',
      required: true,
      rows: 5,
      hint: 'Their words, 20 to 600 characters.',
    },
    { name: 'avatarUrl', type: 'image', label: 'Photo', hint: 'avatar' },
    {
      name: 'propertyId',
      type: 'entity',
      label: 'Property',
      multiple: false,
      labelKey: 'title',
      fetcher: (params, opts) => propertyService.adminList(params, opts),
      // The chosen listing is named by its title: reopened, the box said "#1"
      // — the picker knew only the listings it had searched for (QA-61).
      resolveSelected: resolveProperties,
      hint: 'Optional. The listing this client bought or rented.',
    },
    {
      name: 'isFeatured',
      type: 'switch',
      label: 'Featured',
      half: true,
      hint: 'The home page shows the featured quotes, in the order of this list.',
    },
    {
      name: 'isSample',
      type: 'switch',
      label: 'Sample',
      half: true,
      hint: 'Sample testimonials never appear on the live site.',
    },
    ...STATE_FIELDS,
  ],

  newValues: {
    rating: 5,
    propertyId: null,
    isFeatured: false,
    isSample: false,
    order: FIRST,
    isActive: true,
  },

  validate: (values) => {
    const errors = orderErrors(values);
    const message = String(values.message ?? '').trim();
    if (message.length > 0 && message.length < 20) {
      errors.message = 'A quote needs at least 20 characters.';
    }
    if (message.length > 600) {
      errors.message = 'Keep a quote under 600 characters — the card shows six lines.';
    }
    if (!Number(values.rating)) errors.rating = 'Choose a rating from one to five stars.';
    return errors;
  },

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <Avatar src={row.avatarUrl} name={row.name} size={28} />
      <span className={styles.name}>{row.name}</span>
      <span className={styles.hint}>
        {/* The home page shows the featured quotes in this order, and nothing
            here said which they were: reordering the carousel was blind
            (QA-61, QA-60's rule for localities). */}
        {[
          `${row.rating ?? 0}/5`,
          row.isFeatured ? 'featured' : null,
          row.isSample ? 'sample' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </span>
  ),

  emptyState: {
    title: 'No testimonials yet',
    text: 'Add what clients say about working with us. Mark anything provisional as a sample.',
  },
});

/* ------------------------------------------------------------------ *
 * Team members (§6.9)
 * ------------------------------------------------------------------ */

/** The contact icons a team member carries, or a note that they carry none. */
const ContactCell = ({ row }) => {
  const items = [
    row.phone ? { icon: 'mdi:phone-outline', label: `Phone ${row.phone}` } : null,
    row.whatsapp ? { icon: 'mdi:whatsapp', label: `WhatsApp ${row.whatsapp}` } : null,
    row.email ? { icon: 'mdi:email-outline', label: `E-mail ${row.email}` } : null,
  ].filter(Boolean);

  if (items.length === 0) return <span className={styles.hint}>None</span>;

  return (
    <span className={styles.contactCell}>
      {items.map((item) => (
        <span key={item.icon} className={styles.contactIcon} title={item.label}>
          <Icon icon={item.icon} width="18" height="18" aria-hidden="true" />
          <span className={styles.srOnly}>{item.label}</span>
        </span>
      ))}
    </span>
  );
};

/** The accounts a team card can be linked to, named when the form reopens. */
const resolveUsers = (ids, opts) =>
  userService.list({ ids: ids.join(','), perPage: ids.length }, opts);

/**
 * Admin → Team (`/admin/team`).
 *
 * A team member is a person the site names: the About page lists the ones
 * ticked for it, a listing can name one as its agent, and a CMS `team` block
 * can pick them by id. There is no page of their own, so the slug is an
 * identifier rather than a URL — and a delete is refused while a property or a
 * page still points at them (D88).
 *
 * Since prompt 51 the list counts each member's listings and links to them,
 * the card can name the admin account that signs in as the advisor (leads
 * about their listings can be routed to it), and switching off somebody who
 * still answers for listings asks the screen first — `intercept`, which the
 * page supplies with its reassign dialog.
 *
 * @param {{onMutated?: (collection: string) => void, intercept?: Function}} [options]
 */
export const teamConfig = ({ onMutated, intercept } = {}) => ({
  key: 'team',
  title: 'Team',
  subtitle: 'The advisors named on the About page and on the listings they handle.',
  singular: 'team member',
  service: teamService,
  onMutated,
  schema: schemas['teamMember.update'],
  createSchema: schemas['teamMember.create'],
  slugBase: '#',
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,
  reorderHint: REORDER_HINT,
  intercept,

  columns: [
    {
      key: 'photoUrl',
      label: 'Photo',
      width: '72px',
      align: 'center',
      mobile: false,
      hideBelow: 'md',
      render: (row) => <Avatar src={row.photoUrl} name={row.name} size={36} />,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      primary: true,
      render: (row) => <NameCell name={row.name} hint={row.designation} />,
    },
    {
      key: 'phone',
      label: 'Contact',
      width: '130px',
      mobile: true,
      render: (row) => <ContactCell row={row} />,
    },
    {
      key: 'reraId',
      label: 'RERA',
      hideBelow: 'lg',
      mobile: false,
      render: (row) =>
        row.reraId ? (
          <span className={styles.text}>{row.reraId}</span>
        ) : (
          <span className={styles.hint}>—</span>
        ),
    },
    {
      // The listings that name the member as their advisor, drafts included:
      // the count is the way to them (prompt 51).
      key: 'listingCount',
      label: 'Listings',
      width: '96px',
      align: 'center',
      sortable: true,
      hideBelow: 'md',
      render: (row) =>
        Number(row.listingCount) > 0 ? (
          <Link
            className={styles.countLink}
            to={`${PATHS.adminProperties}?agentId=${row.id}`}
            title={`The listings ${row.name} answers for`}
            aria-label={`${formatNumber(row.listingCount)} listings of ${row.name}`}
          >
            {formatNumber(row.listingCount)}
          </Link>
        ) : (
          <span className={styles.hint}>0</span>
        ),
    },
    toggleColumn({
      key: 'showOnAbout',
      label: 'About page',
      width: '116px',
      describe: (row) => `Show ${row.name} on the About page`,
    }),
    orderColumn,
  ],

  filters: [
    searchFilter('Name or designation'),
    {
      key: 'showOnAbout',
      type: 'toggle',
      label: 'About page',
      trueLabel: 'On the About page',
      falseLabel: 'Not on the About page',
      placeholder: 'Anywhere',
    },
    statusFilter,
  ],

  bulkActions: bulkActions('team members', {
    // A listing that names somebody as its advisor holds them too (D88).
    heldBy: 'a page or a listing still names',
  }),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, half: true },
    {
      name: 'slug',
      type: 'slug',
      label: 'Identifier',
      source: 'name',
      half: true,
      base: '#',
    },
    {
      name: 'designation',
      type: 'text',
      label: 'Designation',
      required: true,
      hint: 'The role shown under the name, e.g. “Senior Advisor”.',
    },
    { name: 'phone', type: 'phone', label: 'Phone', half: true },
    { name: 'whatsapp', type: 'phone', label: 'WhatsApp', half: true },
    { name: 'email', type: 'email', label: 'E-mail', half: true },
    {
      name: 'reraId',
      type: 'text',
      label: 'RERA registration',
      half: true,
      hint: 'Optional, shown on the card as proof of registration.',
    },
    { name: 'photoUrl', type: 'image', label: 'Photograph', hint: 'avatar' },
    {
      name: 'bio',
      type: 'richtext',
      label: 'Biography',
      hint: 'A short paragraph — what they cover and for how long.',
    },
    { name: 'socialLinks.linkedin', type: 'url', label: 'LinkedIn', half: true },
    { name: 'socialLinks.twitter', type: 'url', label: 'X (Twitter)', half: true },
    { name: 'socialLinks.website', type: 'url', label: 'Website', half: true },
    {
      name: 'userId',
      type: 'entity',
      label: 'Admin account',
      multiple: false,
      labelKey: 'name',
      fetcher: (params, opts) => userService.list({ ...params, isActive: true }, opts),
      resolveSelected: resolveUsers,
      hint: 'Optional. Who signs in as this advisor: with Lead notifications set to “The listing’s advisor”, a lead about one of their listings goes to this account.',
    },
    {
      name: 'showOnAbout',
      type: 'switch',
      label: 'Show on the About page',
      half: true,
    },
    ...STATE_FIELDS,
  ],

  newValues: {
    socialLinks: {},
    reraId: null,
    userId: null,
    showOnAbout: true,
    order: FIRST,
    isActive: true,
  },

  validate: orderErrors,

  // The three social boxes are one `socialLinks` object on the record, and the
  // form edits them by dotted path; `pickFields` cannot read those, so the
  // values a record opens with are assembled here. An empty optional field
  // opens as `null` rather than `''`, which is the difference between "no
  // e-mail" and "an e-mail that is not one" (NEW-31).
  toFormValues: (record) => ({
    name: record.name ?? '',
    slug: record.slug ?? '',
    designation: record.designation ?? '',
    phone: record.phone ?? null,
    whatsapp: record.whatsapp ?? null,
    email: record.email ?? null,
    reraId: record.reraId ?? null,
    photoUrl: record.photoUrl ?? null,
    bio: record.bio ?? '',
    socialLinks: {
      linkedin: record.socialLinks?.linkedin ?? null,
      twitter: record.socialLinks?.twitter ?? null,
      website: record.socialLinks?.website ?? null,
    },
    userId: record.userId ?? null,
    showOnAbout: record.showOnAbout !== false,
    order: record.order ?? 0,
    isActive: record.isActive !== false,
  }),

  /**
   * `PUT` replaces the record (§5.8), so the body is the whole of it: the two
   * social networks this form does not offer travel through untouched, the
   * boxes that were emptied become `null`, and the dotted spellings a blank
   * record starts with are dropped in favour of the object they belong to.
   */
  toPayload: (values, record) => {
    const body = Object.fromEntries(Object.entries(values).filter(([key]) => !key.includes('.')));

    return {
      ...body,
      ...Object.fromEntries(
        ['phone', 'whatsapp', 'email', 'reraId', 'photoUrl'].map((field) => [
          field,
          blankToNull(values[field]),
        ])
      ),
      userId:
        values.userId === null || values.userId === undefined || values.userId === ''
          ? null
          : Number(values.userId),
      socialLinks: {
        ...(record?.socialLinks ?? {}),
        ...(values.socialLinks ?? {}),
      },
    };
  },

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <Avatar src={row.photoUrl} name={row.name} size={28} />
      <span className={styles.name}>{row.name}</span>
      <span className={styles.hint}>{row.designation}</span>
    </span>
  ),

  emptyState: {
    title: 'No team members yet',
    text: 'Add the advisors clients deal with — names, roles and how to reach them.',
  },
});

/* ------------------------------------------------------------------ *
 * Partners (§6.9)
 * ------------------------------------------------------------------ */

/**
 * Admin → Partners (`/admin/partners`).
 *
 * The logos in the home marquee and in a CMS `partners` block. A block selects
 * by category rather than by id, so only a block naming this partner's own
 * category counts as a usage (D88).
 *
 * @param {{onMutated?: (collection: string) => void}} [options]
 */
export const partnersConfig = ({ onMutated } = {}) => ({
  key: 'partners',
  title: 'Partners',
  subtitle: 'The logos shown on the home page and in the partners block of a page.',
  singular: 'partner',
  service: partnerService,
  onMutated,
  schema: schemas['partner.update'],
  createSchema: schemas['partner.create'],
  defaultSort: { field: 'order', order: 'asc' },
  orderable: true,
  activeToggle: true,
  usageGuard: true,
  reorderHint: REORDER_HINT,

  columns: [
    {
      key: 'logoUrl',
      label: 'Logo',
      width: '110px',
      mobile: false,
      hideBelow: 'md',
      render: (row) => (
        <LazyImage
          src={row.logoUrl}
          alt=""
          ratio="5/2"
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
      render: (row) => <span className={styles.text}>{row.name}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      mobile: true,
      width: '140px',
      render: (row) => <Chip tone="neutral">{PARTNER_CATEGORIES.labelOf(row.category)}</Chip>,
    },
    {
      key: 'websiteUrl',
      label: 'Website',
      hideBelow: 'lg',
      mobile: false,
      render: (row) =>
        row.websiteUrl ? (
          <a
            className={styles.link}
            href={row.websiteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {hostOf(row.websiteUrl)}
          </a>
        ) : (
          <span className={styles.hint}>—</span>
        ),
    },
    orderColumn,
  ],

  filters: [
    searchFilter('Partner name'),
    {
      key: 'category',
      type: 'select',
      label: 'Category',
      placeholder: 'All categories',
      options: PARTNER_CATEGORIES.options,
    },
    statusFilter,
  ],

  bulkActions: bulkActions('partners'),

  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true, half: true },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      options: PARTNER_CATEGORIES.options,
      half: true,
    },
    { name: 'logoUrl', type: 'image', label: 'Logo', required: true, hint: 'logo' },
    { name: 'websiteUrl', type: 'url', label: 'Website' },
    ...STATE_FIELDS,
  ],

  newValues: { category: 'developer', websiteUrl: null, order: FIRST, isActive: true },

  validate: (values) => {
    const logo = String(values.logoUrl ?? '').trim();
    return {
      ...orderErrors(values),
      ...(logo ? {} : { logoUrl: 'A partner is a logo — add one before saving.' }),
    };
  },

  formFooter: (
    <Alert tone="info" title="How the logos are shown">
      The home marquee draws every active partner; a partners block on a page can narrow that to one
      category. Logos are shown as they are, never recoloured.
    </Alert>
  ),

  renderOrderItem: (row) => (
    <span className={styles.orderRow}>
      <span className={styles.name}>{row.name}</span>
      <span className={styles.hint}>{PARTNER_CATEGORIES.labelOf(row.category)}</span>
    </span>
  ),

  emptyState: {
    title: 'No partners yet',
    text: 'Add the developers, banks and specialists we work with. With none active the row hides.',
  },
});

/** `https://www.example.com/path` → `example.com`; the raw value if unparsable. */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_thrown) {
    return url;
  }
}
