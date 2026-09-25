/**
 * "Is this still in use?" (00_MASTER_CONTEXT.md §5.14; decision D88).
 *
 * Deleting a locality that eleven listings point at does not make those
 * listings better; it makes them wrong. So every master-data delete asks here
 * first, and a non-empty answer becomes a 409 that names what is in the way:
 *
 *   { message: 'This item is in use.',
 *     errors: { id: ['Used by 3 properties'] },
 *     data: { usedBy: [{ type: 'property', id: 12, title: 'Lakeview Heights' }] } }
 *
 * The same lookup, read the other way round, is `media.usedIn` — which is not
 * a guard but a hint: a picture is "used" when its URL appears anywhere in the
 * data, and that is a string search rather than a foreign key.
 *
 * Only a **named** reference counts. A `team` block with an empty `memberIds`
 * renders everybody and a `partners` block with no `category` renders every
 * partner, but neither names a record, so neither can be left dangling by a
 * delete — and treating them as usages would make every new team member and
 * every new partner undeletable the moment such a block exists.
 */

/** The runtime database's state, resolved lazily so requiring this file is free. */
function resolveSource(source) {
  if (source) return source;
  return require('../db').getState();
}

const rows = (source, name) => (Array.isArray(source?.[name]) ? source[name] : []);

const sameId = (left, right) =>
  left !== null && left !== undefined && String(left) === String(right);

const includesId = (list, id) => Array.isArray(list) && list.some((entry) => sameId(entry, id));

/** `{ type, id, title }` for one record, using the first title-like field. */
const usage = (type, record) => ({
  type,
  id: record?.id ?? null,
  title: record?.title ?? record?.name ?? record?.question ?? record?.email ?? String(record?.id),
});

/** Every record of `name` that `predicate` accepts, as usages of `type`. */
const usagesIn = (source, name, type, predicate) =>
  rows(source, name)
    .filter(predicate)
    .map((record) => usage(type, record));

/** The blocks of every page, flattened to `{ page, block }` pairs. */
const pageBlocks = (source) =>
  rows(source, 'pages').flatMap((page) =>
    (Array.isArray(page.blocks) ? page.blocks : []).map((block) => ({ page, block }))
  );

/** Pages holding at least one block of `type` that `predicate` accepts. */
function pagesUsing(source, type, predicate) {
  const seen = new Set();
  const found = [];

  for (const { page, block } of pageBlocks(source)) {
    if (block?.type !== type || seen.has(page.id)) continue;
    if (!predicate(block.data ?? {})) continue;
    seen.add(page.id);
    found.push(usage('page', page));
  }

  return found;
}

/**
 * One finder per master-data type. A type that is absent — `bank` — has no
 * dependants by design and is always safe to delete.
 *
 * @type {Record<string, (id: number|string, source: object) => Array<object>>}
 */
const FINDERS = {
  locality: (id, source) => [
    ...usagesIn(source, 'properties', 'property', (p) => sameId(p.location?.localityId, id)),
    ...usagesIn(source, 'leads', 'lead', (l) => sameId(l.requirement?.localityId, id)),
  ],

  city: (id, source) => [
    ...usagesIn(source, 'localities', 'locality', (l) => sameId(l.cityId, id)),
    ...usagesIn(source, 'properties', 'property', (p) => sameId(p.location?.cityId, id)),
  ],

  // Listings and types hold a segment's slug, not its id (QA-52).
  segment: (id, source) => {
    const segment = rows(source, 'segments').find((row) => sameId(row.id, id));
    if (!segment) return [];
    return [
      ...usagesIn(source, 'propertyTypes', 'propertyType', (t) => t.segment === segment.slug),
      ...usagesIn(source, 'properties', 'property', (p) => p.segment === segment.slug),
    ];
  },

  propertyType: (id, source) => [
    ...usagesIn(source, 'properties', 'property', (p) => sameId(p.propertyTypeId, id)),
    ...usagesIn(source, 'faqs', 'faq', (f) => sameId(f.propertyTypeId, id)),
  ],

  amenity: (id, source) =>
    usagesIn(source, 'properties', 'property', (p) => includesId(p.amenityIds, id)),

  badge: (id, source) =>
    usagesIn(source, 'properties', 'property', (p) => includesId(p.badgeIds, id)),

  developer: (id, source) =>
    usagesIn(source, 'properties', 'property', (p) => sameId(p.project?.developerId, id)),

  articleCategory: (id, source) =>
    usagesIn(source, 'articles', 'article', (a) => sameId(a.categoryId, id)),

  articleTag: (id, source) =>
    usagesIn(source, 'articles', 'article', (a) => includesId(a.tagIds, id)),

  author: (id, source) => usagesIn(source, 'articles', 'article', (a) => sameId(a.authorId, id)),

  faq: (id, source) => pagesUsing(source, 'faq', (data) => includesId(data.faqIds, id)),

  testimonial: (id, source) =>
    pagesUsing(source, 'testimonials', (data) => includesId(data.ids, id)),

  teamMember: (id, source) => [
    ...usagesIn(source, 'properties', 'property', (p) => sameId(p.agent?.teamMemberId, id)),
    ...pagesUsing(source, 'team', (data) => includesId(data.memberIds, id)),
  ],

  // A `partners` block selects by category rather than by id, so only a block
  // that names *this* partner's category is a reference to it.
  partner: (id, source) =>
    pagesUsing(source, 'partners', (data) => {
      if (!data.category) return false;
      const partner = rows(source, 'partners').find((row) => sameId(row.id, id));
      return Boolean(partner) && data.category === partner.category;
    }),

  job: (id, source) =>
    usagesIn(source, 'jobApplications', 'jobApplication', (a) => sameId(a.jobId, id)),
};

/**
 * What still points at one record.
 *
 * @param {string} type a key of {@link FINDERS} — `'locality'`, `'amenity'`, …
 * @param {number|string} id
 * @param {object} [source] collections to search; the runtime database by default
 * @returns {Array<{type: string, id: number, title: string}>} empty when the
 *   record is free to delete, including for a type with no dependants at all
 */
function findUsages(type, id, source) {
  const finder = FINDERS[type];
  if (!finder) return [];
  return finder(id, resolveSource(source));
}

/**
 * The plural noun a 409 message uses for a usage type.
 *
 * Every type a media usage can report is here too (QA-63): the media 409 read
 * "Used by 1 teamMember" — the model's own spelling, in a sentence meant for
 * an editor.
 */
const NOUNS = {
  property: ['property', 'properties'],
  propertyType: ['property type', 'property types'],
  lead: ['lead', 'leads'],
  locality: ['locality', 'localities'],
  developer: ['developer', 'developers'],
  bank: ['bank', 'banks'],
  faq: ['FAQ', 'FAQs'],
  article: ['article', 'articles'],
  author: ['author', 'authors'],
  page: ['page', 'pages'],
  teamMember: ['team member', 'team members'],
  partner: ['partner', 'partners'],
  testimonial: ['testimonial', 'testimonials'],
  job: ['job opening', 'job openings'],
  jobApplication: ['application', 'applications'],
  // There is one of each, so they are named rather than counted.
  settings: 'the site settings',
  seoSettings: 'the SEO settings',
};

/**
 * "Used by 3 properties and 1 lead" — the sentence a 409 puts under `errors.id`.
 *
 * @param {Array<{type: string}>} usages
 * @returns {string}
 */
function describeUsages(usages) {
  const counts = new Map();
  for (const entry of usages) counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);

  const parts = [...counts].map(([type, count]) => {
    if (typeof NOUNS[type] === 'string') return NOUNS[type];
    const [one, many] = NOUNS[type] ?? [type, `${type}s`];
    return `${count} ${count === 1 ? one : many}`;
  });

  if (parts.length <= 1) return `Used by ${parts[0] ?? 'other records'}`;
  return `Used by ${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/**
 * The collections a media URL can appear in, with the type name each reports.
 *
 * Every record a visitor can see a file on (QA-63). The list stopped at seven,
 * so a bank's logo, an author's photograph, a testimonial's avatar, a picture
 * in a FAQ answer or a job opening, and the default share image of the SEO
 * settings all read "Not used anywhere yet — removing it here changes nothing
 * a visitor sees", and their delete was never refused.
 */
const MEDIA_HAYSTACKS = [
  ['properties', 'property'],
  ['articles', 'article'],
  ['pages', 'page'],
  ['localities', 'locality'],
  ['developers', 'developer'],
  ['banks', 'bank'],
  ['authors', 'author'],
  ['teamMembers', 'teamMember'],
  ['partners', 'partner'],
  ['testimonials', 'testimonial'],
  ['faqs', 'faq'],
  ['jobOpenings', 'job'],
];

/** The single records a media URL can appear in, and how each is named. */
const MEDIA_SINGLETONS = [
  ['siteSettings', { type: 'settings', id: 0, title: 'Site settings' }],
  ['seoSettings', { type: 'seoSettings', id: 0, title: 'SEO settings' }],
];

/** Every collection and singleton {@link findMediaUsages} reads. */
const MEDIA_USAGE_COLLECTIONS = [
  ...MEDIA_HAYSTACKS.map(([collection]) => collection),
  ...MEDIA_SINGLETONS.map(([name]) => name),
];

/**
 * A character that carries a URL's path on. An address followed by one is a
 * longer address, not this one: `…/villa.jpg` is not used by a page showing
 * `…/villa.jpg.webp`, nor `…/seed/sna-1` by `…/seed/sna-10`. Anything else — a
 * closing quote, `?`, `#`, `)`, a space, the end — ends it.
 */
const PATH_CHARACTER = /[A-Za-z0-9\-._~/%]/;

/**
 * Whether `text` holds `url` as a whole address rather than as the start of a
 * longer one (QA-63).
 *
 * @param {string} text a record, as JSON
 * @param {string} url
 * @returns {boolean}
 */
function holdsUrl(text, url) {
  let from = text.indexOf(url);
  while (from !== -1) {
    const next = text.charAt(from + url.length);
    if (next === '' || !PATH_CHARACTER.test(next)) return true;
    from = text.indexOf(url, from + 1);
  }
  return false;
}

/**
 * A reusable "where is this address used?" for many addresses at once.
 *
 * Each record is turned into JSON once, however many addresses are asked
 * about (QA-63). The library asks for the page of files it shows, and asking
 * per file cost a full serialisation of every property, article and page per
 * file — about a second for each page of the grid.
 *
 * A picture is referenced from a dozen differently-shaped places (a property's
 * `images[].url`, an article's `featuredImage.url`, a page block's `data`, the
 * site logo), and the model has no join table for any of them, so the honest
 * implementation is a string search. It warns an editor before they delete,
 * and a delete asked for with `force` goes ahead regardless.
 *
 * @param {object} [source] the collections to search; the runtime database by default
 * @returns {(url: string) => Array<{type: string, id: number, title: string}>}
 */
function mediaUsageIndex(source) {
  const db = resolveSource(source);

  const entries = [];
  for (const [collection, type] of MEDIA_HAYSTACKS) {
    for (const record of rows(db, collection)) {
      entries.push({ text: JSON.stringify(record), usage: () => usage(type, record) });
    }
  }
  for (const [name, found] of MEDIA_SINGLETONS) {
    const record = db?.[name];
    if (record && typeof record === 'object') {
      entries.push({ text: JSON.stringify(record), usage: () => ({ ...found }) });
    }
  }

  return (url) => {
    if (typeof url !== 'string' || url === '') return [];
    // The address as it sits inside a JSON string, so one with a `"` or a `\`
    // in it is still found.
    const needle = JSON.stringify(url).slice(1, -1);
    return entries.filter((entry) => holdsUrl(entry.text, needle)).map((entry) => entry.usage());
  };
}

/**
 * Where one media URL appears — best effort, by searching the stored JSON
 * (§6.12). {@link mediaUsageIndex} answers the same question for many
 * addresses at the cost of one.
 *
 * @param {string} url
 * @param {object} [source]
 * @returns {Array<{type: string, id: number, title: string}>}
 */
function findMediaUsages(url, source) {
  if (typeof url !== 'string' || url === '') return [];
  return mediaUsageIndex(source)(url);
}

/**
 * The collections {@link findUsages} and {@link findMediaUsages} read.
 *
 * A caller that is not the runtime database — a test over its own copy of the
 * seed — builds `source` from this list rather than letting the finders reach
 * for the real one.
 */
const USAGE_COLLECTIONS = [
  'properties',
  'propertyTypes',
  'segments',
  'leads',
  'localities',
  'faqs',
  'articles',
  'pages',
  'teamMembers',
  'partners',
  'jobApplications',
  'developers',
  'siteSettings',
];

module.exports = {
  findUsages,
  findMediaUsages,
  mediaUsageIndex,
  holdsUrl,
  describeUsages,
  FINDERS,
  USAGE_COLLECTIONS,
  MEDIA_USAGE_COLLECTIONS,
};
