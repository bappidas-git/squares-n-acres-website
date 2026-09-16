/**
 * Articles (00_MASTER_CONTEXT.md §5.14, §6.8; decision D28).
 *
 *   GET  /api/articles                     published + due, filters, embeds
 *   GET  /api/articles/slug/:slug          counts a view; `?preview=` for drafts
 *   GET  /api/articles/trending            the six most-read
 *   …and the admin CRUD, `bulk`, `check-slug` and `preview-token` of §5.14.
 *
 * Publication is a moment, not a flag (`lib/articleFilters.js`): an article
 * with `status: 'scheduled'` and a `publishedAt` that has passed is public,
 * and the next read through the admin or public list writes the `status` back
 * as `published` so the two views never disagree.
 *
 * What a save derives — `contentText`, `wordCount`, `readingTimeMinutes`, the
 * first `publishedAt` — is computed in `beforeSave` and never taken from the
 * client (§5.5): the reading time of an article is a fact about its text.
 */

const express = require('express');

const {
  applyArticleFilters,
  applyArticleSort,
  isLive,
  liveArticles,
  promoteScheduled,
} = require('../lib/articleFilters');
const { clientIp } = require('../middleware/rateLimit');
const { countView } = require('../lib/viewCounter');
const { embedArticle } = require('../lib/embed');
const { issueToken, verifyToken } = require('../lib/previewTokens');
const { makeCrudRouter } = require('../lib/crud');
const { notFound, validation } = require('../middleware/errors');
const { paginate, toPositiveInt, DEFAULT_PER_PAGE_PUBLIC } = require('../lib/paginate');
const { readingTime, stripHtml, wordCount } = require('../lib/html');

/** The collections the embeds of §5.5 resolve ids against. */
const SOURCE_COLLECTIONS = ['articles', 'articleCategories', 'articleTags', 'authors'];

/** How many articles `GET /articles/trending` answers with (§5.14). */
const TRENDING_LIMIT = 6;

/** The public list row of §4.4 — everything a card renders, nothing heavier. */
const SUMMARY_FIELDS = [
  'id',
  'slug',
  'title',
  'excerpt',
  'featuredImage',
  'category',
  'tags',
  'author',
  'publishedAt',
  'readingTimeMinutes',
  'isFeatured',
  'viewCount',
];

/** The fields no list returns: the body of the article and its plain text. */
const LIST_OMIT = ['content', 'contentText'];

/** `POST /admin/articles/bulk` (§4.4); `feature` and `delete` come for free. */
const BULK_ACTIONS = {
  publish: { status: 'published' },
  unpublish: { status: 'draft' },
  archive: { status: 'archived' },
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/**
 * The articles router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const model = getModel('articles');

  const rows = () => db.getCollection('articles');

  const source = () =>
    Object.fromEntries(SOURCE_COLLECTIONS.map((name) => [name, db.getCollection(name)]));

  /**
   * Brings the stored articles up to date before a read.
   *
   * Two things can be stale: a `scheduled` article whose moment has passed,
   * and the derived text fields of a record that has never been through a save
   * — a seeded article, or one a migration wrote. Both are computed from what
   * is already there, so settling them on read costs one pass and makes every
   * view of the data agree.
   */
  function settle() {
    const articles = rows();
    const promoted = promoteScheduled(articles);

    let derived = false;
    for (const article of articles) {
      if (typeof article.contentText === 'string' && Number.isFinite(article.readingTimeMinutes)) {
        continue;
      }
      deriveText(article);
      derived = true;
    }

    if (promoted || derived) db.write();
  }

  /** An article with `category`, `tags[]` and `author` embedded (§5.5). */
  const present = (article, collections = source()) => embedArticle(article, collections);

  /** The public list row (`ArticleSummary`). */
  const summary = (article) =>
    Object.fromEntries(SUMMARY_FIELDS.map((field) => [field, article[field] ?? null]));

  /** The admin list row: the whole record without the body text. */
  const adminRow = (article) => {
    const row = { ...article };
    for (const field of LIST_OMIT) delete row[field];
    return row;
  };

  /** The site URL a preview link is built on (§9.1). */
  function siteUrl() {
    const seo = db.getSingleton('seoSettings');
    const settings = db.getSingleton('siteSettings');
    return String(seo?.siteUrl ?? settings?.general?.siteUrl ?? '').replace(/\/+$/, '');
  }

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  router.get('/articles', (req, res) => {
    settle();

    const collections = source();
    const filtered = applyArticleFilters(liveArticles(rows()), req.query, { source: collections });
    const sorted = applyArticleSort(filtered, req.query.sort, req.query.order);
    const { data, meta } = paginate(sorted, {
      page: first(req.query.page),
      perPage: toPositiveInt(first(req.query.perPage), DEFAULT_PER_PAGE_PUBLIC),
    });

    res.ok(
      data.map((article) => summary(present(article, collections))),
      meta
    );
  });

  router.get('/articles/trending', (req, res) => {
    settle();

    const collections = source();
    const trending = applyArticleSort(liveArticles(rows()), 'popular').slice(
      0,
      toPositiveInt(first(req.query.perPage), TRENDING_LIMIT)
    );
    const { meta } = paginate(trending, { perPage: null });

    res.ok(
      trending.map((article) => summary(present(article, collections))),
      meta
    );
  });

  router.get('/articles/slug/:slug', (req, res, next) => {
    settle();

    const article = rows().find((row) => row.slug === req.params.slug);
    if (!article) {
      next(notFound());
      return;
    }

    const preview = first(req.query.preview);
    const previewing = verifyToken(preview, 'article', article.id);
    if (!isLive(article) && !previewing) {
      next(notFound());
      return;
    }

    // A preview is the editor checking their own work; it is not readership,
    // and it must not move the article up the "popular" sort (§5.14).
    if (!previewing && countView(clientIp(req), `article-${article.id}`)) {
      article.viewCount = (article.viewCount ?? 0) + 1;
      db.write();
    }

    res.ok(present(article));
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  // Registered before the CRUD router so `/admin/articles/:id/preview-token`
  // is answered here rather than falling through to the generic 404.
  router.get('/admin/articles/:id/preview-token', (req, res, next) => {
    const article = rows().find((row) => sameId(row.id, req.params.id));
    if (!article) {
      next(notFound());
      return;
    }

    const { token, expiresAt } = issueToken('article', article.id);
    res.ok({
      token,
      expiresAt,
      url: `${siteUrl()}/insights/articles/${article.slug}?preview=${token}`,
    });
  });

  // The admin list and the detail read see the same publication state the
  // public site sees.
  router.use('/admin/articles', (req, res, nextMiddleware) => {
    if (req.method === 'GET') settle();
    nextMiddleware();
  });

  router.use(
    makeCrudRouter({
      db,
      model,
      basePath: 'articles',
      schema: 'article',
      // The public routes above own `/articles`; the factory adds the admin half.
      publicPath: false,
      collections: SOURCE_COLLECTIONS,
      afterRead: (article, { collections }) => present(article, collections),
      listShape: (article) => adminRow(article),
      adminFilters: {
        status: { field: 'status', type: 'csv' },
        categoryId: { field: 'categoryId' },
        authorId: { field: 'authorId' },
        isFeatured: { field: 'isFeatured', type: 'bool' },
        tagId: { field: 'tagIds', type: 'csvArray' },
        seoScoreBand: { field: 'seo.scoreBand' },
      },
      sorts: {
        updatedAt: '-updatedAt',
        publishedAt: '-publishedAt',
        newest: '-publishedAt',
        title: 'title',
        viewCount: '-viewCount',
        popular: '-viewCount',
      },
      defaultSort: 'updatedAt',
      beforeSave: deriveFromContent,
      // A bulk `publish` never reaches `beforeSave`, and an article that has
      // just gone live still needs the date it went live on (§6.8).
      afterSave: (article) => {
        if (article.status === 'published' && !article.publishedAt) {
          article.publishedAt = new Date().toISOString();
        }
      },
      bulkActions: BULK_ACTIONS,
      noun: { one: 'article', many: 'articles' },
    })
  );

  return router;
};

/**
 * The three numbers an article's own text decides (§6.8): the plain text the
 * search and the readability analysers read, how many words it holds and how
 * long it takes to read. None of them is ever taken from a client (§5.5).
 *
 * @param {object} record mutated in place
 * @returns {object} the same record
 */
function deriveText(record) {
  record.contentText = stripHtml(record.content);
  record.wordCount = wordCount(record.contentText);
  record.readingTimeMinutes = readingTime(record.wordCount);
  return record;
}

/**
 * What a save derives from the article itself (§6.8).
 *
 * @param {object} record the record about to be stored
 * @returns {object} the same record
 * @throws {import('../middleware/errors').ApiError} 422 when `scheduled` has
 *   no future moment to be scheduled for
 */
function deriveFromContent(record) {
  const now = new Date();

  deriveText(record);

  if (record.status === 'scheduled') {
    const moment = record.publishedAt ? Date.parse(record.publishedAt) : NaN;
    if (!Number.isFinite(moment) || moment <= now.getTime()) {
      throw validation({
        publishedAt: ['A scheduled article needs a publication date in the future.'],
      });
    }
  }

  // The first time an article goes live it gets its date; switching it back to
  // a draft and publishing it again keeps the original (§6.8).
  if (record.status === 'published' && !record.publishedAt) {
    record.publishedAt = now.toISOString();
  }

  return record;
}

module.exports.deriveFromContent = deriveFromContent;
module.exports.deriveText = deriveText;
