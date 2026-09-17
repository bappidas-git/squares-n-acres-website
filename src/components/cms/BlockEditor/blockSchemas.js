import {
  BLOCK_TYPES,
  CONSTRUCTION_STATUS,
  LEAD_SOURCES,
  LISTING_TYPES,
  PARTNER_CATEGORIES,
} from '../../../config/enums';

/**
 * What each CMS block type asks an editor for (00_MASTER_CONTEXT.md §6.10).
 *
 * `src/config/enums.js` owns the vocabulary — the 25 `BLOCK_TYPES` values, each
 * with its label, its Iconify id and a `defaultData()` — because the mock
 * validates against the same file. What lives here is the **editing** half: one
 * sentence saying what a block is for, the picker group it belongs to, and the
 * fields its `data` is built from. `BlockForm` renders a block from this and
 * nothing else, which is why adding a block type is one entry in `enums.js`
 * plus one entry here rather than a new component.
 *
 * A field descriptor:
 *
 *   { name, type, label, required?, placeholder?, hint?, rows?, half?,
 *     options?, optionsFrom?, min?, max?,
 *     itemFields?, itemLabel?, addLabel?, newItem?, max?,   // type 'items'
 *     count?,                                               // type 'stringList'
 *     entity?, labelKey?, multiple?,                        // type 'entity'
 *     visibleWhen? }
 *
 * `name` may be a dotted path (`filter.listingType`), which is what keeps the
 * `properties` block's nested filter inside the same flat field list.
 *
 * Types: `text`, `textarea`, `richtext`, `image`, `url`, `select`, `switch`,
 * `number`, `icon`, `items`, `stringList`, `entity`, `fields` (the lead-form
 * field builder) and `leadSource`. `richtext` is `RichTextEditor`; `textarea`
 * is plain text with no formatting at all.
 */

/** The picker's sections, in the order it shows them. */
export const BLOCK_GROUPS = [
  { key: 'content', label: 'Content', description: 'Words, headings and calls to action' },
  { key: 'lists', label: 'Lists', description: 'Repeating items the editor writes' },
  { key: 'data', label: 'Data', description: 'Records from elsewhere in the panel' },
  { key: 'forms', label: 'Forms', description: 'Ways for a visitor to get in touch' },
  { key: 'media', label: 'Media', description: 'Images, galleries and maps' },
];

const HTML_HINT = 'Headings, lists, links, tables, images and the SNA blocks.';

/** A heading every band may carry; blank means the band shows no heading. */
const title = (extra = {}) => ({
  name: 'title',
  type: 'text',
  label: 'Heading',
  maxLength: 150,
  ...extra,
});

const subtitle = (extra = {}) => ({
  name: 'subtitle',
  type: 'textarea',
  label: 'Sub-heading',
  rows: 2,
  maxLength: 300,
  ...extra,
});

/** The next free integer id in a list of `{ id }` items. */
const nextItemId = (items = []) =>
  items.reduce((highest, item) => Math.max(highest, Number(item?.id) || 0), 0) + 1;

/**
 * The editing definition of every block type, keyed by `BLOCK_TYPES` value.
 * `blockSchemaTest` asserts the two sets agree.
 */
const DEFINITIONS = {
  hero: {
    group: 'content',
    description: 'The band at the top of the page: a heading, a sentence and an optional button.',
    fields: [
      title({ label: 'Heading', hint: 'Left blank, the page title is used.' }),
      subtitle(),
      { name: 'imageUrl', type: 'image', label: 'Background image', imageHint: 'hero' },
      { name: 'ctaLabel', type: 'text', label: 'Button label', half: true, maxLength: 60 },
      {
        name: 'ctaHref',
        type: 'text',
        label: 'Button link',
        half: true,
        placeholder: '/contact',
        hint: 'A path, a full URL, or left blank to open the enquiry form.',
        maxLength: 300,
      },
    ],
  },

  richText: {
    group: 'content',
    description: 'A block of formatted prose — the story, the mission, a legal text.',
    fields: [{ name: 'html', type: 'richtext', label: 'Content', required: true }],
  },

  html: {
    group: 'content',
    description: 'Raw markup for something the other blocks cannot express.',
    fields: [
      {
        name: 'html',
        type: 'richtext',
        label: 'Markup',
        required: true,
        hint: 'Sanitised on save and again on the page. Scripts are refused.',
      },
    ],
  },

  cta: {
    group: 'content',
    description: 'A coloured band with one button — the last nudge before the footer.',
    fields: [
      title({ label: 'Heading', required: true }),
      { name: 'text', type: 'textarea', label: 'Text', rows: 3, maxLength: 400 },
      { name: 'buttonLabel', type: 'text', label: 'Button label', half: true, maxLength: 60 },
      {
        name: 'buttonHref',
        type: 'text',
        label: 'Button link',
        half: true,
        placeholder: '/contact',
        hint: 'Left blank, the button opens the enquiry form.',
        maxLength: 300,
      },
      {
        name: 'leadSource',
        type: 'leadSource',
        label: 'Opens the enquiry form as',
        hint: 'Set this and the button opens the form instead of following the link.',
      },
    ],
  },

  contactInfo: {
    group: 'content',
    description:
      'The phone, e-mail, WhatsApp, address and working hours, read live from Site settings.',
    fields: [],
    emptyHint:
      'Nothing to configure — this block reads Site settings, so an address changed there changes here.',
  },

  features: {
    group: 'lists',
    description: 'A grid of icon, heading and sentence — benefits, values, services.',
    fields: [
      title(),
      subtitle(),
      {
        name: 'items',
        type: 'items',
        label: 'Features',
        addLabel: 'Add feature',
        itemLabel: (item) => item?.title,
        newItem: () => ({ icon: '', title: '', text: '' }),
        itemFields: [
          { name: 'icon', type: 'icon', label: 'Icon', half: true },
          { name: 'title', type: 'text', label: 'Heading', required: true, half: true },
          { name: 'text', type: 'textarea', label: 'Text', rows: 3, maxLength: 400 },
        ],
      },
    ],
  },

  steps: {
    group: 'lists',
    description: 'A numbered sequence — how it works, a process, a timeline.',
    fields: [
      title(),
      subtitle(),
      {
        name: 'items',
        type: 'items',
        label: 'Steps',
        addLabel: 'Add step',
        itemLabel: (item) => item?.title,
        newItem: () => ({ title: '', text: '' }),
        itemFields: [
          { name: 'title', type: 'text', label: 'Heading', required: true },
          { name: 'text', type: 'textarea', label: 'Text', rows: 3, maxLength: 400 },
        ],
      },
    ],
  },

  stats: {
    group: 'lists',
    description: 'Big figures with a label. With no figures the band is not rendered at all.',
    fields: [
      {
        name: 'items',
        type: 'items',
        label: 'Figures',
        addLabel: 'Add figure',
        itemLabel: (item) => item?.label,
        newItem: () => ({ label: '', value: '', suffix: '' }),
        itemFields: [
          { name: 'value', type: 'text', label: 'Value', required: true, half: true },
          { name: 'suffix', type: 'text', label: 'Suffix', half: true, placeholder: '+' },
          { name: 'label', type: 'text', label: 'Label', required: true },
        ],
      },
    ],
  },

  facts: {
    group: 'lists',
    description: '“Did you know” cards — a short fact with the sentence that explains it.',
    fields: [
      title(),
      {
        name: 'items',
        type: 'items',
        label: 'Facts',
        addLabel: 'Add fact',
        itemLabel: (item) => item?.stat,
        newItem: () => ({ stat: '', label: '', icon: '' }),
        itemFields: [
          { name: 'stat', type: 'text', label: 'Fact', required: true, half: true },
          { name: 'icon', type: 'icon', label: 'Icon', half: true },
          { name: 'label', type: 'textarea', label: 'Explanation', rows: 3, required: true },
        ],
      },
    ],
  },

  checklist: {
    group: 'lists',
    description: 'Things to tick off. A visitor’s progress is kept in their own browser.',
    fields: [
      title(),
      { name: 'intro', type: 'textarea', label: 'Intro', rows: 2, maxLength: 400 },
      {
        name: 'items',
        type: 'items',
        label: 'Items',
        addLabel: 'Add item',
        itemLabel: (item) => item?.text,
        newItem: () => ({ text: '', detail: '' }),
        itemFields: [
          { name: 'text', type: 'text', label: 'Item', required: true },
          { name: 'detail', type: 'textarea', label: 'Detail', rows: 2, maxLength: 300 },
        ],
      },
    ],
  },

  expandableCards: {
    group: 'lists',
    description: 'Cards that open: a summary everyone reads and the detail behind it.',
    fields: [
      title(),
      {
        name: 'items',
        type: 'items',
        label: 'Cards',
        addLabel: 'Add card',
        itemLabel: (item) => item?.title,
        newItem: (items) => ({ id: nextItemId(items), icon: '', title: '', summary: '', html: '' }),
        itemFields: [
          { name: 'icon', type: 'icon', label: 'Icon', half: true },
          { name: 'title', type: 'text', label: 'Heading', required: true, half: true },
          { name: 'summary', type: 'textarea', label: 'Summary', rows: 2, required: true },
          { name: 'html', type: 'richtext', label: 'Detail', compact: true },
        ],
      },
    ],
  },

  packages: {
    group: 'lists',
    description: 'Pricing cards. Their button opens the enquiry form with the page’s source.',
    fields: [
      title(),
      {
        name: 'items',
        type: 'items',
        label: 'Packages',
        addLabel: 'Add package',
        itemLabel: (item) => item?.name,
        newItem: () => ({
          name: '',
          price: '',
          unit: '',
          features: [],
          highlighted: false,
          ctaLabel: '',
        }),
        itemFields: [
          { name: 'name', type: 'text', label: 'Name', required: true, half: true },
          {
            name: 'price',
            type: 'text',
            label: 'Price',
            half: true,
            placeholder: 'from ₹3.5 lakh',
          },
          { name: 'unit', type: 'text', label: 'Unit', half: true, placeholder: 'for a 2 BHK' },
          { name: 'ctaLabel', type: 'text', label: 'Button label', half: true },
          { name: 'features', type: 'stringList', label: 'What is included', addLabel: 'Add line' },
          { name: 'highlighted', type: 'switch', label: 'Highlight this card' },
        ],
      },
    ],
  },

  quiz: {
    group: 'lists',
    description: 'A short multiple-choice quiz with an explanation after every answer.',
    fields: [
      title(),
      { name: 'intro', type: 'textarea', label: 'Intro', rows: 2, maxLength: 400 },
      {
        name: 'questions',
        type: 'items',
        label: 'Questions',
        addLabel: 'Add question',
        itemLabel: (item) => item?.question,
        newItem: () => ({
          question: '',
          options: ['', '', '', ''],
          answerIndex: 0,
          explanation: '',
        }),
        itemFields: [
          { name: 'question', type: 'text', label: 'Question', required: true },
          {
            name: 'options',
            type: 'stringList',
            label: 'Answers',
            count: 4,
            required: true,
            hint: 'All four are shown; the visitor picks one.',
          },
          {
            name: 'answerIndex',
            type: 'select',
            label: 'Correct answer',
            required: true,
            half: true,
            options: [
              { value: 0, label: 'Answer 1' },
              { value: 1, label: 'Answer 2' },
              { value: 2, label: 'Answer 3' },
              { value: 3, label: 'Answer 4' },
            ],
          },
          {
            name: 'explanation',
            type: 'textarea',
            label: 'Explanation',
            rows: 3,
            required: true,
            hint: 'Shown once the visitor has answered, right or wrong.',
          },
        ],
      },
    ],
  },

  faq: {
    group: 'data',
    description: 'Questions and answers — picked from the FAQ library, or written here.',
    fields: [
      title(),
      {
        name: 'faqIds',
        type: 'entity',
        entity: 'faqs',
        labelKey: 'question',
        label: 'From the FAQ library',
        hint: 'Shown in the order you add them. Edit the answers under Content → FAQs.',
      },
      {
        name: 'items',
        type: 'items',
        label: 'Questions written here',
        addLabel: 'Add question',
        itemLabel: (item) => item?.question,
        newItem: () => ({ question: '', answer: '' }),
        itemFields: [
          { name: 'question', type: 'text', label: 'Question', required: true },
          { name: 'answer', type: 'richtext', label: 'Answer', required: true, compact: true },
        ],
      },
    ],
  },

  team: {
    group: 'data',
    description: 'Advisor cards from Content → Team.',
    fields: [
      title(),
      {
        name: 'memberIds',
        type: 'entity',
        entity: 'team',
        label: 'Members',
        hint: 'Leave empty to show everyone marked “Show on About”.',
      },
    ],
  },

  testimonials: {
    group: 'data',
    description: 'Client quotes from Content → Testimonials.',
    fields: [
      title(),
      {
        name: 'ids',
        type: 'entity',
        entity: 'testimonials',
        label: 'Testimonials',
        hint: 'Leave empty to show the featured ones.',
      },
    ],
  },

  properties: {
    group: 'data',
    description: 'A rail of listings — the featured ones, a chosen few, or a saved search.',
    fields: [
      title(),
      {
        name: 'mode',
        type: 'select',
        label: 'Which listings',
        required: true,
        options: [
          { value: 'featured', label: 'The featured listings' },
          { value: 'ids', label: 'The ones I pick' },
          { value: 'filter', label: 'Everything matching a filter' },
        ],
      },
      {
        name: 'ids',
        type: 'entity',
        entity: 'properties',
        labelKey: 'title',
        label: 'Listings',
        required: true,
        visibleWhen: (data) => data?.mode === 'ids',
      },
      {
        name: 'filter.listingType',
        type: 'select',
        label: 'Listing type',
        half: true,
        placeholder: 'Any',
        options: LISTING_TYPES.options,
        visibleWhen: (data) => data?.mode === 'filter',
      },
      {
        name: 'filter.constructionStatus',
        type: 'select',
        label: 'Construction status',
        half: true,
        placeholder: 'Any',
        options: CONSTRUCTION_STATUS.options,
        visibleWhen: (data) => data?.mode === 'filter',
      },
      {
        name: 'filter.localityId',
        type: 'select',
        label: 'Locality',
        half: true,
        placeholder: 'Any locality',
        optionsFrom: 'localities',
        visibleWhen: (data) => data?.mode === 'filter',
      },
      {
        name: 'filter.propertyTypeId',
        type: 'select',
        label: 'Property type',
        half: true,
        placeholder: 'Any type',
        optionsFrom: 'propertyTypes',
        visibleWhen: (data) => data?.mode === 'filter',
      },
    ],
  },

  articles: {
    group: 'data',
    description: 'Article cards — the newest, a chosen few, or one category.',
    fields: [
      title(),
      {
        name: 'mode',
        type: 'select',
        label: 'Which articles',
        required: true,
        options: [
          { value: 'latest', label: 'The newest' },
          { value: 'ids', label: 'The ones I pick' },
          { value: 'category', label: 'One category' },
        ],
      },
      {
        name: 'ids',
        type: 'entity',
        entity: 'articles',
        labelKey: 'title',
        label: 'Articles',
        required: true,
        visibleWhen: (data) => data?.mode === 'ids',
      },
      {
        name: 'categoryId',
        type: 'select',
        label: 'Category',
        required: true,
        optionsFrom: 'articleCategories',
        placeholder: 'Select a category',
        visibleWhen: (data) => data?.mode === 'category',
      },
    ],
  },

  partners: {
    group: 'data',
    description: 'Partner logos from Content → Partners.',
    fields: [
      title(),
      {
        name: 'category',
        type: 'select',
        label: 'Only this kind',
        placeholder: 'Every partner',
        options: PARTNER_CATEGORIES.options,
      },
    ],
  },

  banks: {
    group: 'data',
    description: 'The lenders from Master data → Banks, with the EMI calculator above them.',
    fields: [
      title(),
      {
        name: 'showEmiCalculator',
        type: 'switch',
        label: 'Show the EMI calculator',
        hint: 'The sliders take their bounds from the lenders listed below them.',
      },
    ],
  },

  jobs: {
    group: 'data',
    description: 'The open roles from Content → Jobs.',
    fields: [title()],
  },

  leadForm: {
    group: 'forms',
    description: 'An enquiry form. Every submission is a lead filed under the source you choose.',
    fields: [
      title(),
      subtitle(),
      {
        name: 'leadSource',
        type: 'leadSource',
        label: 'File enquiries as',
        required: true,
      },
      { name: 'fields', type: 'fields', label: 'Boxes' },
      {
        name: 'successMessage',
        type: 'textarea',
        label: 'Thank-you message',
        rows: 2,
        maxLength: 300,
      },
    ],
  },

  image: {
    group: 'media',
    description: 'One picture, full width, with an optional caption.',
    fields: [
      { name: 'url', type: 'image', label: 'Image', required: true, imageHint: 'gallery' },
      {
        name: 'alt',
        type: 'text',
        label: 'Alternative text',
        required: true,
        hint: 'What the picture shows, for a reader who cannot see it.',
      },
      { name: 'caption', type: 'text', label: 'Caption', maxLength: 200 },
    ],
  },

  gallery: {
    group: 'media',
    description: 'A grid of photographs that open full screen.',
    fields: [
      title(),
      {
        name: 'items',
        type: 'items',
        label: 'Images',
        addLabel: 'Add image',
        itemLabel: (item, index) => item?.alt || item?.caption || `Image ${index + 1}`,
        newItem: () => ({ url: '', alt: '', caption: '' }),
        itemFields: [
          { name: 'url', type: 'image', label: 'Image', required: true, imageHint: 'gallery' },
          { name: 'alt', type: 'text', label: 'Alternative text', required: true, half: true },
          { name: 'caption', type: 'text', label: 'Caption', half: true },
        ],
      },
    ],
  },

  map: {
    group: 'media',
    description: 'A map. Left empty, it uses the office coordinates from Site settings.',
    fields: [
      {
        name: 'embedUrl',
        type: 'url',
        label: 'Embed URL',
        hint: 'A full Google Maps embed URL. Left blank, the coordinates below are used.',
      },
      { name: 'latitude', type: 'number', label: 'Latitude', half: true, min: -90, max: 90 },
      { name: 'longitude', type: 'number', label: 'Longitude', half: true, min: -180, max: 180 },
    ],
  },
};

/** The `richtext` fields carry the same hint everywhere. */
for (const definition of Object.values(DEFINITIONS)) {
  for (const field of definition.fields) {
    if (field.type === 'richtext' && !field.hint) field.hint = HTML_HINT;
    for (const itemField of field.itemFields ?? []) {
      if (itemField.type === 'richtext' && !itemField.hint) itemField.hint = HTML_HINT;
    }
  }
}

/**
 * Every block type as one object: the vocabulary from `enums.js` and the
 * editing definition above, merged.
 *
 * @type {Record<string, {type: string, label: string, icon: string, group: string,
 *   description: string, fields: Array<object>, emptyHint?: string,
 *   defaultData: () => object}>}
 */
export const BLOCK_SCHEMAS = Object.fromEntries(
  BLOCK_TYPES.values.map((type) => {
    // `makeEnum` keeps the label out of `meta` — it is what `labelOf` answers.
    const meta = BLOCK_TYPES.meta[type] ?? {};
    const definition = DEFINITIONS[type] ?? { group: 'content', description: '', fields: [] };
    return [
      type,
      {
        type,
        label: BLOCK_TYPES.labelOf(type) || type,
        icon: meta.icon ?? 'mdi:shape-outline',
        defaultData: () => BLOCK_TYPES.defaultDataOf(type),
        ...definition,
      },
    ];
  })
);

/**
 * One block type's schema, or `null` for a type this build does not know —
 * which is what the editor renders as "Unsupported block".
 *
 * @param {string} type
 */
export const blockSchema = (type) => BLOCK_SCHEMAS[type] ?? null;

/**
 * A fresh `data` object for a block type (`{}` for an unknown one).
 *
 * @param {string} type
 * @returns {object}
 */
export const defaultData = (type) => BLOCK_TYPES.defaultDataOf(type);

/** The schemas of one picker group, in `BLOCK_TYPES` order. */
export const blocksInGroup = (group) =>
  BLOCK_TYPES.values.map((type) => BLOCK_SCHEMAS[type]).filter((schema) => schema.group === group);

/* ------------------------------------------------------------------ *
 * Reading and writing dotted paths inside a block's `data`
 * ------------------------------------------------------------------ */

/** The value at a dotted path (`filter.localityId`), or `undefined`. */
export function readField(data, path) {
  return String(path)
    .split('.')
    .reduce((node, key) => (node === null || node === undefined ? undefined : node[key]), data);
}

/** A copy of `data` with the dotted path set. */
export function writeField(data, path, value) {
  const [head, ...rest] = String(path).split('.');
  if (rest.length === 0) return { ...data, [head]: value };
  const child = data?.[head];
  return {
    ...data,
    [head]: writeField(child && typeof child === 'object' ? child : {}, rest.join('.'), value),
  };
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/** `<script …>` never reaches the API, which refuses it too (§6.10). */
export const SCRIPT_PATTERN = /<script\b/i;

/** Whether a field is asked for at all, given the rest of the block's data. */
export const fieldApplies = (field, data) => !field.visibleWhen || field.visibleWhen(data);

/**
 * Everything wrong with one block's `data`, as the dotted keys a 422 uses
 * (`items.0.title`, `filter.localityId`) so a server message and a client
 * message land on the same control.
 *
 * @param {string} type
 * @param {object} data
 * @returns {Record<string, string>} empty when the block is complete
 */
export function validateBlockData(type, data = {}) {
  const schema = blockSchema(type);
  if (!schema) return {};

  const errors = {};
  const require = (key, label) => {
    errors[key] = `${label} is required.`;
  };

  for (const field of schema.fields) {
    if (!fieldApplies(field, data)) continue;
    const value = readField(data, field.name);

    if (field.type === 'items') {
      (Array.isArray(value) ? value : []).forEach((item, index) => {
        for (const itemField of field.itemFields ?? []) {
          const itemValue = item?.[itemField.name];
          if (itemField.required && isBlank(itemValue)) {
            require(`${field.name}.${index}.${itemField.name}`, itemField.label);
          }
          if (itemField.type === 'richtext' && SCRIPT_PATTERN.test(String(itemValue ?? ''))) {
            errors[`${field.name}.${index}.${itemField.name}`] =
              'Script tags are not allowed in page content.';
          }
        }
      });
      if (field.required && isBlank(value)) require(field.name, field.label);
      continue;
    }

    if (field.required && isBlank(value)) {
      require(field.name, field.label);
      continue;
    }

    if (field.type === 'richtext' && SCRIPT_PATTERN.test(String(value ?? ''))) {
      errors[field.name] = 'Script tags are not allowed in page content.';
      continue;
    }

    if (field.type === 'leadSource' && !isBlank(value) && !LEAD_SOURCES.values.includes(value)) {
      errors[field.name] = 'That is not one of the lead sources this site files enquiries under.';
    }
  }

  return errors;
}

/**
 * The one line a collapsed block card shows under its type — the block's own
 * heading, or the first words it carries.
 *
 * @param {string} type
 * @param {object} data
 * @returns {string} `''` when the block has nothing to say yet
 */
export function blockSummary(type, data = {}) {
  const schema = blockSchema(type);
  if (!schema) return '';

  const direct = [data.title, data.question, data.alt, data.caption]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find(Boolean);
  if (direct) return direct;

  const list = [data.items, data.questions, data.fields, data.faqIds, data.memberIds, data.ids]
    .filter(Array.isArray)
    .find((entries) => entries.length > 0);
  if (list) return `${list.length} ${list.length === 1 ? 'item' : 'items'}`;

  const html =
    typeof data.html === 'string'
      ? data.html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : '';
  if (html) return html.length > 90 ? `${html.slice(0, 90)}…` : html;

  return '';
}

const blockSchemas = {
  BLOCK_GROUPS,
  BLOCK_SCHEMAS,
  blockSchema,
  blocksInGroup,
  blockSummary,
  defaultData,
  fieldApplies,
  readField,
  validateBlockData,
  writeField,
};

export default blockSchemas;
