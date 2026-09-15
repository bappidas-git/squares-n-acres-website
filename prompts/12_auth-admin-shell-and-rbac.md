# Prompt 12 — Auth (client), admin shell, RBAC routes, notifications, profile

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.4 Auth, §7 RBAC, §8 UI kit, §13 D24/D32/D45/D54/D55), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–11 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/contexts/AdminAuthContext.js` restores `sna_auth_user`/`sna_auth_token` from storage (prompt 11 renamed the keys) but never enforces `expiresAt`, never re-validates with `GET /auth/profile`, and `login(email, password, remember)` still has the meaningless `remember` flag. `src/pages/admin/AdminLogin.js` posts via `authService.login`. `src/components/admin/ProtectedRoute.jsx` contains an unexported `Forbidden` component with a full-reload `href`. `src/routes/index.js` declares admin routes with `RoleRoute allowedRoles={[…]}` inline for the old page set. `src/components/layout/AdminLayout.jsx` (restyled in 04) still polls `GET /admin/leads` every 30 s itself (badge + bell + toast) and renders `pageTitles` from a hardcoded map; `AdminLeads.js` runs a second poller. `src/config/rbac.js` has the final `NAV_ITEMS`, `PERMISSIONS`, `can()`. `http.js` exposes `onUnauthorized(cb)` and `setAuthToken`.

## 2. Objective
When this prompt is finished the admin authentication is contract-exact and robust: login → token/expiry/user stored under `sna_auth_*`, `GET /auth/profile` re-validation on app load, client-side expiry enforcement (timer + route change) with a toast and redirect, 401 handling through `http.onUnauthorized`, logout that clears everything and revokes server-side; `ProtectedRoute`/`RoleRoute`/`Forbidden` are proper components; `src/routes/adminRoutes.js` declares **every** final admin route (existing pages plus placeholders for pages that later prompts implement — placeholder = `AdminPlaceholderPage` that renders the page title and "Coming in prompt NN" only inside admin; it must not exist after prompt 43); the admin shell has a sidebar from `NAV_ITEMS` (grouped, collapsible, role-filtered, active states, badge from `LeadNotificationsContext`), topbar (page title from the route config, notifications bell with the 5 most recent new leads, profile menu with name/role/avatar → Profile, Logout), a single lead poller (30 s, paused when hidden), `/admin/profile` (edit name/phone/avatar URL + change password) for all roles, and `/admin/403`. Session restore works after reload; token expiry (`MOCK_TOKEN_TTL_HOURS=0.01`) logs out cleanly.

## 3. Scope
### Files to create
- `src/contexts/LeadNotificationsContext.js`
- `src/components/admin/RoleRoute.jsx`, `src/components/admin/Forbidden.jsx`, `src/components/admin/AdminPlaceholderPage.jsx`
- `src/components/layout/AdminSidebar.jsx` (+ css), `src/components/layout/AdminTopbar.jsx` (+ css), `src/components/layout/NotificationsMenu.jsx`
- `src/pages/admin/settings/ProfilePage.jsx` (+ css)
- `src/routes/adminRoutes.js`, `src/routes/publicRoutes.js` (moves the existing public routes; unchanged content), `src/routes/adminRouteConfig.js` (path → `{ title, permission: [area, action], element }`)
- `src/contexts/__tests__/AdminAuthContext.test.js`, `src/components/admin/__tests__/RoleRoute.test.jsx`
### Files to modify
- `src/contexts/AdminAuthContext.js`, `src/pages/admin/AdminLogin.js`, `src/components/admin/ProtectedRoute.jsx`, `src/components/layout/AdminLayout.jsx` (+ css), `src/routes/index.js`, `src/pages/admin/AdminLeads.js` (remove its poller; subscribe to the context), `src/App.js` (`LeadNotificationsProvider` inside the admin layout only), `src/services/http.js` (nothing unless a hook is missing), `docs/*`
### Files to delete
- none
### May also touch
- import fixes

## 4. Detailed tasks
1. **`AdminAuthContext`.** State `{ user, token, expiresAt, status: 'loading'|'authenticated'|'anonymous' }`. On mount: read storage; if token and `expiresAt > now` → set state and call `authService.profile()` (success → refresh `user`; 401 → clear); else clear. `login(email, password)` → `authService.login` → store `sna_auth_token`, `sna_auth_user`, `sna_auth_expires_at` (ISO) via `utils/storage.js`, `http.setAuthToken`, set state, return user. `logout({ silent })` → `authService.logout()` (ignore errors), clear storage/state, `navigate('/admin/login')` unless silent. Expiry: a `setTimeout` to `expiresAt - now` (max 24 h; re-armed on login/restore) → `logout({ silent: true })` + toast `'Your session has expired. Please sign in again.'` + redirect with `state.from`; also checked on every location change (`useLocation` effect) for admin paths. Register `http.onUnauthorized(() => { clear; toast; navigate('/admin/login', { state: { from } }) })` once. Expose `{ user, role, status, isAuthenticated, login, logout, can: (area, action) => can(role, area, action), refreshProfile, updateUser }`. `useAdminAuth()` throws outside the provider. Tests: restore with a valid token calls profile; expired token clears; `can` delegates.
2. **Login page.** Form (`useForm` is created in prompt 13 — here use local state): e-mail + password fields (`FormField` wrappers from the UI kit, visible labels, show/hide password `IconButton` with `label`), submit → `login`; errors: 401 → inline `Alert` "Invalid email or password."; 422 → field errors; 429 → "Too many attempts. Try again in a minute."; network → generic. Redirect to `location.state?.from?.pathname` when the role may access it (`hasRouteAccess`), else `/admin/dashboard`; already authenticated → redirect. Remove "Remember me" (D: sessions are always persisted for the token TTL — record). Brand: `Logo` wordmark 56 px, "Admin panel" caption, page `<Seo type="admin">` placeholder (`<Helmet><title>Sign in | Squares N Acres</title><meta name="robots" content="noindex,nofollow"/></Helmet>` until prompt 38). Mock credentials are **not** displayed.
3. **Route guards.** `ProtectedRoute` → `status === 'loading'` renders `PageLoader`; anonymous → `<Navigate to="/admin/login" state={{ from: location }} replace />`; authenticated → children. `RoleRoute({ permission: ['area','action'] | allowedRoles, children })` → `Forbidden` when not allowed. `Forbidden.jsx` (exported; UI kit `EmptyState` with a 403 illustration (monogram), "You don't have access to this page.", `Button to="/admin/dashboard"`), also mounted at `/admin/403`.
4. **Admin route config.** `adminRouteConfig.js` exports an array `{ path, title, permission, component (lazy), exact }` for: `dashboard`, `properties`, `properties/add`, `properties/edit/:id`, `leads`, `leads/:id`, `articles`, `articles/add`, `articles/edit/:id`, `articles/categories`, `articles/tags`, `articles/authors`, `pages`, `pages/add`, `pages/edit/:id`, `faqs`, `master-data/localities` (+ `/add`, `/edit/:id`), `master-data/cities`, `master-data/property-types`, `master-data/amenities`, `master-data/badges`, `master-data/developers` (+ add/edit), `master-data/banks`, `testimonials`, `team`, `partners`, `jobs`, `jobs/applications`, `newsletter`, `media`, `seo`, `seo/settings`, `seo/redirects`, `seo/guide`, `settings`, `settings/users`, `profile`, `403`. Existing pages are wired; missing ones use `AdminPlaceholderPage` with the owning prompt number (13–41). `adminRoutes.js` renders them inside `ProtectedRoute > AdminLayout > RoleRoute`. `routes/index.js` composes `publicRoutes` + `adminRoutes` + `NotFound`. Titles feed the topbar and `document.title` (`<title>${title} | Admin | Squares N Acres</title>`, `noindex`).
5. **`LeadNotificationsContext`** (mounted inside `AdminLayout` so only admin pages poll): every 30 s (and immediately) call `leadService.adminList({ status: 'new', perPage: 5, sort: 'createdAt', order: 'desc' })`; store `newLeadCount = meta.total`, `recentLeads = data`, `lastUpdatedAt`; when `meta.total` increases after the first load → toast `New lead: <name> (<source label>)` with an action "View" → `/admin/leads/<id>`; pause when `document.hidden` (resume + immediate fetch on `visibilitychange`); expose `{ newLeadCount, recentLeads, lastUpdatedAt, refresh, markSeen() }` (`markSeen` stores `sna_leads_seen_at`; the bell dot shows only when `recentLeads[0].createdAt > seenAt`). `AdminLeads.js` subscribes: when `lastUpdatedAt` changes → `refetch()` (its own poller removed).
6. **Shell.** `AdminSidebar`: `Logo` monogram in a white rounded box + "Squares N Acres" / "Admin" (collapsed: monogram only), groups from `getNavItemsForRole(role)` rendered as `NavLink`s with `aria-current`, collapsible parent groups (state persisted per group in `sna_admin_nav_open`), Leads badge = `newLeadCount`, collapse toggle persisted (`sna_admin_sidebar_collapsed`), keyboard operable (Enter/Space on group headers), mobile: MUI `Drawer` (temporary) with the same content. `AdminTopbar`: hamburger (mobile), page title, "View site" link (`SITE.url`, new tab), `NotificationsMenu` (bell + dot; menu lists `recentLeads` with name/source/relative time and "View all leads"), profile menu (avatar initials, name, role chip, "My profile" → `/admin/profile`, "Logout"). `AdminLayout` = sidebar + topbar + `<main id="admin-main">` + `Outlet`, canvas `--color-surface`, content max-width 1400 px, paddings from tokens. Remove every remnant of the old layout polling/toasts/`pageTitles` map.
7. **Profile page** (`/admin/profile`, all roles): two cards — "Profile" (name, phone, avatar URL with preview via `LazyImage`; `authService.updateProfile` → `updateUser`; toast) and "Change password" (current, new, confirm; client rule min 8 with letter+digit; `authService.changePassword`; 422 `currentPassword` inline; success toast + note that other sessions were signed out).
8. Tests: `RoleRoute` renders `Forbidden` for a disallowed role; `AdminAuthContext` restore/expiry; `LeadNotificationsContext` pauses when hidden (mock `document.hidden`).

## 5. Data contract touched
Endpoints consumed: `POST /auth/login`, `POST /auth/logout`, `GET /auth/profile`, `PUT /auth/profile`, `PUT /auth/password`, `GET /admin/leads?status=new&perPage=5`. Storage keys: `sna_auth_token`, `sna_auth_user`, `sna_auth_expires_at`, `sna_admin_sidebar_collapsed`, `sna_admin_nav_open`, `sna_leads_seen_at`.

## 6. UI/UX requirements
Login: centred card on `--color-surface`, wordmark, labelled fields, primary button with loading state, error `Alert` with `role="alert"`; 390 px: full-width card with 16 px gutters. Shell: sidebar 264 px (collapsed 72 px), charcoal, white text, active item red background, hover surface; topbar 64 px white with border; content area scrolls independently; toasts bottom-right; mobile drawer 280 px with the same nav; touch targets 44 px; `Escape` closes menus/drawer; focus returns to the trigger.

## 7. Edge cases that must work
- Reload on `/admin/leads/12` with a valid token → stays there after the profile check; with an expired token → login with `state.from` → after login lands on `/admin/leads/12`.
- Sales user opening `/admin/settings` by URL → `Forbidden` (no redirect loop); sidebar hides it.
- Token revoked on the server (logout elsewhere) → next admin call 401 → single redirect + toast, no double toast.
- Mock down while on an admin page → error toast, stays logged in (no logout on network errors).
- `MOCK_TOKEN_TTL_HOURS=0.01`: after ~36 s the timer logs out with the toast even without navigation.
- Two tabs: logout in one → the other logs out on its next request/route change (storage `storage` event listener → clear state).

## 8. Acceptance criteria
- [ ] Login/logout/restore/expiry/401 behave per §5.4 and task 1 (tests + manual).
- [ ] All admin routes of task 4 exist (placeholders show "Coming in prompt NN"); `Forbidden` renders for disallowed roles; no full-page reloads.
- [ ] Single lead poller (Network tab shows one `GET /admin/leads?status=new…` every 30 s, none while the tab is hidden); bell/badge/toast work.
- [ ] Profile page updates name/phone/avatar and changes the password (with 422 handling).
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings on admin pages.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then in another terminal) npm run smoke
```
Manual QA (desktop + 390 px):
1. `/admin/login` wrong password → inline error; correct (`admin@squaresnacres.com` / `Admin@123`) → dashboard; reload → still logged in; sidebar shows all groups; collapse persists.
2. Log in as `sales@squaresnacres.com` → sidebar shows Dashboard/Properties/Leads/Profile only; open `/admin/settings` → 403 page.
3. Create a lead via `POST /api/leads` (curl) → within 30 s the bell shows a dot and a toast appears; click "View" → lead detail.
4. Hide the tab for a minute → no polling requests; show → immediate fetch.
5. `/admin/profile` → change name → topbar updates; change password → success; log out → login with the new password works.
6. Restart the mock with `MOCK_TOKEN_TTL_HOURS=0.01` → after ~36 s → toast + login page; restore default TTL.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 12 report; Known issues: BUG-14 closed, BUG-17 closed, additional defects 7 (partially: single poller) and 19 (login part) closed, 28 closed; Pending rewrites unchanged; next prompt: 13.
- `docs/DECISIONS.md`: D32, D45, D55, "no remember me" decision, placeholder pages decision.

## 11. Commit
`git add -A && git commit -m "feat(admin): contract auth with expiry, RBAC routes, admin shell with single lead poller, profile page"`

## 12. Guardrails
- Do not touch: public pages, `theme.js`, `global.css`, mock server, `db.json`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (the old AdminLayout notifications/badge/toast behaviour is preserved through the context).
