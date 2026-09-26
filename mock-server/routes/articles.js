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
const { ApiError, notFound, validation } = require('../middleware/errors');
const { clientIp } = require('../middleware/rateLimit');
const { countView } = require('../lib/viewCounter');
const { embedArticle } = require('../lib/embed');
const { goesLive, publishGaps, publishProblems } = require('../../src/config/articleRules');
const { issueToken, verifyToken } = require('../lib/previewTokens');
const { withEditorName } = require('../lib/editors');
const { omit } = require('../lib/scope');
const { makeCrudRouter } = require('../lib/crud');
const { paginate, toPositiveInt, DEFAULT_PER_PAGE_PUBLIC } = require('../lib/paginate');
const { readingTime, stripHtml, unsafeMarkup, wordCount } = require('../lib/html');

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

/**
 * The records an article names by id, and the collection each lives in.
 *
 * `docs/backend-notes` hands Laravel these as `exists:<table>,id`; the mock
 * never asked, so an article could be saved pointing at a category, an author
 * or a tag that did not exist — a stale picker in a second tab was enough —
 * and the public page drew it with no category and no byline (QA-55).
 */
const REFERENCES = [
  { field: 'categoryId', collection: 'articleCategories' },
  { field: 'authorId', collection: 'authors' },
  { field: 'tagIds', collection: 'articleTags', many: true },
  { field: 'relatedArticleIds', collection: 'articles', many: true },
  { field: 'relatedPropertyIds', collection: 'properties', many: true },
];

/** The fields a `PATCH` has to touch before the publish rules are asked again. */
const PUBLISH_FIELDS = ['status', 'publishedAt', 'excerpt', 'content', 'featuredImage'];

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

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

  /**
   * The two articles either side of this one, by `publishedAt`.
   *
   * Beyond the §5.14 catalogue (prompt 34): an article page's previous/next
   * pair is two rows, and `GET /articles` has no "published before this"
   * filter, so the alternative was reading a whole category into the browser
   * to find the two neighbours of one row.
   *
   * `prev` is the article published **before** this one and `next` the one
   * published after it, so the pair walks the category in the order it was
   * written. `categoryId` narrows the pool — what the blog asks for; without it
   * the neighbours are taken from everything published. Either side is `null`
   * at the ends, and both are `null` when the article is not in the pool.
   */
  router.get('/articles/:id/adjacent', (req, res, next) => {
    settle();

    const article = rows().find((row) => sameId(row.id, req.params.id));
    if (!article || !isLive(article)) {
      next(notFound());
      return;
    }

    const collections = source();
    const categoryId = first(req.query.categoryId);
    const wanted = categoryId === undefined || categoryId === '' ? null : String(categoryId);

    const pool = liveArticles(rows())
      .filter((row) => wanted === null || sameId(row.categoryId, wanted))
      .sort(
        (left, right) =>
          Date.parse(left.publishedAt) - Date.parse(right.publishedAt) ||
          Number(left.id) - Number(right.id)
      );

    const index = pool.findIndex((row) => sameId(row.id, article.id));
    const at = (offset) => {
      const neighbour = index < 0 ? undefined : pool[index + offset];
      return neighbour ? summary(present(neighbour, collections)) : null;
    };

    res.ok({ prev: at(-1), next: at(1) });
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

    // Who wrote it into the panel is the panel's business (prompt 51).
    res.ok(omit(present(article), model.publicOmit ?? []));
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
      collections: [...SOURCE_COLLECTIONS, 'adminUsers'],
      // The admin reads name whoever saved last (prompt 51).
      afterRead: (article, { collections }) =>
        withEditorName(present(article, collections), collections.adminUsers),
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
      // A form opened before somebody else's save is refused (prompt 51).
      staleGuard: 'article',
      beforeSave: deriveFromContent,
      // A bulk `publish` never reaches `beforeSave`, and an article that has
      // just gone live still needs the date it went live on (§6.8) — now, if
      // it was waiting for one: "Publish" on a scheduled piece used to leave
      // it "published" with a date in the future, which the site does not show
      // until that date comes (QA-55).
      afterSave: (article) => {
        const moment = article.publishedAt ? Date.parse(article.publishedAt) : NaN;
        if (article.status === 'published' && !(moment <= Date.now())) {
          article.publishedAt = new Date().toISOString();
        }
      },
      beforeBulk: refuseUnpublishable,
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

/** What an unsafe body or answer is told (QA-55). */
const UNSAFE_MESSAGE =
  'The text may not carry a script, an inline event handler or a javascript: link.';

/**
 * The ids an article names that name nothing (QA-55), keyed like the schema's
 * own 422.
 *
 * A `PATCH` is asked only about the references it sends: flipping `isFeatured`
 * must not fail over a field nobody touched.
 *
 * @param {object} record the record about to be stored
 * @param {{method?: string, body?: object, db?: object, existing?: object}} [context]
 * @returns {Record<string, string[]>} `{}` when every reference holds
 */
function referenceProblems(record, { method, body, db, existing } = {}) {
  const found = {};

  for (const { field, collection, many } of REFERENCES) {
    if (method === 'PATCH' && !hasOwn(body, field)) continue;
    const rows = db?.getCollection?.(collection);
    if (!Array.isArray(rows)) continue;
    const known = (id) => rows.some((row) => sameId(row?.id, id));

    if (many) {
      (Array.isArray(record[field]) ? record[field] : []).forEach((id, index) => {
        if (!known(id)) found[`${field}.${index}`] = [`The selected ${field}.${index} is invalid.`];
      });
    } else if (record[field] !== null && record[field] !== undefined && !known(record[field])) {
      found[field] = [`The selected ${field} is invalid.`];
    }
  }

  // An article is not further reading for itself: the public page would list
  // the piece the reader is already on.
  const own = existing?.id;
  if (own !== undefined && own !== null) {
    (Array.isArray(record.relatedArticleIds) ? record.relatedArticleIds : []).forEach(
      (id, index) => {
        if (sameId(id, own)) {
          found[`relatedArticleIds.${index}`] = ['An article cannot be related to itself.'];
        }
      }
    );
  }

  return found;
}

/**
 * What a save derives from the article itself (§6.8), and the rules a write
 * must pass before it is stored.
 *
 * Every rule answers in the one 422: a body that breaks three of them hears
 * about all three, the way Laravel's validator reports them.
 *
 * - `scheduled` needs a moment in the future (§6.8).
 * - `published` may not carry one: the site reads the date, not the word, so
 *   a "published" article dated next month is a 404 the admin calls live
 *   (QA-55). A future date is what `scheduled` is for.
 * - Going live needs an excerpt, a featured image and 300 words
 *   (`src/config/articleRules.js`) — asked of every create and replace, and
 *   of a `PATCH` that touches the status or what the rules read.
 * - A body or an answer may not carry a script, an inline handler or a
 *   `javascript:` link: the editor never writes one and `SafeHtml` would drop
 *   it, so arriving here it came from somewhere else. The pages API refuses a
 *   script the same way; this is the second line of defence, not the first.
 *
 * - Every id it names — category, author, tags, related pieces — names a
 *   record that exists, and none of the related pieces is the article itself.
 *
 * @param {object} record the record about to be stored
 * @param {{method?: string, body?: object, db?: object, existing?: object}} [context]
 *   what `crud.js` hands `beforeSave`
 * @returns {object} the same record
 * @throws {import('../middleware/errors').ApiError} 422 with every rule it breaks
 */
function deriveFromContent(record, context = {}) {
  const { method, body } = context;
  const now = new Date();
  const found = { ...referenceProblems(record, context) };
  const touches = (fields) => method !== 'PATCH' || fields.some((field) => hasOwn(body, field));

  deriveText(record);

  if (touches(['content']) && unsafeMarkup(record.content)) found.content = [UNSAFE_MESSAGE];
  if (touches(['faqs'])) {
    (Array.isArray(record.faqs) ? record.faqs : []).forEach((faq, index) => {
      if (unsafeMarkup(faq?.answer)) found[`faqs.${index}.answer`] = [UNSAFE_MESSAGE];
    });
  }

  const moment = record.publishedAt ? Date.parse(record.publishedAt) : NaN;
  if (record.status === 'scheduled' && !(moment > now.getTime())) {
    found.publishedAt = ['A scheduled article needs a publication date in the future.'];
  }
  if (record.status === 'published' && moment > now.getTime()) {
    found.publishedAt = [
      'A published article cannot carry a date in the future — schedule it instead.',
    ];
  }

  if (goesLive(record.status) && touches(PUBLISH_FIELDS)) {
    for (const [field, message] of Object.entries(publishProblems(record, record.wordCount))) {
      found[field] = [message];
    }
  }

  if (Object.keys(found).length > 0) throw validation(found);

  // The first time an article goes live it gets its date; switching it back to
  // a draft and publishing it again keeps the original (§6.8).
  if (record.status === 'published' && !record.publishedAt) {
    record.publishedAt = now.toISOString();
  }

  return record;
}

/**
 * The bulk "publish" asks the publish rules too, of every article it would
 * put on the site — all or nothing, like a bulk delete, so the editor sees one
 * list of what is missing rather than half a batch published (QA-55).
 *
 * An article that is already published is not asked: publishing it again
 * changes nothing.
 *
 * @param {string} action
 * @param {Array<object>} targets the stored records the ids name
 * @throws {ApiError} 422 naming each article and what it lacks
 */
function refuseUnpublishable(action, targets) {
  if (action !== 'publish') return;

  const refused = targets
    .filter((article) => article.status !== 'published')
    .map((article) => {
      const words = Number.isFinite(article.wordCount)
        ? article.wordCount
        : wordCount(stripHtml(article.content));
      return { article, gaps: publishGaps(publishProblems(article, words), words) };
    })
    .filter(({ gaps }) => gaps.length > 0);

  if (refused.length === 0) return;

  const lines = refused.map(({ article, gaps }) => `“${article.title}”: ${gaps.join(', ')}.`);
  const message =
    refused.length === 1
      ? `“${refused[0].article.title}” is not ready to go live: ${refused[0].gaps.join(', ')}.`
      : `${refused.length} of the selected articles are not ready to go live.`;

  throw new ApiError(
    422,
    message,
    { ids: lines },
    {
      notReady: refused.map(({ article, gaps }) => ({
        id: article.id,
        title: article.title,
        gaps,
      })),
    }
  );
}

module.exports.referenceProblems = referenceProblems;
module.exports.deriveFromContent = deriveFromContent;
module.exports.deriveText = deriveText;
module.exports.refuseUnpublishable = refuseUnpublishable;
