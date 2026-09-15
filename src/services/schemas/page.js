/**
 * CMS page write schemas (00_MASTER_CONTEXT.md §6.10).
 *
 * A block's `data` shape depends on its `type`; the descriptor keeps `data` as
 * a free-form object and `BLOCK_TYPES.defaultDataOf(type)` in
 * `src/config/enums.js` is what seeds and validates a new block's keys.
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

/** Every key optional, one level deep — the `PATCH` variant of a write shape. */
const allOptional = (shape) =>
  Object.fromEntries(
    Object.entries(shape).map(([name, descriptor]) => {
      const { required: _required, ...rest } = descriptor;
      return [name, rest];
    })
  );

const create = {
  slug: { type: 'slug', required: true, maxLength: 120 },
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
  seo,
  order: { type: 'int', min: 0, default: 0 },
  showInFooter: { type: 'bool', default: false },
  footerColumn: { type: 'enum', enum: FOOTER_COLUMNS.values, nullable: true, default: null },
  showInHeader: { type: 'bool', default: false },
  headerMenu: { type: 'enum', enum: HEADER_MENUS.values, nullable: true, default: null },
};

module.exports = { create, update: create, patch: allOptional(create) };
