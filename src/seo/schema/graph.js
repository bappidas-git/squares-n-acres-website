/**
 * One page, one `<script type="application/ld+json">`, one `@graph` (§9.3).
 *
 * Every generator in this folder returns a node with a stable `@id`
 * (`<canonical>#listing`, `#article`, `#breadcrumb`, …) so that the nodes can
 * reference each other and so that merging two graphs is a matter of `@id`
 * rather than of guesswork. {@link mergeGraph} is that merge: nodes in, one
 * document out, duplicates folded together in the order they arrived.
 */

const { validateGraph } = require('./validate');

/** schema.org, for every graph this engine emits. */
const SCHEMA_CONTEXT = 'https://schema.org';

/**
 * An object with its empty properties removed, recursively.
 *
 * JSON-LD with `"telephone": null` in it is not wrong, but it is noise in a
 * document a human has to read when a rich result does not appear. A node left
 * holding nothing but its `@type` goes the same way: `{"@type":"PostalAddress"}`
 * on an organisation whose address nobody has filled in says nothing at all,
 * and saying nothing is what an absent property already does (prompt 38 §7).
 *
 * @param {*} value
 * @returns {*}
 */
function compact(value) {
  if (Array.isArray(value)) {
    const list = value.map(compact).filter((item) => item !== undefined);
    return list.length ? list : undefined;
  }
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const cleaned = compact(child);
    if (cleaned !== undefined) out[key] = cleaned;
  }

  const keys = Object.keys(out);
  if (keys.length === 0) return undefined;
  if (keys.length === 1 && keys[0] === '@type') return undefined;
  return out;
}

/**
 * An absolute URL from a path or a URL.
 *
 * @param {string} siteUrl
 * @param {string} value
 * @returns {string|undefined}
 */
function absolute(siteUrl, value) {
  const path = String(value ?? '').trim();
  if (!path) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return path;

  const base = String(siteUrl ?? '').replace(/\/+$/, '');
  // The trailing-slash policy is "none", the home page included (§9.4).
  const suffix = path === '/' ? '' : path.replace(/\/+$/, '');
  if (!base) return suffix || path;
  if (!suffix) return base;
  return suffix.startsWith('/') ? `${base}${suffix}` : `${base}/${suffix}`;
}

/** An ISO 8601 timestamp, or nothing when the value is not a date. */
function isoDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** A reference to another node of the graph: `{ '@id': … }`. */
const ref = (id) => (id ? { '@id': id } : undefined);

/**
 * Several nodes as one `@graph`, de-duplicated by `@id`.
 *
 * Two nodes with the same `@id` are one node: the later one's properties are
 * folded onto the earlier one, which is what lets a page add `aggregateRating`
 * to the organisation without building the organisation again.
 *
 * @param {Array<object>} nodes may contain `null`s, arrays and whole graphs
 * @returns {{'@context': string, '@graph': Array<object>}}
 */
function mergeGraph(nodes = []) {
  const flat = [];

  const push = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(push);
      return;
    }
    if (typeof node !== 'object') return;
    if (Array.isArray(node['@graph'])) {
      node['@graph'].forEach(push);
      return;
    }
    flat.push(node);
  };
  nodes.forEach(push);

  const byId = new Map();
  const anonymous = [];

  for (const node of flat) {
    const id = node['@id'];
    if (!id) {
      anonymous.push(node);
      continue;
    }
    byId.set(id, byId.has(id) ? { ...byId.get(id), ...node } : node);
  }

  const graph = [...byId.values(), ...anonymous]
    .map((node) => compact(node))
    .filter(Boolean)
    .map((node) => {
      const { '@context': ignored, ...rest } = node;
      return rest;
    });

  return { '@context': SCHEMA_CONTEXT, '@graph': graph };
}

/**
 * An editor's own JSON-LD (`seo.schema.custom`), parsed and checked (§9.6).
 *
 * @param {string} jsonString
 * @returns {{valid: boolean, nodes: Array<object>, errors: Array<{path: string, message: string}>}}
 */
function parseCustom(jsonString) {
  const source = String(jsonString ?? '').trim();
  if (!source) return { valid: true, nodes: [], errors: [] };

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return {
      valid: false,
      nodes: [],
      errors: [{ path: '', message: `Not valid JSON: ${error.message}` }],
    };
  }

  const nodes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.['@graph'])
      ? parsed['@graph']
      : [parsed];

  if (nodes.some((node) => !node || typeof node !== 'object' || Array.isArray(node))) {
    return {
      valid: false,
      nodes: [],
      errors: [{ path: '', message: 'Expected a JSON-LD object.' }],
    };
  }

  const { valid, errors } = validateGraph(nodes);
  return { valid, nodes: valid ? nodes : [], errors };
}

const graph = { SCHEMA_CONTEXT, absolute, compact, isoDate, mergeGraph, parseCustom, ref };

module.exports = graph;
