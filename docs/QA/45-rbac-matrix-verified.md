# Prompt 45 — the RBAC matrix, verified

**Date:** 2026-09-18 · **Roles:** `admin`, `manager`, `sales` (the three seeded accounts of §6.14) ·
**Source of truth:** §7 of `prompts/00_MASTER_CONTEXT.md`, as `src/config/rbac.js` holds it.

The matrix is enforced three times and this document checks all three:

| #   | Where                                | What it does                               | How it was verified                                                                                                                              |
| --- | ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `RoleRoute` around every admin route | renders `Forbidden` in place of the screen | `src/__tests__/rbac.routes.test.jsx` renders the gate of every `adminRouteConfig.js` entry as each role and reads what came out (146 assertions) |
| 2   | `getNavItemsForRole`                 | hides what a role may not open             | the same suite walks every sidebar link of every role through `canAccessAdminRoute`                                                              |
| 3   | `mock-server/middleware/role.js`     | answers **403**                            | a sweep fired every authenticated entry of `src/services/endpoints.js` with each role token: **579 request/role pairs, 0 mismatches**            |

The sweep sent an empty body to every write and addressed every id-bearing path with an id no seed uses, so the role middleware — which runs before validation and before the handler — is the only thing it measured. It ends by re-counting the collections: `{"properties":40,"leads":45,"articles":12}` before, `{"properties":40,"leads":45,"articles":12}` after.

The registry's own `auth` field was checked against the matrix in the same pass: **0 mismatches**, so what the frontend believes about a route is what the API enforces.

---

## 1. Every admin screen

`✓ opens` = the screen rendered. `✓ 403` = the `Forbidden` page rendered in its place.
Both were read from the rendered output, not inferred from the matrix.

| Route                                    | Permission          | admin   | manager | sales   |
| ---------------------------------------- | ------------------- | ------- | ------- | ------- |
| `/admin/dashboard`                       | `dashboard.view`    | ✓ opens | ✓ opens | ✓ opens |
| `/admin/properties`                      | `properties.view`   | ✓ opens | ✓ opens | ✓ opens |
| `/admin/properties/add`                  | `properties.create` | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/properties/edit/:id`             | `properties.view`   | ✓ opens | ✓ opens | ✓ opens |
| `/admin/leads`                           | `leads.view`        | ✓ opens | ✓ opens | ✓ opens |
| `/admin/leads/:id`                       | `leads.view`        | ✓ opens | ✓ opens | ✓ opens |
| `/admin/articles`                        | `articles.view`     | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/articles/add`                    | `articles.create`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/articles/edit/:id`               | `articles.edit`     | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/articles/categories`             | `articles.view`     | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/articles/tags`                   | `articles.view`     | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/articles/authors`                | `articles.view`     | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/pages`                           | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/pages/add`                       | `content.create`    | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/pages/edit/:id`                  | `content.edit`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/faqs`                            | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/localities`          | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/localities/add`      | `masterData.create` | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/localities/edit/:id` | `masterData.edit`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/cities`              | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/property-types`      | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/amenities`           | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/badges`              | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/developers`          | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/developers/add`      | `masterData.create` | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/developers/edit/:id` | `masterData.edit`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/master-data/banks`               | `masterData.view`   | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/testimonials`                    | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/team`                            | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/partners`                        | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/jobs`                            | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/jobs/applications`               | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/newsletter`                      | `content.view`      | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/media`                           | `media.view`        | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/seo`                             | `seo.view`          | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/seo/settings`                    | `seo.view`          | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/seo/redirects`                   | `seo.view`          | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/seo/guide`                       | `seo.view`          | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/settings`                        | `settings.view`     | ✓ opens | ✓ opens | ✓ 403   |
| `/admin/settings/users`                  | `users.view`        | ✓ opens | ✓ 403   | ✓ 403   |
| `/admin/profile`                         | `profile.view`      | ✓ opens | ✓ opens | ✓ opens |
| `/admin/403`                             | — (the 403 page)    | ✓ opens | ✓ opens | ✓ opens |

**42 screens × 3 roles = 126 checks, all as §7 says.**

## 2. Every admin endpoint, by the permission it resolves to

`mock-server/lib/routePermissions.js` turns a path and a method into a permission; the middleware then asks the same matrix the browser asks. The status column is what the sweep actually received — a 4xx that is not 403 means the request passed the gate and was then refused by validation (422) or by the handler (404), which is the point.

| Permission             | Endpoints                                                                                                                                    | admin                    | manager                  | sales                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ | ------------------------ |
| `articles.bulk`        | `POST /admin/articles/bulk`, `POST /admin/article-categories/bulk`, `POST /admin/article-tags/bulk`, `POST /admin/authors/bulk`              | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `articles.create`      | `POST /admin/articles`, `GET /admin/articles/check-slug`, `POST /admin/article-categories`, `GET /admin/article-categories/check-slug` … (8) | ✓ 2xx/4xx <br>(200, 422) | ✓ 2xx/4xx <br>(200, 422) | ✓ 403 <br>(403)          |
| `articles.delete`      | `DELETE /admin/articles/:id`, `DELETE /admin/article-categories/:id`, `DELETE /admin/article-tags/:id`, `DELETE /admin/authors/:id`          | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `articles.edit`        | `PUT /admin/articles/:id`, `PATCH /admin/articles/:id`, `PUT /admin/article-categories/:id`, `PATCH /admin/article-categories/:id` … (8)     | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `articles.view`        | `GET /admin/articles`, `GET /admin/articles/:id`, `GET /admin/articles/:id/preview-token`, `GET /admin/article-categories` … (9)             | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |
| `content.bulk`         | `POST /admin/faqs/bulk`, `POST /admin/testimonials/bulk`, `POST /admin/team/bulk`, `POST /admin/partners/bulk` … (6)                         | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `content.create`       | `POST /admin/faqs`, `POST /admin/testimonials`, `POST /admin/team`, `GET /admin/team/check-slug` … (9)                                       | ✓ 2xx/4xx <br>(200, 422) | ✓ 2xx/4xx <br>(200, 422) | ✓ 403 <br>(403)          |
| `content.delete`       | `DELETE /admin/faqs/:id`, `DELETE /admin/testimonials/:id`, `DELETE /admin/team/:id`, `DELETE /admin/partners/:id` … (8)                     | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `content.edit`         | `PUT /admin/faqs/:id`, `PATCH /admin/faqs/:id`, `PUT /admin/testimonials/:id`, `PATCH /admin/testimonials/:id` … (13)                        | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `content.view`         | `GET /admin/faqs`, `GET /admin/faqs/:id`, `GET /admin/testimonials`, `GET /admin/testimonials/:id` … (16)                                    | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |
| `dashboard.view`       | `GET /admin/dashboard`                                                                                                                       | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      |
| `leads.bulk`           | `POST /admin/leads/bulk`                                                                                                                     | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `leads.delete`         | `DELETE /admin/leads/:id`                                                                                                                    | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `leads.edit`           | `PATCH /admin/leads/:id`, `POST /admin/leads/:id/claim`, `POST /admin/leads/:id/notes`, `DELETE /admin/leads/:id/notes/:noteId`              | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      |
| `leads.export`         | `GET /admin/leads/export`                                                                                                                    | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      |
| `leads.view`           | `GET /admin/leads`, `GET /admin/leads/:id`                                                                                                   | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      |
| `masterData.create`    | `POST /admin/localities`, `GET /admin/localities/check-slug`, `POST /admin/cities`, `GET /admin/cities/check-slug` … (14)                    | ✓ 2xx/4xx <br>(200, 422) | ✓ 2xx/4xx <br>(200, 422) | ✓ 403 <br>(403)          |
| `masterData.delete`    | `DELETE /admin/localities/:id`, `DELETE /admin/cities/:id`, `DELETE /admin/property-types/:id`, `DELETE /admin/amenities/:id` … (7)          | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `masterData.edit`      | `PUT /admin/localities/:id`, `PATCH /admin/localities/:id`, `POST /admin/localities/bulk`, `PUT /admin/cities/:id` … (21)                    | ✓ 2xx/4xx <br>(404, 422) | ✓ 2xx/4xx <br>(404, 422) | ✓ 403 <br>(403)          |
| `masterData.view`      | `GET /admin/localities`, `GET /admin/localities/:id`, `GET /admin/cities`, `GET /admin/cities/:id` … (14)                                    | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |
| `media.bulk`           | `POST /admin/media/bulk`                                                                                                                     | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `media.create`         | `POST /admin/media`                                                                                                                          | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `media.delete`         | `DELETE /admin/media/:id`                                                                                                                    | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `media.edit`           | `PUT /admin/media/:id`, `PATCH /admin/media/:id`                                                                                             | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `media.view`           | `GET /admin/media`, `GET /admin/media/:id`                                                                                                   | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |
| `properties.bulk`      | `POST /admin/properties/bulk`                                                                                                                | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `properties.create`    | `POST /admin/properties`, `GET /admin/properties/check-slug`                                                                                 | ✓ 2xx/4xx <br>(200, 422) | ✓ 2xx/4xx <br>(200, 422) | ✓ 403 <br>(403)          |
| `properties.delete`    | `DELETE /admin/properties/:id`                                                                                                               | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `properties.duplicate` | `POST /admin/properties/:id/duplicate`                                                                                                       | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `properties.edit`      | `PUT /admin/properties/:id`, `PATCH /admin/properties/:id`                                                                                   | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `properties.view`      | `GET /admin/properties`, `GET /admin/properties/:id`, `GET /admin/properties/slug/:slug`                                                     | ✓ 2xx/4xx <br>(200, 404) | ✓ 2xx/4xx <br>(200, 404) | ✓ 2xx/4xx <br>(200, 404) |
| `seo.bulk`             | `POST /admin/redirects/bulk`                                                                                                                 | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `seo.create`           | `POST /admin/redirects`, `POST /admin/redirects/import`                                                                                      | ✓ 2xx/4xx <br>(422)      | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          |
| `seo.delete`           | `DELETE /admin/redirects/:id`                                                                                                                | ✓ 2xx/4xx <br>(404)      | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          |
| `seo.edit`             | `PUT /admin/redirects/:id`, `PATCH /admin/redirects/:id`, `PUT /admin/seo/settings`                                                          | ✓ 2xx/4xx <br>(200, 404) | ✓ 2xx/4xx <br>(200, 404) | ✓ 403 <br>(403)          |
| `seo.view`             | `GET /admin/redirects`, `GET /admin/redirects/:id`, `GET /admin/redirects/export`, `GET /admin/seo/settings` … (6)                           | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |
| `settings.edit`        | `PUT /admin/settings`                                                                                                                        | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          | ✓ 403 <br>(403)          |
| `settings.view`        | `GET /admin/settings`                                                                                                                        | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |
| `users.bulk`           | `POST /admin/users/bulk`                                                                                                                     | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          | ✓ 403 <br>(403)          |
| `users.create`         | `POST /admin/users`                                                                                                                          | ✓ 2xx/4xx <br>(422)      | ✓ 403 <br>(403)          | ✓ 403 <br>(403)          |
| `users.delete`         | `DELETE /admin/users/:id`                                                                                                                    | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          | ✓ 403 <br>(403)          |
| `users.edit`           | `PUT /admin/users/:id`, `PATCH /admin/users/:id`                                                                                             | ✓ 2xx/4xx <br>(404)      | ✓ 403 <br>(403)          | ✓ 403 <br>(403)          |
| `users.list`           | `GET /admin/users`, `GET /admin/users/:id`                                                                                                   | ✓ 2xx/4xx <br>(200)      | ✓ 2xx/4xx <br>(200)      | ✓ 403 <br>(403)          |

## 3. The areas, as `PERMISSIONS` declares them

| Area         | Action      | admin | manager | sales |
| ------------ | ----------- | ----- | ------- | ----- |
| `dashboard`  | `view`      | ✓     | ✓       | ✓     |
| `properties` | `view`      | ✓     | ✓       | ✓     |
| `properties` | `create`    | ✓     | ✓       | —     |
| `properties` | `edit`      | ✓     | ✓       | —     |
| `properties` | `delete`    | ✓     | ✓       | —     |
| `properties` | `bulk`      | ✓     | ✓       | —     |
| `properties` | `duplicate` | ✓     | ✓       | —     |
| `masterData` | `view`      | ✓     | ✓       | —     |
| `masterData` | `create`    | ✓     | ✓       | —     |
| `masterData` | `edit`      | ✓     | ✓       | —     |
| `masterData` | `delete`    | ✓     | ✓       | —     |
| `leads`      | `view`      | ✓     | ✓       | ✓     |
| `leads`      | `edit`      | ✓     | ✓       | ✓     |
| `leads`      | `claim`     | —     | —       | ✓     |
| `leads`      | `assign`    | ✓     | ✓       | —     |
| `leads`      | `delete`    | ✓     | ✓       | —     |
| `leads`      | `bulk`      | ✓     | ✓       | —     |
| `leads`      | `export`    | ✓     | ✓       | ✓     |
| `articles`   | `view`      | ✓     | ✓       | —     |
| `articles`   | `create`    | ✓     | ✓       | —     |
| `articles`   | `edit`      | ✓     | ✓       | —     |
| `articles`   | `delete`    | ✓     | ✓       | —     |
| `articles`   | `bulk`      | ✓     | ✓       | —     |
| `content`    | `view`      | ✓     | ✓       | —     |
| `content`    | `create`    | ✓     | ✓       | —     |
| `content`    | `edit`      | ✓     | ✓       | —     |
| `content`    | `delete`    | ✓     | ✓       | —     |
| `content`    | `bulk`      | ✓     | ✓       | —     |
| `seo`        | `view`      | ✓     | ✓       | —     |
| `seo`        | `create`    | ✓     | ✓       | —     |
| `seo`        | `edit`      | ✓     | ✓       | —     |
| `seo`        | `delete`    | ✓     | ✓       | —     |
| `seo`        | `bulk`      | ✓     | ✓       | —     |
| `media`      | `view`      | ✓     | ✓       | —     |
| `media`      | `create`    | ✓     | ✓       | —     |
| `media`      | `edit`      | ✓     | ✓       | —     |
| `media`      | `delete`    | ✓     | ✓       | —     |
| `media`      | `bulk`      | ✓     | ✓       | —     |
| `settings`   | `view`      | ✓     | ✓       | —     |
| `settings`   | `edit`      | ✓     | —       | —     |
| `users`      | `list`      | ✓     | ✓       | —     |
| `users`      | `*`         | ✓     | —       | —     |
| `profile`    | `*`         | ✓     | ✓       | ✓     |

## 4. The rules a yes/no cannot express

Five §7 rules are about _what_ a role sees rather than _whether_ it may look.
Each was exercised against the running mock; the scenario id is the one in
`45-modules-bug-bash.md`.

| Rule (§7)                                                         | What was done                                                                         | Result                                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A sales user sees only leads assigned to them or unassigned (D15) | `GET /admin/leads?perPage=all` as sales, then every row's `assignedTo` read           | `LEAD-27` ✓ — no row belongs to anybody else                                                                                    |
| A sales user may **claim** an unassigned lead                     | `POST /admin/leads/:id/claim` as sales                                                | `LEAD-28` ✓ 200                                                                                                                 |
| …and may not hand one to a colleague                              | `PATCH /admin/leads/:id { assignedTo: 2 }` as sales                                   | `LEAD-29` ✓ 403                                                                                                                 |
| A sales export is server-scoped, not refused (D15)                | `GET /admin/leads/export` as sales and as admin, rows compared                        | `LEAD-32`, `LEAD-34` ✓ 200, and strictly fewer rows than the admin's                                                            |
| A manager reads the settings and cannot save them                 | the form is disabled and carries no Save; `PUT /admin/settings` sent past it          | `SET-06`, `SET-07` ✓ 403 from the API, ✓ no control in the screen (`e2e/tests/settings.spec.js`)                                |
| A manager cannot write `customHeadHtml` (§9.3)                    | `PUT /admin/settings` as manager with `integrations.customHeadHtml`                   | `SEO-16` ✓ 403 — the field lives inside the settings record, which only `settings.edit` may write                               |
| A sales user opens the property form read-only                    | the form renders with every control disabled, and asks the API nothing it may not ask | `e2e/tests/property-create.spec.js`, plus **MB-01** — the slug field used to fire `check-slug` and collect a 403 in the console |

## 5. What a role is sent to when it asks for a route it may not open

| Case                                                                         | Expected (§7)                                                                | Result                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A signed-out visitor opens `/admin/leads`                                    | the login page, with the location remembered                                 | `AUTH-06` ✓                                                    |
| …signs in as admin                                                           | back to `/admin/leads`                                                       | `AUTH-07` ✓                                                    |
| A signed-out visitor opens `/admin/settings/users` and signs in as **sales** | the dashboard, never a 403                                                   | `AUTH-08` ✓                                                    |
| A signed-in role opens a route it may not have                               | `Forbidden` **in place**, inside the admin layout, with a router `Link` back | `src/__tests__/rbac.routes.test.jsx`, 126 route/role renders ✓ |

---

Nothing in this document is inferred. Section 1 is what `RoleRoute` rendered,
section 2 is what the server answered, sections 4 and 5 are what the scenarios
of `45-modules-bug-bash.md` observed.
