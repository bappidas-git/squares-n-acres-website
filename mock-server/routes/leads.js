/**
 * Leads — the public form and the CRM (00_MASTER_CONTEXT.md §5.11, §5.14,
 * §6.7, §10).
 *
 *   POST   /api/leads                        the site's forms, throttled
 *   GET    /api/admin/leads                  filters, sales scope, pagination
 *   GET    /api/admin/leads/export           the same list as CSV
 *   GET    /api/admin/leads/:id
 *   PATCH  /api/admin/leads/:id              status, priority, follow-up, owner
 *   DELETE /api/admin/leads/:id              admins and managers only
 *   POST   /api/admin/leads/:id/claim        a sales user takes an open lead
 *   POST   /api/admin/leads/:id/notes
 *   DELETE /api/admin/leads/:id/notes/:noteId
 *   POST   /api/admin/leads/bulk             status | assign | priority | delete
 *
 * Two rules run through all of it. **Scope** (D15): a sales user sees, edits,
 * claims and exports the leads assigned to them and the ones nobody has taken,
 * and nothing else — a lead outside that scope answers 404, because its
 * existence is not theirs to know. **Timeline**: every change worth explaining
 * later appends an activity, so the lead detail can be read like a story.
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { toCsv } = require('../lib/csv');
const {
  LEAD_PRIORITY,
  LEAD_SOURCES,
  LEAD_STATUS,
  LEGACY_LEAD_SOURCE_MAP,
} = require('../lib/enums');
const { applyLeadFilters, applyLeadSort } = require('../lib/leadFilters');
const { canSeeLead, omit, scopeLeads } = require('../lib/scope');
const { clientIp, rateLimit } = require('../middleware/rateLimit');
const { conflict, forbidden, notFound, validation } = require('../middleware/errors');
const { embedLead } = require('../lib/embed');
const { nextId } = require('../lib/ids');
const { paginate, toPositiveInt, DEFAULT_PER_PAGE_ADMIN } = require('../lib/paginate');
const { validateBody } = require('../middleware/validate');
const { buildDefaults, mergeDefaults, sanitize } = require('../middleware/timestamps');
const {
  addActivity,
  describeAssignment,
  describeCreated,
  describeFollowUp,
  describePriorityChange,
  describeStatusChange,
} = require('../lib/activities');

/** §5.11: ten submissions a minute per IP, on every public write. */
const SUBMISSIONS_PER_MINUTE = 10;

/** The fields a sales user may change on a lead they hold (§7, D15). */
const SALES_PATCHABLE = ['status', 'priority', 'followUpAt', 'lostReason'];

/** `POST /admin/leads/bulk` (§5.14). */
const BULK_ACTIONS = ['status', 'assign', 'priority', 'delete'];

/** The columns of `GET /admin/leads/export`, in order (§5.14). */
const CSV_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'property', label: 'Property' },
  { key: 'requirement', label: 'Requirement' },
  { key: 'message', label: 'Message' },
  { key: 'followUpAt', label: 'Follow-up' },
  { key: 'createdAt', label: 'Created At' },
];

/** The message every 403 of the admin API carries (§5.3). */
const FORBIDDEN = 'You do not have permission to perform this action.';

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/**
 * An Indian mobile number in one shape: `+919876543210`.
 *
 * The forms send `+91 98765 43210`, `09876543210` and `9876543210`, and a
 * CRM that stores all three cannot tell that they are one person (§7).
 */
function normalizePhone(value) {
  if (typeof value !== 'string') return value;

  const digits = value.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const local = digits.replace(/^91/, '').replace(/^0/, '');
  if (!/^[6-9]\d{9}$/.test(local)) return value;

  return `+91${local}`;
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
  });

  const userName = (id) => users().find((user) => sameId(user.id, id))?.name ?? null;

  /**
   * A lead as a response returns it (`docs/API_CONTRACT.md`, `Lead`).
   *
   * `ipAddress` and `userAgent` are for the CRM, not for the visitor who filled
   * the form in; a list row drops the timeline, which only the detail renders.
   */
  const present = (lead, { admin = true, list = false, collections = source() } = {}) => {
    const embedded = embedLead(lead, collections);
    const scoped = admin ? embedded : omit(embedded, ['ipAddress', 'userAgent']);
    return list ? omit(scoped, ['activities']) : scoped;
  };

  /** The lead a route addresses, or a 404 — including "not in your scope". */
  function findInScope(req) {
    const lead = find(req.params.id);
    if (!lead || !canSeeLead(lead, req.user)) throw notFound();
    return lead;
  }

  /**
   * The next sales user in the rotation, or `null` when auto-assignment is off.
   *
   * The turn is derived from the leads themselves — the most recently created
   * one that went to a sales user decides who is next — so the mock needs no
   * cursor of its own (§10).
   */
  function nextAssignee() {
    const settings = db.getSingleton('siteSettings');
    if (settings?.leads?.autoAssign !== 'round-robin') return null;

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
   * @param {object} lead the stored lead, mutated in place
   * @param {object} changes only the fields the request actually sent
   * @param {object} user the signed-in user, credited on every entry
   * @returns {object} the lead
   */
  function applyChanges(lead, changes, user) {
    const at = new Date().toISOString();
    const has = (field) => Object.prototype.hasOwnProperty.call(changes, field);
    const entries = [];

    if (has('status') && changes.status !== lead.status) {
      entries.push({
        type: 'status-changed',
        description: describeStatusChange(lead.status, changes.status),
      });
    }
    if (has('priority') && changes.priority !== lead.priority) {
      entries.push({
        type: 'priority-changed',
        description: describePriorityChange(lead.priority, changes.priority),
      });
    }
    if (has('assignedTo') && !sameId(changes.assignedTo ?? '', lead.assignedTo ?? '')) {
      entries.push({
        type: 'assigned',
        description: describeAssignment(userName(changes.assignedTo)),
      });
    }
    if (has('followUpAt') && changes.followUpAt !== lead.followUpAt) {
      entries.push({ type: 'follow-up-set', description: describeFollowUp(changes.followUpAt) });
    }

    Object.assign(lead, changes, { updatedAt: at });
    for (const entry of entries) addActivity(lead, { ...entry, createdBy: user?.id ?? null, at });

    return lead;
  }

  /** The leads a request may see, after scope, filters and sorting. */
  function queryLeads(req) {
    const scoped = scopeLeads(rows(), req.user);
    const filtered = applyLeadFilters(scoped, req.query, { user: req.user });
    return applyLeadSort(filtered, req.query.sort, req.query.order);
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

      if (typeof body.phone === 'string') body.phone = normalizePhone(body.phone);
      validateBody(schemas.getSchema('lead.create'), body, { fillDefaults: true });

      // The old site's 24 source values keep arriving from bookmarked pages and
      // stale bundles; they are stored under their §6.17 name (BUG-09).
      const canonical = LEGACY_LEAD_SOURCE_MAP[body.source] ?? body.source;
      if (!LEAD_SOURCES.has(canonical)) {
        throw validation({ source: ['The selected source is invalid.'] });
      }

      const settings = db.getSingleton('siteSettings');
      const clean = sanitize(body, model.fields);
      const now = new Date().toISOString();
      const utm = hasValue(clean.utm) ? clean.utm : utmFromUrl(clean.pageUrl);
      const assignedTo = nextAssignee();

      const record = {
        ...mergeDefaults(buildDefaults(model.fields), clean),
        source: canonical,
        status: 'new',
        priority: settings?.leads?.defaultPriority ?? 'medium',
        assignedTo,
        notes: [],
        activities: [],
        utm: { ...utm },
        ipAddress: clientIp(req),
        userAgent: req.get('user-agent') ?? null,
        id: nextId(rows()),
        createdAt: now,
        updatedAt: now,
      };

      addActivity(record, { type: 'created', description: describeCreated(canonical), at: now });
      if (assignedTo !== null) {
        addActivity(record, {
          type: 'assigned',
          description: describeAssignment(userName(assignedTo)),
          at: now,
        });
      }

      rows().push(record);

      // An enquiry is a fact about the listing too (§10); the counter is
      // server-managed, so this is the only place it moves.
      const property = db
        .getCollection('properties')
        .find((row) => sameId(row.id, record.propertyId) && row.isActive);
      if (property) property.enquiryCount = (property.enquiryCount ?? 0) + 1;

      db.write();

      res.created(present(record, { admin: false }));
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
      meta
    );
  });

  router.get('/admin/leads/export', (req, res) => {
    const collections = source();
    const localityName = (id) =>
      collections.localities.find((locality) => sameId(locality.id, id))?.name ?? null;

    /** The requirement as one readable cell, empty when nothing was captured. */
    const requirement = (lead) => {
      const wanted = lead.requirement ?? {};
      const budget =
        wanted.budgetMin || wanted.budgetMax
          ? `${wanted.budgetMin ?? ''}–${wanted.budgetMax ?? ''}`
          : null;

      return [
        wanted.listingType,
        Number.isFinite(wanted.bedrooms) ? `${wanted.bedrooms} BHK` : null,
        localityName(wanted.localityId),
        budget,
        wanted.timeline,
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
        source: LEAD_SOURCES.labelOf(lead.source) ?? lead.source,
        status: LEAD_STATUS.labelOf(lead.status) ?? lead.status,
        priority: LEAD_PRIORITY.labelOf(lead.priority) ?? lead.priority,
        assignedTo: userName(lead.assignedTo),
        property:
          collections.properties.find((property) => sameId(property.id, lead.propertyId))?.title ??
          null,
        requirement: requirement(lead),
        message: lead.message,
        followUpAt: lead.followUpAt,
        createdAt: lead.createdAt,
      })),
      CSV_COLUMNS
    );

    const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
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
      }

      if (body.action === 'priority') {
        if (!LEAD_PRIORITY.has(payload.priority)) {
          throw validation({ 'payload.priority': ['The selected priority is invalid.'] });
        }
        changes.priority = payload.priority;
      }

      if (body.action === 'assign') {
        const assignee = payload.assignedTo ?? null;
        if (assignee !== null && !users().some((user) => sameId(user.id, assignee))) {
          throw validation({ 'payload.assignedTo': ['The selected user does not exist.'] });
        }
        changes.assignedTo = assignee;
      }

      const ids = body.ids.map(String);
      const targets = rows().filter((lead) => ids.includes(String(lead.id)));

      if (body.action === 'delete') {
        for (const lead of targets) db.removeRecord('leads', lead.id);
      } else {
        for (const lead of targets) applyChanges(lead, { ...changes }, req.user);
        db.write();
      }

      const affected = targets.length;
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
      validateBody(schemas.getSchema('lead.patch'), body, { partial: true });

      const changes = sanitize(body, model.fields);

      // A sales user works their own pipeline: the status, the priority, the
      // follow-up and why a lead was lost. Handing a lead to somebody else is
      // `leads.assign`, which they do not hold (§7).
      if (req.user.role === 'sales') {
        const refused = Object.keys(changes).filter((field) => !SALES_PATCHABLE.includes(field));
        if (refused.length > 0) throw forbidden(FORBIDDEN);
      }

      if (
        Object.prototype.hasOwnProperty.call(changes, 'assignedTo') &&
        changes.assignedTo !== null &&
        !users().some((user) => sameId(user.id, changes.assignedTo))
      ) {
        throw validation({ assignedTo: ['The selected user does not exist.'] });
      }

      applyChanges(lead, changes, req.user);
      db.write();

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
