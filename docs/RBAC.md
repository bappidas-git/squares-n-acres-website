# RBAC — Squares N Acres

Who may open which admin route and who may perform which action, copied verbatim from
`prompts/00_MASTER_CONTEXT.md` §7 and completed with the matrix as
`src/config/rbac.js` actually encodes it.

`src/config/rbac.js` is the only place any of this is written down: `PERMISSIONS`
(`can(role, area, action)`), `ROUTE_PERMISSIONS` (`hasRouteAccess(role, pathname)`),
`NAV_ITEMS` (`getNavItemsForRole(role)`) and `getDefaultRoute(role)`. The endpoint side is
in `docs/API_CONTRACT.md`.

---

## 7. RBAC matrix

Enforced three times: (1) `ProtectedRoute` (authenticated) + `RoleRoute allowedRoles={[…]}` around every admin route; (2) navigation items hidden per role (`src/config/rbac.js` `NAV_ITEMS[].roles`, `ROUTE_PERMISSIONS`, `hasRouteAccess`, `getNavItemsForRole`, `getDefaultRoute` → always `/admin/dashboard`); (3) the API (`mock-server/middleware/role.js`, 403). Components never hardcode `role === 'admin'`; they call `useAdminAuth().can('area', 'action')` which reads the matrix below from `rbac.js` (`PERMISSIONS[area][action] = [roles]`).

| Area (`rbac.js` key)                                                                                                        | admin | manager                            | sales                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard`                                                                                                                 | full  | full                               | own leads stats + property counts                                                                                                                                                                                     |
| `properties` (`view`, `create`, `edit`, `delete`, `bulk`, `duplicate`)                                                      | all   | all                                | `view` only (read-only list + "View on site"; form opens read-only)                                                                                                                                                   |
| `masterData` (localities, cities, property types, amenities, badges, developers, banks)                                     | all   | all                                | —                                                                                                                                                                                                                     |
| `leads` (`view`, `edit`, `assign`, `export`, `delete`, `bulk`)                                                              | all   | all                                | `view`/`edit` only on leads assigned to self or unassigned; may `claim`; no `assign` to others, no `delete`, no `export` (export of own leads allowed — decision: **yes**, `export` allowed for sales, server-scoped) |
| `articles` (+ categories, tags, authors)                                                                                    | all   | all                                | —                                                                                                                                                                                                                     |
| `content` (pages CMS and the header menus, FAQs, testimonials, team, partners, jobs & applications, newsletter subscribers) | all   | all                                | —                                                                                                                                                                                                                     |
| `seo` (panels, dashboard, redirects, SEO settings, guide)                                                                   | all   | all                                | —                                                                                                                                                                                                                     |
| `media`                                                                                                                     | all   | all                                | —                                                                                                                                                                                                                     |
| `settings` (general, contact, hero, navigation/footer, newsletter, integrations, lead notifications)                        | all   | read-only (form disabled, no Save) | —                                                                                                                                                                                                                     |
| `users`                                                                                                                     | all   | —                                  | —                                                                                                                                                                                                                     |
| `profile` (own profile & password)                                                                                          | ✔     | ✔                                  | ✔                                                                                                                                                                                                                     |

Route permission map (`ROUTE_PERMISSIONS`): `/admin/dashboard` all; `/admin/properties` all (sales read-only inside); `/admin/leads` all; `/admin/articles`, `/admin/pages`, `/admin/faqs`, `/admin/testimonials`, `/admin/team`, `/admin/partners`, `/admin/jobs`, `/admin/newsletter`, `/admin/media`, `/admin/seo`, `/admin/master-data/*` → admin+manager; `/admin/settings` → admin+manager (manager read-only); `/admin/settings/users` → admin; `/admin/profile` all. Login redirects to `location.state.from` when allowed, else `/admin/dashboard`; a forbidden route renders the `Forbidden` (403) page inside the admin layout with a "Go to dashboard" `Link` (no full reload).

## The matrix as code

Generated from `src/config/rbac.js` — `PERMISSIONS[area][action] = [roles]`.

| Area         | Action       | Roles                   |
| ------------ | ------------ | ----------------------- |
| `dashboard`  | `view`       | admin · manager · sales |
| `properties` | `view`       | admin · manager · sales |
| `properties` | `create`     | admin · manager         |
| `properties` | `edit`       | admin · manager         |
| `properties` | `delete`     | admin · manager         |
| `properties` | `bulk`       | admin · manager         |
| `properties` | `duplicate`  | admin · manager         |
| `masterData` | `view`       | admin · manager         |
| `masterData` | `create`     | admin · manager         |
| `masterData` | `edit`       | admin · manager         |
| `masterData` | `delete`     | admin · manager         |
| `leads`      | `view`       | admin · manager · sales |
| `leads`      | `edit`       | admin · manager · sales |
| `leads`      | `claim`      | sales                   |
| `leads`      | `assign`     | admin · manager         |
| `leads`      | `delete`     | admin · manager         |
| `leads`      | `bulk`       | admin · manager         |
| `leads`      | `export`     | admin · manager · sales |
| `articles`   | `view`       | admin · manager         |
| `articles`   | `create`     | admin · manager         |
| `articles`   | `edit`       | admin · manager         |
| `articles`   | `delete`     | admin · manager         |
| `articles`   | `bulk`       | admin · manager         |
| `content`    | `view`       | admin · manager         |
| `content`    | `create`     | admin · manager         |
| `content`    | `edit`       | admin · manager         |
| `content`    | `delete`     | admin · manager         |
| `content`    | `bulk`       | admin · manager         |
| `seo`        | `view`       | admin · manager         |
| `seo`        | `create`     | admin · manager         |
| `seo`        | `edit`       | admin · manager         |
| `seo`        | `delete`     | admin · manager         |
| `seo`        | `bulk`       | admin · manager         |
| `media`      | `view`       | admin · manager         |
| `media`      | `create`     | admin · manager         |
| `media`      | `edit`       | admin · manager         |
| `media`      | `delete`     | admin · manager         |
| `media`      | `bulk`       | admin · manager         |
| `settings`   | `view`       | admin · manager         |
| `settings`   | `edit`       | admin                   |
| `users`      | every action | admin                   |
| `profile`    | every action | admin · manager · sales |

`can(role, area, action)` returns `false` for an unknown role, area or action; an area that
declares `every action` (`'*'`) answers `true` for any action for the roles listed. Areas
with no server-side scoping mean exactly what they say; `leads` is scoped further by the
API — a sales user reads and edits only leads assigned to them or unassigned, and their
export is scoped the same way (D15).

`claim` is listed for `sales` because that is the role the action exists for: an admin or
manager assigns a lead instead of claiming it. The route itself
(`POST /admin/leads/:id/claim`) only requires a valid token, and the API applies the matrix.

## Route map

`hasRouteAccess(role, pathname)` matches the **longest** prefix, so
`/admin/settings/users` is decided before `/admin/settings`. A path with no entry is denied.

| Route prefix            | Roles                   |
| ----------------------- | ----------------------- |
| `/admin/dashboard`      | admin · manager · sales |
| `/admin/properties`     | admin · manager · sales |
| `/admin/leads`          | admin · manager · sales |
| `/admin/articles`       | admin · manager         |
| `/admin/pages`          | admin · manager         |
| `/admin/faqs`           | admin · manager         |
| `/admin/master-data`    | admin · manager         |
| `/admin/testimonials`   | admin · manager         |
| `/admin/team`           | admin · manager         |
| `/admin/partners`       | admin · manager         |
| `/admin/jobs`           | admin · manager         |
| `/admin/newsletter`     | admin · manager         |
| `/admin/media`          | admin · manager         |
| `/admin/seo`            | admin · manager         |
| `/admin/settings`       | admin · manager         |
| `/admin/settings/users` | admin                   |
| `/admin/profile`        | admin · manager · sales |

`/admin/login` is deliberately absent — it is the only unprotected admin route.

## Navigation per role

`getNavItemsForRole(role)` keeps the groups the role may open and, inside each, only the
children it may open; a group whose children all disappear is dropped. This is what the
sidebar renders.

### admin

| Item        | Target                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard   | `/admin/dashboard`                                                                                                                                                                                                                                                                                                                                     |
| Properties  | All properties (`/admin/properties`), Add property (`/admin/properties/add`)                                                                                                                                                                                                                                                                           |
| Leads       | `/admin/leads`                                                                                                                                                                                                                                                                                                                                         |
| Articles    | All articles (`/admin/articles`), Add article (`/admin/articles/add`), Categories (`/admin/articles/categories`), Tags (`/admin/articles/tags`), Authors (`/admin/articles/authors`)                                                                                                                                                                   |
| Pages       | All pages (`/admin/pages`), Add page (`/admin/pages/add`), Header menu (`/admin/pages/menus`)                                                                                                                                                                                                                                                          |
| FAQs        | `/admin/faqs`                                                                                                                                                                                                                                                                                                                                          |
| Master data | Localities (`/admin/master-data/localities`), Cities (`/admin/master-data/cities`), Segments (`/admin/master-data/segments`), Property types (`/admin/master-data/property-types`), Amenities (`/admin/master-data/amenities`), Badges (`/admin/master-data/badges`), Developers (`/admin/master-data/developers`), Banks (`/admin/master-data/banks`) |
| Content     | Testimonials (`/admin/testimonials`), Team (`/admin/team`), Partners (`/admin/partners`), Jobs (`/admin/jobs`), Job applications (`/admin/jobs/applications`), Newsletter (`/admin/newsletter`)                                                                                                                                                        |
| Media       | `/admin/media`                                                                                                                                                                                                                                                                                                                                         |
| SEO         | Dashboard (`/admin/seo`), Settings (`/admin/seo/settings`), Redirects (`/admin/seo/redirects`), Guide (`/admin/seo/guide`)                                                                                                                                                                                                                             |
| Settings    | Site settings (`/admin/settings`), Users (`/admin/settings/users`)                                                                                                                                                                                                                                                                                     |
| Profile     | `/admin/profile`                                                                                                                                                                                                                                                                                                                                       |

### manager

| Item        | Target                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard   | `/admin/dashboard`                                                                                                                                                                                                                                                                                                                                     |
| Properties  | All properties (`/admin/properties`), Add property (`/admin/properties/add`)                                                                                                                                                                                                                                                                           |
| Leads       | `/admin/leads`                                                                                                                                                                                                                                                                                                                                         |
| Articles    | All articles (`/admin/articles`), Add article (`/admin/articles/add`), Categories (`/admin/articles/categories`), Tags (`/admin/articles/tags`), Authors (`/admin/articles/authors`)                                                                                                                                                                   |
| Pages       | All pages (`/admin/pages`), Add page (`/admin/pages/add`), Header menu (`/admin/pages/menus`)                                                                                                                                                                                                                                                          |
| FAQs        | `/admin/faqs`                                                                                                                                                                                                                                                                                                                                          |
| Master data | Localities (`/admin/master-data/localities`), Cities (`/admin/master-data/cities`), Segments (`/admin/master-data/segments`), Property types (`/admin/master-data/property-types`), Amenities (`/admin/master-data/amenities`), Badges (`/admin/master-data/badges`), Developers (`/admin/master-data/developers`), Banks (`/admin/master-data/banks`) |
| Content     | Testimonials (`/admin/testimonials`), Team (`/admin/team`), Partners (`/admin/partners`), Jobs (`/admin/jobs`), Job applications (`/admin/jobs/applications`), Newsletter (`/admin/newsletter`)                                                                                                                                                        |
| Media       | `/admin/media`                                                                                                                                                                                                                                                                                                                                         |
| SEO         | Dashboard (`/admin/seo`), Settings (`/admin/seo/settings`), Redirects (`/admin/seo/redirects`), Guide (`/admin/seo/guide`)                                                                                                                                                                                                                             |
| Settings    | Site settings (`/admin/settings`)                                                                                                                                                                                                                                                                                                                      |
| Profile     | `/admin/profile`                                                                                                                                                                                                                                                                                                                                       |

### sales

| Item       | Target                               |
| ---------- | ------------------------------------ |
| Dashboard  | `/admin/dashboard`                   |
| Properties | All properties (`/admin/properties`) |
| Leads      | `/admin/leads`                       |
| Profile    | `/admin/profile`                     |

## How it is enforced

Four layers, each of which must independently say yes.

1. **`ProtectedRoute`** wraps every `/admin/*` route except the login page. No token, an
   expired token or a revoked one redirects to `/admin/login` with
   `location.state.from` so the user lands back where they were after signing in.
2. **`RoleRoute allowedRoles={[…]}`** wraps each admin route with the roles of
   `ROUTE_PERMISSIONS`. A forbidden route renders the `Forbidden` (403) page **inside** the
   admin layout with a "Go to dashboard" `Link` — a router navigation, never a full reload.
3. **`can(role, area, action)`**, reached through `useAdminAuth().can('area', 'action')`,
   decides what is rendered and what is enabled inside a page the role may open: a sales
   user sees the property list and the read-only form but no Add, Edit, Delete or bulk
   controls; a manager sees the settings form with every field disabled and no Save.
   Components never compare a role by hand.
4. **The API** repeats the check (`mock-server/middleware/role.js`, Laravel policies) and
   answers **403** with the standard error envelope. A UI that forgets a check therefore
   cannot cause a write the role is not allowed to make, and the mock's smoke test asserts
   the 403s.

After signing in every role lands on `/admin/dashboard` (D32) unless
`location.state.from` points at a route the role may open.

Routes a later prompt still has to build are already in the sidebar; until their prompt
lands they render the admin 404 inside the layout.
