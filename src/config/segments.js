/**
 * Segments — the master data a listing's and a property type's `segment` names
 * (00_MASTER_CONTEXT.md §6.17; `docs/DECISIONS.md`, QA-52).
 *
 * A record holds a segment's **slug**. What a segment *does* — which fields the
 * property form shows, whether a title carries a BHK, which `@type` the
 * structured data uses, whether its property types live under `/commercial` —
 * is decided by its `kind`, one of the three `SEGMENTS` values. The three
 * built-in segments are their own kind (`commercial` is of kind `commercial`),
 * so a rule that asks `segmentKind(slug) === 'commercial'` gives the answer the
 * old `slug === 'commercial'` gave for them, and the right one for an
 * "Industrial" segment an editor added with the kind `commercial`.
 *
 * The browser keeps the collection `MasterDataContext` loaded in a registry
 * here (`setKnownSegments`), so the pure rules of the property form and the SEO
 * engine can ask about a slug without every caller threading master data
 * through them. The mock server and the Node scripts pass the collection they
 * read as `records` instead, and never touch the registry.
 *
 * CommonJS (D36b), like `enums.js`: the mock server and the seed validator
 * `require` it.
 */

const { SEGMENTS } = require('./enums');

/**
 * The three segments every install has. The public site is built on them —
 * `/commercial` lists `segment=commercial`, `/plots` lists `segment=land` — so
 * the API keeps their slug and kind fixed and refuses to delete them.
 */
const BUILT_IN_SEGMENT_SLUGS = SEGMENTS.values;

/** Whether a slug is one of the three built-in segments. */
const isBuiltInSegment = (slug) => SEGMENTS.has(slug);

/** What each kind gives a listing on the property form. */
const KIND_FIELDS = {
  residential: 'rooms, BHK, built-up areas and furnishing',
  commercial: 'built-up areas, parking and furnishing — no rooms',
  land: 'plot area and dimensions — no building',
};

/**
 * The layouts a segment can take — the three built-in segments' own — in the
 * words the forms offer them: `Commercial — built-up areas, parking and …`.
 */
const SEGMENT_KIND_OPTIONS = SEGMENTS.entries.map(({ value, label }) => ({
  value,
  label: `${label} — ${KIND_FIELDS[value]}`,
}));

/** The collection as the browser last loaded it; empty until it has. */
let known = [];

/**
 * Hands the registry the collection. `MasterDataContext` calls it with every
 * list it receives, inactive segments included — a listing filed under a
 * retired segment still needs its layout.
 *
 * @param {Array<object>} records
 */
function setKnownSegments(records) {
  known = Array.isArray(records)
    ? records.filter((record) => record && typeof record.slug === 'string')
    : [];
}

/** The registry's records. */
const knownSegments = () => known;

/**
 * One segment by slug, or `null`.
 *
 * @param {string} slug
 * @param {Array<object>} [records] the collection; the registry by default
 * @returns {object|null}
 */
function findSegment(slug, records = known) {
  if (!slug) return null;
  return (Array.isArray(records) ? records : []).find((record) => record?.slug === slug) ?? null;
}

/**
 * What a segment behaves as: `'residential'`, `'commercial'` or `'land'`.
 *
 * A built-in segment is its own kind whatever `records` holds — the API will
 * not let it change. A slug nobody knows is `null`, which every rule reads as
 * "none of the three": no rooms, no plot, the built areas.
 *
 * @param {string} slug
 * @param {Array<object>} [records]
 * @returns {'residential'|'commercial'|'land'|null}
 */
function segmentKind(slug, records) {
  if (isBuiltInSegment(slug)) return slug;
  const kind = findSegment(slug, records)?.kind;
  return SEGMENTS.has(kind) ? kind : null;
}

/**
 * A segment as a person reads it: the name an editor gave it, the enum's label
 * for a built-in one before the collection has loaded, the slug as a last
 * resort — never an empty string where a value exists.
 *
 * @param {string} slug
 * @param {Array<object>} [records]
 * @returns {string}
 */
function segmentName(slug, records) {
  const record = findSegment(slug, records);
  if (record?.name) return record.name;
  return SEGMENTS.labelOf(slug) || String(slug ?? '');
}

/**
 * `[{ value, label }]` for a select or a radio group: the active segments in
 * the editor's order, plus `current` when it is not among them — labelled, so
 * a listing filed under a retired segment does not show an empty control while
 * the old slug is quietly kept and saved.
 *
 * Before the collection has loaded it answers the three built-ins, so a form
 * is never drawn without its first choice.
 *
 * @param {Array<object>} records the whole collection, inactive ones included
 * @param {{current?: string, activeOnly?: boolean}} [options]
 * @returns {Array<{value: string, label: string}>}
 */
function segmentOptions(records, { current, activeOnly = true } = {}) {
  const rows = Array.isArray(records) && records.length > 0 ? records : null;
  if (!rows) {
    const options = SEGMENTS.options.map(({ value, label }) => ({ value, label }));
    if (current && !isBuiltInSegment(current)) options.push({ value: current, label: current });
    return options;
  }

  const ordered = rows
    .slice()
    .sort(
      (left, right) =>
        (left.order ?? 0) - (right.order ?? 0) ||
        String(left.name ?? '').localeCompare(String(right.name ?? ''))
    );

  const options = ordered
    .filter((record) => !activeOnly || record.isActive !== false || record.slug === current)
    .map((record) => ({
      value: record.slug,
      label: record.isActive === false ? `${record.name} (inactive)` : record.name,
    }));

  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: segmentName(current, rows) });
  }

  return options;
}

module.exports = {
  BUILT_IN_SEGMENT_SLUGS,
  SEGMENT_KIND_OPTIONS,
  isBuiltInSegment,
  setKnownSegments,
  knownSegments,
  findSegment,
  segmentKind,
  segmentName,
  segmentOptions,
};
