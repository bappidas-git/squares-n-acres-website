/**
 * Article write schemas (00_MASTER_CONTEXT.md §6.8).
 *
 * `contentText`, `readingTimeMinutes`, `wordCount` and `viewCount` are derived
 * by the API on save and are not writable.
 */

const { ARTICLE_STATUS } = require('../../config/enums');
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
  slug: { type: 'slug', maxLength: 75, default: '' },
  title: { type: 'string', required: true, min: 20, maxLength: 100 },
  excerpt: { type: 'string', maxLength: 300, default: '' },
  content: { type: 'html', required: true },
  featuredImage: {
    type: 'object',
    shape: {
      url: { type: 'url', required: true },
      alt: { type: 'string', required: true, maxLength: 200 },
      caption: { type: 'string', nullable: true, maxLength: 300, default: null },
    },
    nullable: true,
    default: null,
  },
  categoryId: { type: 'int', required: true },
  tagIds: { type: 'array', items: { type: 'int' }, default: [] },
  authorId: { type: 'int', required: true },
  status: { type: 'enum', enum: ARTICLE_STATUS.values, required: true, default: 'draft' },
  publishedAt: { type: 'datetime', nullable: true, default: null },
  updatedAtDisplay: { type: 'datetime', nullable: true, default: null },
  isFeatured: { type: 'bool', default: false },
  allowComments: { type: 'bool', default: false },
  relatedArticleIds: { type: 'array', items: { type: 'int' }, max: 6, default: [] },
  relatedPropertyIds: { type: 'array', items: { type: 'int' }, max: 6, default: [] },
  faqs: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        question: { type: 'string', required: true, maxLength: 300 },
        answer: { type: 'html', required: true },
      },
    },
  },
  tableOfContents: { type: 'bool', default: true },
  seo,
};

module.exports = {
  create,
  update: create,
  patch: allOptional(create),
};
