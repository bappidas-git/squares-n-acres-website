/**
 * Media library (00_MASTER_CONTEXT.md §5.14, §6.12).
 *
 *   GET    /api/admin/media          filters `type`, `folder`, `q`, `provider`;
 *                                    `meta.folders` lists the folders the
 *                                    other filters leave something in
 *   POST   /api/admin/media          a metadata record — no binary crosses here
 *   GET    /api/admin/media/:id      with `usedIn`
 *   PUT, PATCH, DELETE, bulk
 *
 * `q` reads the alt text, the title, the folder, the public id, the address
 * and the tags. The address is unique and at most 500 characters: the record
 * *is* the file (QA-63).
 *
 * The mock stores **metadata only**: an upload goes straight from the browser
 * to Cloudinary with an unsigned preset (D12) and the API is told about the
 * result afterwards, which is exactly what Laravel will do. So a `DELETE` here
 * removes the library entry and never an asset, and `usedIn` — where a picture
 * appears across properties, articles, pages and the settings — is a
 * best-effort URL search (`lib/usage.js`).
 *
 * That search is also what a delete asks first (prompt 39 §5). Removing the
 * entry for a photograph that eight listings still show would leave those
 * listings pointing at a picture nobody can find again, so a `DELETE` of a
 * used file is a 409 that lists where it is used. `?force=true` goes ahead
 * anyway, because the search is a *string* search and can be wrong, and an
 * editor who has looked at the list is better placed to decide than a
 * `JSON.stringify` is. Either way the asset itself stays where it is hosted:
 * this API has never had it to delete. A bulk delete is all or nothing — one
 * 409 naming every selected file still in use, and nothing removed — and
 * honours `?force=true` the same way (QA-63).
 *
 * Two fields are inferred rather than demanded: `provider` from the host and
 * `type` from the extension, because the one thing an upload widget always
 * knows is the URL.
 */

const { conflict } = require('../middleware/errors');
const {
  describeUsages,
  findMediaUsages,
  mediaUsageIndex,
  MEDIA_USAGE_COLLECTIONS,
} = require('../lib/usage');
const { makeCrudRouter } = require('../lib/crud');
const { toBool } = require('../lib/filters');

/** Extensions that decide `type` when the client does not send one (§6.12). */
const EXTENSION_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
};

/** The host that means the asset is ours to transform. */
const CLOUDINARY_HOST = 'res.cloudinary.com';

/** The file extension of a URL, lowercase and without the dot. */
function extensionOf(url) {
  let pathname;
  try {
    pathname = new URL(String(url)).pathname;
  } catch {
    pathname = String(url ?? '');
  }

  const match = /\.([a-z0-9]+)$/i.exec(pathname);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Fills in `provider`, `type` and `format` when the client left them out.
 *
 * @param {object} body
 * @returns {object} the same body
 */
function inferFromUrl(body) {
  const url = typeof body.url === 'string' ? body.url : '';
  if (url === '') return body;

  if (body.provider === undefined || body.provider === null || body.provider === '') {
    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      host = '';
    }
    body.provider = host === CLOUDINARY_HOST ? 'cloudinary' : 'external';
  }

  const extension = extensionOf(url);

  if (body.type === undefined || body.type === null || body.type === '') {
    const found = Object.entries(EXTENSION_TYPES).find(([, list]) => list.includes(extension));
    body.type = found ? found[0] : 'document';
  }

  if (extension && (body.format === undefined || body.format === null || body.format === '')) {
    body.format = extension;
  }

  return body;
}

/**
 * The tags a write keeps: trimmed, without the blank ones, each once whatever
 * its case (QA-63). `["aerial", "Aerial", "  ", ""]` was stored as sent, and
 * the drawer then showed four chips, two of them empty.
 *
 * Anything that is not a list of strings is left for the validator to refuse.
 *
 * @param {object} body
 * @returns {object} the same body
 */
function normaliseTags(body) {
  if (!Array.isArray(body.tags) || !body.tags.every((tag) => typeof tag === 'string')) return body;

  const seen = new Set();
  body.tags = body.tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (tag === '' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return body;
}

/**
 * A folder as the library files it: its segments trimmed, with no slash at
 * either end and none doubled (QA-63). The upload sends Cloudinary
 * `sna/projects/aurelia` for "/projects/aurelia/", and the record used to keep
 * the slashes — one folder under two names in the Folder filter.
 *
 * @param {object} body
 * @returns {object} the same body
 */
function normaliseFolder(body) {
  if (typeof body.folder !== 'string') return body;
  const clean = body.folder
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
  body.folder = clean === '' ? null : clean;
  return body;
}

/**
 * What every write passes through: the inferred fields on a create or a
 * replace, and the tags and the folder always.
 *
 * A `PATCH` infers nothing (QA-63). It writes only what it sends, and a patch
 * of the address alone used to re-infer the rest from it: an extension-less
 * photograph's address turned the stored image into a "document".
 *
 * @param {object} body
 * @param {{method?: string}} [context]
 * @returns {object}
 */
const prepareBody = (body, { method } = {}) =>
  normaliseFolder(normaliseTags(method === 'PATCH' ? body : inferFromUrl(body)));

/**
 * Refuses a delete that would strand a picture somebody is still showing
 * (prompt 39 §5), unless `?force=true` says to go ahead.
 *
 * @param {object} record the media row
 * @param {{query: object, collections: object}} ctx
 * @throws {import('../middleware/errors').ApiError} 409, carrying `usedIn`
 */
function guardMediaDelete(record, { query, collections }) {
  if (toBool(query?.force) === true) return;

  const usedIn = findMediaUsages(record.url, collections);
  if (usedIn.length === 0) return;

  throw conflict(
    'This file is still in use.',
    { id: [describeUsages(usedIn)] },
    { usedIn, usedBy: usedIn }
  );
}

/**
 * The collections a usage search reads, from the runtime database — a
 * singleton (`siteSettings`) as the object itself.
 *
 * @param {object} db the runtime database module
 * @returns {object}
 */
const usageSource = (db) =>
  Object.fromEntries(
    MEDIA_USAGE_COLLECTIONS.map((key) => [key, db.getSingleton(key) ?? db.getCollection(key)])
  );

/**
 * Refuses a bulk delete whole when any selected file is still in use, naming
 * every one of them (QA-63), unless `?force=true` says to go ahead.
 *
 * A bulk delete used to ask file by file, between the removals: the first
 * file in use stopped it with a 409 naming that file alone — after every file
 * before it had been removed.
 *
 * @param {string} action
 * @param {Array<object>} targets the selected files
 * @param {{db: object, query: object}} ctx
 * @throws {import('../middleware/errors').ApiError} 409, carrying `usedIn` and `refused`
 */
function guardMediaBulkDelete(action, targets, { db, query }) {
  if (action !== 'delete' || toBool(query?.force) === true) return;

  const usagesOf = mediaUsageIndex(usageSource(db));
  const refused = targets
    .map((record) => ({ record, usedBy: usagesOf(record.url) }))
    .filter((entry) => entry.usedBy.length > 0)
    .map(({ record, usedBy }) => ({
      id: record.id,
      label: record.title || record.alt || record.url,
      reason: describeUsages(usedBy),
      usedBy,
    }));
  if (refused.length === 0) return;

  const usedIn = [];
  const seen = new Set();
  for (const usage of refused.flatMap((entry) => entry.usedBy)) {
    const key = `${usage.type}:${usage.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    usedIn.push(usage);
  }

  // One file selected is the single delete's answer, word for word.
  if (targets.length === 1) {
    throw conflict(
      'This file is still in use.',
      { id: [refused[0].reason] },
      { usedIn, usedBy: usedIn, refused }
    );
  }

  const verb = refused.length === 1 ? 'is' : 'are';
  throw conflict(
    `${refused.length} of the selected files ${verb} still in use, so none was removed.`,
    { id: refused.map((entry) => `${entry.label}: ${entry.reason}`) },
    { usedIn, usedBy: usedIn, refused }
  );
}

/**
 * The folders of a set of files, sorted — the Folder filter's options (QA-63).
 *
 * The screens used to list the folders of the page they had loaded: the 24
 * newest files named two folders of the eleven, and a library filtered to one
 * folder offered only that one, so moving to another meant resetting first.
 * The list is given the files every *other* filter lets through, so each folder
 * it names holds something to show — a picker of documents offers the folders
 * that hold documents, not eleven that lead to "Nothing to choose from".
 *
 * @param {Array<object>} rows every file the request may see
 * @returns {Array<string>}
 */
const foldersOf = (rows) =>
  [
    ...new Set(
      rows.map((row) => row.folder).filter((folder) => typeof folder === 'string' && folder)
    ),
  ].sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }));

/**
 * The media router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) =>
  makeCrudRouter({
    db,
    model: getModel('media'),
    basePath: 'media',
    schema: 'media',
    // There is no public media endpoint: the library is an editor's tool
    // (`PRIVATE_COLLECTIONS`, §5.10).
    publicPath: false,
    slugged: false,
    // Every collection a file can be shown from (`lib/usage.js`, QA-63).
    collections: MEDIA_USAGE_COLLECTIONS,
    // Laravel's `TrimStrings`: alt, title, folder and each tag, as the forms
    // trim them.
    trimStrings: true,
    beforeValidate: prepareBody,
    beforeDelete: guardMediaDelete,
    beforeBulk: guardMediaBulkDelete,
    // A single read says where its file is used. A list says it only when it
    // is asked to, and only for the page it answers: nothing filters or sorts
    // on it, and working it out for all 389 files before paging cost about a
    // second per page of the grid (QA-63).
    afterRead: (record, { collections, list }) =>
      list ? { ...record } : { ...record, usedIn: findMediaUsages(record.url, collections) },
    decoratePage: (records, { collections, query }) => {
      if (toBool(query?.withUsage) !== true) return records;
      const usagesOf = mediaUsageIndex(collections);
      return records.map((record) => ({ ...record, usedIn: usagesOf(record.url) }));
    },
    listMeta: ({ facet }) => ({ folders: foldersOf(facet('folder')) }),
    adminFilters: {
      type: { field: 'type', type: 'csv' },
      provider: { field: 'provider', type: 'csv' },
      folder: { field: 'folder' },
    },
    sorts: { createdAt: '-createdAt', bytes: '-bytes', alt: 'alt' },
    defaultSort: 'createdAt',
    noun: { one: 'file', many: 'files' },
  });

module.exports.inferFromUrl = inferFromUrl;
module.exports.normaliseTags = normaliseTags;
module.exports.normaliseFolder = normaliseFolder;
module.exports.extensionOf = extensionOf;
module.exports.guardMediaDelete = guardMediaDelete;
module.exports.guardMediaBulkDelete = guardMediaBulkDelete;
module.exports.foldersOf = foldersOf;
