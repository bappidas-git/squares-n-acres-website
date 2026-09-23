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
 *
 * The same idea, one role further in: a sales user sees the leads assigned to
 * them and the ones nobody has taken yet (D15). That scope is applied before
 * any filter of the list, so it also governs the detail read, the export and
 * every write.
 */

/** A shallow copy of `record` without `keys`. */
function omit(record, keys = []) {
  if (!record || typeof record !== 'object' || keys.length === 0) return record;
  const copy = { ...record };
  for (const key of keys) delete copy[key];
  return copy;
}

const filled = (value) => typeof value === 'string' && value.trim() !== '';

/** A trimmed address, or `null` for anything that is not one. */
const address = (value) => (filled(value) ? value.trim() : null);

/**
 * The floor-plan files of a listing — every drawing and every PDF, on the
 * plans and on the unit configurations. There is no switch for these: the
 * floor plans are always behind the lead form (P24), and since QA-51 the API
 * keeps them there rather than leaving it to the page's blur.
 *
 * @param {object} property
 * @returns {string[]}
 */
function floorPlanUrls(property) {
  const plans = Array.isArray(property?.floorPlans) ? property.floorPlans : [];
  const units = Array.isArray(property?.unitConfigurations) ? property.unitConfigurations : [];
  return [
    ...plans.flatMap((plan) => [plan?.imageUrl, plan?.pdfUrl]),
    ...units.flatMap((unit) => [unit?.floorPlanImageUrl, unit?.floorPlanPdfUrl]),
  ]
    .map(address)
    .filter(Boolean);
}

/**
 * A listing's files as a visitor who has not shared their details may see
 * them: every file behind the lead form keeps its row and loses its address.
 *
 * - The brochure, while `brochureLeadGated` is on, reads `brochureUrl: null`
 *   and `hasBrochure: true`.
 * - A gated document reads `url: null` and `hasFile: true`; every document
 *   carries `hasFile`, so a page can tell "nothing attached" from "attached,
 *   ask first".
 * - Every floor plan reads `imageUrl: null` and `pdfUrl: null` with `hasImage`
 *   and `hasPdf`, and every unit configuration `floorPlanImageUrl: null` and
 *   `floorPlanPdfUrl: null` with `hasFloorPlanImage` and `hasFloorPlanPdf`:
 *   the drawings and their PDFs are always gated (the product owner's call —
 *   `docs/DECISIONS.md`, QA-51 OPEN-1). The page blurs a stand-in drawing
 *   until the visitor has shared their details.
 * - One file, one gate: an open document — or an open brochure — whose address
 *   is a gated file's, a floor plan's included, is gated with it, and reads
 *   `leadGated: true` / `brochureLeadGated: true` so the page shows the lock it
 *   will meet. A document that is the brochure's own file is left out, as the
 *   page always did (P25): it is the brochure, offered once.
 *
 * The photo gallery is not a gated file: a drawing the editor also puts among
 * the photographs is public through the gallery.
 *
 * The addresses are handed over by `POST /properties/:id/documents/access`
 * once the visitor has filed a lead about the listing (`lib/fileAccess.js`).
 * Before this, they rode along in every public read and the gate was the page's
 * word only (QA-51 OPEN-1).
 *
 * @param {object} property
 * @returns {object}
 */
function withoutGatedFiles(property) {
  const brochure = filled(property.brochureUrl) ? property.brochureUrl.trim() : null;
  const documents = Array.isArray(property.documents) ? property.documents : [];

  const gatedUrls = new Set([
    ...documents
      .filter((document) => document?.leadGated !== false && filled(document?.url))
      .map((document) => document.url.trim()),
    ...floorPlanUrls(property),
  ]);
  const brochureGated =
    Boolean(brochure) && (property.brochureLeadGated !== false || gatedUrls.has(brochure));
  if (brochureGated) gatedUrls.add(brochure);

  const scoped = {
    ...property,
    brochureUrl: brochureGated ? null : (property.brochureUrl ?? null),
    ...(brochureGated ? { brochureLeadGated: true } : {}),
    hasBrochure: Boolean(brochure),
  };

  if (Array.isArray(property.documents)) {
    scoped.documents = documents
      .filter(
        (document) => !(brochure && filled(document?.url) && document.url.trim() === brochure)
      )
      .map((document) => {
        if (!document || typeof document !== 'object') return document;
        const url = address(document.url);
        if (url && gatedUrls.has(url)) {
          return { ...document, url: null, leadGated: true, hasFile: true };
        }
        return { ...document, hasFile: Boolean(url) };
      });
  }

  const isRecord = (value) => Boolean(value) && typeof value === 'object';

  if (Array.isArray(property.floorPlans)) {
    scoped.floorPlans = property.floorPlans.map((plan) =>
      isRecord(plan)
        ? {
            ...plan,
            imageUrl: null,
            pdfUrl: null,
            hasImage: filled(plan.imageUrl),
            hasPdf: filled(plan.pdfUrl),
          }
        : plan
    );
  }

  if (Array.isArray(property.unitConfigurations)) {
    scoped.unitConfigurations = property.unitConfigurations.map((unit) =>
      isRecord(unit)
        ? {
            ...unit,
            floorPlanImageUrl: null,
            floorPlanPdfUrl: null,
            hasFloorPlanImage: filled(unit.floorPlanImageUrl),
            hasFloorPlanPdf: filled(unit.floorPlanPdfUrl),
          }
        : unit
    );
  }

  return scoped;
}

/**
 * A property as the public site may see it: no audit columns, the agent's
 * contact details only when the agent is meant to be listed, and no address
 * for a file kept behind the lead form.
 *
 * @param {object} property
 * @returns {object}
 */
function publicProperty(property) {
  if (!property) return property;
  const scoped = withoutGatedFiles(omit(property, ['createdBy', 'updatedBy']));
  const agent = property.agent ?? null;
  if (!agent) return scoped;

  return {
    ...scoped,
    agent: agent.showOnListing ? { ...agent } : omit(agent, ['phone', 'whatsapp', 'email']),
  };
}

/**
 * Every file of a listing with its address — what
 * `POST /properties/:id/documents/access` answers once the token checks out.
 * A document that is the brochure's own file is left out, as it is from the
 * public read, and so is an inactive unit configuration, which the page never
 * shows.
 *
 * @param {object} property the stored record
 * @returns {{brochureUrl: string|null, documents: Array<{id: number, url: string}>,
 *   floorPlans: Array<{id: number, imageUrl: string|null, pdfUrl: string|null}>,
 *   unitConfigurations: Array<{id: number, floorPlanImageUrl: string|null,
 *   floorPlanPdfUrl: string|null}>}}
 */
function propertyFiles(property) {
  const brochure = address(property?.brochureUrl);
  const documents = (Array.isArray(property?.documents) ? property.documents : [])
    .filter((document) => document && filled(document.url))
    .filter((document) => !brochure || document.url.trim() !== brochure)
    .map((document) => ({ id: document.id, url: document.url.trim() }));

  const floorPlans = (Array.isArray(property?.floorPlans) ? property.floorPlans : [])
    .filter((plan) => plan && (filled(plan.imageUrl) || filled(plan.pdfUrl)))
    .map((plan) => ({
      id: plan.id,
      imageUrl: address(plan.imageUrl),
      pdfUrl: address(plan.pdfUrl),
    }));

  const unitConfigurations = (
    Array.isArray(property?.unitConfigurations) ? property.unitConfigurations : []
  )
    .filter((unit) => unit && unit.isActive !== false)
    .filter((unit) => filled(unit.floorPlanImageUrl) || filled(unit.floorPlanPdfUrl))
    .map((unit) => ({
      id: unit.id,
      floorPlanImageUrl: address(unit.floorPlanImageUrl),
      floorPlanPdfUrl: address(unit.floorPlanPdfUrl),
    }));

  return { brochureUrl: brochure, documents, floorPlans, unitConfigurations };
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

/**
 * Whether a user may see one lead (D15).
 *
 * Admins and managers see every lead; a sales user sees their own and the
 * unassigned ones — which is what makes "claim" possible in the first place.
 *
 * @param {object} lead
 * @param {object} user the signed-in user (`req.user`)
 * @returns {boolean}
 */
function canSeeLead(lead, user) {
  if (!user) return false;
  if (user.role !== 'sales') return true;
  const assigned = lead?.assignedTo;
  return assigned === null || assigned === undefined || String(assigned) === String(user.id);
}

/**
 * The leads a user may see, in the order they came in.
 *
 * @param {Array<object>} leads
 * @param {object} user
 * @returns {Array<object>}
 */
const scopeLeads = (leads, user) =>
  user?.role === 'sales' ? leads.filter((lead) => canSeeLead(lead, user)) : leads.slice();

module.exports = {
  omit,
  publicProperty,
  propertyFiles,
  publicAuthor,
  publicSettings,
  publicSeoSettings,
  canSeeLead,
  scopeLeads,
};
