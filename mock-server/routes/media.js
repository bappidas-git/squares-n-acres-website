/**
 * Media library (00_MASTER_CONTEXT.md §5.14, §6.12).
 *
 *   GET    /api/admin/media          filters `type`, `folder`, `unfiled`, `usage`,
 *                                    `q`, `provider`; `meta.folders` lists the
 *                                    folders the other filters leave something
 *                                    in, each with its count, and `meta.unfiled`
 *                                    counts the files in none
 *   POST   /api/admin/media          a metadata record — no binary crosses here
 *   GET    /api/admin/media/:id      with `usedIn`
 *   POST   /api/admin/media/folders/rename   `{ from, to, merge? }` — refiles
 *                                    every record of a folder (prompt 51)
 *   PUT, PATCH, DELETE, bulk         bulk: `activate`… `delete`, and `move`
 *                                    with `payload.folder` (prompt 51)
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

const express = require('express');

const schemas = require('../../src/services/schemas');
const { ApiError, conflict, validation } = require('../middleware/errors');
const {
  describeUsages,
  findMediaUsages,
  mediaUsageIndex,
  MEDIA_USAGE_COLLECTIONS,
} = require('../lib/usage');
const { makeCrudRouter } = require('../lib/crud');
const { toBool } = require('../lib/filters');
const { validateBody } = require('../middleware/validate');

/** The longest folder a record keeps (`media.folder`, §6.12). */
const FOLDER_MAX_LENGTH = 120;

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
  const clean = cleanFolder(body.folder);
  body.folder = clean === '' ? null : clean;
  return body;
}

/**
 * A folder name as the library files it — `" /projects//aurelia/ "` is
 * `projects/aurelia` — or `''` for none.
 *
 * @param {string} folder
 * @returns {string}
 */
function cleanFolder(folder) {
  return String(folder ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
}

/** Whether `folder` is `parent` or a folder inside it. */
const inFolder = (folder, parent) =>
  typeof folder === 'string' && (folder === parent || folder.startsWith(`${parent}/`));

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

/** Folder names in the order every list of them is read. */
const byName = (left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' });

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
  ].sort(byName);

/**
 * The folders of a set of files with how many each holds — `meta.folders`
 * since prompt 51, which the library's folder rail prints: "properties (284)".
 *
 * @param {Array<object>} rows
 * @returns {Array<{name: string, count: number}>}
 */
function folderCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (typeof row.folder !== 'string' || row.folder === '') continue;
    counts.set(row.folder, (counts.get(row.folder) ?? 0) + 1);
  }
  return [...counts.keys()].sort(byName).map((name) => ({ name, count: counts.get(name) }));
}

/**
 * What a list request knows about where its files are used, worked out once
 * per request: the index over every collection a file can be shown from, and
 * each address's answer as it is asked. The `usage` filter reads it for every
 * row, and again for the folder counts (`facet`), so it is kept against the
 * request's own snapshot of the collections.
 */
const usageMemo = new WeakMap();

/**
 * Whether anything shows the file at `url`, by the same whole-address search
 * the delete guard runs.
 *
 * @param {string} url
 * @param {object} collections the request's collections (`lib/usage.js`)
 * @returns {boolean}
 */
function isUsed(url, collections) {
  let memo = usageMemo.get(collections);
  if (!memo) {
    memo = { usagesOf: mediaUsageIndex(collections), answers: new Map() };
    usageMemo.set(collections, memo);
  }
  if (!memo.answers.has(url)) memo.answers.set(url, memo.usagesOf(url).length > 0);
  return memo.answers.get(url);
}

/**
 * `unfiled=true` — the files in no folder; `false`, the files in one.
 *
 * @param {object} record
 * @param {string} raw
 * @returns {boolean}
 */
function unfiledFilter(record, raw) {
  const wanted = toBool(raw);
  if (wanted === undefined) return true;
  const filed = typeof record.folder === 'string' && record.folder !== '';
  return wanted ? !filed : filed;
}

/**
 * `usage=unused` — the files nothing on the site shows, for a cleanup: the
 * same search a delete asks first, so every file this lists deletes without a
 * 409. Any other value filters nothing.
 *
 * @param {object} record
 * @param {string} raw
 * @param {{collections: object}} context
 * @returns {boolean}
 */
function usageFilter(record, raw, { collections }) {
  if (String(Array.isArray(raw) ? raw[0] : raw) !== 'unused') return true;
  return !isUsed(record.url, collections);
}

/**
 * The bulk `move`: `payload.folder` cleaned as a record's folder is, `null`
 * (or blank) for no folder at all (prompt 51).
 *
 * @param {object|null} payload
 * @returns {{folder: string|null}}
 * @throws {import('../middleware/errors').ApiError} 422 on `payload.folder`
 */
function moveChanges(payload) {
  const folder = payload && typeof payload === 'object' ? payload.folder : undefined;
  if (folder !== null && typeof folder !== 'string') {
    throw validation({
      'payload.folder': ['Name the folder to move the files to, or send null for no folder.'],
    });
  }
  const clean = cleanFolder(folder);
  if (clean.length > FOLDER_MAX_LENGTH) {
    throw validation({
      'payload.folder': [`The folder may not be greater than ${FOLDER_MAX_LENGTH} characters.`],
    });
  }
  return { folder: clean === '' ? null : clean };
}

/**
 * `POST /admin/media/folders/rename { from, to, merge? }` (prompt 51).
 *
 * A folder is a string on its files (D12), so a rename refiles every record
 * that names it — and every record in a folder inside it, `projects/aurelia`
 * going along with `projects` — in one write. It moves the library's filing
 * only: each record keeps its `url` and its `publicId`, so the Cloudinary
 * asset stays at the path it was uploaded to and nothing pointing at it breaks.
 *
 * A name the library already uses is a 422 on `to` carrying
 * `data.existing: { name, count }`, unless `merge: true` says to move the files
 * in beside the ones already there.
 *
 * @param {object} db the runtime database module
 * @param {object} body the request body
 * @returns {{from: string, to: string, moved: number, merged: boolean}}
 */
function renameFolder(db, body) {
  validateBody(schemas.getSchema('media.renameFolder'), body, { fillDefaults: true });

  const from = cleanFolder(body.from);
  const to = cleanFolder(body.to);
  if (from === '') throw validation({ from: ['Name the folder to rename.'] });
  if (to === '') throw validation({ to: ['Name the folder to move the files to.'] });

  const rows = db.getCollection('media');
  const moving = rows.filter((record) => inFolder(record.folder, from));
  if (moving.length === 0) throw validation({ from: [`No file is filed in “${from}”.`] });
  if (to === from) throw validation({ to: ['That is the folder’s name already.'] });
  if (inFolder(to, from)) {
    throw validation({ to: ['A folder cannot move into a folder inside itself.'] });
  }

  const renamed = (folder) => `${to}${folder.slice(from.length)}`;
  const tooLong = moving.find((record) => renamed(record.folder).length > FOLDER_MAX_LENGTH);
  if (tooLong) {
    throw validation({
      to: [
        `“${renamed(tooLong.folder)}” would be longer than ${FOLDER_MAX_LENGTH} characters — choose a shorter name.`,
      ],
    });
  }

  const staying = rows.filter((record) => !inFolder(record.folder, from));
  const existing = staying.filter((record) => inFolder(record.folder, to)).length;
  const merge = body.merge === true;
  if (existing > 0 && !merge) {
    throw new ApiError(
      422,
      'The given data was invalid.',
      {
        to: [
          `“${to}” already holds ${existing} ${existing === 1 ? 'file' : 'files'} — merge into it, or choose another name.`,
        ],
      },
      { existing: { name: to, count: existing } }
    );
  }

  const now = new Date().toISOString();
  for (const record of moving) {
    record.folder = renamed(record.folder);
    record.updatedAt = now;
  }
  db.write();

  return { from, to, moved: moving.length, merged: existing > 0 };
}

/**
 * The library's CRUD, bulk and list, on the shared router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
const mediaCrudRouter = ({ db, getModel }) =>
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
    // Each folder with what it holds, and the files in none, over the rows
    // every other filter lets through — the rail's "properties (284)" and
    // "No folder (3)" (prompt 51).
    listMeta: ({ facet }) => {
      const rows = facet(['folder', 'unfiled']);
      return {
        folders: folderCounts(rows),
        unfiled: rows.filter((row) => typeof row.folder !== 'string' || row.folder === '').length,
      };
    },
    adminFilters: {
      type: { field: 'type', type: 'csv' },
      provider: { field: 'provider', type: 'csv' },
      folder: { field: 'folder' },
      unfiled: unfiledFilter,
      usage: usageFilter,
    },
    bulkActions: { move: moveChanges },
    sorts: { createdAt: '-createdAt', bytes: '-bytes', alt: 'alt' },
    defaultSort: 'createdAt',
    noun: { one: 'file', many: 'files' },
  });

/**
 * The media router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();

  router.post('/admin/media/folders/rename', (req, res, next) => {
    try {
      const result = renameFolder(db, { ...(req.body ?? {}) });
      const noun = result.moved === 1 ? 'file' : 'files';
      res.message(
        result.merged
          ? `Merged ${result.moved} ${noun} from “${result.from}” into “${result.to}”.`
          : `Moved ${result.moved} ${noun} from “${result.from}” to “${result.to}”.`,
        result
      );
    } catch (error) {
      next(error);
    }
  });

  router.use(mediaCrudRouter({ db, getModel }));
  return router;
};

module.exports.inferFromUrl = inferFromUrl;
module.exports.normaliseTags = normaliseTags;
module.exports.normaliseFolder = normaliseFolder;
module.exports.extensionOf = extensionOf;
module.exports.guardMediaDelete = guardMediaDelete;
module.exports.guardMediaBulkDelete = guardMediaBulkDelete;
module.exports.foldersOf = foldersOf;
module.exports.folderCounts = folderCounts;
module.exports.cleanFolder = cleanFolder;
module.exports.moveChanges = moveChanges;
module.exports.renameFolder = renameFolder;
