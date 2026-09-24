import redirectService from '../../services/redirectService';
import { clearCache as clearRedirectCache } from '../common/RedirectHandler';

/**
 * Sends visitors from the addresses a record left to the ones it moved to — a
 * 301 each, the rule the SEO guide asks for whenever a slug changes (QA-56's
 * rule for pages, QA-60 for a locality, a developer and a property type).
 *
 * A rule that sent the new address somewhere else is switched off first: it
 * would now send the moved record's own page away, or loop. Each move is
 * written on its own, so one refused rule does not cost the others.
 *
 * @param {Array<[string, string]>} moves `[fromPath, toPath]` pairs
 * @param {string} [note] stored on each rule, for the redirects screen
 * @returns {Promise<{done: Array<[string, string]>, failed: Array<[string, string]>}>}
 */
export default async function redirectMoves(moves, note) {
  const done = [];
  const failed = [];

  for (const [fromPath, toPath] of Array.isArray(moves) ? moves : []) {
    if (!fromPath || !toPath || fromPath === toPath) continue;
    try {
      await redirectService.deactivateByFromPath(toPath);
      await redirectService.upsertByFromPath({
        fromPath,
        toPath,
        statusCode: 301,
        ...(note ? { note } : {}),
      });
      done.push([fromPath, toPath]);
    } catch (thrown) {
      console.warn(`${fromPath} could not be redirected to ${toPath}.`, thrown);
      failed.push([fromPath, toPath]);
    }
  }

  // This browser's copy of the table is ten minutes old at most; the new rule
  // is for this editor to try at once too.
  if (done.length > 0) clearRedirectCache();
  return { done, failed };
}

/**
 * The sentence a toast says about what {@link redirectMoves} did.
 *
 * @param {{done: Array<[string, string]>, failed: Array<[string, string]>}} result
 * @returns {{info: string|null, error: string|null}}
 */
export function describeMoves({ done = [], failed = [] } = {}) {
  const list = (pairs) => pairs.map(([from]) => from).join(' and ');
  return {
    info:
      done.length > 0
        ? `${list(done)} now ${done.length === 1 ? 'redirects' : 'redirect'} to the new address.`
        : null,
    error:
      failed.length > 0
        ? `Saved, but ${list(failed)} could not be redirected. Add ${
            failed.length === 1 ? 'it' : 'them'
          } under SEO → Redirects.`
        : null,
  };
}
