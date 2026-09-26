/**
 * "Somebody else saved this after you opened it" — the 409 a replace made from
 * an older version of a record is refused with. Listings have had it since
 * QA-62; articles, pages, localities, developers and job openings since
 * prompt 51.
 *
 * `PUT` sends the whole record, so a form opened before somebody else's save
 * wrote every field back as it had read it, and the other editor's changes
 * went, silently. The form now sends the `updatedAt` it read; when the record
 * has been saved since, the write is refused and the answer says who saved it
 * and when, so the form can offer their version or this one. The check is
 * optional: a body without `updatedAt` replaces as before — which is also how
 * a form's "Save mine anyway" goes through, naming the newer version.
 */

const { conflict } = require('../middleware/errors');

const sameId = (left, right) => String(left) === String(right);

/**
 * @param {object} existing the stored record
 * @param {object} body the request body
 * @param {{users?: Array<object>, noun?: string}} [options] `adminUsers`, and
 *   what the message calls the record — "listing", "page", "locality"
 * @throws {import('../middleware/errors').ApiError} 409 with
 *   `data.conflict: 'stale'` and `data.current { updatedAt, updatedBy, updatedByName }`
 */
function refuseStaleReplace(existing, body, { users = [], noun = 'record' } = {}) {
  const expected = typeof body?.updatedAt === 'string' ? body.updatedAt : null;
  if (!expected || !existing?.updatedAt || expected === existing.updatedAt) return;

  const editor =
    existing.updatedBy === null || existing.updatedBy === undefined
      ? null
      : ((users ?? []).find((user) => sameId(user?.id, existing.updatedBy)) ?? null);
  throw conflict(
    editor?.name
      ? `${editor.name} saved this ${noun} after you opened it.`
      : `This ${noun} was saved by somebody else after you opened it.`,
    undefined,
    {
      conflict: 'stale',
      current: {
        updatedAt: existing.updatedAt,
        updatedBy: editor ? { id: editor.id, name: editor.name } : null,
        updatedByName: editor?.name ?? null,
      },
    }
  );
}

module.exports = { refuseStaleReplace };
