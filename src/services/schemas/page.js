/**
 * CMS page write schemas (00_MASTER_CONTEXT.md §6.10).
 *
 * A block's `data` shape depends on its `type`; the descriptor keeps `data` as
 * a free-form object and `BLOCK_TYPES.defaultDataOf(type)` in
 * `src/config/enums.js` is what seeds and validates a new block's keys.
 *
 * **A page's slug is a URL path, not a single segment.** §6.10 seeds
 * `buyer-assistance/home-loan` and the public route serves the page at exactly
 * that path, so `slug` — and the `seo.slug` that mirrors it (D34) — are typed
 * as strings matching {@link PATH_SLUG_PATTERN} rather than as `slug`, whose
 * `[a-z0-9-]+` would refuse the separator. Pages are the only collection that
 * does this; `scripts/validate-seed.js` has said the same about the seed since
 * prompt 10.
 */

const {
  BLOCK_TYPES,
  FOOTER_COLUMNS,
  LEAD_SOURCES,
  PAGE_STATUS,
  PAGE_TEMPLATES,
} = require('../../config/enums');
const { headerMenuRef } = require('./refs');
const { seo } = require('./seo');

/**
 * One or more slug segments joined by `/`: `about`, `buyer-assistance/home-loan`.
 *
 * The empty string is allowed for the same reason the `slug` **type** allows it
 * (§5.9, prompt 44's BB-01): an empty slug is a *request to derive one from the
 * title*, which `mock-server/lib/crud.js` `resolveSlug` does. A page that must
 * carry a slug says so with `required`, not with this pattern.
 */
const PATH_SLUG_PATTERN = '^$|^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$';

/** The contract's ceiling for a page path (§6.10). */
const PATH_SLUG_MAX_LENGTH = 120;

/** The largest `order` a page may carry. */
const PAGE_ORDER_MAX = 100000;

/** The contract's bounds for a page's title (§6.10) — the form's as well (QA-56). */
const PAGE_TITLE_MIN_LENGTH = 2;
const PAGE_TITLE_MAX_LENGTH = 150;

/** A URL-path slug descriptor, with the message the pattern alone would not give. */
const pathSlug = (extra = {}) => ({
  type: 'string',
  maxLength: PATH_SLUG_MAX_LENGTH,
  pattern: PATH_SLUG_PATTERN,
  ...extra,
});

/** Every key optional, one level deep — the `PATCH` variant of a write shape. */
const allOptional = (shape) =>
  Object.fromEntries(
    Object.entries(shape).map(([name, descriptor]) => {
      const { required: _required, ...rest } = descriptor;
      return [name, rest];
    })
  );

const create = {
  // Empty means "derive it from the title", exactly as it does for every other
  // slugged resource (§5.9); pages were the one collection that answered 422
  // instead, which is why `pageService.duplicate()` had to resolve a slug of
  // its own before it could post a copy (MB-03).
  slug: pathSlug({ default: '' }),
  title: {
    type: 'string',
    required: true,
    min: PAGE_TITLE_MIN_LENGTH,
    maxLength: PAGE_TITLE_MAX_LENGTH,
  },
  template: { type: 'enum', enum: PAGE_TEMPLATES.values, required: true, default: 'standard' },
  status: { type: 'enum', enum: PAGE_STATUS.values, required: true, default: 'draft' },
  heroImageUrl: { type: 'url', nullable: true, default: null },
  blocks: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        type: { type: 'enum', enum: BLOCK_TYPES.values, required: true },
        order: { type: 'int', min: 0, default: 0 },
        data: { type: 'object', default: {} },
      },
    },
  },
  leadSource: { type: 'enum', enum: LEAD_SOURCES.values, nullable: true, default: null },
  // The shared `seo` shape, with the one field a page widens (see above).
  seo: { ...seo, shape: { ...seo.shape, slug: pathSlug({ default: '' }) } },
  // Capped so that a stray keystroke cannot store a number the column will
  // not hold (QA-56): the form took 99 999 999 999 and so did the API.
  order: { type: 'int', min: 0, max: PAGE_ORDER_MAX, default: 0 },
  showInFooter: { type: 'bool', default: false },
  footerColumn: {
    type: 'enum',
    enum: FOOTER_COLUMNS.values,
    nullable: true,
    requiredIf: { field: 'showInFooter', in: [true] },
    default: null,
  },
  showInHeader: { type: 'bool', default: false },
  // A `headerMenus` slug (QA-56) — it was one of three fixed values.
  headerMenu: headerMenuRef,
  // One of that menu's `submenus[].slug`, or `null` for the menu's own list.
  // The pages resource checks it against the menu it names.
  headerSubmenu: {
    type: 'string',
    nullable: true,
    maxLength: 75,
    pattern: '^[a-z0-9-]+$',
    default: null,
  },
};

module.exports = {
  create,
  update: create,
  patch: allOptional(create),
  PATH_SLUG_PATTERN,
  PATH_SLUG_MAX_LENGTH,
  PAGE_ORDER_MAX,
  PAGE_TITLE_MIN_LENGTH,
  PAGE_TITLE_MAX_LENGTH,
};
