/**
 * Leads — the public form and the CRM (00_MASTER_CONTEXT.md §5.11, §5.14,
 * §6.7, §10).
 *
 *   POST   /api/leads                        the site's forms, throttled; a lead
 *                                            about a listing also opens its gated
 *                                            files (`access`, lib/fileAccess.js)
 *   GET    /api/admin/leads                  filters, sales scope, pagination;
 *                                            `meta.followUp` counts the worklist
 *   POST   /api/admin/leads                  an enquiry the desk enters itself
 *   GET    /api/admin/leads/export           the same list as CSV
 *   GET    /api/admin/leads/:id
 *   PATCH  /api/admin/leads/:id              status, priority, follow-up, owner,
 *                                            and the contact details
 *   DELETE /api/admin/leads/:id              admins and managers only
 *   POST   /api/admin/leads/:id/claim        a sales user takes an open lead
 *   POST   /api/admin/leads/:id/notes
 *   DELETE /api/admin/leads/:id/notes/:noteId
 *   POST   /api/admin/leads/:id/activities   a call, a visit, a meeting — logged
 *   POST   /api/admin/leads/bulk             status | assign | priority | delete
 *
 * Prompt 51 made the desk's own work part of the record: a lead entered by
 * hand, the details it corrects, the conversations it logs. A second enquiry
 * from a number whose open lead is under thirty days old goes to that lead's
 * owner, and the older lead's timeline says so. A lead keeps a snapshot of
 * the listing it named, so it still says what it was about once the listing
 * is gone.
 *
 * Two rules run through all of it. **Scope** (D15): a sales user sees, edits,
 * claims and exports the leads assigned to them and the ones nobody has taken,
 * and nothing else — a lead outside that scope answers 404, because its
 * existence is not theirs to know. **Timeline**: every change worth explaining
 * later appends an activity, so the lead detail can be read like a story.
 *
 * Every admin read also carries `isPossibleDuplicate` — whether another lead
 * holds the same number within thirty days (`lib/leadFilters.js`) — because the
 * moment to notice that somebody has enquired twice is while reading the row,
 * not after calling them twice.
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { formatBhk, formatPriceRange } = require('../../src/utils/format');
const { toCsv } = require('../lib/csv');
const {
  LEAD_CONTACT_TYPES,
  LEAD_PRIORITY,
  LEAD_SOURCES,
  LEAD_STATUS,
  LEGACY_LEAD_SOURCE_MAP,
  LISTING_TYPES,
  REQUIREMENT_TIMELINES,
  SITE_LEAD_SOURCES,
} = require('../lib/enums');
const {
  applyLeadFilters,
  applyLeadSort,
  buildDuplicateIndex,
  followUpCounts,
  isOpenLead,
  isPossibleDuplicate,
  leadPhoneKey,
  normalizeLeadPhone,
} = require('../lib/leadFilters');
const { canSeeLead, omit, scopeLeads } = require('../lib/scope');
const { clientIp, rateLimit } = require('../middleware/rateLimit');
const { conflict, forbidden, notFound, validation } = require('../middleware/errors');
const { embedLead, leadProperty, propertySnapshotOf } = require('../lib/embed');
const { fillWhatsappTemplate } = require('../../src/config/leadWhatsapp');
const { issueAccess } = require('../lib/fileAccess');
const { istDateTime, istDay } = require('../lib/ist');
const { nextId } = require('../lib/ids');
const { paginate, toPositiveInt, DEFAULT_PER_PAGE_ADMIN } = require('../lib/paginate');
const { validateBody } = require('../middleware/validate');
const { buildDefaults, mergeDefaults, sanitize } = require('../middleware/timestamps');
const {
  addActivity,
  describeAssignment,
  describeCreated,
  describeDetailsUpdate,
  describeFollowUp,
  describePriorityChange,
  describeStatusChange,
} = require('../lib/activities');

/** §5.11: ten submissions a minute per IP, on every public write. */
const SUBMISSIONS_PER_MINUTE = 10;

/** What a lead captured about the person, which the desk may correct (prompt 51). */
const DETAIL_FIELDS = ['name', 'phone', 'email', 'requirement'];

/**
 * The fields a sales user may change on a lead they hold (§7, D15) — the
 * details only on a lead assigned to them (prompt 51).
 */
const SALES_PATCHABLE = ['status', 'priority', 'followUpAt', 'lostReason', ...DETAIL_FIELDS];

/**
 * How recent an open lead from the same number must be for a new enquiry to
 * go to its owner rather than round the rotation (prompt 51).
 */
const REPEAT_WINDOW_DAYS = 30;
const REPEAT_WINDOW_MS = REPEAT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** The roles a listing's advisor may be linked to and still receive leads (prompt 51). */
const ADVISOR_ROLES = new Set(['sales', 'manager']);

/** `POST /admin/leads/bulk` (§5.14). */
const BULK_ACTIONS = ['status', 'assign', 'priority', 'delete'];

/**
 * A lost reason's length: three characters at least — the dialog's minimum
 * (prompt 29 §7) — and at most what `lead.patch` stores.
 */
const LOST_REASON_MIN = 3;
const LOST_REASON_MAX = schemas.getSchema('lead.patch').lostReason.maxLength;

/**
 * The columns of `GET /admin/leads/export`, in order (§5.14).
 *
 * The two dates are IST wall-clock times (`2026-09-14 18:00`), which a
 * spreadsheet reads as dates; the header says so (QA-53).
 */
const CSV_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'lostReason', label: 'Lost Reason' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'property', label: 'Property' },
  { key: 'requirement', label: 'Requirement' },
  { key: 'message', label: 'Message' },
  { key: 'followUpAt', label: 'Follow-up (IST)' },
  { key: 'createdAt', label: 'Created At (IST)' },
];

/** The message every 403 of the admin API carries (§5.3). */
const FORBIDDEN = 'You do not have permission to perform this action.';

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** Two stored values are the same value — an id however it is typed, an object by content. */
const sameValue = (left, right) => {
  if ((left ?? null) === null || (right ?? null) === null)
    return (left ?? null) === (right ?? null);
  if (typeof left === 'object' || typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return String(left) === String(right);
};

/**
 * The change set with the lost reason settled (prompt 29 §7, QA-53).
 *
 * - Marking a lead as lost asks why: a reason of three characters or more
 *   comes with it, and so does rewriting the reason of a lead that is lost.
 * - Reopening a lost lead clears the reason. The timeline entry of the move to
 *   Lost keeps it, so nothing is forgotten; the lead just stops claiming it.
 * - A reason on a lead that is not lost is refused rather than stored where
 *   nothing reads it.
 *
 * @param {object} lead the stored lead
 * @param {object} changes what the request would write
 * @param {string} [field] the key a 422 names — `payload.lostReason` for a bulk action
 * @returns {object} the change set to apply
 */
function settleLostReason(lead, changes, field = 'lostReason') {
  const status = hasOwn(changes, 'status') ? changes.status : lead.status;
  const sent = hasOwn(changes, 'lostReason');

  if (status === 'lost') {
    if (lead.status === 'lost' && !sent) return changes;
    return { ...changes, lostReason: lostReasonOf(changes.lostReason, field) };
  }

  const reason = typeof changes.lostReason === 'string' ? changes.lostReason.trim() : null;
  if (sent && reason) {
    throw validation({ [field]: ['The lost reason applies to a lost lead only.'] });
  }
  return lead.status === 'lost' || sent ? { ...changes, lostReason: null } : changes;
}

/**
 * A lost reason, trimmed, or a 422 naming `field`.
 *
 * @param {unknown} value
 * @param {string} field
 * @returns {string}
 */
function lostReasonOf(value, field) {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (!reason) {
    throw validation({ [field]: ['The lost reason is required when a lead is marked as lost.'] });
  }
  if (reason.length < LOST_REASON_MIN) {
    throw validation({
      [field]: [`The lost reason must be at least ${LOST_REASON_MIN} characters.`],
    });
  }
  if (reason.length > LOST_REASON_MAX) {
    throw validation({
      [field]: [`The lost reason may not be greater than ${LOST_REASON_MAX} characters.`],
    });
  }
  return reason;
}

/** The `utm_*` parameters of the page the form was submitted from. */
function utmFromUrl(pageUrl) {
  const empty = { source: null, medium: null, campaign: null, term: null, content: null };
  if (typeof pageUrl !== 'string' || pageUrl === '') return empty;

  let params;
  try {
    params = new URL(pageUrl, 'https://placeholder.invalid').searchParams;
  } catch {
    return empty;
  }

  return Object.fromEntries(
    Object.keys(empty).map((key) => [key, params.get(`utm_${key}`) || null])
  );
}

/** True when the object carries at least one value. */
const hasValue = (object) => Object.values(object ?? {}).some((value) => Boolean(value));

/**
 * The leads router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const model = getModel('leads');

  const rows = () => db.getCollection('leads');
  const users = () => db.getCollection('adminUsers');
  const find = (id) => rows().find((lead) => sameId(lead?.id, id));

  const source = () => ({
    properties: db.getCollection('properties'),
    localities: db.getCollection('localities'),
    adminUsers: users(),
    // Built once per response rather than per row: a twenty-row page would
    // otherwise walk the whole collection twenty times (prompt 29).
    duplicates: buildDuplicateIndex(rows()),
  });

  const userName = (id) =>
    id === null || id === undefined
      ? null
      : (users().find((user) => sameId(user.id, id))?.name ?? null);

  /**
   * A lead as a response returns it (`docs/API_CONTRACT.md`, `Lead`).
   *
   * `ipAddress` and `userAgent` are for the CRM, not for the visitor who filled
   * the form in; a list row drops the timeline, which only the detail renders.
   *
   * Each timeline entry carries its author's name, `createdByName`, read from
   * the directory as the note does from its own record: a sales user cannot
   * read the directory, so "Assigned to Sales User" by the manager used to
   * render with no author at all (QA-53).
   */
  const present = (lead, { admin = true, list = false, collections = source() } = {}) => {
    const embedded = embedLead(lead, collections);
    const scoped = admin
      ? {
          ...embedded,
          isPossibleDuplicate: isPossibleDuplicate(lead, collections.duplicates),
          whatsappMessage: whatsappMessageOf(embedded),
        }
      : omit(embedded, ['ipAddress', 'userAgent']);
    if (list) return omit(scoped, ['activities']);

    return Array.isArray(scoped.activities)
      ? {
          ...scoped,
          activities: scoped.activities.map((activity) => ({
            ...activity,
            createdByName: userName(activity.createdBy),
          })),
        }
      : scoped;
  };

  /**
   * The message the desk's WhatsApp buttons open with for this lead
   * (prompt 51): `settings.leads.whatsappTemplate`, filled in here because the
   * `leads` branch of the settings is not a sales user's to read, and the
   * sales desk is who sends it.
   *
   * @param {object} lead the lead with `property` and `assignedUser` embedded
   * @returns {string}
   */
  function whatsappMessageOf(lead) {
    const settings = db.getSingleton('siteSettings') ?? {};
    const live = lead.property && !lead.property.deleted ? lead.property : null;
    const siteUrl = String(settings.general?.siteUrl ?? '').replace(/\/+$/, '');
    return fillWhatsappTemplate(settings.leads?.whatsappTemplate, {
      name: lead.name,
      property: live?.title ?? '',
      agent: lead.assignedUser?.name ?? '',
      link: live?.slug && siteUrl ? `${siteUrl}/properties/${live.slug}` : '',
      brand: settings.general?.siteName ?? '',
    });
  }

  /**
   * The colleague a lead may be handed to, or a 422 naming `field`.
   *
   * A deactivated account cannot sign in to work the lead, so it is refused as
   * a new owner (QA-53); a lead that already sits with one keeps it until it is
   * reassigned.
   */
  function assertAssignable(assignee, field, current = null) {
    if (assignee === null || sameId(assignee, current ?? '')) return;
    const user = users().find((row) => sameId(row.id, assignee));
    if (!user) throw validation({ [field]: ['The selected user does not exist.'] });
    if (user.isActive === false) throw validation({ [field]: ['The selected user is inactive.'] });
  }

  /** The lead a route addresses, or a 404 — including "not in your scope". */
  function findInScope(req) {
    const lead = find(req.params.id);
    if (!lead || !canSeeLead(lead, req.user)) throw notFound();
    return lead;
  }

  /**
   * Who a new lead goes to, by `settings.leads.autoAssign`: nobody, the next
   * sales user in the rotation, or — `listing-advisor`, prompt 51 — the
   * account linked to the advisor of the listing it names, with the rotation
   * as the fallback.
   *
   * @param {object} record the lead about to be stored
   * @returns {number|null}
   */
  function autoAssignee(record) {
    const mode = db.getSingleton('siteSettings')?.leads?.autoAssign;
    if (mode === 'listing-advisor') return advisorOf(record.propertyId) ?? nextInRotation();
    if (mode === 'round-robin') return nextInRotation();
    return null;
  }

  /**
   * The account behind a listing's advisor card, when it can take the lead:
   * the card is active and linked to an active sales or manager account.
   *
   * @param {number|null} propertyId
   * @returns {number|null}
   */
  function advisorOf(propertyId) {
    if (propertyId === null || propertyId === undefined) return null;
    const property = db.getCollection('properties').find((row) => sameId(row.id, propertyId));
    const memberId = property?.agent?.teamMemberId;
    if (memberId === null || memberId === undefined) return null;
    const member = db.getCollection('teamMembers').find((row) => sameId(row.id, memberId));
    if (!member || member.isActive === false) return null;
    return activeOwner(member.userId, ADVISOR_ROLES);
  }

  /**
   * `id` when it names an active account (of one of `roles`, when given) —
   * somebody who can still sign in and work a lead — else `null`.
   */
  function activeOwner(id, roles = null) {
    if (id === null || id === undefined) return null;
    const user = users().find((row) => sameId(row.id, id));
    if (!user || user.isActive === false) return null;
    if (roles && !roles.has(user.role)) return null;
    return user.id;
  }

  /**
   * The open lead a new enquiry repeats: the newest one from the same number,
   * not converted or lost, created within {@link REPEAT_WINDOW_DAYS} days
   * (prompt 51). A lead with no number repeats nothing.
   *
   * @param {object} record the new lead
   * @param {number} now
   * @returns {object|null}
   */
  function repeatedLead(record, now) {
    const key = leadPhoneKey(record.phone);
    if (key === '') return null;
    return (
      rows()
        .filter(
          (lead) =>
            !sameId(lead.id, record.id) &&
            isOpenLead(lead) &&
            leadPhoneKey(lead.phone) === key &&
            now - Date.parse(lead.createdAt) <= REPEAT_WINDOW_MS
        )
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] ?? null
    );
  }

  /**
   * The next sales user in the rotation.
   *
   * The turn is derived from the leads themselves — the most recently created
   * one that went to a sales user decides who is next — so the mock needs no
   * cursor of its own (§10). A colleague who has since been deactivated is
   * simply not in the rotation any more: the turn passes to the first one.
   */
  function nextInRotation() {
    const sales = users()
      .filter((user) => user.role === 'sales' && user.isActive !== false)
      .sort((left, right) => left.id - right.id);
    if (sales.length === 0) return null;

    const previous = rows()
      .filter((lead) => sales.some((user) => sameId(user.id, lead.assignedTo)))
      .sort(
        (left, right) =>
          Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id - right.id
      )
      .at(-1);

    if (!previous) return sales[0].id;

    const index = sales.findIndex((user) => sameId(user.id, previous.assignedTo));
    return sales[(index + 1) % sales.length].id;
  }

  /**
   * Applies a change set to a lead and records what it changed.
   *
   * A change set that changes nothing writes nothing — not an activity and not
   * `updatedAt` — which is also what `affected` of a bulk action counts.
   *
   * @param {object} lead the stored lead, mutated in place
   * @param {object} changes only the fields the request actually sent
   * @param {object} user the signed-in user, credited on every entry
   * @returns {boolean} whether any field changed
   */
  function applyChanges(lead, changes, user) {
    const at = new Date().toISOString();
    const differs = (field) => hasOwn(changes, field) && !sameValue(changes[field], lead[field]);
    const entries = [];

    const details = DETAIL_FIELDS.filter(differs);
    if (details.length > 0) {
      entries.push({
        type: 'details-updated',
        description: describeDetailsUpdate(details, user?.name ?? null),
      });
    }

    if (differs('status')) {
      entries.push({
        type: 'status-changed',
        description: describeStatusChange(lead.status, changes.status, changes.lostReason),
      });
    }
    if (differs('priority')) {
      entries.push({
        type: 'priority-changed',
        description: describePriorityChange(lead.priority, changes.priority),
      });
    }
    if (differs('assignedTo')) {
      entries.push({
        type: 'assigned',
        description: describeAssignment(userName(changes.assignedTo)),
      });
    }
    if (differs('followUpAt')) {
      entries.push({ type: 'follow-up-set', description: describeFollowUp(changes.followUpAt) });
    }

    const changed = Object.keys(changes).some(differs);
    if (!changed) return false;

    Object.assign(lead, changes, { updatedAt: at });
    for (const entry of entries) addActivity(lead, { ...entry, createdBy: user?.id ?? null, at });

    return true;
  }

  /** The leads a request may see, after scope, filters and sorting. */
  function queryLeads(req) {
    const scoped = scopeLeads(rows(), req.user);
    const filtered = applyLeadFilters(scoped, req.query, { user: req.user });
    return applyLeadSort(filtered, req.query.sort, req.query.order);
  }

  /**
   * The worklist's counts for the view on screen — every filter but the
   * follow-up bucket itself, so the chips keep their numbers while one of
   * them is chosen (prompt 51).
   */
  function worklistCounts(req) {
    const scoped = scopeLeads(rows(), req.user);
    const view = applyLeadFilters(
      scoped,
      { ...req.query, followUp: undefined },
      { user: req.user }
    );
    return followUpCounts(view);
  }

  /**
   * Files a new lead about a listing: the enquiry counter moves (§10) and the
   * lead keeps a snapshot of the listing (prompt 51).
   *
   * @param {object} record the lead about to be stored
   * @returns {object|null} the listing, when it is live
   */
  function attachListing(record) {
    const property = db
      .getCollection('properties')
      .find((row) => sameId(row.id, record.propertyId));
    record.propertySnapshot = propertySnapshotOf(property ?? null, {
      localities: db.getCollection('localities'),
    });
    if (!property?.isActive) return null;
    property.enquiryCount = (property.enquiryCount ?? 0) + 1;
    return property;
  }

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  router.post('/leads', rateLimit({ max: SUBMISSIONS_PER_MINUTE }), (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };

      // The honeypot is invisible to a human, so anything in it is a robot:
      // answer as if the form had been accepted and store nothing (§5.11).
      if (typeof body.website === 'string' && body.website.trim() !== '') {
        res.message('ok');
        return;
      }

      // A number the Indian rule does not recognise is kept as typed, so the
      // validator — not this line — is what refuses it (`lib/leadFilters.js`).
      if (typeof body.phone === 'string') body.phone = normalizeLeadPhone(body.phone) ?? body.phone;
      validateBody(schemas.getSchema('lead.create'), body, { fillDefaults: true });

      // The old site's 24 source values keep arriving from bookmarked pages and
      // stale bundles; they are stored under their §6.17 name (BUG-09).
      const canonical = LEGACY_LEAD_SOURCE_MAP[body.source] ?? body.source;
      // A visitor's enquiry is never one of the desk's sources (prompt 51).
      if (!SITE_LEAD_SOURCES.includes(canonical)) {
        throw validation({ source: ['The selected source is invalid.'] });
      }

      const settings = db.getSingleton('siteSettings');
      const clean = sanitize(body, model.fields);
      const moment = Date.now();
      const now = new Date(moment).toISOString();
      const utm = hasValue(clean.utm) ? clean.utm : utmFromUrl(clean.pageUrl);

      const record = {
        ...mergeDefaults(buildDefaults(model.fields), clean),
        source: canonical,
        status: 'new',
        priority: settings?.leads?.defaultPriority ?? 'medium',
        assignedTo: null,
        notes: [],
        activities: [],
        utm: { ...utm },
        ipAddress: clientIp(req),
        userAgent: req.get('user-agent') ?? null,
        id: nextId(rows()),
        createdAt: now,
        updatedAt: now,
      };

      // Somebody who enquired a fortnight ago is already somebody's
      // conversation: the new enquiry goes to that colleague, not to whoever
      // the rotation reaches next, and the older lead hears about it
      // (prompt 51).
      const repeat = repeatedLead(record, moment);
      const owner = repeat ? activeOwner(repeat.assignedTo) : null;
      record.assignedTo = owner ?? autoAssignee(record);

      addActivity(record, { type: 'created', description: describeCreated(canonical), at: now });
      if (record.assignedTo !== null) {
        addActivity(record, {
          type: 'assigned',
          description: owner
            ? `${describeAssignment(userName(owner))} — they hold lead #${repeat.id} from this number`
            : describeAssignment(userName(record.assignedTo)),
          at: now,
        });
      }

      // An enquiry is a fact about the listing too (§10); the counter is
      // server-managed, so this and the desk's own entry are the only places
      // it moves.
      const property = attachListing(record);
      rows().push(record);

      if (repeat) {
        const about = leadProperty(record, { properties: db.getCollection('properties') });
        addActivity(repeat, {
          type: 'enquired-again',
          description: `Enquired again via ${LEAD_SOURCES.labelOf(canonical) || canonical}${
            about ? ` about ${about.title}` : ''
          } — lead #${record.id}`,
          at: now,
        });
        repeat.updatedAt = now;
      }

      db.write();

      // A lead about a listing opens that listing's gated files: the token is
      // what `POST /properties/:id/documents/access` asks for. It is part of
      // this response only — a credential, never stored on the lead.
      const access = property ? issueAccess(property.id, record.id) : null;

      res.created({ ...present(record, { admin: false }), access });
    } catch (error) {
      next(error);
    }
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  router.get('/admin/leads', (req, res) => {
    const items = queryLeads(req);
    const perPage =
      String(first(req.query.perPage)) === 'all'
        ? null
        : toPositiveInt(first(req.query.perPage), DEFAULT_PER_PAGE_ADMIN);

    const { data, meta } = paginate(items, { page: first(req.query.page), perPage });
    const collections = source();

    res.ok(
      data.map((lead) => present(lead, { list: true, collections })),
      { ...meta, followUp: worklistCounts(req) }
    );
  });

  /**
   * An enquiry the desk enters itself — a walk-in, a phone call, a portal
   * lead (prompt 51). Validated like the public form without its honeypot or
   * rate limit; the source is the one sent. A sales user's lead is their own
   * whatever the form says; anyone else's goes to the colleague named, or —
   * nobody named — the way a public lead would.
   */
  router.post('/admin/leads', (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };
      if (typeof body.phone === 'string') body.phone = normalizeLeadPhone(body.phone) ?? body.phone;
      validateBody(schemas.getSchema('lead.adminCreate'), body, { fillDefaults: true });

      if (
        body.propertyId !== null &&
        body.propertyId !== undefined &&
        !db.getCollection('properties').some((row) => sameId(row.id, body.propertyId))
      ) {
        throw validation({ propertyId: ['The selected property does not exist.'] });
      }

      const user = req.user;
      const named = req.user.role === 'sales' ? null : (body.assignedTo ?? null);
      if (named !== null) assertAssignable(named, 'assignedTo');

      const settings = db.getSingleton('siteSettings');
      const now = new Date().toISOString();
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const { note: _note, ...fields } = body;
      const clean = sanitize(fields, model.fields);

      const record = {
        ...mergeDefaults(buildDefaults(model.fields), clean),
        source: body.source,
        status: 'new',
        priority: body.priority ?? settings?.leads?.defaultPriority ?? 'medium',
        assignedTo: null,
        notes: [],
        activities: [],
        utm: { source: null, medium: null, campaign: null, term: null, content: null },
        ipAddress: null,
        userAgent: null,
        id: nextId(rows()),
        createdAt: now,
        updatedAt: now,
      };
      record.assignedTo = req.user.role === 'sales' ? user.id : (named ?? autoAssignee(record));

      addActivity(record, {
        type: 'created',
        description: `Added by ${user.name} — ${LEAD_SOURCES.labelOf(body.source) || body.source}`,
        createdBy: user.id,
        at: now,
      });
      if (record.assignedTo !== null) {
        addActivity(record, {
          type: 'assigned',
          description: describeAssignment(userName(record.assignedTo)),
          createdBy: user.id,
          at: now,
        });
      }
      if (note) {
        record.notes.push({
          id: 1,
          text: note,
          createdBy: user.id,
          createdByName: user.name,
          createdAt: now,
        });
        addActivity(record, {
          type: 'note-added',
          description: 'Note added',
          createdBy: user.id,
          at: now,
        });
      }

      attachListing(record);
      rows().push(record);
      db.write();

      res.created(present(record));
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/leads/export', (req, res) => {
    const collections = source();
    const nameIn = (records, id) =>
      id === null || id === undefined
        ? null
        : (records.find((record) => sameId(record.id, id))?.name ?? null);
    const propertyTypes = db.getCollection('propertyTypes');

    /**
     * The requirement as one readable cell, empty when nothing was captured:
     * "Buy · Apartments · 3 BHK · Whitefield · ₹1.1 Cr – ₹1.4 Cr · 1–3 months",
     * in the words the lead's own page prints rather than the stored values
     * ("sale · 3 BHK · Whitefield · 11000000–14000000 · 1-3-months", QA-53).
     */
    const requirement = (lead) => {
      const wanted = lead.requirement ?? {};
      const budget =
        wanted.budgetMin || wanted.budgetMax
          ? formatPriceRange(wanted.budgetMin, wanted.budgetMax, {
              listingType: wanted.listingType,
            })
          : null;

      return [
        LISTING_TYPES.labelOf(wanted.listingType) || null,
        nameIn(propertyTypes, wanted.propertyTypeId),
        Number.isFinite(wanted.bedrooms) ? formatBhk(wanted.bedrooms) : null,
        nameIn(collections.localities, wanted.localityId),
        budget,
        REQUIREMENT_TIMELINES.labelOf(wanted.timeline) || null,
      ]
        .filter(Boolean)
        .join(' · ');
    };

    const csv = toCsv(
      queryLeads(req).map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: LEAD_SOURCES.labelOf(lead.source) || lead.source,
        status: LEAD_STATUS.labelOf(lead.status) || lead.status,
        lostReason: lead.status === 'lost' ? lead.lostReason : null,
        priority: LEAD_PRIORITY.labelOf(lead.priority) || lead.priority,
        assignedTo: userName(lead.assignedTo),
        // A deleted listing is still named, from the lead's snapshot (prompt 51).
        property: leadProperty(lead, collections)?.title ?? null,
        requirement: requirement(lead),
        message: lead.message,
        followUpAt: istDateTime(lead.followUpAt),
        createdAt: istDateTime(lead.createdAt),
      })),
      CSV_COLUMNS
    );

    // Named after the day it was taken, in IST — the browser names its copy
    // the same way (`utils/csv.js`).
    const filename = `leads-${istDay(Date.now())}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });

  router.post('/admin/leads/bulk', (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };
      validateBody(schemas.bulk, body);

      if (!BULK_ACTIONS.includes(body.action)) {
        throw validation({ action: ['The selected action is invalid.'] });
      }

      const payload = body.payload ?? {};
      const changes = {};

      if (body.action === 'status') {
        if (!LEAD_STATUS.has(payload.status)) {
          throw validation({ 'payload.status': ['The selected status is invalid.'] });
        }
        changes.status = payload.status;

        // Closing leads in bulk asks why, as closing one does (QA-53): the
        // reason is recorded on every lead the action closes.
        if (payload.status === 'lost') {
          changes.lostReason = lostReasonOf(payload.lostReason, 'payload.lostReason');
        }
      }

      if (body.action === 'priority') {
        if (!LEAD_PRIORITY.has(payload.priority)) {
          throw validation({ 'payload.priority': ['The selected priority is invalid.'] });
        }
        changes.priority = payload.priority;
      }

      if (body.action === 'assign') {
        const assignee = payload.assignedTo ?? null;
        // An id, as `PATCH` asks for one: a string "3" matched the user and was
        // stored as a string (QA-53).
        if (assignee !== null && !Number.isInteger(assignee)) {
          throw validation({
            'payload.assignedTo': ['The payload.assignedTo must be an integer.'],
          });
        }
        assertAssignable(assignee, 'payload.assignedTo');
        changes.assignedTo = assignee;
      }

      const ids = body.ids.map(String);
      const targets = rows().filter((lead) => ids.includes(String(lead.id)));

      // `affected` counts what changed, not what was named: a lead already in
      // the target state is neither an error nor news
      // (`docs/backend-notes/05_business_rules.md` → "Bulk actions").
      let affected = 0;
      if (body.action === 'delete') {
        for (const lead of targets) db.removeRecord('leads', lead.id);
        affected = targets.length;
      } else {
        for (const lead of targets) {
          // A lead that is already lost keeps the reason it was closed with.
          const own =
            changes.status === 'lost' && lead.status === 'lost' ? { status: 'lost' } : changes;
          if (applyChanges(lead, settleLostReason(lead, { ...own }), req.user)) affected += 1;
        }
        db.write();
      }

      const noun = affected === 1 ? 'lead' : 'leads';
      const verb = body.action === 'delete' ? 'deleted' : 'updated';
      res.message(`${affected} ${noun} ${verb}.`, { affected });
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/leads/:id', (req, res, next) => {
    try {
      res.ok(present(findInScope(req)));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/leads/:id', (req, res, next) => {
    try {
      const lead = findInScope(req);
      const body = { ...(req.body ?? {}) };
      // Stored the way the public form stores it, so a corrected number still
      // matches the lead's other enquiries (prompt 51).
      if (typeof body.phone === 'string') body.phone = normalizeLeadPhone(body.phone) ?? body.phone;
      validateBody(schemas.getSchema('lead.patch'), body, { partial: true });

      const changes = sanitize(body, model.fields);

      // A sales user works their own pipeline: the status, the priority, the
      // follow-up and why a lead was lost — and the details of a lead that is
      // theirs (prompt 51). Handing a lead to somebody else is `leads.assign`,
      // which they do not hold (§7).
      if (req.user.role === 'sales') {
        const refused = Object.keys(changes).filter((field) => !SALES_PATCHABLE.includes(field));
        if (refused.length > 0) throw forbidden(FORBIDDEN);
        const editsDetails = DETAIL_FIELDS.some((field) => hasOwn(changes, field));
        if (editsDetails && !sameId(lead.assignedTo, req.user.id)) {
          throw forbidden('You can correct the details of your own leads only.');
        }
      }

      if (hasOwn(changes, 'assignedTo')) {
        assertAssignable(changes.assignedTo, 'assignedTo', lead.assignedTo);
      }

      if (applyChanges(lead, settleLostReason(lead, changes), req.user)) db.write();

      res.ok(present(lead));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/leads/:id', (req, res, next) => {
    try {
      const lead = findInScope(req);
      db.removeRecord('leads', lead.id);
      res.message('Deleted');
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/leads/:id/claim', (req, res, next) => {
    try {
      const lead = findInScope(req);

      // Claiming is what a sales user does instead of assigning; an admin or a
      // manager assigns, which is a different permission (§7, D89).
      if (req.user.role !== 'sales') throw forbidden(FORBIDDEN);
      if (lead.assignedTo !== null && lead.assignedTo !== undefined) {
        throw conflict('This lead is already assigned.', {
          assignedTo: ['This lead is already assigned.'],
        });
      }

      applyChanges(lead, { assignedTo: req.user.id }, req.user);
      db.write();

      res.ok(present(lead));
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/leads/:id/notes', (req, res, next) => {
    try {
      const lead = findInScope(req);
      const body = { ...(req.body ?? {}) };
      validateBody(schemas.getSchema('lead.note'), body);

      if (!Array.isArray(lead.notes)) lead.notes = [];
      const at = new Date().toISOString();

      lead.notes.push({
        id: nextId(lead.notes),
        text: body.text,
        createdBy: req.user.id,
        createdByName: req.user.name,
        createdAt: at,
      });
      addActivity(lead, {
        type: 'note-added',
        description: 'Note added',
        createdBy: req.user.id,
        at,
      });
      lead.updatedAt = at;
      db.write();

      res.ok(present(lead));
    } catch (error) {
      next(error);
    }
  });

  /**
   * A conversation, logged (prompt 51): a typed entry on the timeline — "Call
   * logged — Interested, wants a Saturday visit" — with whatever was noted.
   * A change of status or follow-up that came of it is the `PATCH` the panel
   * sends beside it.
   */
  router.post('/admin/leads/:id/activities', (req, res, next) => {
    try {
      const lead = findInScope(req);
      const body = { ...(req.body ?? {}) };
      validateBody(schemas.getSchema('lead.activity'), body, { fillDefaults: true });

      const outcome = typeof body.outcome === 'string' ? body.outcome.trim() : '';
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const at = new Date().toISOString();

      addActivity(lead, {
        type: LEAD_CONTACT_TYPES.meta[body.type]?.activity ?? 'activity-logged',
        description: `${LEAD_CONTACT_TYPES.labelOf(body.type)} logged${outcome ? ` — ${outcome}` : ''}`,
        note: note || null,
        createdBy: req.user.id,
        at,
      });
      lead.updatedAt = at;
      db.write();

      res.ok(present(lead));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/leads/:id/notes/:noteId', (req, res, next) => {
    try {
      const lead = findInScope(req);
      const notes = Array.isArray(lead.notes) ? lead.notes : [];
      const note = notes.find((entry) => sameId(entry.id, req.params.noteId));
      if (!note) throw notFound();

      // Your own note is yours to withdraw; anybody else's belongs to the
      // record, and only an admin or a manager edits the record.
      if (req.user.role === 'sales' && !sameId(note.createdBy, req.user.id)) {
        throw forbidden(FORBIDDEN);
      }

      lead.notes = notes.filter((entry) => !sameId(entry.id, note.id));
      lead.updatedAt = new Date().toISOString();
      db.write();

      res.ok(present(lead));
    } catch (error) {
      next(error);
    }
  });

  // Leads are served here and nowhere else (§6 of prompt 08).
  const gone = (req, res, next) => next(notFound());
  router.use('/leads', gone);
  router.use('/admin/leads', gone);

  return router;
};
