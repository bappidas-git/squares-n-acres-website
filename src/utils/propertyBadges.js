/**
 * Which badges a property shows, once the built-in "Verified" chip is counted.
 *
 * A property carries two independent things that can both say "verified": the
 * record's own `isVerified` flag, which every surface draws as a green chip
 * with a shield, and the master-data badges an editor attaches — one of which
 * the seed calls "Verified". A property holding both printed the word twice,
 * once in green and once in grey, on the card and in the listing.
 *
 * The rule, in one place so the card and the details page cannot drift apart:
 * the built-in chip wins, and the badge that duplicates it is dropped. Dropping
 * happens **before** any limit is applied, so a card with room for two badges
 * still shows two of the badges that say something new.
 */

/** Whether a master-data badge says the same thing as the `isVerified` chip. */
export const isVerifiedBadge = (badge) =>
  badge?.slug === 'verified' ||
  String(badge?.name ?? '')
    .trim()
    .toLowerCase() === 'verified';

/**
 * The badges to draw beside the built-in chips.
 *
 * @param {object} property a §6.1 record
 * @param {{limit?: number}} [options] `limit` caps the list after de-duplicating
 * @returns {Array<object>}
 */
export function visibleBadges(property, { limit } = {}) {
  const badges = Array.isArray(property?.badges) ? property.badges : [];
  const kept = property?.isVerified ? badges.filter((badge) => !isVerifiedBadge(badge)) : badges;
  return typeof limit === 'number' ? kept.slice(0, limit) : kept;
}

export default visibleBadges;
