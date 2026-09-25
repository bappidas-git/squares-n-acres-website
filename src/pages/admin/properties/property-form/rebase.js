/**
 * An editor's changes, replayed onto a newer version of the record (QA-62).
 *
 * When a save is refused because somebody else saved the listing in between,
 * "Load their version" shows the listing as it now stands and keeps this
 * editor's work as a draft to restore. Kept whole, that draft was the form as
 * this editor had it — every field of it, including the ones they never
 * touched — and restoring it undid the other save all over again. Kept as a
 * rebase, it is their version with this editor's edits on top: a field this
 * editor changed takes their value, every other field keeps the newer one.
 *
 * Objects are compared key by key; anything else — a string, a number, a list
 * of images — is one value, taken whole from whichever side changed it. Where
 * both sides changed the same value, this editor's wins: they are the one
 * about to save, and the banner shows them what they are restoring.
 */

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/**
 * @param {*} base the version this editor started from
 * @param {*} mine what this editor made of it
 * @param {*} theirs the version saved since
 * @returns {*} `theirs`, with every change from `base` to `mine` applied
 */
export default function rebase(base, mine, theirs) {
  if (same(base, mine)) return theirs;
  if (!isPlainObject(base) || !isPlainObject(mine) || !isPlainObject(theirs)) return mine;

  const merged = { ...theirs };
  for (const key of new Set([...Object.keys(base), ...Object.keys(mine)])) {
    if (same(base[key], mine[key])) continue;
    if (mine[key] === undefined) delete merged[key];
    else merged[key] = rebase(base[key], mine[key], theirs[key]);
  }
  return merged;
}
