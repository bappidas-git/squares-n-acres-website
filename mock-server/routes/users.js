/**
 * Admin users (00_MASTER_CONTEXT.md §5.14, §6.14, §7).
 *
 *   GET    /api/admin/users            filter `q`, `role`, `isActive`, `ids`
 *   POST   /api/admin/users            409 when the e-mail is taken
 *   GET    /api/admin/users/:id
 *   PUT    /api/admin/users/:id        full replace; the password is optional
 *   PATCH  /api/admin/users/:id        partial; sending `password` resets it
 *   DELETE /api/admin/users/:id        unassigns the user's leads
 *   POST   /api/admin/users/bulk       activate | deactivate | delete
 *
 * The area is `users`, which the matrix gives to admins only — enforced for
 * every route at once by `adminPermission()` in `mock-server/app.js`, so the
 * router itself only implements the rules the matrix cannot express:
 *
 *   - you cannot deactivate or delete your own account, and you cannot change
 *     your own role (a `PUT` on yourself keeps it; a `PATCH` that changes it is
 *     a 422) — otherwise one mis-click locks the panel's last admin out;
 *   - the last **active admin** cannot be deactivated, demoted or deleted; the
 *     rule is checked against the state the request would produce, and before
 *     the "not yourself" rules, so the answer names the reason that matters
 *     when both apply;
 *   - e-mail addresses are unique, case-insensitively;
 *   - deleting a user unassigns their leads (with an activity entry saying so)
 *     and revokes their tokens; deactivating one revokes their tokens too;
 *   - a password holds a letter and a digit as well as eight characters —
 *     the rule `PUT /auth/password` keeps, kept here too (QA-64) — and setting
 *     one (a reset) signs the account out everywhere but the session that set
 *     it, as the reset dialog tells the administrator it will;
 *   - a bulk activate or deactivate counts, and writes, only the accounts it
 *     changes: one already in that state is left alone (QA-64).
 *
 * `password` is never part of a response: every record leaves through
 * `publicUser()`.
 */

const express = require('express');

const { bulk: bulkSchema } = require('../../src/services/schemas');
const { PASSWORD_PATTERN, passwordMessage } = require('../../src/services/schemas/auth');
const { user: userSchema } = require('../../src/services/schemas/masterData');
const { conflict, notFound, validation } = require('../middleware/errors');
const { createTokenStore } = require('../lib/tokens');
const { inCsv, matchesQ, toBool } = require('../lib/filters');
const { nextId } = require('../lib/ids');
const { paginate, DEFAULT_PER_PAGE_ADMIN } = require('../lib/paginate');
const { publicUser } = require('../middleware/auth');
const { sortItems } = require('../lib/sort');
const { store } = require('../lib/password');
const { validateBody } = require('../middleware/validate');
const {
  buildDefaults,
  mergeDefaults,
  sanitize,
  serverManagedValues,
} = require('../middleware/timestamps');

/** The sort keys of the admin table (`adminUsers.sortable`, §6.14). */
const SORTABLE = ['name', 'createdAt', 'lastLoginAt'];

/** The bulk actions this resource supports (§5.8). */
const BULK_ACTIONS = ['activate', 'deactivate', 'delete'];

const EMAIL_TAKEN = 'The email has already been taken.';
const LAST_ADMIN = 'The last active admin cannot be deactivated, demoted or deleted.';
const SELF_DEACTIVATE = 'You cannot deactivate your own account.';
const SELF_DELETE = 'You cannot delete your own account.';
const SELF_ROLE = 'You cannot change your own role.';

const sameId = (left, right) => String(left) === String(right);

const sameEmail = (left, right) =>
  String(left ?? '')
    .trim()
    .toLowerCase() ===
  String(right ?? '')
    .trim()
    .toLowerCase();

/**
 * Refuses a password that is eight letters or eight digits (§5.4). Checked
 * after the schema, which has already asked for the eight characters.
 *
 * @param {unknown} password the body's password, when it carries one
 */
function assertStrongPassword(password) {
  if (typeof password !== 'string' || password === '') return;
  if (!PASSWORD_PATTERN.test(password)) throw validation({ password: [passwordMessage()] });
}

/** Trims the string fields a form sends, so ` Ada ` and `ADA@x.io ` behave. */
function normalize(body) {
  const clean = { ...(body ?? {}) };
  for (const field of ['name', 'email', 'phone', 'avatarUrl']) {
    if (typeof clean[field] === 'string') clean[field] = clean[field].trim();
  }
  return clean;
}

/**
 * The users router.
 *
 * @param {{db: object, config: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, config, getModel }) => {
  const router = express.Router();
  const tokens = createTokenStore({ db, config });
  const model = getModel('adminUsers');

  const rows = () => db.getCollection('adminUsers');
  const find = (id) => rows().find((user) => sameId(user?.id, id));

  /**
   * A password set by an administrator — a reset, or a new one in the edit
   * form — ends every session of that account (QA-64): the reset dialog says
   * "the user is signed out of their other sessions", and every one of them
   * went on working. An administrator resetting their own keeps the session
   * they did it from, as `PUT /auth/password` does.
   *
   * @param {number|string} userId
   * @param {import('express').Request} req
   */
  function signOutElsewhere(userId, req) {
    const own = sameId(userId, req.user.id) ? req.token?.token : undefined;
    tokens.revokeUserTokens(userId, { except: own });
  }

  /** 409 when another record already holds the address (§5.3). */
  function assertEmailFree(email, excludeId) {
    const taken = rows().some(
      (user) => !sameId(user.id, excludeId) && sameEmail(user.email, email)
    );
    if (taken) throw conflict(EMAIL_TAKEN, { email: [EMAIL_TAKEN] });
  }

  /**
   * Refuses a change that would leave the panel without an active admin.
   *
   * The check runs on the state the request *would* produce, which is what
   * makes it cover a demotion, a deactivation, a delete and a bulk action with
   * one rule instead of four.
   *
   * @param {{deleted?: Array<number|string>, updates?: Map<string, object>}} change
   */
  function assertAdminSurvives({ deleted = [], updates = new Map() } = {}) {
    const removed = new Set(deleted.map(String));
    const survivors = rows()
      .filter((user) => !removed.has(String(user.id)))
      .map((user) => ({ ...user, ...(updates.get(String(user.id)) ?? {}) }));

    const admins = survivors.filter((user) => user.role === 'admin' && user.isActive !== false);
    if (admins.length === 0) throw validation({ id: [LAST_ADMIN] });
  }

  /**
   * Unassigns every lead of a deleted user and records why (§10 business
   * rules: an assignment change always leaves an activity behind).
   *
   * @param {number|string} userId
   * @param {object} actor the signed-in user performing the delete
   */
  function unassignLeads(userId, actor) {
    const now = new Date().toISOString();

    for (const lead of db.getCollection('leads')) {
      if (!sameId(lead?.assignedTo, userId)) continue;

      lead.assignedTo = null;
      if (!Array.isArray(lead.activities)) lead.activities = [];
      lead.activities.push({
        id: nextId(lead.activities),
        type: 'assigned',
        description: 'Unassigned (user deleted)',
        createdBy: actor?.id ?? null,
        createdAt: now,
      });
      lead.updatedAt = now;
    }
  }

  router.get('/admin/users', (req, res) => {
    const { q, role, isActive, ids, sort, order, page, perPage } = req.query;

    const roles = inCsv(role);
    const identifiers = inCsv(ids);
    const active = toBool(isActive);

    const matched = rows().filter((user) => {
      if (!matchesQ(user, ['name', 'email'], q)) return false;
      if (roles.length > 0 && !roles.includes(user.role)) return false;
      if (identifiers.length > 0 && !identifiers.includes(String(user.id))) return false;
      if (active !== undefined && Boolean(user.isActive) !== active) return false;
      return true;
    });

    const field = SORTABLE.includes(String(sort)) ? String(sort) : 'name';
    const direction = SORTABLE.includes(String(sort)) ? order : 'asc';
    const sorted = sortItems(matched, field, direction);

    const { data, meta } = paginate(sorted, {
      page,
      perPage: perPage === 'all' ? null : (perPage ?? DEFAULT_PER_PAGE_ADMIN),
    });

    res.ok(data.map(publicUser), meta);
  });

  router.post('/admin/users/bulk', (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };
      validateBody(bulkSchema, body);

      if (!BULK_ACTIONS.includes(body.action)) {
        throw validation({ action: ['The selected action is invalid.'] });
      }

      const ids = body.ids.map(String);
      const targets = rows().filter((user) => ids.includes(String(user.id)));
      const hitsSelf = targets.some((user) => sameId(user.id, req.user.id));

      if (body.action === 'deactivate') {
        assertAdminSurvives({
          updates: new Map(targets.map((user) => [String(user.id), { isActive: false }])),
        });
        if (hitsSelf) throw validation({ id: [SELF_DEACTIVATE] });
      }

      if (body.action === 'delete') {
        assertAdminSurvives({ deleted: targets.map((user) => user.id) });
        if (hitsSelf) throw validation({ id: [SELF_DELETE] });
      }

      const now = new Date().toISOString();
      let affected = targets.length;

      if (body.action === 'delete') {
        for (const user of targets) {
          unassignLeads(user.id, req.user);
          tokens.revokeUserTokens(user.id);
          db.removeRecord('adminUsers', user.id);
        }
      } else {
        const isActive = body.action === 'activate';
        // An account already in that state is not written and not counted
        // (§5.8): "1 user updated." over one that was already inactive read
        // as a change, and the screen could not say "Nothing to change".
        const changing = targets.filter((user) => (user.isActive !== false) !== isActive);
        for (const user of changing) {
          user.isActive = isActive;
          user.updatedAt = now;
          if (!isActive) tokens.revokeUserTokens(user.id);
        }
        if (changing.length > 0) db.write();
        affected = changing.length;
      }

      const noun = affected === 1 ? 'user' : 'users';
      const verb = body.action === 'delete' ? 'deleted' : 'updated';
      res.message(`${affected} ${noun} ${verb}.`, { affected });
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/users', (req, res, next) => {
    try {
      const body = normalize(req.body);
      validateBody(userSchema.create, body, { fillDefaults: true });
      assertStrongPassword(body.password);
      assertEmailFree(body.email, null);

      const now = new Date().toISOString();
      const clean = sanitize(body, model.fields);
      const record = {
        ...mergeDefaults(buildDefaults(model.fields), clean),
        password: store(clean.password),
        id: nextId(rows()),
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };

      rows().push(record);
      db.write();

      res.created(publicUser(record));
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/users/:id', (req, res, next) => {
    const user = find(req.params.id);
    if (!user) {
      next(notFound());
      return;
    }
    res.ok(publicUser(user));
  });

  router.put('/admin/users/:id', (req, res, next) => {
    try {
      const existing = find(req.params.id);
      if (!existing) throw notFound();

      const body = normalize(req.body);
      validateBody(userSchema.update, body);
      assertStrongPassword(body.password);
      assertEmailFree(body.email, existing.id);

      const isSelf = sameId(existing.id, req.user.id);
      const clean = sanitize(body, model.fields);
      // A user editing their own record keeps their role whatever the form
      // sends; only a `PATCH` that explicitly changes it is an error (§7).
      const role = isSelf ? existing.role : clean.role;
      const isActive = clean.isActive !== false;

      assertAdminSurvives({ updates: new Map([[String(existing.id), { role, isActive }]]) });
      if (isSelf && !isActive) throw validation({ id: [SELF_DEACTIVATE] });

      const record = {
        ...mergeDefaults(
          { ...buildDefaults(model.fields), ...serverManagedValues(existing, model.fields) },
          clean
        ),
        role,
        // The form does not carry the stored password, so an absent one means
        // "unchanged" rather than "empty" (§5.14).
        password: clean.password ? store(clean.password) : existing.password,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const list = rows();
      list[list.indexOf(existing)] = record;
      db.write();

      if (record.isActive === false) tokens.revokeUserTokens(record.id);
      else if (clean.password) signOutElsewhere(record.id, req);

      res.ok(publicUser(record));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/users/:id', (req, res, next) => {
    try {
      const existing = find(req.params.id);
      if (!existing) throw notFound();

      const body = normalize(req.body);
      validateBody(userSchema.update, body, { partial: true });
      assertStrongPassword(body.password);

      const isSelf = sameId(existing.id, req.user.id);
      const clean = sanitize(body, model.fields);
      const role = clean.role ?? existing.role;
      const isActive = clean.isActive ?? existing.isActive;

      if (isSelf && role !== existing.role) throw validation({ role: [SELF_ROLE] });
      if (clean.email !== undefined) assertEmailFree(clean.email, existing.id);
      assertAdminSurvives({ updates: new Map([[String(existing.id), { role, isActive }]]) });
      if (isSelf && isActive === false) throw validation({ id: [SELF_DEACTIVATE] });

      Object.assign(existing, clean, {
        password: clean.password ? store(clean.password) : existing.password,
        updatedAt: new Date().toISOString(),
      });
      db.write();

      if (existing.isActive === false) tokens.revokeUserTokens(existing.id);
      else if (clean.password) signOutElsewhere(existing.id, req);

      res.ok(publicUser(existing));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/users/:id', (req, res, next) => {
    try {
      const existing = find(req.params.id);
      if (!existing) throw notFound();

      assertAdminSurvives({ deleted: [existing.id] });
      if (sameId(existing.id, req.user.id)) throw validation({ id: [SELF_DELETE] });

      unassignLeads(existing.id, req.user);
      tokens.revokeUserTokens(existing.id);
      db.removeRecord('adminUsers', existing.id);

      res.message('Deleted');
    } catch (error) {
      next(error);
    }
  });

  return router;
};
