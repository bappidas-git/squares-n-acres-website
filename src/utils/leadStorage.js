/**
 * What this visit already told us, kept for the length of the visit.
 *
 * One record under `sna_lead` (sessionStorage, §4.2) holds the name, e-mail and
 * phone the visitor last typed — so the second form on the site opens with the
 * boxes filled — the listings they have already enquired about, and the gated
 * content they have earned the right to see.
 *
 * Unlocks are **per kind** (`floorPlans`, `documents`): sharing a phone number
 * to read a floor plan is not the same as asking for the legal papers, and the
 * page says which one it is asking for. The exceptions are the forms in which a
 * visitor identifies themselves about the whole listing rather than about one
 * file — an enquiry, and either of the eligibility checks, which ask for more
 * than any download gate does (prompt 24 §7, prompt 25 §4.2).
 *
 * Nothing here is a permission system: it decides what a page shows this
 * visitor, and the lead it records is the thing of value. Clearing the session
 * simply asks again.
 */

import { getItem, removeItem, setItem } from './storage';

const STORAGE_KEY = 'sna_lead';

/** The shape written today. A record from an older visit is read and migrated. */
const VERSION = 2;

const SESSION = { session: true };

/** The kinds of gated content a property page can unlock. */
export const UNLOCK_KINDS = ['floorPlans', 'documents'];

/** Lead sources that identify a visitor for the whole listing, not one file. */
export const UNLOCKS_EVERYTHING = ['property-enquiry', 'financial-assessment', 'bank-eligibility'];

/**
 * The event a section listens for when another part of the page opens a gate.
 *
 * Unlocking is a write to `sessionStorage`, which fires no event in the tab
 * that made it, so a component that read the gate when it mounted would keep
 * showing a lock after an enquiry elsewhere on the page had opened it.
 */
export const LEAD_CHANGE_EVENT = 'sna:lead-change';

const announce = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(LEAD_CHANGE_EVENT));
  } catch {
    // An environment without `CustomEvent` has nothing listening either.
  }
};

/** Storage keys are strings; a property id arrives as either. */
const key = (propertyId) =>
  propertyId === null || propertyId === undefined || propertyId === '' ? null : String(propertyId);

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const EMPTY = { version: VERSION, name: '', email: '', phone: '', captured: [], unlocks: {} };

/**
 * The stored record in today's shape.
 *
 * A visit that started before this version carried `capturedProperties[]` and
 * `capturedSources[]`; both fold into one `captured[]` list so that a visitor
 * who was half-way through a session when the bundle changed is not asked for
 * their phone number a second time.
 */
function read() {
  const raw = getItem(STORAGE_KEY, null, SESSION);
  if (!raw || typeof raw !== 'object') return null;

  const captured = Array.isArray(raw.captured)
    ? raw.captured
    : [
        ...(Array.isArray(raw.capturedSources) ? raw.capturedSources : []).map((entry) => ({
          propertyId: key(entry?.propertyId),
          source: entry?.source ?? null,
        })),
        ...(Array.isArray(raw.capturedProperties) ? raw.capturedProperties : []).map((id) => ({
          propertyId: key(id),
          source: null,
        })),
      ];

  return {
    version: VERSION,
    name: text(raw.name),
    email: text(raw.email),
    phone: text(raw.phone),
    captured: captured.filter(Boolean),
    unlocks: raw.unlocks && typeof raw.unlocks === 'object' ? raw.unlocks : {},
  };
}

function write(data) {
  // A full or blocked session store costs the visitor a prefilled form, not the
  // lead: the POST has already happened by the time this is called.
  setItem(STORAGE_KEY, data, SESSION);
  announce();
  return data;
}

/** Where the campaign parameters of the first page of the visit are kept. */
const UTM_KEY = 'sna_utm';

/** The five `utm_*` parameters §6.7 stores on a lead. */
const UTM_PARAMS = ['source', 'medium', 'campaign', 'term', 'content'];

/**
 * Remember the campaign that brought this visit, once.
 *
 * A visitor lands on `/whitefield?utm_campaign=…`, reads three pages and fills
 * a form in on the fourth, by which time the parameters are long gone from the
 * address bar. Capturing them on the first page and keeping them in
 * `sna_utm` for the session is what lets every lead carry its campaign.
 *
 * The first landing wins: a later page that happens to carry its own `utm_*`
 * does not overwrite the campaign the visit actually started with.
 *
 * @param {string} [search] defaults to the current query string
 * @returns {object|null} the stored parameters, or `null` when there are none
 */
export function captureUtm(search) {
  if (typeof window === 'undefined') return getUtm();

  const stored = getItem(UTM_KEY, null, SESSION);
  if (stored && typeof stored === 'object') return stored;

  let params;
  try {
    params = new URLSearchParams(search ?? window.location.search);
  } catch {
    return null;
  }

  const found = {};
  for (const name of UTM_PARAMS) {
    const value = text(params.get(`utm_${name}`));
    if (value) found[name] = value.slice(0, 120);
  }

  if (Object.keys(found).length === 0) return null;
  setItem(UTM_KEY, found, SESSION);
  return found;
}

/** The campaign of this visit, or `null` when it arrived without one. */
export function getUtm() {
  const stored = getItem(UTM_KEY, null, SESSION);
  return stored && typeof stored === 'object' && Object.keys(stored).length > 0 ? stored : null;
}

export const leadStorage = {
  /** The whole record, or `null` when this visit has not filled anything in. */
  get() {
    return read();
  },

  /**
   * The three fields a form prefills itself from, or `null`.
   *
   * @returns {{name: string, email: string, phone: string}|null}
   */
  getVisitor() {
    const data = read();
    if (!data) return null;
    return { name: data.name, email: data.email, phone: data.phone };
  },

  /**
   * Remember who just filled a form in.
   *
   * Only the fields the form actually collected are written: a newsletter box
   * that asks for an e-mail address must not blank the phone number a property
   * enquiry stored ten minutes earlier.
   *
   * @param {{name?: string, email?: string, phone?: string}} visitor
   * @returns {object} the stored record
   */
  saveVisitor(visitor = {}) {
    const existing = read() ?? EMPTY;
    return write({
      ...existing,
      name: text(visitor.name) || existing.name,
      email: text(visitor.email) || existing.email,
      phone: text(visitor.phone) || existing.phone,
    });
  },

  /**
   * Record that a form was filled in about one listing, from one entry point.
   *
   * Somebody who has enquired about a listing, or answered the eligibility
   * questionnaire about it, has already told us who they are; asking again
   * before each file would be theatre, so those sources open every gated kind
   * on that listing at once.
   *
   * @param {number|string|null} propertyId
   * @param {string} [source] a `LEAD_SOURCES` value
   * @returns {object} the stored record
   */
  markCaptured(propertyId, source) {
    const existing = read() ?? EMPTY;
    const id = key(propertyId);
    const captured = [...existing.captured, { propertyId: id, source: source ?? null }];

    const unlocks =
      id && UNLOCKS_EVERYTHING.includes(source)
        ? { ...existing.unlocks, [id]: [...UNLOCK_KINDS] }
        : existing.unlocks;

    return write({ ...existing, captured, unlocks });
  },

  /** Whether a form has already been filled in about this listing. */
  isCapturedFor(propertyId) {
    const id = key(propertyId);
    if (!id) return false;
    return (read()?.captured ?? []).some((entry) => entry.propertyId === id);
  },

  /** Whether this visit has identified itself at all — a name and a number. */
  isIdentified() {
    const data = read();
    return Boolean(data?.name && data?.phone);
  },

  /**
   * Record that this visitor may see one kind of gated content on one listing.
   *
   * @param {number|string} propertyId
   * @param {string} kind a member of {@link UNLOCK_KINDS}
   * @returns {boolean} whether the gate is open afterwards
   */
  unlock(propertyId, kind) {
    const id = key(propertyId);
    if (!id || !UNLOCK_KINDS.includes(kind)) return false;

    const data = read() ?? EMPTY;
    const kinds = Array.isArray(data.unlocks[id]) ? data.unlocks[id] : [];
    if (kinds.includes(kind)) return true;

    write({ ...data, unlocks: { ...data.unlocks, [id]: [...kinds, kind] } });
    return true;
  },

  /**
   * Whether one kind of gated content is already open on one listing.
   *
   * @param {number|string} propertyId
   * @param {string} kind a member of {@link UNLOCK_KINDS}
   * @returns {boolean}
   */
  isUnlocked(propertyId, kind) {
    const id = key(propertyId);
    if (!id) return false;
    const kinds = read()?.unlocks?.[id];
    return Array.isArray(kinds) && kinds.includes(kind);
  },

  clear() {
    removeItem(STORAGE_KEY, SESSION);
    removeItem(UTM_KEY, SESSION);
    announce();
  },
};

export default leadStorage;
