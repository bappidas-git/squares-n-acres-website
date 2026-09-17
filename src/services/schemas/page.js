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
  HEADER_MENUS,
  LEAD_SOURCES,
  PAGE_STATUS,
  PAGE_TEMPLATES,
} = require('../../config/enums');
const { seo } = require('./seo');

/** One or more slug segments joined by `/`: `about`, `buyer-assistance/home-loan`. */
const PATH_SLUG_PATTERN = '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$';

/** The contract's ceiling for a page path (§6.10). */
const PATH_SLUG_MAX_LENGTH = 120;

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
  slug: pathSlug({ required: true }),
  title: { type: 'string', required: true, min: 2, maxLength: 150 },
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
  order: { type: 'int', min: 0, default: 0 },
  showInFooter: { type: 'bool', default: false },
  footerColumn: { type: 'enum', enum: FOOTER_COLUMNS.values, nullable: true, default: null },
  showInHeader: { type: 'bool', default: false },
  headerMenu: { type: 'enum', enum: HEADER_MENUS.values, nullable: true, default: null },
};

module.exports = {
  create,
  update: create,
  patch: allOptional(create),
  PATH_SLUG_PATTERN,
  PATH_SLUG_MAX_LENGTH,
};
