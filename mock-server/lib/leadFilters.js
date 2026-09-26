/**
 * Lead list filters (00_MASTER_CONTEXT.md §5.14, §6.7).
 *
 * The CRM list is the one screen a sales user lives in, so its filters are the
 * ones the export has to reproduce exactly — both call the functions here, and
 * both apply the sales scope of `mock-server/lib/scope.js` first.
 *
 * `from` and `to` compare the **IST date** of `createdAt` (QA-53, superseding
 * D96's UTC): the whole panel prints dates in IST (D22), so a lead that
 * arrived at 01:30 on the 14th is found by "created on the 14th". India keeps
 * no daylight saving, so the day's edges are a fixed +05:30 away from UTC and
 * two servers still cannot disagree.
 *
 * The same file also answers "have we heard from this person already?" —
 * `isPossibleDuplicate`, the flag the CRM list and detail carry (prompt 29).
 */

const { LEAD_FOLLOW_UP, LEAD_PRIORITY, LEAD_STATUS } = require('./enums');
const { inCsv, matchesQ, toBool } = require('./filters');
const { istDay } = require('./ist');

/** The statuses a follow-up can no longer be late for (prompt 51). */
const CLOSED_STATUSES = new Set(['converted', 'lost']);

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far ahead "due in the next 7 days" looks. */
const NEXT_DAYS = 7;

/** Whether a lead is still being worked: not converted and not lost. */
const isOpenLead = (lead) => !CLOSED_STATUSES.has(lead?.status);

/**
 * Which follow-up bucket an open lead is in, as of `now` (prompt 51):
 *
 *   - `overdue` — its follow-up time has passed;
 *   - `today`   — it is due later today (IST);
 *   - `next7`   — it is due within the next seven days, today's included;
 *   - `none`    — it has no follow-up at all: no next step.
 *
 * A closed lead is in none of them. The buckets `overdue`, `today` and `none`
 * never overlap, which is what lets the worklist chips add up; `next7` is a
 * horizon and holds `today`'s leads too.
 *
 * @param {object} lead
 * @param {string} bucket a value of `LEAD_FOLLOW_UP`
 * @param {number} [now]
 * @returns {boolean}
 */
function matchesFollowUp(lead, bucket, now = Date.now()) {
  if (!isOpenLead(lead)) return false;
  const due = lead?.followUpAt ? Date.parse(lead.followUpAt) : Number.NaN;

  if (bucket === 'none') return !Number.isFinite(due);
  if (!Number.isFinite(due)) return false;
  if (bucket === 'overdue') return due < now;
  if (bucket === 'today') return due >= now && istDay(due) === istDay(now);
  if (bucket === 'next7') return due >= now && due <= now + NEXT_DAYS * DAY_MS;
  return true;
}

/**
 * The worklist's counts — `meta.followUp` of the lead list (prompt 51): how
 * many open leads of the view are overdue, due today, due within seven days,
 * and without a next step.
 *
 * @param {Array<object>} leads the view, every filter but `followUp` applied
 * @param {number} [now]
 * @returns {{overdue: number, today: number, next7: number, none: number}}
 */
function followUpCounts(leads, now = Date.now()) {
  return Object.fromEntries(
    LEAD_FOLLOW_UP.values.map((bucket) => [
      bucket,
      leads.filter((lead) => matchesFollowUp(lead, bucket, now)).length,
    ])
  );
}

/**
 * Whether an open lead has gone `days` days without a change (prompt 51).
 *
 * @param {object} lead
 * @param {number} days
 * @param {number} [now]
 * @returns {boolean}
 */
function isIdleFor(lead, days, now = Date.now()) {
  if (!isOpenLead(lead)) return false;
  const touched = Date.parse(lead?.updatedAt ?? lead?.createdAt);
  return Number.isFinite(touched) && now - touched >= days * DAY_MS;
}

const first = (value) => (Array.isArray(value) ? value[0] : value);

const isFilled = (value) => value !== undefined && value !== null && value !== '';

/** The fields `q` is looked for in, as typed. */
const SEARCH_FIELDS = ['name', 'email', 'phone', 'message'];

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

/** Only the characters a person types a phone number with. */
const PHONE_QUERY = /^[\d\s()+.-]+$/;

/** The shortest run of digits worth comparing as part of a number. */
const PHONE_QUERY_MIN_DIGITS = 4;

/**
 * Whether `q` finds the lead.
 *
 * The text match first — name, e-mail, phone and message, as typed. Then, for a
 * query that is a phone number, the digits alone: the desk types
 * `98765 43210`, `+91 98765 43210` or `098765 43210`, and the record holds
 * `9876543210` or `+919876543210`; none of those is a substring of the other
 * (QA-53).
 *
 * @param {object} lead
 * @param {string} q
 * @returns {boolean}
 */
function matchesLeadQuery(lead, q) {
  if (matchesQ(lead, SEARCH_FIELDS, q)) return true;

  const text = String(q ?? '').trim();
  if (!PHONE_QUERY.test(text)) return false;

  const wanted = localMobileDigits(text) ?? text.replace(/\D/g, '');
  if (wanted.length < PHONE_QUERY_MIN_DIGITS) return false;

  const stored = typeof lead?.phone === 'string' ? lead.phone : '';
  const have = localMobileDigits(stored) ?? stored.replace(/\D/g, '');
  return have.includes(wanted);
}

/**
 * Applies every filter of the admin lead list.
 *
 * @param {Array<object>} items the leads in scope
 * @param {object} query `req.query`
 * @param {{user?: object}} [options] the signed-in user, for `assignedTo=me`
 * @returns {Array<object>}
 */
function applyLeadFilters(items, query = {}, { user, now = Date.now() } = {}) {
  const csv = (name) => inCsv(query[name]);
  const has = (name) => csv(name).length > 0;

  const from = isFilled(first(query.from)) ? String(first(query.from)).slice(0, 10) : null;
  const to = isFilled(first(query.to)) ? String(first(query.to)).slice(0, 10) : null;
  const q = first(query.q);
  // An unknown bucket filters nothing, as an unknown parameter does (§5.6).
  const followUp = LEAD_FOLLOW_UP.has(String(first(query.followUp) ?? ''))
    ? String(first(query.followUp))
    : null;
  const idle = Number.parseInt(String(first(query.idleDays) ?? ''), 10);
  const idleDays = Number.isFinite(idle) && idle > 0 ? idle : null;

  return items.filter((lead) => {
    if (followUp && !matchesFollowUp(lead, followUp, now)) return false;
    if (idleDays && !isIdleFor(lead, idleDays, now)) return false;
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
      const created = istDay(lead.createdAt);
      if (created === null) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;
    }

    return isFilled(q) ? matchesLeadQuery(lead, q) : true;
  });
}

/** The columns the lead table sorts by (`adminUsers` style: a fixed list). */
const SORTABLE = ['createdAt', 'updatedAt', 'followUpAt', 'status', 'priority'];

/**
 * The order a status or a priority sorts in: its place in the enum.
 *
 * A status sorts along the funnel — New, Contacted, Qualified, Site Visit,
 * Negotiation, Converted — with Lost after them, and a priority from Low to
 * High. Compared as words they came out as "Contacted, Converted, Lost,
 * Negotiation, New…" and "High, Low, Medium", which no desk reads (QA-53).
 */
const RANKS = {
  status: LEAD_STATUS.values,
  priority: LEAD_PRIORITY.values,
};

/** The value a lead sorts by, as a number; `null` sorts last either way. */
const value = (lead, field) => {
  if (RANKS[field]) {
    const rank = RANKS[field].indexOf(lead[field]);
    return rank === -1 ? null : rank;
  }
  const parsed = Date.parse(lead[field]);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Newest first, then the higher id: the order two equal rows keep. */
const newestFirst = (a, b) =>
  (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) ||
  (Number(b.id) || 0) - (Number(a.id) || 0);

/**
 * Sorts the lead list; the default is newest first.
 *
 * Rows that tie — twenty leads of the same priority — stay newest first, so a
 * page boundary falls in the same place on every request.
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

    if (left === null && right === null) return newestFirst(a, b);
    if (left === null) return 1;
    if (right === null) return -1;
    return (direction === 'desc' ? right - left : left - right) || newestFirst(a, b);
  });
}

/* ------------------------------------------------------------------ *
 * Duplicates
 * ------------------------------------------------------------------ */

/** How far apart two enquiries from one number may be and still be "the same". */
const DUPLICATE_WINDOW_DAYS = 30;
const DUPLICATE_WINDOW_MS = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * The ten digits of an Indian mobile number, however it was typed, or `null`.
 *
 * `+91 98765 43210`, `+91-98765-43210`, `09876543210` and `9876543210` are all
 * `9876543210`. The country code is taken off only when it **is** one — twelve
 * digits starting 91 — and the trunk zero only from eleven: stripping a
 * leading `91` from any number mangled every ten-digit mobile of the 91xxx
 * series (`9123456780` became `23456780`), so those were stored as typed and
 * never matched the same number sent with its `+91` (QA-53).
 *
 * @param {string} value
 * @returns {string|null}
 */
function localMobileDigits(value) {
  if (typeof value !== 'string') return null;

  let digits = value.replace(/[\s()-]/g, '').replace(/^\+/, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

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
  const local = localMobileDigits(value);
  return local ? `+91${local}` : null;
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
  followUpCounts,
  isIdleFor,
  isOpenLead,
  matchesFollowUp,
  isPossibleDuplicate,
  leadPhoneKey,
  localMobileDigits,
  matchesAssignee,
  matchesLeadQuery,
  normalizeLeadPhone,
  DUPLICATE_WINDOW_DAYS,
  CLOSED_STATUSES,
  SORTABLE,
};
