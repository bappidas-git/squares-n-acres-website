/**
 * Every place on the site that can capture a lead, in one table.
 *
 * A page or a button names the **entry point** it is — `brochure-download`,
 * `contact-page`, `post-requirement` — and this table answers with the
 * canonical `LEAD_SOURCES` value (§6.17), the heading the form wears and the
 * boxes it asks for. Nothing in `src/` writes a source string of its own any
 * more, which is what closes BUG-09: the twenty-odd spellings the boilerplate
 * invented (`home_loan`, `faq_contact`, `website`) existed because each page
 * chose its own, and the mock had to carry `LEGACY_LEAD_SOURCE_MAP` to file
 * them under the right name.
 *
 *   const entry = entryPoint('home-loan');
 *   <LeadForm {...leadFormProps('home-loan')} />
 *
 * Field descriptors are the `LeadForm` contract:
 * `{ name, label, type, required?, placeholder?, options?, helper?, half?,
 * group?, toBody? }`. A field whose `name` is not one of the four the API
 * stores at the top level (`name`, `phone`, `email`, `message`) lands in
 * `lead.meta` — the free-form, source-specific payload of D56 — unless it
 * declares `group: 'requirement'`.
 */

import {
  BEDROOM_OPTIONS,
  LEAD_SOURCES,
  LISTING_TYPES,
  PRICE_BUCKETS_RENT,
  PRICE_BUCKETS_SALE,
  REQUIREMENT_TIMELINES,
} from '../config/enums';

/** The four boxes almost every form opens with. */
export const DEFAULT_FIELDS = [
  {
    name: 'name',
    label: 'Your name',
    type: 'text',
    required: true,
    placeholder: 'Full name',
    autoComplete: 'name',
    half: true,
  },
  {
    name: 'phone',
    label: 'Phone',
    type: 'tel',
    required: true,
    placeholder: '98XXX XXXXX',
    autoComplete: 'tel',
    half: true,
  },
  {
    name: 'email',
    label: 'E-mail',
    type: 'email',
    required: false,
    placeholder: 'you@example.com',
    autoComplete: 'email',
  },
  {
    name: 'message',
    label: 'Message',
    type: 'textarea',
    required: false,
    placeholder: 'Anything we should know?',
  },
];

/** The same four with the e-mail address compulsory — the written-reply forms. */
const withRequiredEmail = (fields) =>
  fields.map((field) => (field.name === 'email' ? { ...field, required: true } : field));

/** `DEFAULT_FIELDS` with extra boxes inserted before the message box. */
function fieldsWith(extra = [], { emailRequired = false, message } = {}) {
  const base = emailRequired ? withRequiredEmail(DEFAULT_FIELDS) : DEFAULT_FIELDS;
  const head = base.filter((field) => field.name !== 'message');
  const tail = base.find((field) => field.name === 'message');
  const last = message === null ? [] : [{ ...tail, ...(message ?? {}) }];
  return [...head, ...extra, ...last];
}

/** A price bucket as a `min-max` option value; the open-ended one ends in `-`. */
export const bucketOptions = (buckets) =>
  buckets.map((bucket) => ({ value: `${bucket.min}-${bucket.max ?? ''}`, label: bucket.label }));

/** `"5000000-10000000"` back into the two numbers §6.7 stores. */
export function budgetToBody(value) {
  const [min, max] = String(value ?? '').split('-');
  return {
    budgetMin: min === '' ? null : Number(min),
    budgetMax: max === '' || max === undefined ? null : Number(max),
  };
}

/**
 * The six requirement selects of D82 — what, where, how big, how much, by when.
 *
 * Every one of them nests under `requirement` in the `POST /leads` body, and
 * the budget bands follow the listing type chosen above them: the sale and rent
 * scales are two orders of magnitude apart (D90).
 *
 * @param {{propertyTypes?: Array<object>, localities?: Array<object>}} [masterData]
 * @returns {Array<object>} field descriptors
 */
export function requirementFields({ propertyTypes = [], localities = [] } = {}) {
  return [
    {
      name: 'listingType',
      label: 'I want to',
      type: 'select',
      group: 'requirement',
      placeholder: 'Buy, rent or lease',
      options: LISTING_TYPES.options,
      half: true,
    },
    {
      name: 'propertyTypeId',
      label: 'Property type',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any property type',
      options: propertyTypes.map((type) => ({ value: String(type.id), label: type.name })),
      toBody: (value) => ({ propertyTypeId: Number(value) }),
      half: true,
    },
    {
      name: 'localityId',
      label: 'Preferred locality',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any locality',
      options: localities.map((locality) => ({ value: String(locality.id), label: locality.name })),
      toBody: (value) => ({ localityId: Number(value) }),
      half: true,
    },
    {
      name: 'bedrooms',
      label: 'Bedrooms',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any configuration',
      options: BEDROOM_OPTIONS.options.map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
      toBody: (value) => ({ bedrooms: Number(value) }),
      half: true,
    },
    {
      name: 'budget',
      label: 'Budget',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any budget',
      options: (values) =>
        bucketOptions(
          values.listingType === 'rent' || values.listingType === 'lease'
            ? PRICE_BUCKETS_RENT
            : PRICE_BUCKETS_SALE
        ),
      toBody: budgetToBody,
      half: true,
    },
    {
      name: 'timeline',
      label: 'Timeline',
      type: 'select',
      group: 'requirement',
      placeholder: 'When are you looking to move?',
      options: REQUIREMENT_TIMELINES.options,
      half: true,
    },
  ];
}

/** The slots a callback can be asked for; stored in `meta.preferredTime`. */
const PREFERRED_TIMES = [
  { value: 'morning', label: 'Morning (9 am – 12 pm)' },
  { value: 'afternoon', label: 'Afternoon (12 pm – 4 pm)' },
  { value: 'evening', label: 'Evening (4 pm – 8 pm)' },
  { value: 'anytime', label: 'Any time' },
];

/**
 * Every entry point of the site, keyed by the name a component passes to
 * `openLeadModal({ entry })` or `leadFormProps(entry)`.
 *
 * `source` is always a `LEAD_SOURCES` value — `leadSources.test.js` asserts it.
 * `gated` names the `leadStorage` unlock kind a delivery opens; `requirement`
 * adds the six selects of D82; `subscriber` marks the one entry that is not a
 * lead at all (the newsletter goes to `POST /newsletter/subscribe`).
 */
export const ENTRY_POINTS = {
  'property-enquiry': {
    source: 'property-enquiry',
    defaultTitle: 'Enquire about this property',
    subtitle: 'An advisor will call with the price sheet, the availability and a visit slot.',
    fields: DEFAULT_FIELDS,
  },

  'brochure-download': {
    source: 'brochure-download',
    defaultTitle: 'Download the brochure',
    subtitle: 'Share your details once and the file opens straight away.',
    gated: 'documents',
    fields: fieldsWith([], { message: null }),
  },

  'floor-plan-request': {
    source: 'floor-plan-request',
    defaultTitle: 'View the floor plans',
    subtitle: 'An advisor sends the drawings and the current price list for this project.',
    gated: 'floorPlans',
    fields: fieldsWith([], { message: null }),
  },

  'document-request': {
    source: 'document-request',
    defaultTitle: 'Open the documents',
    subtitle: 'Share your details once to open the papers for this listing.',
    gated: 'documents',
    fields: fieldsWith([], { message: null }),
  },

  'price-request': {
    source: 'price-request',
    defaultTitle: 'Get the price',
    subtitle: 'We send the current rate, the payment plan and what is still available.',
    fields: DEFAULT_FIELDS,
  },

  'site-visit-request': {
    source: 'site-visit-request',
    defaultTitle: 'Schedule a site visit',
    subtitle: 'Tell us when suits you and an advisor confirms the slot.',
    fields: fieldsWith([
      {
        name: 'preferredDate',
        label: 'Preferred date',
        type: 'date',
        required: false,
        helper: 'We confirm the slot on the phone.',
        half: true,
      },
      {
        name: 'preferredTime',
        label: 'Preferred time',
        type: 'select',
        required: false,
        placeholder: 'Any time',
        options: PREFERRED_TIMES,
        half: true,
      },
    ]),
  },

  'callback-request': {
    source: 'callback-request',
    defaultTitle: 'Request a call back',
    subtitle: 'Say when to ring and an advisor will call you then.',
    fields: fieldsWith([
      {
        name: 'preferredTime',
        label: 'When should we call?',
        type: 'select',
        required: false,
        placeholder: 'Any time',
        options: PREFERRED_TIMES,
      },
    ]),
  },

  'post-requirement': {
    source: 'post-requirement',
    defaultTitle: 'Post your requirement',
    subtitle: 'Tell us what you are looking for and we will send a shortlist that fits.',
    requirement: true,
    fields: DEFAULT_FIELDS,
  },

  'contact-page': {
    source: 'contact-page',
    defaultTitle: 'Send us a message',
    subtitle: 'Fill this in and we will come back to you as soon as we can.',
    fields: fieldsWith(
      [
        {
          name: 'subject',
          label: 'Subject',
          type: 'select',
          required: true,
          placeholder: 'What is this about?',
          options: [
            { value: 'property-enquiry', label: 'Property enquiry' },
            { value: 'sell-or-let', label: 'Sell or let my property' },
            { value: 'home-loan', label: 'Home loan assistance' },
            { value: 'legal', label: 'Legal assistance' },
            { value: 'partnership', label: 'Partnership' },
            { value: 'careers', label: 'Careers' },
            { value: 'other', label: 'Something else' },
          ],
        },
      ],
      { emailRequired: true, message: { required: true, placeholder: 'How can we help?' } }
    ),
  },

  'home-loan': {
    source: 'home-loan',
    defaultTitle: 'Check what you can borrow',
    subtitle: 'An advisor compares the lenders you qualify for and comes back to you.',
    fields: fieldsWith(
      [
        {
          name: 'monthlyIncome',
          label: 'Monthly income',
          type: 'select',
          required: true,
          placeholder: 'Select a band',
          options: [
            { value: 'below-50k', label: 'Below ₹50,000' },
            { value: '50k-1l', label: '₹50,000 – ₹1,00,000' },
            { value: '1l-2l', label: '₹1,00,000 – ₹2,00,000' },
            { value: '2l-5l', label: '₹2,00,000 – ₹5,00,000' },
            { value: 'above-5l', label: 'Above ₹5,00,000' },
          ],
          half: true,
        },
        {
          name: 'desiredLoanAmount',
          label: 'Loan amount',
          type: 'select',
          required: true,
          placeholder: 'Select a band',
          options: [
            { value: 'below-30l', label: 'Below ₹30 L' },
            { value: '30l-50l', label: '₹30 L – ₹50 L' },
            { value: '50l-1cr', label: '₹50 L – ₹1 Cr' },
            { value: '1cr-2cr', label: '₹1 Cr – ₹2 Cr' },
            { value: 'above-2cr', label: 'Above ₹2 Cr' },
          ],
          half: true,
        },
      ],
      { emailRequired: true }
    ),
  },

  'financial-assessment': {
    source: 'financial-assessment',
    defaultTitle: 'Check your eligibility',
    subtitle: 'Answer a few questions and we estimate what a lender would offer.',
    fields: DEFAULT_FIELDS,
  },

  'bank-eligibility': {
    source: 'bank-eligibility',
    defaultTitle: 'Check with this lender',
    subtitle: 'We pass your answers to the bank and come back with what they say.',
    fields: DEFAULT_FIELDS,
  },

  'legal-assistance': {
    source: 'legal-assistance',
    defaultTitle: 'Request a legal consultation',
    subtitle: 'Describe what you need and we connect you with the right expert.',
    fields: fieldsWith(
      [
        {
          name: 'serviceType',
          label: 'Service needed',
          type: 'select',
          required: true,
          placeholder: 'Select a service',
          options: [
            { value: 'title-verification', label: 'Title verification' },
            { value: 'agreement-drafting', label: 'Agreement drafting' },
            { value: 'registration', label: 'Registration support' },
            { value: 'rera', label: 'RERA matters' },
            { value: 'due-diligence', label: 'Due diligence' },
            { value: 'dispute', label: 'Dispute resolution' },
            { value: 'other', label: 'Something else' },
          ],
        },
      ],
      { emailRequired: true, message: { label: 'Your situation' } }
    ),
  },

  'interior-design': {
    source: 'interior-design',
    defaultTitle: 'Book a consultation',
    subtitle: 'Tell us about the space and a designer will get in touch.',
    fields: fieldsWith(
      [
        {
          name: 'propertyType',
          label: 'Property type',
          type: 'select',
          required: true,
          placeholder: 'Select a type',
          options: [
            { value: '1bhk', label: '1 BHK' },
            { value: '2bhk', label: '2 BHK' },
            { value: '3bhk', label: '3 BHK' },
            { value: '4bhk-plus', label: '4 BHK or larger' },
            { value: 'villa', label: 'Villa / independent house' },
            { value: 'commercial', label: 'Commercial space' },
          ],
          half: true,
        },
        {
          name: 'budget',
          label: 'Budget',
          type: 'select',
          required: false,
          placeholder: 'Select a band',
          options: [
            { value: 'below-5l', label: 'Below ₹5 L' },
            { value: '5l-10l', label: '₹5 L – ₹10 L' },
            { value: '10l-20l', label: '₹10 L – ₹20 L' },
            { value: '20l-50l', label: '₹20 L – ₹50 L' },
            { value: 'above-50l', label: 'Above ₹50 L' },
          ],
          half: true,
        },
      ],
      { emailRequired: true }
    ),
  },

  'sell-let': {
    source: 'sell-let',
    defaultTitle: 'Submit your property',
    subtitle: 'Our team reviews the details and comes back with a price opinion.',
    fields: fieldsWith(
      [
        {
          name: 'propertyType',
          label: 'Property type',
          type: 'select',
          required: true,
          placeholder: 'Select a type',
          options: [
            { value: 'apartment', label: 'Apartment' },
            { value: 'villa', label: 'Villa / independent house' },
            { value: 'plot', label: 'Plot / land' },
            { value: 'commercial', label: 'Commercial property' },
            { value: 'penthouse', label: 'Penthouse' },
          ],
          half: true,
        },
        {
          name: 'location',
          label: 'Location',
          type: 'text',
          required: true,
          placeholder: 'Locality or project name',
          half: true,
        },
        {
          name: 'askingPrice',
          label: 'Expected price',
          type: 'text',
          required: false,
          placeholder: 'e.g. ₹1.2 Cr',
          helper: 'Leave this blank if you would like us to suggest one.',
        },
      ],
      { emailRequired: true, message: { label: 'Property details' } }
    ),
  },

  careers: {
    source: 'careers',
    defaultTitle: 'Send us your profile',
    subtitle: "Didn't find a role that fits? Tell us about yourself and we will keep in touch.",
    fields: fieldsWith([], {
      emailRequired: true,
      message: {
        label: 'Tell us about yourself',
        required: true,
        placeholder: 'Your experience, what you are looking for and a link to your CV.',
      },
    }),
  },

  partnership: {
    source: 'partnership',
    defaultTitle: 'Partnership enquiry',
    subtitle: 'Tell us about your company and what you have in mind.',
    fields: fieldsWith(
      [
        {
          name: 'companyName',
          label: 'Company name',
          type: 'text',
          required: true,
          placeholder: 'Your company',
          half: true,
        },
        {
          name: 'partnershipType',
          label: 'Partnership type',
          type: 'select',
          required: true,
          placeholder: 'Select a type',
          options: [
            { value: 'builder', label: 'Builder / developer' },
            { value: 'agent', label: 'Real-estate agent' },
            { value: 'financial', label: 'Financial institution' },
            { value: 'interior', label: 'Interior designer' },
            { value: 'other', label: 'Other' },
          ],
          half: true,
        },
      ],
      { emailRequired: true }
    ),
  },

  'flexible-workspace': {
    source: 'flexible-workspace',
    defaultTitle: 'Enquire about workspaces',
    subtitle: 'Tell us how your team works and we curate the options that fit.',
    fields: fieldsWith(
      [
        {
          name: 'workspaceType',
          label: 'Workspace type',
          type: 'select',
          required: true,
          placeholder: 'Select a type',
          options: [
            { value: 'hot-desk', label: 'Hot desk' },
            { value: 'dedicated-desk', label: 'Dedicated desk' },
            { value: 'private-office', label: 'Private office' },
            { value: 'meeting-room', label: 'Meeting room' },
            { value: 'virtual-office', label: 'Virtual office' },
          ],
          half: true,
        },
        {
          name: 'teamSize',
          label: 'Team size',
          type: 'number',
          required: false,
          placeholder: 'Seats needed',
          half: true,
        },
      ],
      { emailRequired: true, message: { label: 'Requirements' } }
    ),
  },

  'direct-lease-retail': {
    source: 'direct-lease-retail',
    defaultTitle: 'Enquire about spaces',
    subtitle: 'Tell us what you need and we shortlist the spaces available on direct lease.',
    fields: fieldsWith(
      [
        {
          name: 'spaceType',
          label: 'Space type',
          type: 'select',
          required: true,
          placeholder: 'Select a type',
          options: [
            { value: 'retail-shop', label: 'Retail shop' },
            { value: 'office', label: 'Office space' },
            { value: 'showroom', label: 'Showroom' },
            { value: 'warehouse', label: 'Warehouse / storage' },
            { value: 'restaurant', label: 'Restaurant / café' },
          ],
          half: true,
        },
        {
          name: 'areaRequired',
          label: 'Area required',
          type: 'text',
          required: false,
          placeholder: 'e.g. 2,000 sq ft',
          half: true,
        },
      ],
      { emailRequired: true, message: { label: 'Requirements' } }
    ),
  },

  'real-estate-awareness': {
    source: 'real-estate-awareness',
    defaultTitle: 'Talk to an advisor',
    subtitle: 'Tell us what you are working on and we will send the guidance that applies.',
    fields: fieldsWith(
      [
        {
          name: 'interest',
          label: 'Interested in',
          type: 'select',
          required: true,
          placeholder: 'What are you looking for?',
          options: [
            { value: 'buying', label: 'Buying a property' },
            { value: 'selling', label: 'Selling a property' },
            { value: 'renting', label: 'Renting a property' },
            { value: 'home-loan', label: 'Home loan assistance' },
            { value: 'legal', label: 'Legal assistance' },
            { value: 'general', label: 'General consultation' },
          ],
        },
      ],
      { emailRequired: true }
    ),
  },

  newsletter: {
    source: 'newsletter',
    defaultTitle: 'Property insight, once a month',
    subtitle: 'Locality notes and practical guidance. No sales calls.',
    // Not a lead: this entry subscribes through `POST /newsletter/subscribe`.
    subscriber: true,
    fields: [
      {
        name: 'name',
        label: 'Your name',
        type: 'text',
        required: false,
        placeholder: 'Full name',
        autoComplete: 'name',
      },
      {
        name: 'email',
        label: 'E-mail',
        type: 'email',
        required: true,
        placeholder: 'you@example.com',
        autoComplete: 'email',
      },
    ],
  },

  article: {
    source: 'article',
    defaultTitle: 'Speak to an advisor',
    subtitle: 'Tell us what you are looking for and we will come back with the trade-offs.',
    fields: DEFAULT_FIELDS,
  },

  faq: {
    source: 'faq',
    defaultTitle: 'Ask your question',
    subtitle: 'We answer as soon as we can.',
    fields: fieldsWith([], {
      message: {
        label: 'Your question',
        required: true,
        placeholder: 'What would you like to know?',
      },
    }),
  },

  'locality-page': {
    source: 'locality-page',
    defaultTitle: 'Looking in this locality?',
    subtitle: 'An advisor sends the current shortlist, including what never reaches a portal.',
    fields: DEFAULT_FIELDS,
  },

  'developer-page': {
    source: 'developer-page',
    defaultTitle: 'Interested in this builder?',
    subtitle: 'We send the availability, the configurations and the payment plans.',
    fields: DEFAULT_FIELDS,
  },

  // The two click records. They carry no form at all: `WhatsAppButton` and
  // `CallButton` file them silently for a visitor who has already identified
  // themselves, and file nothing for one who has not.
  'whatsapp-click': {
    source: 'whatsapp-click',
    defaultTitle: 'WhatsApp',
    click: true,
    fields: DEFAULT_FIELDS,
  },

  'call-click': {
    source: 'call-click',
    defaultTitle: 'Call',
    click: true,
    fields: DEFAULT_FIELDS,
  },

  // Reserved (§6.17): the hero search files no lead today, but the value exists
  // so that a future "save this search" has a canonical source to use.
  'hero-search': {
    source: 'hero-search',
    defaultTitle: 'Save this search',
    subtitle: 'We will tell you when something matching comes up.',
    requirement: true,
    fields: DEFAULT_FIELDS,
  },
};

/** Every entry key, for the tests and for an admin filter. */
export const ENTRY_KEYS = Object.keys(ENTRY_POINTS);

/** The boxes the API stores at the top level of a lead rather than in `meta`. */
const TOP_LEVEL_FIELDS = new Set(['name', 'phone', 'email', 'message']);

/**
 * The boxes a source's forms ask for that land in `lead.meta`, keyed by name —
 * so the CRM prints "When should we call?: Evening (4 pm – 8 pm)" rather than
 * `preferredTime: evening` (QA-53). The first form that asks for a name wins
 * when two entries of one source ask for it.
 *
 * @param {string} source a `LEAD_SOURCES` value
 * @returns {Map<string, object>} field descriptors
 */
export function metaFieldsOf(source) {
  const fields = new Map();

  for (const config of Object.values(ENTRY_POINTS)) {
    if (config.source !== source) continue;
    for (const field of config.fields ?? []) {
      if (field.toBody || field.group === 'requirement') continue;
      if (TOP_LEVEL_FIELDS.has(field.name) && field.group !== 'meta') continue;
      if (!fields.has(field.name)) fields.set(field.name, field);
    }
  }

  return fields;
}

/**
 * One entry point, or `null` when the key is unknown.
 *
 * @param {string} entry
 * @returns {object|null}
 */
export function entryPoint(entry) {
  return ENTRY_POINTS[entry] ?? null;
}

/**
 * The same fields, with some of them opening on a value.
 *
 * "Price for the 3 BHK" belongs in the message box as text the visitor can
 * edit, not as a hidden field that would silently overwrite whatever they
 * typed instead.
 *
 * @param {Array<object>} fields
 * @param {object} prefill `{ fieldName: value }`
 * @returns {Array<object>}
 */
export function withDefaults(fields, prefill = {}) {
  return (Array.isArray(fields) ? fields : []).map((field) =>
    Object.prototype.hasOwnProperty.call(prefill, field.name)
      ? { ...field, defaultValue: prefill[field.name] }
      : field
  );
}

/**
 * The `LeadForm` props an entry point implies, with overrides on top.
 *
 * `title` and `subtitle` fall back to the entry's own copy, so a caller that
 * only wants a different heading passes that one key. A `prefill` override is
 * not a prop: it opens the named boxes on a value (see {@link withDefaults}).
 *
 * @param {string} entry a key of {@link ENTRY_POINTS}
 * @param {object} [overrides] any `LeadForm` prop, plus `prefill`
 * @returns {object} props ready to spread
 */
export function leadFormProps(entry, overrides = {}) {
  const { prefill, ...props } = overrides;
  const config = entryPoint(entry);
  if (!config) return { source: LEAD_SOURCES.values[0], ...props };

  const { defaultTitle, gated: _gated, click: _click, subscriber: _subscriber, ...rest } = config;
  const merged = { title: defaultTitle, ...rest, ...props };
  if (prefill) merged.fields = withDefaults(merged.fields, prefill);
  return merged;
}

const leadSources = {
  DEFAULT_FIELDS,
  ENTRY_POINTS,
  ENTRY_KEYS,
  entryPoint,
  leadFormProps,
  metaFieldsOf,
  withDefaults,
};
export default leadSources;
