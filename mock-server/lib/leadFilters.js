/**
 * Lead list filters (00_MASTER_CONTEXT.md §5.14, §6.7).
 *
 * The CRM list is the one screen a sales user lives in, so its filters are the
 * ones the export has to reproduce exactly — both call the functions here, and
 * both apply the sales scope of `mock-server/lib/scope.js` first.
 *
 * `from` and `to` compare the **UTC date** of `createdAt` (decision D96): the
 * mock has no notion of the viewer's timezone, and a server that answers the
 * same question differently depending on where it runs is worse than one that
 * answers it in UTC and says so.
 *
 * The same file also answers "have we heard from this person already?" —
 * `isPossibleDuplicate`, the flag the CRM list and detail carry (prompt 29).
 */

const { inCsv, matchesQ, toBool } = require('./filters');

const first = (value) => (Array.isArray(value) ? value[0] : value);

const isFilled = (value) => value !== undefined && value !== null && value !== '';

/** The `yyyy-mm-dd` of an ISO timestamp, in UTC. */
const utcDate = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
};

/**
 * Whether a lead matches `assignedTo`, which takes an id or one of two words.
 *
 * `me` is the signed-in user, `unassigned` is nobody — the two filters the
 * lead table's quick tabs use.
 */
function matchesAssignee(lead, value, user) {
  const wanted = String(value);
  if (wanted === 'unassigned') return lead.assignedTo === null || lead.assignedTo === undefined;
  if (wanted === 'me') return String(lead.assignedTo) === String(user?.id);
  return String(lead.assignedTo) === wanted;
}

/**
 * Applies every filter of the admin lead list.
 *
 * @param {Array<object>} items the leads in scope
 * @param {object} query `req.query`
 * @param {{user?: object}} [options] the signed-in user, for `assignedTo=me`
 * @returns {Array<object>}
 */
function applyLeadFilters(items, query = {}, { user } = {}) {
  const csv = (name) => inCsv(query[name]);
  const has = (name) => csv(name).length > 0;

  const from = isFilled(first(query.from)) ? String(first(query.from)).slice(0, 10) : null;
  const to = isFilled(first(query.to)) ? String(first(query.to)).slice(0, 10) : null;

  return items.filter((lead) => {
    if (has('status') && !csv('status').includes(String(lead.status))) return false;
    if (has('source') && !csv('source').includes(String(lead.source))) return false;
    if (has('priority') && !csv('priority').includes(String(lead.priority))) return false;
    if (has('propertyId') && !csv('propertyId').includes(String(lead.propertyId))) return false;

    if (isFilled(first(query.assignedTo))) {
      if (!matchesAssignee(lead, first(query.assignedTo), user)) return false;
    }

    const consent = toBool(query.consent);
    if (consent !== undefined && Boolean(lead.consent) !== consent) return false;

    if (from || to) {
      const created = utcDate(lead.createdAt);
      if (created === null) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;
    }

    return matchesQ(lead, ['name', 'email', 'phone', 'message'], first(query.q));
  });
}

/** The columns the lead table sorts by (`adminUsers` style: a fixed list). */
const SORTABLE = ['createdAt', 'updatedAt', 'followUpAt', 'status', 'priority'];

const value = (lead, field) => {
  if (field === 'status' || field === 'priority') return lead[field] ?? '';
  const parsed = Date.parse(lead[field]);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Sorts the lead list; the default is newest first.
 *
 * @param {Array<object>} items
 * @param {string} [sort]
 * @param {string} [order]
 * @returns {Array<object>} a sorted copy
 */
function applyLeadSort(items, sort, order) {
  const field = SORTABLE.includes(String(first(sort))) ? String(first(sort)) : 'createdAt';
  const requested = String(first(order) ?? '').toLowerCase();
  // Only an explicit `order` overrides the default direction of the column.
  const direction = requested === 'asc' || requested === 'desc' ? requested : 'desc';

  return items.slice().sort((a, b) => {
    const left = value(a, field);
    const right = value(b, field);

    if (typeof left === 'string' || typeof right === 'string') {
      const result = String(left).localeCompare(String(right), 'en', { sensitivity: 'base' });
      return direction === 'desc' ? -result : result;
    }
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return direction === 'desc' ? right - left : left - right;
  });
}

/* ------------------------------------------------------------------ *
 * Duplicates
 * ------------------------------------------------------------------ */

/** How far apart two enquiries from one number may be and still be "the same". */
const DUPLICATE_WINDOW_DAYS = 30;
const DUPLICATE_WINDOW_MS = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * An Indian mobile number in one shape: `+919876543210`.
 *
 * The forms send `+91 98765 43210`, `09876543210` and `9876543210`, and a CRM
 * that stores all three cannot tell that they are one person.
 *
 * @param {string} value
 * @returns {string|null} the canonical number, or `null` when it is not one
 */
function normalizeLeadPhone(value) {
  if (typeof value !== 'string') return null;

  const digits = value.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const local = digits.replace(/^91/, '').replace(/^0/, '');
  if (!/^[6-9]\d{9}$/.test(local)) return null;

  return `+91${local}`;
}

/**
 * The key two leads are compared on.
 *
 * A number the Indian rule does not recognise — a landline, a number from
 * abroad — still identifies a person, so it is compared on its digits rather
 * than dropped.
 *
 * @param {string} value
 * @returns {string} `''` when there is nothing to compare
 */
function leadPhoneKey(value) {
  const canonical = normalizeLeadPhone(value);
  if (canonical) return canonical;
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

/**
 * Indexes every lead by its phone key, so the flag below costs one pass over
 * the collection rather than one scan per row.
 *
 * The index is built from **all** leads, not the ones in scope: whether a
 * caller has enquired before is a fact about the caller, and a sales user who
 * cannot see the other enquiry is exactly the person who needs telling that it
 * exists (D15 governs the records, not this boolean).
 *
 * @param {Array<object>} leads
 * @returns {Map<string, Array<{id: unknown, at: number|null}>>}
 */
function buildDuplicateIndex(leads = []) {
  const index = new Map();

  for (const lead of leads) {
    const key = leadPhoneKey(lead?.phone);
    if (key === '') continue;
    const at = Date.parse(lead?.createdAt);
    const entry = { id: lead?.id, at: Number.isFinite(at) ? at : null };
    const bucket = index.get(key);
    if (bucket) bucket.push(entry);
    else index.set(key, [entry]);
  }

  return index;
}

/**
 * Whether another lead carries the same number within
 * {@link DUPLICATE_WINDOW_DAYS} days of this one.
 *
 * The window is measured between the two leads rather than from today, so the
 * answer for a pair of enquiries never changes as the calendar moves on.
 *
 * @param {object} lead
 * @param {Map<string, Array<{id: unknown, at: number|null}>>} index
 * @returns {boolean}
 */
function isPossibleDuplicate(lead, index) {
  const key = leadPhoneKey(lead?.phone);
  if (key === '') return false;

  const bucket = index?.get(key) ?? [];
  if (bucket.length < 2) return false;

  const at = Date.parse(lead?.createdAt);
  if (!Number.isFinite(at)) return false;

  return bucket.some(
    (entry) =>
      String(entry.id) !== String(lead?.id) &&
      entry.at !== null &&
      Math.abs(entry.at - at) <= DUPLICATE_WINDOW_MS
  );
}

module.exports = {
  applyLeadFilters,
  applyLeadSort,
  buildDuplicateIndex,
  isPossibleDuplicate,
  leadPhoneKey,
  matchesAssignee,
  normalizeLeadPhone,
  DUPLICATE_WINDOW_DAYS,
  SORTABLE,
};
