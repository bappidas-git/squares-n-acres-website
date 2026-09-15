# Prompt 07 — Mock server: authentication, tokens, RBAC middleware, users, profile

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.4 Auth, §5.14 Auth/Admin endpoints, §6.14 `adminUsers`/`apiTokens`, §7 RBAC, §10), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–06 are done; working tree clean; `npm install` run; `npm run mock` works.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`mock-server/app.js` mounts `mock-server/routes/index.js` (currently `[]`) before the generic JSON Server router; `/api/admin/*` is open to everyone. `db.json` has `adminUsers` (3 users, plaintext passwords `Admin@123`/`Manager@123`/`Sales@123`, `role` admin/manager/sales, `isActive`) and an empty `apiTokens` array. `mock-server/middleware/errors.js` provides `ApiError` + helpers; `validate.js` validates bodies against `src/services/schemas/auth.js` (`auth.login`, `auth.profile`, `auth.password`) and `masterData.js` (`users`). `src/config/rbac.js` exports `PERMISSIONS` and `can(role, area, action)`. The React `AdminAuthContext` still uses the HOM flow (rewritten in prompt 12).

## 2. Objective
When this prompt is finished the mock implements the full auth contract (`POST /auth/login`, `POST /auth/logout`, `GET /auth/profile`, `PUT /auth/profile`, `PUT /auth/password`) with opaque 48-char tokens stored in `apiTokens` and a TTL from `MOCK_TOKEN_TTL_HOURS`; every `/api/admin/*` route requires a valid Bearer token (401 otherwise) and the role middleware enforces the §7 matrix per route (403); `GET|POST /admin/users`, `GET|PUT|PATCH|DELETE /admin/users/:id`, `POST /admin/users/bulk` exist with the safety rules (cannot delete/disable yourself, cannot disable/delete the last active admin, e-mail unique, password never returned); `lastLoginAt` is set on login; expired tokens are purged lazily.

## 3. Scope
### Files to create
- `mock-server/middleware/auth.js`, `mock-server/middleware/role.js`
- `mock-server/routes/auth.js`, `mock-server/routes/users.js`
- `mock-server/lib/tokens.js`, `mock-server/lib/password.js` (plain comparison + a comment-free note in README that Laravel hashes), `mock-server/lib/routePermissions.js`
- `mock-server/__tests__/auth.test.js` (Node's built-in `node:test` + `node:assert` against `createApp()` with an in-memory copy of the seed — runnable with `node --test mock-server/__tests__`; add script `"test:mock": "node --test mock-server/__tests__"` and include it in `check:all`)
### Files to modify
- `mock-server/routes/index.js` (register `auth`, `users`), `mock-server/app.js` (apply `auth` to `/api/admin` and to `/api/auth/profile|logout|password`), `mock-server/README.md`, `package.json` (`test:mock`, `check:all`), `docs/API_CONTRACT.md` (auth examples), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`
### Files to delete
- none
### May also touch
- nothing else

## 4. Detailed tasks
1. **Tokens (`lib/tokens.js`).** `issueToken(userId)` → `crypto.randomBytes(36).toString('base64url').slice(0, 48)`, stored as `{ id, userId, token, expiresAt: now + ttlHours, createdAt }` in `apiTokens`; `resolveToken(token)` → `{ token, user }` or `null` (deletes the record when expired); `revokeToken(token)`; `purgeExpired()` called on every login.
2. **`middleware/auth.js`.** Reads `Authorization: Bearer <token>`; missing/invalid/expired → `401 { message: 'Unauthenticated.' }`; inactive user → 401 `'Account is inactive.'`; attaches `req.user` (without `password`) and `req.token`. Export `requireAuth`.
3. **`middleware/role.js`.** `role(...roles)` → 403 `{ message: 'You do not have permission to perform this action.' }` when `req.user.role` is not included. Also `can(area, action)` middleware built on `src/config/rbac.js` `can()`. **`lib/routePermissions.js`** maps admin route prefixes + methods to `(area, action)` for the generic router fallback (so that master-data collections served generically in prompt 09 are also protected): e.g. `GET /admin/properties*` → `properties.view`; `POST|PUT|PATCH|DELETE /admin/properties*` → `properties.edit` (POST → `create`, DELETE → `delete`); `/admin/localities|cities|property-types|amenities|badges|developers|banks` → `masterData.*`; `/admin/articles|article-categories|article-tags|authors` → `articles.*`; `/admin/pages|faqs|testimonials|team|partners|jobs|job-applications|newsletter-subscribers` → `content.*`; `/admin/seo*` → `seo.*`; `/admin/media` → `media.*`; `/admin/settings` GET → `settings.view`, PUT → `settings.edit`; `/admin/users` → `users.*`; `/admin/leads*` → `leads.*` (sales scoping is applied inside the leads router in prompt 08); `/admin/dashboard` → `dashboard.view`. Apply `requireAuth` + the permission resolver to everything under `/api/admin` in `app.js` **before** the custom routers and the generic router.
4. **`routes/auth.js`.** `POST /api/auth/login`: validate (`email` email required, `password` string required), rate-limit 10/min per IP, find active user by e-mail (case-insensitive), compare password (`lib/password.js` `verify(plain, stored)` — plain equality on the mock; document), wrong → `401 { message: 'Invalid email or password.' }` (also 422 for malformed input), success → set `lastLoginAt`, issue token, respond `{ data: { token, expiresAt, user: { id, name, email, role, avatarUrl, phone } } }`. `POST /api/auth/logout` (auth): revoke → `{ data: null, message: 'Logged out.' }`. `GET /api/auth/profile` (auth) → `{ data: user }`. `PUT /api/auth/profile` (auth): validate `name` (2–80), `phone` (phone, nullable), `avatarUrl` (url, nullable) → updates the user → `{ data: user }`. `PUT /api/auth/password` (auth): `currentPassword` required, `newPassword` min 8 with at least one letter and one digit; wrong current → 422 `{ errors: { currentPassword: ['Current password is incorrect.'] } }`; success revokes **other** tokens of the user (keeps the current one) → `{ data: null, message: 'Password updated.' }`.
5. **`routes/users.js`** (`users.*` permissions → admin only): `GET /api/admin/users` (filters `q` on name/email, `role`, `isActive`; sort `name|createdAt|lastLoginAt`; paginated; password stripped), `POST /api/admin/users` (validate `name`, `email` unique (409 on duplicate with `errors.email`), `password` min 8, `role` enum, `phone?`, `avatarUrl?`, `isActive` default true) → 201 user without password, `GET /api/admin/users/:id`, `PUT` (full replace; `password` optional — when omitted the stored one is kept), `PATCH` (partial; `password` allowed → "reset password"), `DELETE`, `POST /api/admin/users/bulk` (`activate|deactivate|delete`). Safety rules (422 with a field error on `id`): cannot deactivate/delete yourself; cannot deactivate/delete/demote the last active admin; changing your own role is refused (`errors.role`). Deleting a user sets `assignedTo: null` on their leads (append a `assigned` activity "Unassigned (user deleted)") and revokes their tokens.
6. **Public exposure check.** Confirm `GET /api/admin-users` and `GET /api/adminUsers` and `GET /api/apiTokens` are **not** reachable through the generic router: add `adminUsers`, `apiTokens`, `media`, `leads`, `jobApplications`, `newsletterSubscribers`, `propertyViews` to a `PRIVATE_COLLECTIONS` list in `publicScope.js` that returns 404 for any non-`/api/admin` access.
7. **Tests (`mock-server/__tests__/auth.test.js`).** Using `createApp()` with a temp runtime copy (`os.tmpdir()`): login ok → token; wrong password → 401; profile without token → 401; expired token (set `expiresAt` in the past directly in the db) → 401; sales → `GET /api/admin/users` → 403; manager → `PUT /api/admin/settings`-style route → 403 (use `/api/admin/users` for now); admin creates a user, duplicate e-mail → 409; last-admin guard → 422; logout → subsequent profile → 401; password change revokes other tokens. Run with `node --test`.
8. Update `mock-server/README.md` (auth flow, seed credentials, TTL, how RBAC is resolved) and `docs/API_CONTRACT.md` (login/profile/password examples with real JSON from the mock).

## 5. Data contract touched
Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /auth/profile`, `PUT /auth/profile`, `PUT /auth/password`; `GET|POST /admin/users`, `GET|PUT|PATCH|DELETE /admin/users/:id`, `POST /admin/users/bulk`. Collections: `apiTokens` (written), `adminUsers` (`lastLoginAt`). Env: `MOCK_TOKEN_TTL_HOURS`. npm script: `test:mock` (in `check:all`).

## 6. UI/UX requirements
N/A (the React admin login will not work until prompt 12 because it still posts to the HOM shape; verify with curl/tests).

## 7. Edge cases that must work
- `MOCK_TOKEN_TTL_HOURS=0.01` → tokens expire after 36 s (used by QA in prompts 12/45).
- E-mail matching is case-insensitive and trims whitespace; passwords are case-sensitive.
- A deactivated user's existing tokens stop working immediately.
- `PUT /admin/users/:id` for yourself keeps your role; `PATCH` with `{ role }` on yourself → 422.
- `GET /api/admin/users?perPage=all` returns everything; passwords never appear in any response (assert with a regex over the JSON).
- Rate limit on login: the 11th attempt within a minute → 429.

## 8. Acceptance criteria
- [ ] All auth endpoints behave per §5.4 (verified by `npm run test:mock` and curl).
- [ ] Every `/api/admin/*` route returns 401 without a token and 403 for a role outside the matrix (tested for users/dashboard prefixes; the resolver covers all prefixes of task 3).
- [ ] Private collections are unreachable publicly (404).
- [ ] Users CRUD + bulk + safety rules work; tokens revoked on delete/deactivate/password change.
- [ ] `npm run test:mock`, `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run validate:seed` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run test:mock
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run mock   (second terminal; then in PowerShell:)
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"admin@squaresnacres.com\",\"password\":\"Admin@123\"}" http://localhost:4000/api/auth/login
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/auth/profile
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/admin/users
curl http://localhost:4000/api/admin/users        (expect 401)
curl http://localhost:4000/api/adminUsers         (expect 404)
```
Manual QA: log in as sales via curl and call `GET /api/admin/users` → 403; call `GET /api/admin/properties` → 200 (view allowed) and `POST /api/admin/properties` → 403.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 07 report (endpoints, script `test:mock`), Known issues: BUG-03 partially (auth done), BUG-14 server side done (client in 12); next prompt: 08.
- `docs/DECISIONS.md`: D15 (sales scope), D19 (TTL), token format decision, `node --test` for mock tests.

## 11. Commit
`git add -A && git commit -m "feat(mock): auth tokens, RBAC middleware, users CRUD and profile endpoints"`

## 12. Guardrails
- Do not touch: React source, `db.json` (except nothing — seed users already exist), `theme.js`, `global.css`.
- Do not add dependencies other than: none (use `node:crypto`, `node:test`).
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
