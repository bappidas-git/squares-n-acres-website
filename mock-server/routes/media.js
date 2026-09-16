/**
 * Media library (00_MASTER_CONTEXT.md §5.14, §6.12).
 *
 *   GET    /api/admin/media          filters `type`, `folder`, `q`, `provider`
 *   POST   /api/admin/media          a metadata record — no binary crosses here
 *   GET    /api/admin/media/:id      with `usedIn`
 *   PUT, PATCH, DELETE, bulk
 *
 * The mock stores **metadata only**: an upload goes straight from the browser
 * to Cloudinary with an unsigned preset (D12) and the API is told about the
 * result afterwards, which is exactly what Laravel will do. So a `DELETE` here
 * removes the library entry and never an asset, and `usedIn` — where a picture
 * appears across properties, articles, pages and the settings — is a
 * best-effort URL search (`lib/usage.js`), reported so an editor can decide,
 * never used to refuse the delete.
 *
 * Two fields are inferred rather than demanded: `provider` from the host and
 * `type` from the extension, because the one thing an upload widget always
 * knows is the URL.
 */

const { findMediaUsages } = require('../lib/usage');
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
    collections: [
      'properties',
      'articles',
      'pages',
      'localities',
      'developers',
      'teamMembers',
      'partners',
      'siteSettings',
    ],
    beforeValidate: inferFromUrl,
    // A list of 400 assets would mean 400 JSON searches, so the usage hint is
    // computed for a single read and, on a list, only when it is asked for.
    afterRead: (record, { collections, query, list }) => {
      const wanted = !list || toBool(query?.withUsage) === true;
      if (!wanted) return { ...record };
      return { ...record, usedIn: findMediaUsages(record.url, collections) };
    },
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
module.exports.extensionOf = extensionOf;
