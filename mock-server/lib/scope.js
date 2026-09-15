/**
 * Public field stripping (00_MASTER_CONTEXT.md §5.10).
 *
 * Admin responses carry the whole record; public responses drop the fields a
 * visitor has no business seeing — who created a listing, an agent's direct
 * line when the agent asked not to be listed, an author's e-mail address, the
 * lead-routing configuration of the site.
 *
 * Each collection's blanket list lives on its descriptor (`publicOmit` in
 * `mock-server/schemas/models.js`); the functions here implement the rules that
 * depend on the record's own values and therefore cannot be a static list.
 */

/** A shallow copy of `record` without `keys`. */
function omit(record, keys = []) {
  if (!record || typeof record !== 'object' || keys.length === 0) return record;
  const copy = { ...record };
  for (const key of keys) delete copy[key];
  return copy;
}

/**
 * A property as the public site may see it: no audit columns, and the agent's
 * contact details only when the agent is meant to be listed.
 *
 * @param {object} property
 * @returns {object}
 */
function publicProperty(property) {
  if (!property) return property;
  const scoped = omit(property, ['createdBy', 'updatedBy']);
  const agent = property.agent ?? null;
  if (!agent) return scoped;

  return {
    ...scoped,
    agent: agent.showOnListing ? { ...agent } : omit(agent, ['phone', 'whatsapp', 'email']),
  };
}

/** An author without the private e-mail address. */
function publicAuthor(author) {
  return omit(author, ['email']);
}

/** `siteSettings` without the admin-only lead-routing branch. */
function publicSettings(settings) {
  return omit(settings, ['leads']);
}

/**
 * `seoSettings` as served publicly.
 *
 * Nothing is stripped: the model holds no secrets, and the public site has to
 * render `customHeadHtml`, the verification tags and `robotsTxt` itself
 * (§5.14). The function exists so the rule is stated in one place rather than
 * assumed at every call site.
 *
 * @param {object} settings
 * @returns {object}
 */
function publicSeoSettings(settings) {
  return settings ? { ...settings } : settings;
}

module.exports = { omit, publicProperty, publicAuthor, publicSettings, publicSeoSettings };
