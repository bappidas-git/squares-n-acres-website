# Project state — Squares N Acres website

Status: IN PROGRESS
Last prompt executed: 28 — Lead capture unification Next prompt: 29

## Executed prompts

| #   | Title                                                          | Commit                                                                             | Date       |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 01  | Repository audit, tooling baseline and project state files     | `c1cc2f7`                                                                          | 2026-09-15 |
| 02  | Rebrand identity, environment files, brand assets and README   | `376203f`                                                                          | 2026-09-15 |
| 03  | Purge HOM traces and dead code; strict trace check             | `f82d069`                                                                          | 2026-09-15 |
| 04  | Design system: tokens, MUI theme, UI kit and layout restyle    | `373e092`                                                                          | 2026-09-15 |
| 05  | API contract, enums, endpoint registry and schema descriptors  | `1812eae`                                                                          | 2026-09-15 |
| 06  | Mock server core, runtime db, envelope and starter seed        | `1a2ce23`                                                                          | 2026-09-15 |
| 07  | Auth tokens, RBAC middleware, users CRUD and profile           | `2383116`                                                                          | 2026-09-15 |
| 08  | Property search and lead pipeline on the mock                  | `71e0727`                                                                          | 2026-09-15 |
| 09  | Mock content, master data, SEO, sitemaps and smoke tests       | `92df3cb`                                                                          | 2026-09-16 |
| 10  | Full Bangalore seed data and seed guide                        | `bdaeaa9`                                                                          | 2026-09-16 |
| 11  | Frontend data layer, hooks, contexts and page rewiring         | `d60193e`                                                                          | 2026-09-16 |
| 12  | Auth, admin shell, RBAC routes, notifications and profile      | `d6128b5`                                                                          | 2026-09-16 |
| 13  | Admin UI kit, `MasterDataPage`, users page, IconPicker fixes   | `651a8cc`                                                                          | 2026-09-16 |
| 14  | Localities and cities: admin CRUD, public index and guide      | `b3813a1`                                                                          | 2026-09-16 |
| 15  | Master data: property types, amenities, badges and banks       | `0cc1afc`                                                                          | 2026-09-16 |
| 16  | Developers: admin CRUD and the public builder pages            | `da19cb5`                                                                          | 2026-09-16 |
| 17  | FAQs, testimonials, team and partners: admin and sections      | `4dcf5cd`                                                                          | 2026-09-16 |
| 18  | Property form foundation: reducer, validators, rail, payload   | `c917a9a`                                                                          | 2026-09-16 |
| 19  | Property form tabs 1–6: basics → media                         | `44122e1`                                                                          | 2026-09-16 |
| 20  | Property form tabs 7–12: amenities → FAQs                      | `d114794`                                                                          | 2026-09-16 |
| 21  | Property form tabs 13–16, admin preview, publish polish        | `fb93d0c`                                                                          | 2026-09-16 |
| 22  | Admin property list: filters, bulk, toggles, CSV export        | `28e892a`                                                                          | 2026-09-16 |
| 23  | Property details part 1: page shell, gallery, price, shortlist | `399b188`                                                                          | 2026-09-16 |
| 24  | Property details part 2: the eleven content sections           | `296deaa`                                                                          | 2026-09-16 |
| 25  | Property details part 3: documents, finance, similar, enquiry  | `adfe5ad`                                                                          | 2026-09-17 |
| 26  | Public listing engine, filters, global search and shortlist    | `382e5cf`                                                                          | 2026-09-17 |
| 27  | Data-driven home page, navigation and footer                   | `f20e4e0`                                                                          | 2026-09-17 |
| 28  | Unified lead capture, spam protection, click tracking          | HEAD of this branch (a commit cannot contain its own hash — prompt 29 fills it in) | 2026-09-17 |

## Baseline (prompt 01)

### Toolchain

| Item                               | Value                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node -v`                          | `v22.22.2` (above the `.nvmrc` pin of `20`; `engines` requires `>=18.18`)                                                                                                                                                                                                                                                                       |
| `npm -v`                           | `10.9.7`                                                                                                                                                                                                                                                                                                                                        |
| `npm install`                      | `added 1624 packages, and audited 1625 packages in 25s` — **70 vulnerabilities (15 low, 15 moderate, 37 high, 3 critical)**, all inside the `react-scripts 5.0.1` dependency tree (`svgo`/`postcss`/`webpack-dev-server`/`workbox`); not fixable without ejecting or a CRA major, so they are accepted for now.                                 |
| `npm install` deprecation warnings | `w3c-hr-time@1.0.2`, `stable@0.1.8`, `workbox-cacheable-response@6.6.0`, `sourcemap-codec@1.4.8`, `rollup-plugin-terser@7.0.2`, `workbox-google-analytics@6.6.0`, `domexception@2.0.1`, `abab@2.0.6`, `svgo@1.3.2`, `@babel/plugin-proposal-{optional-chaining,numeric-separator,private-methods,nullish-coalescing-operator,class-properties}` |
| Dev deps added                     | `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `cross-env@7.0.3`, `rimraf@5.0.10` (`added 11 packages, changed 3 packages`)                                                                                                                                                                                                                 |

Every build emits the CRA notice that `babel-preset-react-app` imports
`@babel/plugin-proposal-private-property-in-object` without declaring it, plus
`Browserslist: caniuse-lite is outdated`. Neither fails the build; neither is fixed here
(adding the Babel plugin would mean a dependency outside the allow-list of §12).

### `npm run build` — before any change

Exit 0, `Compiled with warnings.` — **10 ESLint warnings, 0 errors.** First lines:

```
Compiled with warnings.

[eslint]
src/components/sections/home/HeroSection.jsx
  Line 267:17:  Elements with the ARIA role "combobox" must have the following attributes defined: aria-controls,aria-expanded  jsx-a11y/role-has-required-aria-props

src/components/sections/property/EnquiryForm.jsx
  Line 6:28:  'sanitizeInput' is defined but never used  no-unused-vars

src/components/sections/property/FinanceGuide.jsx
  Line 168:9:  'resultRef' is assigned a value but never used  no-unused-vars

src/components/sections/property/StickyNav.jsx
  Line 127:5:  React Hook useCallback has a missing dependency: 'navItems'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src/pages/admin/LeadDetail.js
  Line 41:9:  'isMobile' is assigned a value but never used  no-unused-vars

src/pages/admin/property-tabs/SeoTagsTab.jsx
  Line 2:67:  'LinearProgress' is defined but never used  no-unused-vars

src/pages/public/ArticleDetail.js
  Line 43:7:  'inList' is assigned a value but never used  no-unused-vars

src/pages/public/PropertyDetails.jsx
  Line 203:9:  'handleOpenLeadForm' is assigned a value but never used  no-unused-vars

src/pages/public/PropertyListing.jsx
  Line 1:60:  'memo' is defined but never used       no-unused-vars
  Line 5:10:  'useInView' is defined but never used  no-unused-vars
```

Bundle (gzip): `main.28d19d0e.js` 212.91 kB + 41.44 kB + 34.67 kB and ~90 further chunks.

### `npx eslint "src/**/*.{js,jsx}"` — before any change (CRA config, no project rules)

`✖ 16 problems (0 errors, 16 warnings)` — the 10 above plus:

```
src/services/api.js
  75:7  warning  'extractPaginationMeta' is assigned a value but never used  no-unused-vars

src/utils/seoGenerator.js
   21:7    warning  'capitalize' is assigned a value but never used      no-unused-vars
  238:116  warning  'specifications' is assigned a value but never used  no-unused-vars
  241:9    warning  'state' is assigned a value but never used           no-unused-vars

src/utils/validators.js
  26:21  warning  Unnecessary escape character: \-  no-useless-escape
  59:35  warning  Unnecessary escape character: \-  no-useless-escape
```

Under the **new** config (prompt 01 §7) the same tree reported
`✖ 26 problems (23 errors, 3 warnings)` — the 16 above re-graded to errors, plus
`AnimatedSection.jsx` `Tag`, `ToastProvider.jsx` `index`,
`property-tabs/BasicInfoTab.jsx` `slugManuallyEdited` and the 7 `no-console` errors in
`PropertyForm.jsx`. All are fixed in this commit.

### Size counters

| Counter                                                | Value                                                  |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Files tracked under `src/`                             | 173 (80 `.jsx`, 39 `.js`, 53 `.css`, 1 `.png`)         |
| Lines under `src/` (`git ls-files src \| xargs wc -l`) | 47 834                                                 |
| Hex literals in `src/**/*.{js,jsx}` outside `theme.js` | **1 206** (expected ≈ 1 206 ✔)                         |
| Hex literals in `src/**/*.css` outside `global.css`    | **290** (expected ≈ 290 ✔); 307 including `global.css` |
| Inline `fontFamily:` literals in `src/**/*.{js,jsx}`   | 30 (17 of them in `PropertyDetails.jsx`)               |
| JS/JSX files scanned by the inventory                  | 119                                                    |

### Boilerplate-trace counters (regexes of `00_MASTER_CONTEXT.md` §13 D17)

Brand strings only (the eight brand/identifier/host patterns of D17 — the dotted and
spaced brand names, the old domain, the tagline, the two identifier prefixes, the CSS class
prefix and the Cloudways host):

| Scope     | Matches                |
| --------- | ---------------------- |
| `db.json` | **52** (expected ≈ 49) |
| `src/`    | **84** (expected ≈ 90) |

Full D17 pattern set (brand strings + the boilerplate palette hexes and fonts + the old
Cloudinary cloud + the video host + the placeholder-image host and its colour name):

| Scope     | Matches |
| --------- | ------- |
| `db.json` | 226     |
| `src/`    | 475     |

`npm run check:traces:report` scans 181 files (`src`, `public`, `scripts`, `docs`, `db.json`,
`README.md`, `package.json`, `.env`). Excluding `docs/**` — whose three new files quote the
traces as evidence and are handled under "Pending rewrites" — the **product tree** reports:

```
brand/legacy traces:  717
hex colour literals: 1495
total findings:      2212
```

(The totals printed by the script itself are higher because the scan includes this file and the
inventory; those documentation findings are not product defects.)

By pattern in the product tree: hex-literal 1495 · HOM palette navy 222 · the dotted brand
string 95 · the placeholder-image host 89 · its colour name 77 · the palette gold 63 ·
the old domain 35 ·
the boilerplate body font 35 · navy-light 26 · navy-alt 14 · the old Cloudinary cloud 11 ·
the hyphen identifier prefix 10 ·
the boilerplate heading font 9 · the Cloudways host 4 · gold-dark 4 · cream 4 ·
the CSS class prefix 4 ·
the HOM tagline 3 · the Gumlet host 2 · the HOM numeral font 2 · navy-dark 2 · gold-light 2 ·
the underscore storage-key prefix 2 · the spaced brand string 2.

Worst product files: `db.json` 226 · `AdminSeo.js` 141 · `AdminProperties.js` 94 ·
`Dashboard.js` 80 · `LeadDetail.js` 76 · `ArticleForm.jsx` 72 ·
`AdminLayout.module.css` 67 · `AdminSettings.js` 65 · `FaqManager.jsx` 65 ·
`PropertyDetails.jsx` 60.

`npm run check:traces` (strict) exits **1** — expected until prompt 03.

### Line endings

`git add --renormalize .` after switching `.gitattributes` to `* text=auto eol=lf` changed
**no** files: the working tree was already LF-only (`file` reports no CRLF in any tracked file).
The renormalisation is therefore invisible in the diff.

## Current npm scripts / env vars / endpoints added (cumulative lists)

### npm scripts

| Script                  | Command                                                                                         | Added by                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| `start`                 | `react-scripts start`                                                                           | boilerplate                  |
| `dev`                   | `concurrently -n mock,web -c blue,green "npm run mock" "npm start"`                             | boilerplate (replaced in 06) |
| `mock`                  | `node mock-server/server.js`                                                                    | 06                           |
| `mock:reset`            | `node mock-server/reset.js`                                                                     | 06                           |
| `build`                 | `react-scripts build`                                                                           | boilerplate                  |
| `test`                  | `react-scripts test`                                                                            | boilerplate                  |
| `eject`                 | `react-scripts eject`                                                                           | boilerplate                  |
| `lint`                  | `eslint … --max-warnings=0 && node scripts/check-endpoints.js`                                  | 01 (extended in 05, 06)      |
| `lint:fix`              | `eslint "src/**/*.{js,jsx}" "mock-server/**/*.js" "scripts/**/*.js" --fix`                      | 01 (extended in 06)          |
| `format`                | `prettier --write "src/**" "mock-server/**/*.js" "scripts/**" "docs/**/*.md"`                   | 01 (extended in 06)          |
| `format:check`          | `prettier --check "src/**" "mock-server/**/*.js" "scripts/**/*.js"`                             | 01 (extended in 06)          |
| `test:ci`               | `cross-env CI=true react-scripts test --watchAll=false --passWithNoTests`                       | 01                           |
| `test:mock`             | `cd mock-server && node --test`                                                                 | 07                           |
| `build:ci`              | `cross-env CI=true react-scripts build`                                                         | 01                           |
| `check:traces`          | `node scripts/check-traces.js`                                                                  | 01                           |
| `check:traces:report`   | `node scripts/check-traces.js --report`                                                         | 01                           |
| `generate:brand-assets` | `node scripts/fetch-brand-assets.js`                                                            | 02                           |
| `check:contrast`        | `node scripts/contrast-check.js`                                                                | 04                           |
| `check:endpoints`       | `node scripts/check-endpoints.js`                                                               | 05                           |
| `validate:seed`         | `node scripts/validate-seed.js`                                                                 | 06                           |
| `seed:build`            | `node scripts/seed/build-seed.js`                                                               | 10                           |
| `smoke`                 | `node scripts/smoke-api.js` (needs a running mock; deliberately outside `check:all`)            | 09                           |
| `check:all`             | `… lint && test:ci && test:mock && build:ci && check:traces && validate:seed && check:contrast` | 01 (extended in 04, 06, 07)  |

### Environment variables

The boilerplate's committed `.env` was removed from git and from disk in prompt 02; the
committed files are now `.env.example` (documents every variable), `.env.development` (read
by `npm start`) and `.env.production.example` (template for `.env.production`, git-ignored).

| Variable                             | Required | Default (development)       | Added by | Consumed by                                                  |
| ------------------------------------ | -------- | --------------------------- | -------- | ------------------------------------------------------------ |
| `REACT_APP_API_URL`                  | yes      | `http://localhost:4000/api` | 02       | `src/services/api.js` — throws when missing (D48)            |
| `REACT_APP_SITE_URL`                 | no       | `http://localhost:3000`     | 02       | `src/config/site.js` → `SITE.url`                            |
| `REACT_APP_SITE_NAME`                | no       | `Squares N Acres`           | 02       | `src/config/site.js` → `SITE.name`                           |
| `REACT_APP_CLOUDINARY_CLOUD_NAME`    | no       | —                           | 02       | media uploads (prompt 39)                                    |
| `REACT_APP_CLOUDINARY_UPLOAD_PRESET` | no       | —                           | 02       | media uploads (prompt 39)                                    |
| `REACT_APP_GOOGLE_MAPS_KEY`          | no       | —                           | 02       | property location map                                        |
| `CHROME_PATH`                        | no       | —                           | 02       | prerender script (prompt 41)                                 |
| `MOCK_PORT`                          | no       | `4000`                      | 02       | `mock-server/config.js` — the port `npm run mock` listens on |
| `MOCK_DELAY_MS`                      | no       | `0`                         | 02       | `mock-server/config.js` — latency on every response          |
| `MOCK_TOKEN_TTL_HOURS`               | no       | `24`                        | 02       | `mock-server/config.js` — token lifetime (used by prompt 07) |
| `MOCK_FRESH`                         | no       | `0`                         | 02       | `mock-server/config.js` — `1` re-seeds the runtime db        |

`.gitignore` (prompt 01) already ignored `.env` and `.env.production`; those rules now
protect real files instead of being a no-op.

### Endpoints

**236 endpoints are now declared** in `src/services/endpoints.js` — the complete catalogue
of `00_MASTER_CONTEXT.md` §5.14 (44 public, 5 auth, 187 admin) in 52 groups, documented in
`docs/API_CONTRACT.md`. Prompt 21 added the one endpoint the catalogue did not list:
`GET /admin/properties/slug/:slug`, the admin read by slug that the preview of an unpublished
listing needs (a public URL carries no id). None of them is served yet (prompts 06–09 build the mock) and none
is called yet (prompt 11 rewrites the services): this prompt freezes the contract, it does
not wire it.

`src/services/endpoints.test.js` hardcodes every path of §5.14 and fails when one
disappears from the registry; `scripts/check-endpoints.js` (now part of `npm run lint`)
fails when a path literal appears anywhere else under `src/`.

Prompt 27 added the second endpoint the catalogue did not list: **`GET /pages`**
(`pages.list`), the navigation list of published pages — `showInHeader` / `showInFooter`
filters, `{slug,title,headerMenu,footerColumn,order}` per row, unpaginated unless
`page`/`perPage` ask otherwise. The header and the footer are built from it, so **237**
endpoints are now declared.

**Served by the mock:** all 236 registry endpoints, plus `GET /api/health` and four
operational paths the registry does not declare (`GET /redirects/resolve`,
`POST /admin/redirects/import`, `GET /admin/redirects/export`,
`GET /admin/seo/llms-preview`). Prompt 06 built the core and generic CRUD for all 28
collections; 07 added `/auth/*` and `/admin/users`; 08 the property and lead routes; 09 the
rest — articles, pages, the fourteen master-data collections, media, settings, SEO settings
and overview, the dashboard, the newsletter, careers, redirects, and the sitemap family
(`sitemap.xml` + five children, `robots.txt`, `rss.xml`, `llms.txt`) at both `/api/...` and
the root (D21).

Every `/api/admin/*` path — hand-written or generic — answers 401 without a bearer token and
403 outside the §7 matrix. `npm run smoke` walks `allEndpoints()` against a running server
and asserts the status, the envelope and two dozen behaviours: **273/273 checks pass, 0
failures** (2026-09-16, against the committed seed).

The generic JSON Server router is now a fallback for two things only, neither of them in the
contract: the camelCase spellings of the kebab-case paths (`/api/propertyTypes`) and a
detail read by id where the contract gives only a slug lookup (`/api/localities/1`).
`GENERIC_COLLECTIONS` in `mock-server/middleware/publicScope.js` names them.

The boilerplate's own endpoint surface stays inventoried in
`docs/archive/CODEBASE_INVENTORY.md` §d until prompt 11 replaces it.

## Pending rewrites (temporary adapters that must be removed; owner prompt)

| Item                                            | Why it is temporary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Owner prompt |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `test:ci --passWithNoTests`                     | Needed only while `src/` contains no test file; drop the flag once real tests exist.                                                                                                                                                                                                                                                                                                                                                                                                                     | 35           |
| Header / MobileHeader / BottomNav nav arrays    | The three components still declare the same `navItems` / `sideMenuItems` literals. Prompt 04 restyled and unified their breakpoints but left the data alone, as its §9 requires ("nav data still hardcoded until prompt 27"). Prompt 27 moves it to `src/config/navigation.js`.                                                                                                                                                                                                                          | 27           |
| 501 on the sitemap / robots / RSS / llms paths  | The routes are mounted and mirrored at the root (D21) but answer `501` until prompt 09 generates the documents from `seoSettings` and the seed.                                                                                                                                                                                                                                                                                                                                                          | 09           |
| `src/utils/adapters/legacyArticle.js`           | `toLegacyArticle()` maps `featuredImage.url` → `image`, `category.name`, `author.name` and `readingTimeMinutes` → `readTime` for `AdminArticles` and `ArticleForm`.                                                                                                                                                                                                                                                                                                                                      | 33 / 34      |
| `src/components/common/LegacyHtml.jsx`          | Renders CMS-authored HTML (article bodies, FAQ answers) with `dangerouslySetInnerHTML`. Prompt 32 replaces it with `SafeHtml`, sanitising against the allow-list the Tiptap editor writes with.                                                                                                                                                                                                                                                                                                          | 32           |
| FAQ answers textarea → `RichTextEditor`         | The FAQs tab's answer is a four-row `TextareaField` holding HTML, refused only by a regex when it carries a script, an iframe or an event handler (D66). Prompt 32 swaps the control for the Tiptap editor and the regex for the real sanitiser; the field, the validator key and the payload do not move.                                                                                                                                                                                               | 32           |
| Description textarea → `RichTextEditor`         | The Basics tab's description is an eight-row `TextareaField` with a live character and word counter. The field stores sanitised HTML (§6.1) and the counters already measure the plain text inside it, so prompt 32 swaps the control for the Tiptap editor without touching the reducer, the validators or the payload.                                                                                                                                                                                 | 32           |
| `ArticleForm` saving disabled                   | Its category, author and tag pickers offer hardcoded strings; an article now carries `categoryId`, `authorId`, `tagIds[]`, `featuredImage{}`, `status` and a nested `seo{}`. Loading works through `toLegacyArticle`; saving is disabled behind an info `Alert`.                                                                                                                                                                                                                                         | 33           |
| `AdminSettings` saving disabled                 | The screen holds a flattened view of five of the eight §6.13 branches, so writing it back would flatten the record on the server. Reads are live; saving is disabled behind an info `Alert`.                                                                                                                                                                                                                                                                                                             | 40           |
| `AdminSeo` saving disabled                      | SEO now lives in one nested `seo{}` saved through the entity's own PATCH, and the generator still writes boilerplate titles and canonicals (ADD-20/ADD-27). The table reads `GET /admin/seo/overview` live; editing and bulk generation are disabled behind an info `Alert`.                                                                                                                                                                                                                             | 36–37        |
| `LegacyHtml` in `LocalityGuide`                 | The locality description is CMS-authored HTML rendered through the temporary `LegacyHtml`; `SafeHtml` replaces it with the editor's allow-list.                                                                                                                                                                                                                                                                                                                                                          | 32           |
| `SeoPlaceholderTab` → `SeoPanel`                | The property form's SEO tab (prompt 21) holds `seo.title`, `seo.description`, `seo.focusKeyword` with the §9.1 length guides and a read-only mirror of the slug. The full panel — analysis, search and social previews, robots, schema, redirect — replaces it in prompt 36 (D87); the rest of the `seo` branch rides through every save untouched meanwhile.                                                                                                                                            | 36           |
| Locality SEO placeholder card                   | The locality form's "Search engines" section is an `Alert` saying the panel arrives later; the form carries the record's `seo` branch through a save untouched in the meantime.                                                                                                                                                                                                                                                                                                                          | 36           |
| Locality/localities Helmet titles               | `Localities.jsx` and `LocalityDetail.jsx` set `<title>`/`description` through `react-helmet-async`; `<Seo>` replaces both, with the §9.5 templates and the JSON-LD graph.                                                                                                                                                                                                                                                                                                                                | 38           |
| `LegacyHtml` in the builder profile             | The developer description on `/builders/:slug` is CMS-authored HTML rendered through the temporary `LegacyHtml`; `SafeHtml` replaces it with the editor's allow-list.                                                                                                                                                                                                                                                                                                                                    | 32           |
| Developer SEO placeholder card                  | The developer form's "Search engines" section is an `Alert` saying the panel arrives later; the form carries the record's `seo` branch through the `PUT` untouched in the meantime.                                                                                                                                                                                                                                                                                                                      | 36           |
| Builders/builder Helmet titles                  | `Builders.jsx` and `BuilderDetail.jsx` set `<title>`/`description` through `react-helmet-async`, following the §9.5 `developer` template; `<Seo>` replaces both, with the JSON-LD `Organization` + `ItemList` graph (§9.3).                                                                                                                                                                                                                                                                              | 38           |
| Property-type SEO placeholder card              | The property-type form ends in an `Alert` saying the SEO panel arrives later; the form carries the record's `seo` branch through the `PUT` untouched so nothing is lost meanwhile.                                                                                                                                                                                                                                                                                                                       | 36           |
| `LegacyHtml` in `FaqAccordion`                  | Every FAQ on the site — the home band, `/insights/faqs`, a property page's questions and the CMS `faq` block — renders its answer through the temporary `LegacyHtml`. `SafeHtml` replaces it with the editor's allow-list, and the same prompt turns the FAQ form's HTML textarea into the editor.                                                                                                                                                                                                       | 32           |
| `LegacyHtml` in `OverviewSection`               | The property description on `/properties/:slug` is CMS-authored HTML rendered through the temporary `LegacyHtml`, clamped to about twelve lines with a measured "Read more". `SafeHtml` replaces it with the editor's allow-list; the clamp, the measurement and the markup around it do not move.                                                                                                                                                                                                       | 32           |
| `AdminPlaceholderPage` routes                   | Thirteen admin routes of `src/routes/adminRouteConfig.js` render `AdminPlaceholderPage` with the number of the prompt that writes the screen (13–39). Each one disappears when its owner prompt lands; the component itself must not exist after prompt 43.                                                                                                                                                                                                                                              | 13–39        |
| ~~`LeadModalTemp` → `LeadCaptureModal`~~        | **Closed in 28.** `LeadModalTemp.jsx` and its stylesheet are deleted; `components/common/LeadCaptureModal.jsx` is the one dialog, parameterised from `ENTRY_POINTS`. Prompt 25 gave it `successTitle`/`successAction`, which is how the documents section hands the file over after the lead (BUG-08); what it still lacks is the requirement fields, the submit throttle (D43) and `<label>`s on its boxes (ADD-09). Prompt 28 unifies every form on the site behind `LeadCaptureModal` and deletes it. | 28           |
| `PropertyDetails` temporary `Helmet`            | The page sets `<title>`, the description, the canonical and `robots` through `react-helmet-async`; `<Seo>` replaces it in prompt 38 with the §9.5 templates, the social tags and the JSON-LD graph (including the `BreadcrumbList` the crumbs already describe).                                                                                                                                                                                                                                         | 38           |
| Listing `Helmet` → `<Seo type="listing">`       | `ListingEngine` renders the title, the description, the canonical and `robots` from `listingSeo.js` through `react-helmet-async`, and `Pagination` emits `rel=prev/next` from the same object. Prompt 38 hands `buildListingSeo()` to `<Seo>`, which adds the OG/Twitter tags and the `ItemList` JSON-LD; the rules themselves do not change.                                                                                                                                                            | 38           |
| `Shortlist` temporary `Helmet`                  | `/shortlist` sets its title and `noindex, follow` through `react-helmet-async`; `<Seo type="shortlist">` replaces it, with the same robots rule (§9.3).                                                                                                                                                                                                                                                                                                                                                  | 38           |
| `HomeFeatures` / `HomeSteps` → CMS blocks       | The `features` and `steps` blocks of the `home` page are rendered by two components in `sections/home/`. Prompt 30 moves them to `components/cms/blocks/` and mounts them from `PageRenderer`, so the About page's values and a service page's process render through the same markup. The markup is what moves; the data contract does not change.                                                                                                                                                      | 30           |
| ~~Post-requirement modal → `LeadCaptureModal`~~ | **Closed in 28.** The header CTA, the drawer's CTA row and the bottom bar's Enquire all call `useLeadCapture().openLeadModal({ entry: 'post-requirement' })`; `LeadCaptureProvider` mounts the one dialog for the whole app.                                                                                                                                                                                                                                                                             | 28           |
| Home `Helmet` → `<Seo type="home">`             | `Home.jsx` sets `<title>` and the description from the `home` CMS page's `seo` branch through `react-helmet-async`. Prompt 38 hands the same record to `<Seo type="home">`, which adds the §9.5 template, the social tags and the `Organization` + `WebSite` JSON-LD graph.                                                                                                                                                                                                                              | 38           |

## Known issues (open) — id, description, found by, owner prompt

### Tagged defects of `00_MASTER_CONTEXT.md` §11

| Id                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Found by                  | Owner prompt                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------- |
| BUG-01                    | Every write uses `PUT` with partial payloads (11 call sites across property/lead/article/FAQ/neighborhood/partner/user toggles) **Prompt 11 moved every write it touched to the right verb**: toggles, reorders and lead-status changes use `PATCH`, bulk actions use `POST /admin/<resource>/bulk`, and `PUT` is reserved for a full-record form save. The row closes when prompts 18–40 confirm the remaining forms. **The property-form half is closed in 21**: the sixteen tabs are written, `toPayload` states the whole §6.1 record and the form saves it with `PUT /admin/properties/:id` (a create is `POST`); no property write sends a partial body through `PUT` any more.                                                                                                                                                    | master spec, confirmed 01 | 11, 14–22, 29, 33, 40             |
| BUG-09 (contract defined) | Lead sources inconsistent (21 values in `src/` vs `adminConstants` vs `AdminLayout.formatSource`). **Prompt 05 froze `LEAD_SOURCES` (29 values) and `LEGACY_LEAD_SOURCE_MAP` (24 old values)** in `src/config/enums.js`, tested in `enums.test.js`. The forms still send the old values; **Prompt 08 applies `LEGACY_LEAD_SOURCE_MAP` on `POST /leads`**, so an old bundle's `property_enquiry` is stored as `property-enquiry` and an unknown value is a 422. The seed converts its own rows in 10, the forms move in 28 and the CRM labels in 29. **Closed in the client in 28:** `src/utils/leadSources.js` `ENTRY_POINTS` is the only place `src/` writes a source, every value is canonical, and `leadSources.test.js` asserts it; the acceptance grep for the fifteen legacy spellings returns 0. Only the CRM labels (29) remain. | master spec, confirmed 01 | 29 (contract: 05 ✔, client: 28 ✔) |
| BUG-11                    | Hardcoded content on About, Contact, FAQs, HomeLoan, LegalAssistance, InteriorDesigning, Careers, Partnership, SellLet, FlexibleWorkspace, DirectLeaseRetails, RealEstateAwareness, WhyChoose, HowItWorks, Dashboard trends, footer defaults, `SeoGuidelines` **Data side prepared in 10:** every one of those pages is now a seeded CMS record with its blocks, so prompts 27–31 render data rather than JSX. **Home half closed in 27:** `WhyChoose` and `HowItWorks` are deleted and the two bands are the `features` and `steps` blocks of the `home` page; every other band of the home page is settings, master data or a collection. The other pages are still JSX.                                                                                                                                                               | master spec, confirmed 01 | 29, 30, 31, 37, 40                |
| BUG-15 (frontend)         | Careers résumé upload dead; no spam protection; newsletter no dedupe and a false reCAPTCHA notice. **Closed on the server in 09:** `POST /jobs/:id/apply`, `POST /newsletter/subscribe` and `POST /leads` are throttled to ten a minute per IP and honour the `website` honeypot, a known address answers "Already subscribed" and an unsubscribed one is revived, and a résumé travels as a URL (D12). **The spam protection and the newsletter half are closed in the client in 28:** every lead form and the newsletter band carry the `website` honeypot and a ten-second throttle (D43), a duplicate address reads back as "You're already subscribed", and the reCAPTCHA notice only appears when a site key is configured. The careers résumé upload is prompt 31's.                                                              | master spec, confirmed 01 | 31                                |
| BUG-18 (frontend)         | `getFeatured` tag hack; ad-hoc trending/related; FAQ page/section fetch-all-and-filter. **Closed on the server:** `/properties/featured` and `/properties/:id/similar` (08), `/articles/trending` and the `category`/`showOnHome`/`propertyTypeId` FAQ filters (09). The components that still fetch-all-and-filter arrive with 27 and 34. **Mostly closed in 11**: `FeaturedProperties` calls `/properties/featured`, `TrendingTopics` and `Articles` call `/articles/trending`, `FaqSection` calls `/faqs?showOnHome=true` and the FAQ page filters server-side. What is left is the listing page, which still narrows in the browser (prompt 26).                                                                                                                                                                                     | master spec, confirmed 01 | 27, 34                            |
| BUG-21                    | Additional defects recorded here by the audit prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 01                        | 01 → all                          |

### Additional defects of `00_MASTER_CONTEXT.md` §11

| Id | Description | Found by | Owner prompt |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| ADD-01 | `.env` committed with the Cloudways URL; no `.env.example`; README links a non-existent `API_DOCUMENTATION.md`; README says Node 16+ | master spec, confirmed 01 | 02 |
| ADD-02 | `dev` script equals `start` (no json-server anywhere); `devDependencies` empty; no ESLint/Prettier config beyond CRA | master spec | 01 (tooling half **closed**), 06 (`dev`/`mock`) |
| ADD-03 | `public/index.html` references a non-existent `favicon.ico`; `robots.txt` allows everything with no sitemap; no `manifest.json` | master spec, confirmed 01 | 02 |
| ADD-04 | `@mui/icons-material` and `web-vitals` are unused dependencies (0 imports each) | master spec, confirmed 01 | 03, 41 |
| ADD-06 (partial) | **Closed in 04:** the three scroll-hide copies (now `useScrollDirection`; `useThrottledScroll` stays for `BackToTop`), the 13 local `Section` components (now `ui/Section`), and `tagColors` vs `TAG_OPTIONS` (`PropertyCard` reads `TAG_OPTIONS` tones). **Still open:** the five `formatPrice` and three `formatDate` copies still exist at their call sites — `src/utils/format.js` is the single implementation but the call sites move to it with the data hooks; `GooglePreview` ×2, `getTitleLenColor` ×2 and `leadStatusConfig` in `Dashboard`. The nav data half closed in 27 (`src/config/navigation.js`). | master spec, confirmed 01 | 11, 36 |
| ADD-09 (closed in 28) | `LeadForm` ignores `required:false`, has no `<label>`s, no `onSuccess`, posts unsanitised values; `NewsletterSection` validation is `includes('@')`, fails silently, shows a false reCAPTCHA notice. **Closed:** every control is a `ui/FormField` with a visible `<label>`, `aria-describedby` and `aria-invalid`; `required` is honoured per field; the payload is sanitised, the phone normalised to `+91XXXXXXXXXX` and unknown answers filed under `meta` (D56); `onSuccess(lead, values)` exists; `NewsletterForm` validates with `EMAIL_PATTERN`, shows its error inline and only claims reCAPTCHA when a key is set. | master spec, confirmed 01 | 28 ✔ |
| ADD-16 | `ArticleDetail` Markdown renderer: duplicate tables on every `\ **Closed in 11**: the article body is CMS-authored HTML rendered through `LegacyHtml`, and the breadcrumb now goes Home → Articles → category.                                                                                                                                                                                                                                                                                                                                                             | `line, ordered lists rendered as`<ul>`, only `**bold**`inline, breadcrumb "Insights" and "Articles" to the same URL;`Articles` state not URL-synced | master spec, confirmed 01 | 32, 34 |
| ADD-17 | `Contact`: five `#` social links opening new tabs, generic Brigade Road map with a fabricated `!4v1700000000000`, US-format phone in FAQs `(555) 123-4567`. **The FAQ half is closed in 17**: `/insights/faqs` renders `ContactMethods`, which reads the phone, the e-mail and the WhatsApp number from `siteSettings.general` and renders nothing when they are empty (D83). The contact page keeps the rest. | master spec, confirmed 01 | 30, 31 |
| ADD-18 | `Careers`: résumé file input has no `name`/`onChange`, form never reset, modal without dialog semantics; `InteriorDesigning` room cards and "Get Started" buttons do nothing; `LegalAssistance`/`RealEstateAwareness` encode conflicting Karnataka stamp-duty figures | master spec, confirmed 01 | 30, 31 |
| ADD-19 (settings/users) | `AdminSettings`: `PUT` drops `footerLinks`, tab panels out of order, "Footer Tagline" edits the General `tagline`, hardcoded `role === 'admin'`; `UserManagement`: last-admin guard hole, plaintext passwords echoed, own `ROLES` list. **The `AdminLogin` half is closed in 12 and the `UserManagement` half in 13; only the `AdminSettings` form remains, for prompt 40.** | master spec, confirmed 01 | 40 |
| ADD-20 | `AdminSeo`: the old domain in previews, "Auto-Generate" writes HOM titles/canonicals/schema, `stats.missing` dead, saving wipes empty fields, no confirmation before bulk overwrite; `ArticleForm`: the boilerplate brand as the default article author, `readTime` not editable, `isTrending/trendingOrder` dropped on PUT, `setTimeout(navigate)` not cleared | master spec, confirmed 01 | 33, 36, 37 |
| ADD-21 (property list closed) | `AdminProperties` fetches the public `/properties`, toggle omits the `is_active` fallback, `Promise.all` bulk aborts on first failure, per-page select-all (**closed in 22**: the file is deleted and `/admin/properties` is `PropertiesListPage`, server-side throughout, with one `POST /admin/properties/bulk` per bulk action); `AdminLeads`/`Dashboard` `p.id === propertyId` string-vs-number → Property column always empty; `Dashboard` "Leads by source" from 10 leads; `FaqManager` reorder wrong under a category filter with two sequential PUTs per swap (**closed in 17**: `FaqManager` is deleted and the reorder is D98's single `PATCH`); `LeadDetail` simulated timeline, `isMobile` unused (**closed in 01**) | master spec, confirmed 01 | 29 |
| ADD-22 | Property tabs: `DetailsTab` drag issues N state updates per drag-over; `SectionVisibilityTab` toggle asymmetric for `undefined`; `GalleryTab` seeds placeholder-image covers; `NearbyPlacesTab` default type `school` unknown to the public map; index keys everywhere; `SeoTagsTab` old-domain placeholder. **Prompt 18 settles the structural half for the new form**: every repeating row carries a stable id (`tmp-<n>` until the API assigns one), so no list is keyed by its index and a move is one `LIST_MOVE`; `fromRecord` fills all eighteen `sectionVisibility` keys, so a toggle is never reading `undefined`; `makeNearbyPlace` defaults to `other`; and nothing seeds an image. The tabs that render these fields are written in 19–21. **Closed in 21**: the new Section-visibility tab writes `true`/`false` explicitly for the key pressed and every key at once for "Enable all"/"Disable all", and the whole of `property-tabs/*` — `DetailsTab`, `GalleryTab`, `NearbyPlacesTab`, `SeoTagsTab` and the rest — is deleted. | master spec, confirmed 01 | 18–21 |
| ADD-27 | `seoScoring.js`/`seoGenerator.js`: HOM site name/URL constants, generic CTA-word scoring, schema string stored in the record | master spec, confirmed 01 | 36 |

### New defects found by this audit

| Id     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Found by     | Owner prompt                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------- |
| NEW-01 | `config/rbac.js` has no `/admin/settings/users` entry and no per-area permission matrix; `AdminSettings` uses `role === 'admin'` and `UserManagement` its own `ROLES` array                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 01           | 12                              |
| NEW-02 | `routes/index.js` limits `/admin/seo` and `/admin/settings` to `admin` only; §7 of the master context gives both to `admin` **and** `manager`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 01           | 12                              |
| NEW-03 | Navigation/role data lives in three places: `rbac.NAV_ITEMS`, `AdminLayout.pageTitles` and the `<Route>` declarations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 01           | 12                              |
| NEW-04 | `slick-carousel` is a dependency but its CSS is never imported, so the `SimilarProperties` slider renders unstyled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 01           | 03, 25                          |
| NEW-08 | `GalleryTab` carried the repository's only `eslint-disable` comment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 01           | **closed in 01**                |
| NEW-10 | `AdminSettings` renders `TabPanel index={4}` after `index={5}`, so the JSX order no longer matches the `<Tab>` order                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 01           | 40                              |
| NEW-11 | `AdminSettings.mergeWithDefaults` omits `footerLinks`, so every save drops that `db.json` key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 01           | 40                              |
| NEW-15 | `useThrottledScroll` has a single consumer (`BackToTop`); Header, MobileHeader, BottomNav and StickyNav each re-implement scroll handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 01           | 04                              |
| NEW-17 | `global.css` loads Google Fonts through a render-blocking CSS `@import` instead of a `<link>` in `index.html`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 01           | 02, 04                          |
| NEW-18 | `public/robots.txt` is the CRA default with no `Sitemap:`; `index.html` has no manifest, no OG tags, and a `theme-color` in the boilerplate navy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 01           | 02                              |
| NEW-20 | No test file exists anywhere (119 files checked, 0 matches), so `test:ci` needs `--passWithNoTests` until the first tests land                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 01           | partially closed in 01; 35      |
| NEW-22 | `AdminLeads` CSV export is built in the browser: no UTF-8 BOM, the Property column uses the broken id lookup, newlines inside `message` break rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 01           | 29                              |
| NEW-28 | `src/pages/public/RealEstateAwareness.js` uses `mdi:stamp`, which is not in the Iconify MDI set — the tile renders blank. Found while verifying every icon id of prompt 13.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 13           | 31                              |
| NEW-29 | `db.json` seeds `icon: "mdi:home-check-outline"`, which is not in the Iconify MDI set. `db.json` is off-limits to prompt 13 (§12 guardrails), so the seed keeps a blank icon until its owner prompt fixes it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 13           | 15                              |
| NEW-30 | `useCountUp` figures are still at their start value when a page is rendered by a browser that never delivers a second animation frame — headless Chrome with `--virtual-time-budget` grants exactly one. Every counted statistic (`DeveloperStats`, `BuilderOverview`, and the home figures of 27) therefore prerenders as `0`. The prerenderer must emulate `prefers-reduced-motion: reduce`, which makes `useCountUp` jump straight to the value; a real browser is unaffected.                                                                                                                                                                                                                                                                                                                                                                 | 16           | 41                              |
| NEW-33 | A Jest suite that drives a MUI dialog with `@testing-library/user-event@13` reports React's "An update to … was not wrapped in act(…)" for the transition timers jsdom never fires a `transitionend` for. It is not specific to the property page (the `IconPicker` suite reports 95 of them and the `Modal` suite 8), every affected test passes, and no test is flaky because of it. The fix is user-event v14's `userEvent.setup()`, a dependency bump §3.3 does not list; the QA prompt decides whether to ask for it.                                                                                                                                                                                                                                                                                                                        | 24           | 44                              |
| NEW-34 | `src/pages/admin/Dashboard.js` uses MUI v5 `Grid` props (`item`, `xs`, `sm`, `md`) that MUI v7 removed, so signing in to the admin prints four console warnings. Pre-existing — the file is untouched since 12 — and found while checking the console during prompt 25's QA. The fix is the Grid v2 API (`size={{ xs: 12, md: 6 }}`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | prompt 25 QA | 29                              |
| NEW-35 | For about half a second after a route change, every `position: fixed` element **inside** `<main>` is positioned against `MainLayout`'s framer-motion page-transition wrapper rather than the viewport, because that wrapper carries a `transform` while the spring settles (a transform on an ancestor makes it the containing block for fixed descendants). Measured at 390 px on `/properties/:slug`: the mobile CTA bar reads `top: 9041` in a 780 px viewport at 0 ms and `top: 715` (pinned to the bottom) from ~500 ms on. It self-corrects and affects only the property page's own CTA bar — the floating WhatsApp button sits outside `<main>` and is never affected. Pre-existing (the wrapper is prompt 04's, the bar prompt 23's); the fix is either rendering the bar in a portal or dropping the transform once the animation ends. | 28           | 41 (performance/animation pass) |

## Known issues (closed)

| Id                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Closed by                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-20             | Nav data hardcoded and duplicated between `Header` and `MobileHeader` (two copies of `navItems` and `sideMenuItems`). **Closed in 27:** `src/config/navigation.js` builds every menu from master data, the published CMS pages and `siteSettings`; the header, the mobile drawer, the bottom bar and the footer all read the same builders, and the two literals are gone.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ADD-15             | `HeroSection` owned a `role="combobox"` without `aria-controls`, offered "View all results" with no suggestions, and kept unused video/input refs. **Closed in 26/27:** the type-ahead is `GlobalSearch`; the hero is now the tabbed search card, the badges row and the stats row, and it holds no refs of its own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BUG-10             | `NotFound` sent `?search=`, `QuickActions` linked `?type=sale`, `?type=rent` and `?type=lease`, and the listing read neither; `type=lease` matched nothing at all. **Closed in 26:** `NotFound` navigates to `/properties?q=`, the six `QuickActions` tiles link to `/buy`, `/rent`, `/lease`, `/commercial`, `/plots` and `/buy/ready-to-move` (D92), and every parameter the listing reads is a §5.7 name. The `?area=` half closed in 14.                                                                                                                                                                                                                                                                                                                                                                         |
| BUG-16             | Filter logic duplicated between `PropertyListing` and `PropertyFilters`. **Closed in 26:** both files are deleted; one `ListingEngine` holds the filters, and the rail and the mobile sheet render the same `FilterGroups` against the same draft.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| BUG-19             | The listing fetched `perPage=100` and then filtered, sorted and paginated in the browser. **Closed in 26:** `GET /properties` does all four (D94); the browser only draws the facets it is sent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ADD-10             | `PropertyCard`: price unit printed twice, `liked` not persisted, `imageLoaded` never reset, timer leak, `TAG_OPTIONS` imported from `pages/admin`, autoplaying videos in grids. Closed in 11 except the shortlist, **closed in 23** (the heart writes through `ShortlistContext`) and **26** (the saved list has a page of its own at `/shortlist`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ADD-11             | `PropertyFilters`: `clearFilters` wiped every query parameter, `50000000-Infinity` travelled in URLs, the fourth location was silently ignored, only apartments and villas were offered, and desktop applied live while mobile needed an Apply. **Closed in 26:** the panel is deleted; ranges are `minPrice`/`maxPrice` numbers, every locality and property type is offered with a facet count, "Clear all" keeps the route's own filters, and the rail and the sheet differ only where the medium requires it.                                                                                                                                                                                                                                                                                                    |
| ADD-15             | `HeroSection`: `role="combobox"` without `aria-controls` (closed in 01), "View all results" shown with no suggestions, unused video/input refs; `QuickActions` linked `type=lease`. **Closed in 26:** the hero mounts `GlobalSearch`, whose footer row reads "Search for “…”" whether or not anything matched, and the tiles link to real routes (D92).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| NEW-05             | `?area=` was a hidden client-side substring filter with no chip and no way to remove it. **Closed in 26:** the parameter is gone with `PropertyListing`'s client-side filtering; localities are addressed by `?localityId=` and every active filter has a removable chip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| NEW-06             | `PropertyFilters.clearFilters()` replaced the query string with an empty one, dropping `q`, `sort` and `page`. **Closed in 26:** "Clear all" clears the filter groups and returns to page 1, keeps the sort, and cannot touch the route's fixed filters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| NEW-32             | The bottom navigation's "Saved" item and the shortlist toast's "View" link pointed at `/shortlist`, which had no route. **Closed in 26:** the page exists, reads the live records by id and shares through `?ids=`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| BUG-05             | `PropertyDetails` rendered sections with defaults and placeholders (`DEFAULT_BANKS`, `'—'` cards, `Feature`, `Document`, `Available`, "Map view available on live version"). Closed across 23–25: the bank list became `useBanks()` in 15, the ten content sections lost their defaults in 24, and 25 deleted the last two holders — `PropertyDocuments`' `Document`/`Available` row and `FinanceGuide`'s hardcoded rate card. Nothing on the page now prints a value the record does not carry.                                                                                                                                                                                                                                                                                                                     |
| BUG-07             | `SimilarProperties` ignored `similarPropertyIds` and refetched by listing type. Prompt 08 built `GET /properties/:id/similar` (editor's picks first, topped up to six by locality and type); prompt 25 made the page consume it — `PropertyDetails` fetches the row, `SimilarSection` prints it and `getVisibleSections` offers the navigation item only when the endpoint answered with something.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| BUG-08             | `brochureUrl`, `floorPlanPdfUrl` and `documents[].url` were never delivered after a lead. Closed in 24 (floor plans and their PDFs) and 25 (the brochure and the document rows): the file is opened with `window.open(url, '_blank', 'noopener,noreferrer')` from inside the lead form's success handler, a blocked pop-up falls back to a toast with the address, and the success panel always carries an "Open <file>" button. The unlock is remembered per property in `sna_lead`.                                                                                                                                                                                                                                                                                                                                |
| ADD-12             | `PropertyDetails`: 30 `useState`s, four copy-pasted modal state machines, `handleOpenLeadForm` dead so the enquiry modal was unreachable, `EnquiryForm` mounted three times, a `dimensionRange` chip that always rendered " - sqft", modals without dialog semantics and an `og:site_name` naming the boilerplate. Closed across 23–25: one `LeadModalTemp` (MUI dialog, focus trap, `role="dialog"`) replaced the four machines in 23, and 25 left exactly one `LeadForm` on the page — `EnquirySection` — with every other call to action opening that dialog.                                                                                                                                                                                                                                                     |
| ADD-13             | `FinanceGuide` (1 858 lines as found): the heading typo "Home Finance Clearity", a hardcoded "8.35 % / 48 Hrs / Up to 90 % / 0.5 % + GST" stats bar, "Pre-Approved" badges, a score that ignored six of the collected fields, a result shown whether or not the `POST` succeeded, `document.body.style.overflow` written by hand and an unused `resultRef`. Closed in 25: seven sub-components of at most 292 lines each under `sections/property/finance/`, every claim traced to a §6.6 record or to `financeCopy.js`, all arithmetic in `utils/finance.js`, and a result that only exists once `POST /leads` has accepted the answers.                                                                                                                                                                            |
| BUG-06             | `StickyNav` ignored the section toggles, the page duplicated its `visibleSections` logic, and the "Construction" item scrolled to `construction-specs` — an anchor no section carried. **Closed in 23:** `StickyNav` is deleted and `SectionNav` renders `getVisibleSections(property, context)` — the same `src/utils/propertySections.js` rule the admin's Section-visibility tab reads (prompt 21) — so the chips, the section wrappers and the toggles cannot disagree, and every anchor is `#section-<key>` generated from the same list.                                                                                                                                                                                                                                                                       |
| ADD-14             | `ConstructionStatus` divided by `milestones.length - 1`, so one milestone printed `Infinity%` and none printed `NaN%`; `BuilderOverview` returned `null` for a developer that carried only a description; `PropertySpecs` kept an unreachable legacy-object branch and a dead `specificationsArray` prop. **Closed in 24:** all three components are deleted. `ConstructionSection.progressPercent()` prefers the editor's own figure, otherwise divides completed milestones by **all** of them and hides the bar for an empty timeline — unit-tested at one milestone for 0 % and 100 %. `BuilderSection` renders on a name alone, reading the full record out of `MasterDataContext` because the property embeds only `{id, name, slug, logoUrl}`. `SpecificationsSection` reads the §6.1 array and nothing else. |
| NEW-09             | `SectionVisibilityTab` read `!== false` but wrote `!value`, so the first toggle of a key the record did not carry was a no-op on screen. **Closed in 21:** the tab is rewritten, the switch writes `true`/`false` explicitly, and a unit test presses a key an empty `sectionVisibility` never held.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NEW-31 (SlugField) | `SlugField` followed the title whenever it mounted with an empty `value`, and the property form mounts its tabs one render before the reducer's `LOAD` effect — so opening a listing and saving it rewrote a live URL from the title. **Closed in 21:** every write the field makes goes through one `write()` that records it, and a `value` the field did not write unlocks it instead of being overwritten.                                                                                                                                                                                                                                                                                                                                                                                                       |
| NEW-23             | `FaqManager` reorder wrote two sequential `PUT`s and computed `swapIndex` against the filtered array, so dragging inside a category filter moved the wrong records. **Closed in 17:** the screen is gone, and a move is one `PATCH { order }` on the record that travelled, carrying the position of the row it landed on; the API renumbers the collection `1..n` (D98). Verified against the seed: filtered to Legal, dragging the second question to the top reorders those two and leaves the other eighteen where they were.                                                                                                                                                                                                                                                                                    |
| NEW-31             | `LeadForm` sent every box it rendered, so an optional e-mail nobody filled in travelled as `""` and `POST /leads` answered 422 ("The email must be a valid email address"). Every CTA with an optional e-mail was affected, the locality one of prompt 14 included.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 16 — `LeadForm` trims what was typed and leaves the empty boxes out of the body, so an absent key takes the schema's own default (§6.7). Verified in the browser: the builder CTA files a lead with `email: null` where before it was refused, and the filled-in case is unchanged.                                                                           |
| ADD-07 (pollers)   | Two 30-second pollers on `GET /admin/leads` (`AdminLayout` and `AdminLeads`), each downloading the whole collection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 12 — One poller: `LeadNotificationsContext`, mounted inside `AdminLayout`, asks for `status=new&perPage=5&sort=createdAt&order=desc` every 30 s and pauses while `document.hidden`. `AdminLeads` refetches when `lastUpdatedAt` changes and has no interval of its own (D45/D55). Verified in the browser: one GET per 30 s, none while the tab is hidden.    |
| ADD-19 (login)     | `AdminLogin`: "Remember me" is a no-op and the seed passwords sit in a commented block.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 12 — The checkbox is gone (sessions always last the token TTL) and the page prints no credentials. The `AdminSettings` / `UserManagement` half of the row stays open as ADD-19 (settings/users).                                                                                                                                                              |
| ADD-19 (users)     | `UserManagement`: the last-admin guard read `isActive === undefined` as active, the component kept its own `ROLES` list and its own Snackbar, and the table paginated nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 13 — Replaced by `/admin/settings/users` on `MasterDataPage`. Every safety rule now comes from the API's 422 (§7) instead of a second, weaker copy in the browser; roles come from `enums.ROLES`; the toast is the one `ToastProvider` (D54); the list pages, sorts and filters on the server.                                                                |
| ADD-23             | `IconPicker`: invalid MDI ids, tiles not keyboard-operable, search ignoring the category.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 13 — Every id in the library was checked against the live Iconify MDI collection: three were gone and three were aliases; all six are replaced. Tiles are `<button aria-pressed>` in a roving tab order with arrow-key navigation, search narrows inside the active category, and the custom-id box validates against `^mdi:[a-z0-9-]+$` with a live preview. |
| ADD-28             | `AdminLayout`: the active parent group could not collapse, the mobile drawer rendered the brand twice, the toast navigated even when dismissed, `pageTitles` lacked `/admin/partners`, `.notificationDot` was dead CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 04 closed the first three. 12 closes the rest: the layout is `AdminSidebar` + `AdminTopbar` + `NotificationsMenu`, the title comes from `routes/adminRouteConfig.js` instead of a hand-kept map, and no dead CSS survives the split.                                                                                                                          |
| BUG-02             | List params (`is_active`, `featured`, `property_type`, `per_page`, `search`, `type`, `status`, `area`) match neither `db.json` camelCase nor JSON Server syntax.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 11 — Deleted with `api.js`: every list call now sends the §5.7 filter names built from the registry's `query` map.                                                                                                                                                                                                                                            |
| BUG-04             | camelCase/snake_case drift (`transformPropertyPayload`, `normalizePropertyResponse`, `seoService` mappers, nested shapes differ between form, db and sections).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 11 — `transformPropertyPayload`, `normalizePropertyResponse`, `normalizeListResponse` and the `seoService` mappers are gone with `api.js`; the contract is camelCase end to end (§5.1).                                                                                                                                                                       |
| BUG-14             | Token expiry never enforced; login writes both storages; logout incomplete; 401 redirect for public calls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 11 — Closed on the client: the three `sna_auth_*` keys are the only session store, the restore checks `expiresAt`, `logout()` awaits the API before clearing, and a 401 signs the session out only on an admin or auth call.                                                                                                                                  |
| ADD-08             | Two `GET /settings` calls per public page (Footer + NewsletterSection); Articles fires `/articles/trending` twice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 11 — `SiteSettingsContext` loads `GET /settings` and `GET /seo/settings` once per page load (D93); `/articles/trending` is fetched once per page. Verified in the browser network panel.                                                                                                                                                                      |
| NEW-07             | `Articles.js` fires `GET /articles/trending` twice (its effect depends on `articles`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 11 — `Articles.js` fetches trending through `useApi` with a stable dependency list, once.                                                                                                                                                                                                                                                                     |
| NEW-12             | `AdminAuthContext` restores a session without checking `tokenExpiry`, and `logout()` clears `user` before awaiting `authService.logout()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 11 — `AdminAuthContext` refuses an expired stored session and awaits `authService.logout()` before clearing.                                                                                                                                                                                                                                                  |
| NEW-13             | The 401 handler does a full `window.location.href` reload from any page, including public ones                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 11 — The 401 handler fires only for `/admin/*` and `/auth/*` (except login), is latched so concurrent 401s redirect once, and never touches a public page.                                                                                                                                                                                                    |
| NEW-14             | `authService.login` invents a 24-hour `tokenExpiry` client-side when the API omits one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 11 — The client stores the API's own `expiresAt` and invents nothing.                                                                                                                                                                                                                                                                                         |
| NEW-16             | `PropertyCard` imports `TAG_OPTIONS` from `pages/admin/property-tabs/constants`, so the public bundle depends on admin code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 11 — `PropertyCard` was rewritten against the contract shape and no longer imports from `pages/admin`.                                                                                                                                                                                                                                                        |
| NEW-24             | `Dashboard` falls back to fetching the entire `properties`, `leads` and `articles` collections and recomputing every KPI in the browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 11 — `Dashboard` reads `GET /admin/dashboard` only; `AdminLayout` and `AdminLeads` poll with `perPage=1` and read `meta.total`.                                                                                                                                                                                                                               |
| NEW-26             | `/properties` renders the `ErrorBoundary` fallback against the new data shape: `PropertyCard` calls `property.configuration.join()`, and `configuration` is an object in §6.1, not an array of `"3 BHK"` strings (`pageerror: _property$configurati.join is not a function`). Expected until prompt 11 rewrites the services and cards; the app recovers rather than white-screening.                                                                                                                                                                                                                                                                                                                                                                                                                                | 11 — `PropertyCard` reads `configuration.bedrooms`, `pricing`, `area` and `images` directly; `/properties` renders without a console error.                                                                                                                                                                                                                   |
| NEW-27             | The un-migrated frontend still calls four endpoints that no longer exist: `GET /settings` (6× on the home page — it is `/settings` in the registry but the old service sends no `Accept` scoping and the response shape differs), `/neighborhoods/active`, `/partners/active` and `/articles/trending`. All four answer 404 with the error envelope. Prompt 11 moves every call onto `src/services/endpoints.js`.                                                                                                                                                                                                                                                                                                                                                                                                    | 11 — Every call goes through `services/endpoints.js`; `scripts/check-endpoints.allow.json` is `[]` and `npm run lint` enforces it.                                                                                                                                                                                                                            |
| BUG-03             | 15 endpoints called by the frontend do not exist on a plain JSON Server                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 09 — every endpoint of §5.14 is served by a hand-written router; `npm run smoke` walks the whole registry (269/269). `/neighborhoods/active`, `/partners/active` and `/visits` are boilerplate paths the contract replaces, not endpoints to build (11).                                                                                                      |
| NEW-08             | `eslint-disable-line react-hooks/exhaustive-deps` in `GalleryTab.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 01 — effect restructured with a loop-safe equality guard                                                                                                                                                                                                                                                                                                      |
| ADD-15 (partial)   | `role="combobox"` without `aria-controls` in `HeroSection`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 01 — `aria-controls="hero-search-suggestions"` added                                                                                                                                                                                                                                                                                                          |
| ADD-21 (partial)   | `LeadDetail` computed `isMobile` and never used it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 01 — removed with its `useTheme`/`useMediaQuery` imports                                                                                                                                                                                                                                                                                                      |
| ADD-02 (partial)   | No ESLint/Prettier config beyond CRA, empty `devDependencies`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 01 — Prettier + `eslint-config-prettier` + project rule set + cross-platform scripts                                                                                                                                                                                                                                                                          |
| NEW-21             | No favicon, PWA icon or OG image; `logo.png` the only brand asset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 02 — 10 brand PNGs in `public/brand/`, favicons + `manifest.json`, HOM `logo.png` deleted                                                                                                                                                                                                                                                                     |
| BUG-17 (partial)   | README/`.env` described HOM + Cloudways; no favicon or manifest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 02 — README rewritten, `.env` removed from git, favicons and `manifest.json` added                                                                                                                                                                                                                                                                            |
| BUG-17             | "Sign In" (`/admin/login`) in the public drawer menus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 03 — both `sideMenuItems` entries removed; the route still works by URL (D24)                                                                                                                                                                                                                                                                                 |
| BUG-16 (dead code) | `adminService`, `visitService`, `PropertyDetail.js`, `AnimatedSection.jsx`, the unreachable enquiry modal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 03 — deleted, together with five dead CSS class blocks, two dead props and `stats.missing`                                                                                                                                                                                                                                                                    |
| NEW-25             | 16 public pages set a boilerplate brand title through React Helmet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 03 — every Helmet `<title>` and meta description now interpolates `SITE.name`                                                                                                                                                                                                                                                                                 |
| BUG-12             | ~1 500 colour and font literals outside the token files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 04 — 0 hex literals outside `global.css`/`theme.js`; `check:traces` gates it with an empty allow-list                                                                                                                                                                                                                                                         |
| ADD-05             | No header rendered between 900 px and 960 px; five competing breakpoint sets                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 04 — one 900 px switch in JS (`useBreakpoint`) and CSS (`899.98`/`900`); verified at 899–960 px                                                                                                                                                                                                                                                               |
| ADD-07 (toasts)    | Three toast systems (`ToastProvider`, AdminLayout and UserManagement Snackbars)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 04 — one `ToastProvider`/`useToast`; 13 local Snackbars removed, `grep -rn "Snackbar" src` is empty (the two pollers stay, owner 12/29)                                                                                                                                                                                                                       |
| ADD-24             | `PropertyCardSkeleton` showed two buttons the card has not; no `aria-busy`; `PageLoader` in the HOM serif                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 04 — skeleton mirrors the card's detail grid with `aria-busy`; `PageLoader` is the monogram + "Loading…" with `role="status"`                                                                                                                                                                                                                                 |
| ADD-25             | `ScrollToTop` threw on non-selector hashes and used `behavior: 'instant'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 04 — `getElementById` on the decoded fragment, `behavior` honours `prefers-reduced-motion`                                                                                                                                                                                                                                                                    |
| BUG-13             | Mixed id types (`"b998"`, `"8a37"`, string ids vs numeric `propertyId`), missing timestamps, plaintext HOM users                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 06 — `db.json` rewritten with integer ids and ISO `createdAt`/`updatedAt` on every record; the mock assigns `max(id)+1` and the timestamps (D14), `validate:seed` enforces both, and the three seeded accounts are the documented SNA placeholders (D80)                                                                                                      |
| NEW-19             | `db.json` `partners` and property `developer` values were real company names and URLs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 06 — `db.json` rewritten: the three seed developers, the three banks and the three partners are fictional placeholder records (§14), and every project name with them                                                                                                                                                                                         |

## Prompt reports

### Prompt 01 — Repository audit, tooling baseline and project state files (2026-09-15)

**Files added**

- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/CODEBASE_INVENTORY.md`
- `.editorconfig`, `.nvmrc` (`20`), `.prettierrc`, `.prettierignore`
- `scripts/check-traces.js` (+ `--report` mode)

**Files changed**

- `package.json` — `engines`, `devDependencies`, the 9 new scripts, the project `eslintConfig`, the `jest.transformIgnorePatterns` key; script order regrouped (name unchanged — prompt 02 renames it)
- `package-lock.json` — the four dev dependencies
- `.gitattributes` — `* text=auto eol=lf` + `*.png|*.jpg|*.ico|*.woff2 binary`
- `.gitignore` — `/mock-server/.runtime/`, `/backend_developer_guidelines/.tmp/`, `.env`, `.env.production`, `/e2e/test-results/`, `/playwright-report/`, `*.log`
- 22 files under `src/` — behaviour-preserving lint fixes only (44 insertions, 97 deletions):
  `AnimatedSection.jsx` (unused `as: Tag`), `ToastProvider.jsx` (unused map `index`),
  `HeroSection.jsx` (`aria-controls` + listbox `id`), `EnquiryForm.jsx` (unused import),
  `FinanceGuide.jsx` (`resultRef` + `useRef` import), `StickyNav.jsx` (`navItems` dependency),
  `AdminLeads.js`, `AdminProperties.js`, `LeadDetail.js`, `PropertyForm.jsx`,
  `ArticleDetail.js`, `Articles.js`, `FAQs.js`, `PropertyListing.jsx` (16 unused catch
  bindings → `catch {`), `Dashboard.js` (`console.error` → comment),
  `PropertyForm.jsx` (7 `console.log`), `BasicInfoTab.jsx` (unused prop),
  `SeoTagsTab.jsx` (unused import), `GalleryTab.jsx` (effect restructure, no `eslint-disable`),
  `PropertyDetails.jsx` (dead `handleOpenLeadForm`), `api.js` (dead `extractPaginationMeta`),
  `seoGenerator.js` (dead `capitalize`, unused destructured `specifications`/`state`),
  `validators.js` (two unnecessary regex escapes)

**Files removed** — none.

**Endpoints added / changed** — none.

**Env vars** — none. **npm scripts** — see the cumulative table above.

**Acceptance checklist**

- [x] `npm run lint` → 0 errors, 0 warnings across `src/**` and `scripts/**`
- [x] `npm run build:ci` succeeds (`Compiled successfully.`, no warnings)
- [x] `npm run test:ci` passes (no tests yet; `--passWithNoTests` added per §7 edge case 5)
- [x] `npm run check:traces:report` prints totals (2 212 in the product tree, plus 113 in the three new `docs/` files that quote them as evidence); `npm run check:traces` exits 1 — expected until prompt 03
- [x] `.editorconfig`, `.nvmrc` (`20`), `.prettierrc`, `.prettierignore`, `.gitattributes` (`* text=auto eol=lf`) exist; `package.json` has `engines`, the task-8 scripts, the task-7 `eslintConfig` and the `jest` key
- [x] `docs/CODEBASE_INVENTORY.md` covers every route, page, component, section, service function, util, constant, hook and `db.json` collection — including `FinanceGuide.jsx` (1 808 lines), `PropertyDetails.jsx` (30 `useState`, spec said 24), `PropertyDetail.js` (dead stub), `adminService` (dead duplicate), the `?search=`/`?q=` mismatch and the 900–960 px header gap
- [x] `docs/PROJECT_STATE.md` and `docs/DECISIONS.md` exist in the prescribed format; "Known issues (open)" holds BUG-01…BUG-21, ADD-01…ADD-28 and NEW-01…NEW-24 with owner prompts
- [x] App behaviour unchanged — the fixes only delete unreachable bindings, add one ARIA attribute and correct two hook dependency lists
- [x] One commit; `git status` clean afterwards

**Verification output**

```
npm run lint          → exit 0, no findings
npm run test:ci       → "No tests found, exiting with code 0"
npm run build:ci      → "Compiled successfully."
npm run check:traces  → exit 1 (2 212 product-tree findings — expected until prompt 03)
npm run check:traces:report → exit 0, totals printed
```

**Manual QA (Chromium, dev server on `http://localhost:3000`)**

| Check                               | Result                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` at 1280 px                      | Renders; `h1` = "Find Your Dream Home"; header present; no horizontal scroll                                                                                                                                                                               |
| `/` at 390 px                       | Renders; same `h1`; mobile header present; no horizontal scroll                                                                                                                                                                                            |
| `/admin/login` at 1280 px           | Renders the login card (3 inputs, 2 buttons, "Remember me", "Sign In")                                                                                                                                                                                     |
| `/properties` at 1280 px and 390 px | Renders its `h1` "Property Listings" and the empty/error state without crashing                                                                                                                                                                            |
| Console                             | Only the pre-existing failures against the unreachable boilerplate API (`ERR_CERT_AUTHORITY_INVALID` on the Cloudways host + the axios interceptor's own `Network error:`). No React, MUI, key or `act()` warnings; no error introduced by the lint fixes. |
| 930 px viewport                     | Confirms ADD-05 live: the `<header>` element is in the DOM but `display: none`, so no navigation renders between 900 px and 960 px.                                                                                                                        |

**Issues left → moved to "Known issues"** — every defect of `00_MASTER_CONTEXT.md` §11 that
this audit could confirm, plus NEW-01…NEW-24. Four items are closed above.

**Next prompt: 02 — Rebrand identity and environment.**

### Prompt 02 — Rebrand identity, environment files, brand assets and README (2026-09-15)

**Files added**

- `.env.example` (every variable with a comment), `.env.development`, `.env.production.example`
- `src/config/site.js` — `BRAND` (name, shortName, four Cloudinary URLs, three local paths)
  and `SITE` (name, url, defaultLocale, placeholderDomain); the only module that reads the
  brand environment variables
- `scripts/fetch-brand-assets.js` + `public/brand/` — the 10 PNGs of the master context §2.3
- `public/manifest.json` — three icons (192 `any`, 512 `any`, 512 `maskable`)

**Files changed**

- `package.json` — `name` `squares-n-acres-website`, `description`, `version` `0.2.0`,
  script `generate:brand-assets`
- `package-lock.json` — the same name/version (regenerated with `npm install --package-lock-only`)
- `public/index.html` — new `<head>`: `lang="en-IN"`, viewport with `viewport-fit=cover`,
  `theme-color`, `application-name`, description, title, three PNG favicons,
  `apple-touch-icon`, `manifest`, Google Fonts preconnect + Inter/Manrope stylesheet;
  the `favicon.ico` link (a 404) is gone
- `public/robots.txt` — development placeholder that disallows `/admin` and points at the
  production setup (the API serves `/robots.txt`, master context §5.13)
- `README.md` — rewritten (what it is, requirements, quick start, scripts, env vars, project
  structure, brand assets, deployment placeholder, license); no HOM, Cloudways or
  `API_DOCUMENTATION.md` reference remains
- `src/services/api.js` — `BASE_URL` is `process.env.REACT_APP_API_URL` with no fallback and
  throws at module load when unset (D48); nothing else in the file changed
- `src/components/layout/Header.jsx`, `MobileHeader.jsx`, `Footer.jsx` — the `logo.png` import
  is replaced by `import { BRAND } from '../../config/site'`; the five `<img>` tags (header 2,
  mobile header 2, footer 1) render `BRAND.logoUrl` with `alt={BRAND.name}` and explicit
  `width`/`height` in the wordmark's 2.34:1 ratio (112×48 at 48 px, 94×40 at 40 px)
- `src/components/layout/Footer.module.css` — `.brandLogo` loses `filter: brightness(0) invert(1)`
  and gains `object-fit: contain` plus the temporary white container
- `docs/CODEBASE_INVENTORY.md` — one line: the quoted Cloudways fallback URL is described
  instead of reproduced, so the host exists nowhere in the repository
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`

**Files removed**

- `.env` (untracked with `git rm --cached` **and** deleted; `.env.development` covers `npm start`)
- `src/assets/images/logo.png` (the HOM wordmark; `src/assets/images/` is now empty and gone)

**Endpoints added / changed** — none.

**Env vars** — see the cumulative table above (11 variables documented in `.env.example`).
**npm scripts** — `generate:brand-assets` added.

**Brand assets** — all 10 downloads succeeded, so `index.html` and `manifest.json` reference
the local files only; the Cloudinary fallback of task 6 was not needed.

```
File                   Bytes   Pixels     Status
favicon-16.png         488     16x16      OK
favicon-32.png         1018    32x32      OK
favicon-48.png         1510    48x48      OK
apple-touch-icon.png   12685   180x180    OK
icon-192.png           14846   192x192    OK
icon-512.png           140496  512x512    OK
icon-512-maskable.png  140496  512x512    OK
og-default.png         145120  1200x630   OK
logo.png               59342   540x231    OK
icon.png               850244  1254x1254  OK
```

`og-default.png` is 1200×630 and the wordmark is 540×231 (2.338:1), both read from the PNG
IHDR header by the script.

**Trace counters after this prompt** (`npm run check:traces:report`, 186 files scanned)

| Scope                                    | Traces | Hex literals | Total     |
| ---------------------------------------- | ------ | ------------ | --------- |
| Product tree (everything except `docs/`) | 696    | 1 498        | **2 194** |
| `docs/` (evidence quotes)                | 100    | 20           | 120       |
| Reported by the script                   | 796    | 1 518        | 2 314     |

Prompt 01 measured 717 / 1 495 / 2 212 in the product tree. The 21 brand traces removed are
the README, `.env` and `index.html` rewrites; the 3 added hex literals are `theme-color` in
`index.html` and `theme_color`/`background_color` in `manifest.json` (see "Pending rewrites").
The Cloudways host is at **0** in the product tree (it was 4). `npm run check:traces` (strict)
still exits 1 — expected until prompt 03.

**Acceptance checklist**

- [x] `package.json` name `squares-n-acres-website`, version `0.2.0`, script `generate:brand-assets`
- [x] `.env` untracked and deleted; `.env.example`, `.env.development`, `.env.production.example`
      exist with the documented variables; `.gitignore` ignores `.env` and `.env.production`
- [x] `grep -ri <the Cloudways host> .` (excluding `node_modules`, `.git`, `prompts`) → the only
      match left is the regex that defines the pattern in `scripts/check-traces.js`, which
      excludes itself from its own scan; the host and the URL appear nowhere else
- [x] `public/brand/` contains the 10 PNGs; `public/index.html` has the new
      title/meta/theme-color/fonts/favicons/manifest; `public/manifest.json` is valid JSON
      with three icons (verified with `JSON.parse` and by fetching each icon: 200 `image/png`)
- [x] `src/config/site.js` exports `BRAND` and `SITE` exactly as specified
- [x] Header, mobile header and footer render the SNA wordmark from `BRAND.logoUrl` with
      `alt="Squares N Acres"`; `src/assets/images/logo.png` is gone; no CSS `filter` on the logo
      (computed style `filter: none` in all three)
- [x] `README.md` has no HOM/Cloudways reference and documents the current scripts and env vars
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` pass
- [x] One commit; clean tree

**Verification output**

```
npm run generate:brand-assets → exit 0, 10/10 assets written
npm run lint                  → exit 0, no findings
npm run test:ci               → "No tests found, exiting with code 0"
npm run build:ci              → "Compiled successfully." (no .env.production present)
npm run check:traces:report   → exit 0, totals above
npm run check:traces          → exit 1 (2 194 product-tree findings — expected until prompt 03)
```

Edge case of §7 confirmed: `npm run build:ci` succeeds **without** `.env.production`. CRA does
not fail on a missing variable — it inlines `undefined`, and `api.js` throws only when the
bundle loads in a browser. The throw was left in place (not weakened) and the built bundle
contains the message `REACT_APP_API_URL is not set`.

**Manual QA** (Chromium 1280×900 and 390×844 against `npm start`, mock API not yet running)

| Check                          | Result                                                                                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static `<head>`                | `lang="en-IN"`, `theme-color` matching `--color-primary`, title "Squares N Acres – Buy, Sell & Rent Properties in Bangalore", `/brand/favicon-32.png` requested and served 200 `image/png`                                                          |
| Tab title at runtime           | **Still the HOM title** on `/` — `Home.jsx` sets it through React Helmet, which overrides the document title (NEW-25, owner prompt 03). The static title is correct.                                                                                |
| Header logo (1280 px)          | `BRAND.logoUrl`, natural 540×231, rendered 112×48 (ratio 2.338 — no stretching), `alt="Squares N Acres"`, `filter: none`                                                                                                                            |
| Footer logo                    | Rendered inside a 91×48 white box (`background rgb(255,255,255)`, `padding 8px`, `radius 8px`), content ratio 2.337, `filter: none`; the footer surface is still navy (prompt 04)                                                                   |
| Google Fonts                   | The `css2?family=Inter…&family=Manrope…` stylesheet is requested and returns 200 with Inter and Manrope `@font-face` rules (39 total). The boilerplate's three display/body faces are still `@import`ed by `global.css` too — removed by prompt 03. |
| Manifest                       | `name`/`short_name` "Squares N Acres", `theme_color` matching `--color-primary`, `background_color` white, `display standalone`; all three icons fetch 200 `image/png`                                                                              |
| 390 px viewport                | Mobile header shows the wordmark at 94×40, `scrollWidth == clientWidth == 390` (no overflow)                                                                                                                                                        |
| Console                        | No new errors. The only failures are the API calls to `http://localhost:4000/api/*` (`ERR_CONNECTION_REFUSED` — the mock server arrives in prompt 06); no React/MUI/key warnings, no 404 on any local asset.                                        |
| `git status` after `npm start` | Only the intended files; no generated file outside `public/brand/` (`build/` and `node_modules/` are git-ignored)                                                                                                                                   |

**Issues left → moved to "Known issues"** — NEW-25 (Helmet titles still HOM). NEW-21 and the
favicon/manifest/README/env half of BUG-17 are closed.

**Next prompt: 03 — Purge HOM traces and dead code.**

### Prompt 03 — Purge HOM traces and dead code; strict trace check (2026-09-15)

**Files added** — `scripts/check-traces.allow.json`, `docs/QA/03-traces-before.txt`,
`docs/QA/03-traces-after.txt`.

**Files removed** — `src/pages/public/PropertyDetail.js` (unrouted stub: `routes/index.js`
binds the name `PropertyDetail` to a lazy import of `PropertyDetails.jsx`, so the file was
never reachable), `src/components/common/AnimatedSection.jsx` (re-verified zero importers).

**Files renamed** — `docs/CODEBASE_INVENTORY.md` → `docs/archive/CODEBASE_INVENTORY.md`.

**Files changed** — 136, of which 118 are whole-tree Prettier formatting only (the
formatting deferred by prompt 01). The behavioural changes are:

| Area                    | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand strings           | 16 public pages' Helmet `<title>`s and meta descriptions, the 9 `PropertyListing` `seoTitle`s, `PropertyDetails` `og:site_name`, the `AdminLayout` brand block (×2), `AdminLogin`, `WhyChoose`, `SkeletonLoaders.PageLoader`, `Footer` defaults, `Contact`, `Careers`, `Partnership`, `SellLet`, `About`, `RealEstateAwareness` now read `BRAND.name` / `SITE.name` from `src/config/site.js`                                                                                                                                                                                                                                                                                                                                                                    |
| Copy                    | Footer defaults → `BRAND.name` / `''` / neutral description and tagline (the subtitle element is skipped when empty); the `About` timeline entry and three testimonials no longer name any brand; `team[].image` (never read) dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E-mail / domain / phone | `info@squaresnacres.com` in `Contact`, `FAQs` and the seed; `SITE.placeholderDomain` in the `AdminSeo` / `ArticleForm` SERP previews (via a `PREVIEW_HOST` constant) and the two canonical-URL placeholders; `+91 98XXX XXXXX` replaces the US-format number in `FAQs`, `AdminSettings` and the seed                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Authorship              | `ArticleForm` default author → `'Editorial Team'` (both call sites); `seoGenerator.js` `SITE_NAME`/`SITE_URL` now read `SITE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fonts                   | The Google Fonts `@import` removed from `global.css` (loaded by `index.html` since prompt 02); all 31 inline `fontFamily`/`font-family` literals replaced by `var(--font-body)` / `var(--font-heading)` / the new `var(--font-serp)` / `var(--font-mono)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Classes / keys          | The SweetAlert2 override block deleted from `global.css` and the `customClass` object from `PropertyDetails` (SweetAlert2 falls back to its default theme); `sna_lead` (sessionStorage) and `sna_property_draft` (localStorage)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Public admin link       | The `Sign In` → `/admin/login` entry removed from `sideMenuItems` in `Header.jsx` and `MobileHeader.jsx` (D24)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Dead code               | `adminService` and `visitService` deleted from `api.js`; the unreachable enquiry modal and its `showLeadForm` state deleted from `PropertyDetails`; `specificationsArray` prop dropped from `PropertySpecs` and its two call sites (the normaliser never emits the field; the legacy-object branch is kept); `index` prop dropped from `PropertyFaq.FaqItem`; `stats.missing` dropped from `AdminSeo`; the commented demo-credential block dropped from `AdminLogin`; five dead CSS class blocks removed (`.notificationDot`, `.qualities*`, `.breakdownBar*`, `.skeletonGrid`/`.skeletonCard`)                                                                                                                                                                  |
| `db.json`               | String replacements only, no shape changes: all 178 placeholder-image, old-Cloudinary and colour-named image URLs → `picsum.photos` seeds (galleries 800×600, floor plans 600×400, articles 1200×600, localities 400×300, partner logos 200×80, footer collage 400×300 replacing the Unsplash URLs); both legacy video-host `.mp4` entries removed (`heroText.backgroundMedia` → `''`, the `b998` gallery entry dropped); canonical and JSON-LD URLs → `https://www.squaresnacres.com/…`; FAQ answers, article `seoTitle`s and `author` rebranded; `siteSettings` name/subtitle/description/tagline/e-mail/phone/social handles → SNA placeholders; `adminUsers` → `admin@squaresnacres.com / Admin@123`, `manager@… / Manager@123`, `sales@… / Sales@123` (D80) |
| `check-traces`          | Allow-list support (`files`, `lines` with SHA-256 content verification, `colourLiterals`), `docs/QA/**` skip-listed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**Endpoints added / changed** — none.

**Env vars, npm scripts** — none added or changed. Dependency removed:
`@mui/icons-material` (0 imports; `npm uninstall` also dropped it from `package-lock.json`).
It stays named in the `no-restricted-imports` ESLint rule, which is what keeps it out.

**Trace counters**

|                                                            | Before                                          | After                                                    |
| ---------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Brand/legacy trace findings (non-colour)                   | 467 in the product tree, 817 including the docs | **0**                                                    |
| Colour findings (hex literals + boilerplate palette hexes) | 1 847                                           | 1 809 — deferred to prompt 04, reported but not blocking |
| `npm run check:traces`                                     | exit 1                                          | **exit 0**                                               |

`docs/QA/03-traces-before.txt` holds the prompt-01 scanner report plus every one of the 817
brand/legacy findings; `docs/QA/03-traces-after.txt` holds the report after this prompt.

**Acceptance checklist**

- [x] `npm run check:traces` exits 0 (strict) with the documented allow-list; `docs/QA/03-traces-before.txt` exists
- [x] The §8 trace grep (the eleven case-insensitive brand/host/placeholder patterns) over `src public db.json README.md package.json` → 0 matches
- [x] `grep -rn "fontFamily\|font-family" src | grep -v "var(--font" | grep -v global.css | grep -v theme.js` → 0
- [x] "Sign In" is not present in any public component; `/admin/login` still works by URL (the route and `ProtectedRoute` redirect are untouched)
- [x] `src/pages/public/PropertyDetail.js`, `adminService`, `visitService`, `extractPaginationMeta`, `handleOpenLeadForm` no longer exist; `@mui/icons-material` is not a dependency
- [x] `npm run lint` (0/0), `npm run test:ci`, `npm run build:ci` (`Compiled successfully.`, 0 warnings), `npm run format:check` pass
- [x] Storage keys `sna_lead` and `sna_property_draft` are used; the old underscore-prefixed keys have no occurrence left in `src/`
- [x] One commit, clean tree

**Verified behaviours**

- `db.json` still parses (`node -e "JSON.parse(...)"`) and the round-trip is byte-identical apart from the intended edits — no record shape changed.
- The allow-list content check works: inserting a line into `global.css` makes `check:traces` exit 1 and print `allow-listed line no longer matches its recorded content` for each shifted line; restoring the file returns it to exit 0.
- The §8 grep for the placeholder-image host, its colour name, the old Cloudinary cloud and the video host over `src public db.json` → nothing.

**Issues left → moved to "Known issues"** — BUG-12 stays open for the ~1 500 colour
literals (owner 04). BUG-16 keeps a residual row for the duplicated listing/filter logic
(owner 26). BUG-17, NEW-25 and the dead-code half of BUG-16 are closed.

**Not done in this prompt, deliberately**

- Manual QA in a browser was not run: this session has no display and the mock API does not exist until prompt 06, so `npm start` can only be checked for compile errors, which `npm run build:ci` already does more strictly. The §9 manual script is carried into prompt 04, which touches the same surfaces.
- The `:<id|new>` suffix on the property draft key (`00_MASTER_CONTEXT.md` §4.2) is a behaviour change and belongs to prompts 18–21.

**Next prompt: 04 — Design system, theme and UI kit.**

### Prompt 04 — Design system: tokens, MUI theme, UI kit and layout restyle (2026-09-15)

**Files added** — 33 UI-kit components with 28 CSS modules and `tones.js`/`index.js` under
`src/components/ui/`, six tests in `src/components/ui/__tests__/`, `src/test-utils.jsx`,
`src/setupTests.js`, `src/theme.test.js`, `src/utils/format.js` + `format.test.js`,
`src/utils/storage.js`, `src/utils/motion.js`, `src/hooks/{useInView,useCountUp,useScrollDirection,useBreakpoint,useCssVar}.js`,
`src/components/common/ErrorBoundary.jsx` + module, `src/components/common/BackToTop.module.css`,
`src/components/common/ToastProvider.module.css`, `src/components/layout/MainLayout.module.css`,
`scripts/contrast-check.js`.

**Files changed** — 175. The design system replaced every colour, font, spacing, radius,
shadow, z-index and breakpoint literal in `src/`.

| Area                  | Change                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens (`global.css`) | `:root` rewritten to §2.4 plus eleven documented extras (two social, three SERP, eight translucent). `body` is Inter on white, `html, body { overflow-x: clip }`, `:focus-visible` is the 2 px `--color-focus` ring, selection is the red tint, and `@media (min-width: 900px)` widens `--container-padding` to 24 px and `--header-height` to 72 px. The slick and SweetAlert overrides are gone.                                        |
| Theme (`theme.js`)    | `createTheme` from the same values, with `palette.surface` as a custom slot, Manrope h1–h6 on the §2.5 scale, `shadows[1..3]` = the three soft tokens (4+ reuse `--shadow-lg`, so nothing can reach for a heavier one), and component overrides that read `theme.palette` instead of repeating literals. `src/theme.test.js` (25 cases) asserts the two files agree.                                                                      |
| CSS modules           | 52 files: the old variable names mapped to the new ones, ~330 raw `#hex`/`rgba()` values replaced, box shadows collapsed onto `--shadow-*`, the four `data:` URI `<select>` chevrons redrawn as token-coloured gradients, and every media query moved onto `599.98/600` and `899.98/900`.                                                                                                                                                 |
| JS/JSX                | ~1 200 literals across 45 files replaced with `var(--token)`, property-aware (a `color:` gets the `-dark` variant, a `background`/`border` gets the base). Data records now carry a `tone`; `toneStyles()` resolves it.                                                                                                                                                                                                                   |
| Libraries             | `react-slick` + `slick-carousel` → `ui/Carousel` (`SimilarProperties`); `react-countup` → `useCountUp` (`BuilderOverview`); `sweetalert2` → `ConfirmDialog variant="alert"` (`PropertyDetails`, all five messages verbatim); `react-intersection-observer` → `hooks/useInView` (34 files). `date-fns@4.4.0` added for `formatRelative`.                                                                                                   |
| Layout                | Header and MobileHeader on one 900 px switch, sticky with `--shadow-sm` on scroll and never hidden (D52); BottomNav on `--bottom-nav-height` + `--safe-bottom`, hiding on scroll-down; Footer on `--color-surface` with the logo bare; MainLayout paddings from tokens; AdminLayout charcoal sidebar with the monogram in a white box, red active item, white topbar, `sna_admin_sidebar_collapsed` persisted through `utils/storage.js`. |
| Toasts                | One `ToastProvider` (max 3 visible, `aria-live="polite"`, bottom-right on desktop / under the header on mobile, `--z-toast`). Thirteen local `Snackbar`s removed across `AdminLayout`, `UserManagement` and eleven admin pages.                                                                                                                                                                                                           |
| Sections              | The 13 duplicated page-level `Section` components deleted in favour of `ui/Section`.                                                                                                                                                                                                                                                                                                                                                      |

**Size counters after this prompt**

| Counter                                                         | Value                                        |
| --------------------------------------------------------------- | -------------------------------------------- |
| Hex literals in `src/**/*.{js,jsx,css}` outside the token files | **0** (was ~1 500)                           |
| `var(--token)` references in `src/`                             | 5 363                                        |
| Files under `src/`                                              | 257 (was 171)                                |
| UI-kit components                                               | 33 `.jsx` + 28 CSS modules                   |
| Jest tests                                                      | 71 in 8 suites (was 0)                       |
| `main.js` after gzip                                            | 216.4 kB (+45 B — five packages out, kit in) |

**Verification**

- [x] `npm run check:contrast` — 29 gated pairs, all pass (3 informational)
- [x] `npm run check:traces` — 0 findings with `{ "files": [], "lines": {} }`
- [x] `npm run lint` — 0 errors, 0 warnings; `npm run format:check` clean
- [x] `npm run test:ci` — 8 suites, 71 tests
- [x] `npm run build:ci` — `Compiled successfully.`, 0 warnings
- [x] `grep -rnoE "#[0-9A-Fa-f]{3,8}\b" src --include=*.js --include=*.jsx --include=*.css | grep -v "global.css\|theme.js\|%23"` → 0
- [x] `grep -rn "Snackbar" src` → nothing; `grep -rn "swal" src` → nothing
- [x] Old variable names (`--color-bg-surface`, `--color-secondary*`, `--spacing-*`, `--font-number`, `--color-text-primary`, `--color-bg-default`, `--color-bg-paper`, `--color-text-light`, `--shadow-xl`, `--z-fixed`, `--z-modal-backdrop`) → 0 occurrences
- [x] `package.json` lists `date-fns 4.4.0` and none of the five removed packages

**Browser QA** — run against `npm start` in a headless Chromium (`/opt/pw-browsers`) over the
DevTools protocol, because this session has no display and no browser-driver dependency is
allowed. Evidence:

| Check                                 | Result                                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts on `/`                          | `h1` computes `Manrope, "Segoe UI", …`; `main p` computes `Inter, "Segoe UI", …`                                                                                                        |
| Header at 899 / 900 / 930 / 959 / 960 | Exactly **one** visible `header` at every width — 65 px below 900, 73 px at and above. The 900–960 gap (ADD-05) is closed.                                                              |
| Horizontal scroll                     | `scrollWidth === innerWidth` at 390, 899, 900, 930, 959, 960 and 1280 px on `/`, `/properties` and `/admin/login`                                                                       |
| Footer                                | `rgb(247, 247, 248)` (`--color-surface`) with `rgb(31, 31, 31)` text; the wordmark's wrapper computes `rgba(0, 0, 0, 0)` — no container                                                 |
| Header elevation                      | No shadow at `scrollY 0`; `--shadow-sm` after scrolling, and the header never translates away                                                                                           |
| Bottom nav at 390 px                  | `transform: none` at the top → `translateY(65px)` after scrolling to 900 → `none` again after scrolling up                                                                              |
| Reduced motion                        | With `prefers-reduced-motion: reduce` emulated, all 7 sections of `/about` compute `opacity: 1` — no fade-up holds content back                                                         |
| Console                               | Clean on `/`, `/properties`, `/admin/login` and `/` at 390 px apart from `ERR_CONNECTION_REFUSED` on `localhost:4000` — the mock API does not exist until prompt 06. No React warnings. |

**Issues left → moved to "Known issues"** — BUG-20 keeps a row for the nav **data**
(owner 27); ADD-06 keeps a row for the `formatPrice`/`formatDate` call sites, `GooglePreview`,
`getTitleLenColor` and the Dashboard `leadStatusConfig` copy; ADD-07 keeps its poller half
(owner 12/29); ADD-28 keeps the toast-click and dead-CSS half (owner 12). BUG-12, ADD-05,
ADD-24 and ADD-25 are closed.

**Not done in this prompt, deliberately**

- The five `formatPrice` and three `formatDate` copies still sit at their call sites.
  `src/utils/format.js` is the single implementation with 18 tests, but swapping the call
  sites means touching data shapes (`priceUnit` vs `price_unit`, `listingType`), which is
  §12's "do not touch data fetching". Prompt 11 moves them when the services land.
- Admin routes beyond `/admin/login` were not exercised in the browser: they need a session
  from an API that does not exist until prompt 06.
- The `srcSet` widths of `LazyImage` are accepted as props but nothing generates them yet;
  the Cloudinary helper arrives in prompt 39.

**Next prompt: 05 — API contract, enums and data-model docs.**

---

### Prompt 05 — API contract, canonical enums, endpoint registry and schema descriptors (2026-09-15)

The contract is now frozen in code and in documentation. Nothing is wired: no component,
service or `db.json` record changed, and no endpoint is served yet. Everything added here
is a pure module or a document that prompts 06–11 consume.

**Files added**

| File                             | What it holds                                                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/API_CONTRACT.md`           | §5.1–§5.13 verbatim (with the full 422 example), the 235-endpoint catalogue rendered from the registry, and every response shape                      |
| `docs/DATA_MODEL.md`             | §6.1–§6.14 verbatim, the HOM → SNA mapping table (§6.15), the singleton note and the reserved seed id ranges                                          |
| `docs/RBAC.md`                   | §7 verbatim, the matrix and route map as `rbac.js` encodes them, the navigation per role, and the four enforcement layers                             |
| `src/config/enums.js`            | `makeEnum()` + 46 enums, `LEGACY_LEAD_SOURCE_MAP`, `PRICE_BUCKETS_SALE/RENT`, `SECTION_VISIBILITY_KEYS`, `BLOCK_TYPES`                                |
| `src/config/enums.test.js`       | 241 assertions: unique values, labels, tones, icons, `bandOf`, `toSqft`, `verbOf`, the legacy map, the price buckets                                  |
| `src/services/endpoints.js`      | the registry: 235 entries in 52 groups, `allEndpoints()`, `findEndpoint()`                                                                            |
| `src/services/endpoints.test.js` | 251 assertions incl. the hardcoded §5.14 path list in both directions                                                                                 |
| `src/services/schemas/*.js`      | 74 request-body descriptors (`index`, `property`, `lead`, `article`, `page`, `masterData`, `settings`, `auth`, `seo`, `newsletter`, `jobApplication`) |
| `mock-server/schemas/models.js`  | 28 collection descriptors, every field of §6 with defaults                                                                                            |
| `mock-server/schemas/README.md`  | the field mini-language and how each descriptor renders as a Laravel rule                                                                             |
| `scripts/check-endpoints.js`     | three rules, now part of `npm run lint`                                                                                                               |

**Files changed**

- `src/config/rbac.js` — rewritten to the §7 matrix. Same exports and signatures
  (`ROLES`, `ROUTE_PERMISSIONS`, `NAV_ITEMS`, `hasRouteAccess`, `getNavItemsForRole`,
  `getDefaultRoute`), plus `PERMISSIONS` and `can(role, area, action)`. `NAV_ITEMS` is the
  final 12-group navigation. Its three consumers (`AdminLayout`, `AdminAuthContext`,
  `routes/index.js`) compile unchanged.
- `package.json` — `lint` gained `&& node scripts/check-endpoints.js`; `check:endpoints`
  added as its own script.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Endpoints added / changed**

235 declared, 0 served. See "Current npm scripts / env vars / endpoints added" above.

**Env vars** — none added or changed.

**npm scripts** — `lint` extended, `check:endpoints` added.

**Acceptance checklist**

- [x] `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` (with the mapping table) and
      `docs/RBAC.md` exist and contain every endpoint and every field of the master context.
- [x] `src/config/enums.js` exports every enum of §6.17; `enums.test.js` passes
      (241 assertions).
- [x] `src/services/endpoints.js` holds 235 entries covering every path of §5.14;
      `endpoints.test.js` passes (251 assertions). Verified that removing
      `articles.trending` fails the suite with `✕ serves GET /articles/trending`, and that
      restoring it turns the suite green again.
- [x] `src/services/schemas/*` and `mock-server/schemas/models.js` load in Node
      (`node -e "require('./mock-server/schemas/models')"`) and under Jest (checked with a
      throwaway spec in `src/`, since CRA's Jest `roots` is `src/`); each model lists every
      field of §6 with its default.
- [x] `src/config/rbac.js` exports `PERMISSIONS` and `can()`; the old exports still work;
      the sidebar shows the final navigation per role.
- [x] `npm run lint` (incl. `check:endpoints` with the temporary allow-list) — 0 errors,
      0 warnings, 0 blocking findings.
- [x] `npm run test:ci` — 10 suites, 573 tests, all green.
- [x] `npm run build:ci` — `Compiled successfully.`, 0 warnings.
- [x] `npm run check:traces` — 293 files scanned, 0 findings.
- [x] One commit, clean tree.

**Verification output**

```
node -e "…enums…"                  → 29 good 43560
node -e "…allEndpoints().length"   → 235
node -e "…getNavItemsForRole('sales').map(i=>i.label)"
                                   → [ 'Dashboard', 'Properties', 'Leads', 'Profile' ]
npm run lint                       → blocking findings: 0
npm run test:ci                    → Tests: 573 passed, 573 total
npm run build:ci                   → Compiled successfully.
npm run check:traces               → total findings: 0
```

The edge cases of the prompt were checked one by one: `require('./src/config/enums')` works
from Node **and** `import { LEAD_SOURCES } from '../config/enums'` compiles under CRA and
Jest; `getNavItemsForRole('sales')` returns the four expected groups with "Add property"
filtered out of Properties; `can('sales','leads','delete')` is `false`,
`can('manager','settings','edit')` is `false` and `can('manager','settings','view')` is
`true`.

**Manual QA**

The admin panel cannot be signed into until the mock exists (prompt 06), so the navigation
was verified through `getNavItemsForRole` in Node for all three roles instead of in the
browser: admin sees 12 groups (Users under Settings), manager sees 12 with Users removed,
sales sees 4. The public site was not touched — no component, page, stylesheet, `theme.js`,
`global.css` or `db.json` change is part of this commit — so `/` and `/properties` at 390 px
are byte-for-byte the pages prompt 04 left behind.

**Issues left**

- `scripts/check-endpoints.allow.json` still exempts `src/services/api.js` and
  `src/services/seoService.js` (53 findings between them) → "Pending rewrites", prompt 11.
- BUG-02, BUG-04 and BUG-09 are marked "contract defined"; their code migration stays open
  and is owned by 08–11 and 28.
- `ROUTE_PERMISSIONS` no longer carries `/admin/neighborhoods`: §7's final route map
  replaces it with `/admin/master-data/localities`. The boilerplate route still renders
  (it is guarded by the hardcoded `RoleRoute` in `src/routes/index.js`, which prompt 12
  rewrites onto `ROUTE_PERMISSIONS`); nothing calls `hasRouteAccess` for that path today.
- The sidebar lists routes that do not exist yet (master data, content, media, SEO
  sub-pages, profile, users). They render the admin 404 inside the layout until their own
  prompt lands — accepted by §6 of the prompt.

**Not done in this prompt, deliberately**

- `src/config/adminConstants.js`, `src/pages/admin/property-tabs/constants.js`,
  `PropertyFilters.jsx`, `NearbyPlaces.jsx` and `ConstructionSpecs.jsx` keep their local
  constant copies. They are still the live source for components this prompt may not
  touch; each is deleted by the prompt that rewrites its consumer (13–29).
- No service calls the registry yet and `http.request()` does not exist: prompt 11 builds
  the client and deletes the transformation layer.

**Next prompt: 06 — Mock server core.**

### Prompt 06 — Mock server core, runtime db, envelope and starter seed (2026-09-15)

**Files added**

| Path                                       | What it is                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `mock-server/server.js`                    | `npm run mock` — prepares the runtime db, listens on `MOCK_PORT`, fails with a readable message        |
| `mock-server/app.js`                       | `createApp({ router, config, db })` — the whole request pipeline, exported for tests and the smoke run |
| `mock-server/db.js`                        | `ensureRuntimeDb()`, `createRouter()`, `getCollection/getSingleton/write/removeRecord`                 |
| `mock-server/reset.js`                     | `npm run mock:reset` — "Runtime db restored from db.json"                                              |
| `mock-server/config.js`                    | The four `MOCK_*` variables, the seed/runtime paths and the CORS origins                               |
| `mock-server/routes/index.js`              | The (still empty) list of custom routers prompts 07–09 fill                                            |
| `mock-server/middleware/envelope.js`       | `res.ok/created/message` and `renderEnvelope` (JSON Server's `router.render`)                          |
| `mock-server/middleware/errors.js`         | `ApiError` + `notFound/forbidden/unauthorized/conflict/validation/tooManyRequests` + the handler       |
| `mock-server/middleware/timestamps.js`     | Ids, timestamps, read-only stripping, `PUT` defaults, `PATCH` deep merge                               |
| `mock-server/middleware/validate.js`       | `validateBody()` and `validateWrite()` — 422 in Laravel's shape with dotted keys                       |
| `mock-server/middleware/queryTranslate.js` | `page/perPage/sort/order/q` → `_page/_limit/_sort/_order/q`, CSV → repeated, unknown dropped           |
| `mock-server/middleware/publicScope.js`    | `/admin` prefix stripping, public scoping, `publicRead: false` collections                             |
| `mock-server/middleware/requestLog.js`     | One line per request: `GET /api/properties → 200 (4ms)`                                                |
| `mock-server/middleware/rateLimit.js`      | In-memory per-IP limiter for the public write endpoints (used by prompts 08/09)                        |
| `mock-server/lib/*`                        | `ids`, `paginate`, `sort`, `filters`, `slug`, `embed`, `scope`, `enums`, `models`, `xml`, `csv`        |
| `mock-server/README.md`                    | How to run it, the envelopes, `PUT` vs `PATCH`, how to add a route                                     |
| `scripts/validate-seed.js`                 | `npm run validate:seed` — the seed against the data model, plus the structural rules                   |
| `docs/SEED_GUIDE.md`                       | What the seed contains, the rules it follows, how to change and reset it                               |

**Files changed**

- `db.json` — **rewritten** as the starter seed of §6: 28 collections, integer ids from 1, ISO
  timestamps, every non-computed field present. 6 properties (one rent, one lease, one under
  construction with a timeline, one villa, one plotted layout), 6 localities, 17 property types,
  20 amenities, 8 badges, 3 fictional developers, 3 fictional banks, 6 leads, 3 published
  articles, 4 categories, 15 tags, 3 authors, 8 FAQs, 2 sample testimonials, 2 team members,
  3 partners, the `home` and `about` pages, 1 job, 58 media records, `siteSettings` and
  `seoSettings` fully populated, 2 redirects, 2 subscribers, 3 admin users.
- `package.json` — `mock`, `mock:reset`, `dev` (concurrently), `validate:seed`; `lint`,
  `lint:fix`, `format` and `format:check` extended with `mock-server/**/*.js`; `validate:seed`
  added to `check:all`; devDependencies `json-server@0.17.4`, `express@4.22.3`, `cors@2.8.6`,
  `concurrently@9.2.1`.
- `scripts/check-traces.js` — exports `TRACE_PATTERNS`, `ALLOW_LIST` and `HEX_RE` (CLI guarded by
  `require.main === module`) so `validate-seed.js` applies the same regexes to `db.json` instead
  of restating them; a second copy would drift and would itself be a finding.
- `mock-server/schemas/models.js` — Prettier reformatting only (three long lines wrapped), now
  that `format`/`format:check` cover `mock-server/**`. Verified behaviour-identical by comparing
  the serialised `MODELS` object before and after.
- `docs/archive/CODEBASE_INVENTORY.md` — the `db.json` section is marked **replaced in prompt 06**.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and 14 decision records.

**Endpoints served** (generic, unauthenticated until prompt 07)

`GET /api/health`, and generic CRUD for all 28 collections at `/api/<collection>` and
`/api/admin/<collection>` with the §5.2 envelope, §5.3 errors, §5.6 query translation and §5.10
public scoping. `GET /sitemap.xml`, `/sitemap-*.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt`
answer 501 at both the root and `/api` until prompt 09. Every custom route of §5.14
(`/auth/*`, `/properties/slug/:slug`, `/admin/dashboard`, …) still answers 404.

**npm scripts** `mock`, `mock:reset`, `dev`, `validate:seed`.
**Env vars** `MOCK_PORT`, `MOCK_DELAY_MS`, `MOCK_TOKEN_TTL_HOURS`, `MOCK_FRESH` (documented since
prompt 02, consumed from now on).

**Acceptance checklist**

- [x] `npm run validate:seed` passes on the new `db.json`; `--stats` prints counts for all
      **28** collections and singletons (the prompt's "27" is a miscount of its own list — see
      `docs/DECISIONS.md`).
- [x] `npm run mock` serves `/api/health`, envelopes lists / objects / deletes per §5.2 and
      returns 404 / 422 / 500 per §5.3.
- [x] Public GETs exclude inactive records (`isActive: false` on property 6 → public
      `meta.total` 5, public detail 404), `/api/admin/*` include them (total 6, detail 200).
- [x] `PATCH` keeps untouched fields — verified on `properties/1` (`isFeatured` set, all 5
      images, 14 amenity ids, `viewCount` 184 and `createdAt` unchanged) and on a nested
      `seo` patch (`seo.title` replaced, the other 18 `seo` keys intact).
- [x] `PUT` applies model defaults, including nested ones (`pricing.currency` `INR`,
      `area.areaUnit` `sqft`, the full `agent` shape, all 18 `sectionVisibility` keys) and keeps
      the id, `createdAt` and `viewCount`; a partial `PUT` is a 422 naming `listingType`,
      `propertyTypeId` and the eight other required fields.
- [x] `POST` assigns `id = max+1` (lead 7) and both timestamps; an invalid body is a 422 in
      Laravel's format.
- [x] `npm run mock:reset` restores the runtime db; `MOCK_FRESH=1 npm run mock` re-seeds;
      `MOCK_DELAY_MS=800` adds 800 ms to every response.
- [x] `npm run dev` starts both processes (`[mock]` and `[web]` prefixes, Ctrl+C stops both).
- [x] `npm run lint` (now including `mock-server/**`) 0 errors / 0 warnings, `npm run test:ci`
      573 tests in 10 suites, `npm run build:ci` "Compiled successfully." with 0 warnings,
      `npm run check:traces` 0 findings, `npm run format:check` clean.
- [x] One commit, clean tree.

**Edge cases verified**

`perPage=all` → 12 on a public endpoint, the whole collection on `/api/admin/*`; `page=999` →
empty `data` with `meta.total` 6; `PATCH` with an unknown field → 200 and nothing stored;
`PATCH` with a wrong type → 422; `DELETE` twice → 200 then 404, with the other five leads
untouched (JSON Server's own cascade would have removed every lead whose `propertyId` is
`null` — see `docs/DECISIONS.md`); a corrupt runtime db → a named error and a working
`mock:reset`; `GET /api/properties/slug/…` → the 404 envelope until prompt 08.

**Manual QA**

`npm run dev`, then Chromium at 1280 px:

- `/` renders every section — header, hero, the three quick-action cards, "Why Choose
  Squares N Acres", "How It Works", "Featured Properties", the FAQ block, the newsletter and
  the footer — with **0 page errors**. "Featured Properties" and the FAQ list come back empty:
  `GET /api/properties?featured=true&is_active=true` and `GET /api/faqs?isActive=true` both
  answer 200, but the un-migrated services read a bare array from a body that is now
  `{ data, meta }` (§5.2). That is the empty state this prompt expects (`NEW-27`).
- `/properties` renders the `ErrorBoundary` recovery screen rather than the listing:
  `PropertyCard` calls `.join()` on `configuration`, which is an object in the new shape.
  Expected until prompt 11 (`NEW-26`), and the app recovers rather than white-screening.
- Both pages log 404s for `/settings`, `/neighborhoods/active`, `/partners/active` and
  `/articles/trending` — the old endpoint surface (`NEW-27`).

**Issues left**

`NEW-26` and `NEW-27` (owner prompt 11); `BUG-03` partially closed — generic CRUD is served,
the custom routes arrive with prompts 07–09; `/api/admin/*` is unauthenticated until prompt 07
and the SEO document routes answer 501 until prompt 09 (both listed under "Pending rewrites").

### Prompt 07 — Mock server: authentication, tokens, RBAC middleware, users, profile (2026-09-15)

**Files added**

| Path | What it is |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| `mock-server/lib/tokens.js` | `createTokenStore({db, config})` — issue / resolve / revoke / purge over `apiTokens` |
| `mock-server/lib/password.js` | `verify()` and `store()` — plain comparison on the mock, one place to replace with a hash |
| `mock-server/lib/routePermissions.js` | `resolvePermission(path, method)` — an admin path and method → an area and action of §7 |
| `mock-server/middleware/auth.js` | `requireAuth` — `Bearer` → `req.user` (no password) + `req.token`; 401 with one message |
| `mock-server/middleware/role.js` | `role(...roles)`, `can(area, action)` and `adminPermission()` — the matrix, 403 |
| `mock-server/routes/auth.js` | `POST /auth/login` (throttled 10/min), `logout`, `GET                                     | PUT /auth/profile`, `PUT /auth/password` |
| `mock-server/routes/users.js` | `/admin/users` list, create, read, replace, patch, delete and bulk, with the safety rules |
| `mock-server/__tests__/auth.test.js` | 24 `node:test` cases over `createApp()` on a temp copy of the seed — `npm run test:mock` |

**Files changed**

- `mock-server/app.js` — `requireAuth` + `adminPermission()` mounted on `/api/admin`, and
  `requireAuth` on `/api/auth/logout|profile|password`, both **before** the custom routers and
  the generic router, so no admin route can exist without being covered.
- `mock-server/routes/index.js` — registers `auth.js` and `users.js`.
- `mock-server/middleware/publicScope.js` — `PRIVATE_COLLECTIONS` (`adminUsers`, `apiTokens`,
  `media`, `leads`, `jobApplications`, `newsletterSubscribers`, `propertyViews`) answer 404 on
  any public path, whatever the method; `PUBLIC_WRITES` keeps the one public write the contract
  defines on such a collection (`POST /leads`) open.
- `mock-server/config.js` — `MOCK_TOKEN_TTL_HOURS` is parsed as a **number** rather than an
  integer, so the `0.01` (36 s) of §7 works; the default is unchanged (24).
- `package.json` — `test:mock` added and included in `check:all`.
- `mock-server/README.md` — "Authentication", "Roles" and "Tests" sections: the flow, the seed
  credentials with the note that Laravel hashes them, the TTL, how a permission is resolved and
  what `/admin/users` refuses.
- `docs/API_CONTRACT.md` — "Auth — worked examples": login, 401, 429, profile, profile update,
  password (422 and success) and logout, with the JSON the mock actually returned.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and nine decision records.

**Endpoints served**

`POST /api/auth/login` → `{ data: { token, expiresAt, user } }` (48-char opaque token,
`lastLoginAt` set, expired tokens purged); `POST /api/auth/logout`; `GET /api/auth/profile`;
`PUT /api/auth/profile`; `PUT /api/auth/password` (revokes the user's other tokens);
`GET|POST /api/admin/users`, `GET|PUT|PATCH|DELETE /api/admin/users/:id`,
`POST /api/admin/users/bulk` (`activate|deactivate|delete`).

**npm scripts** `test:mock` (`cd mock-server && node --test`), also in `check:all`.
**Env vars** none added; `MOCK_TOKEN_TTL_HOURS` is now consumed (and accepts fractions).

**Acceptance checklist**

- [x] All five auth endpoints behave per §5.4 — verified by `npm run test:mock` (24 cases) and
      by curl against `npm run mock`.
- [x] `/api/admin/*` answers 401 without a token (`users`, `properties`, `dashboard` checked)
      and 403 outside the matrix: sales on `GET /admin/users`, manager on `GET /admin/users`,
      sales on `POST /admin/properties`, `DELETE /admin/properties/1` and `GET /admin/localities`,
      manager on `PUT /admin/settings`. Sales on `GET /admin/properties` → 200.
- [x] Private collections are unreachable publicly: `/api/adminUsers`, `/api/apiTokens`,
      `/api/media`, `/api/leads`, `/api/jobApplications`, `/api/newsletterSubscribers`,
      `/api/propertyViews` → 404, while the public `POST /api/leads` still answers 201.
- [x] Users CRUD, bulk and the safety rules work; tokens are revoked on delete, on deactivation
      and on a password change.
- [x] `npm run test:mock` (24/24), `npm run lint` (0 errors, 0 warnings, 0 blocking endpoint
      findings), `npm run test:ci` (573 tests in 10 suites), `npm run build:ci` ("Compiled
      successfully."), `npm run check:traces` (0 findings), `npm run validate:seed` ("db.json is
      valid."), `npm run format:check` clean.
- [x] One commit, clean tree.

**Edge cases verified**

`MOCK_TOKEN_TTL_HOURS=0.01` → `expiresAt` is 36 s out (test + `config.js` unit check); e-mail
matching is case-insensitive and trimmed (` ADMIN@SquaresNAcres.com` signs in) while
passwords are case-sensitive; a deactivated user's existing token stops working immediately
(401); `PUT /admin/users/1` on yourself keeps your role, `PATCH { role }` on yourself is a 422
naming `role`; `GET /admin/users?perPage=all` returns all three with `meta.perPage: 3`, and a
regex over the whole response body asserts no `password` key and none of the three seed
passwords ever appear; the 11th login attempt within a minute is a 429; an expired token is
deleted when it is presented.

**Manual QA**

`npm run mock` in a second terminal, then curl: `POST /api/auth/login` as each of the three
seed accounts; `GET /api/auth/profile` with the token; `GET /api/admin/users` as admin (200,
no passwords) and as sales/manager (403); `GET /api/admin/users` without a token (401);
`GET /api/adminUsers` (404); sales `GET /api/admin/properties` (200) and
`POST /api/admin/properties` (403); a created user signing in with their new password, then
changing it, then logging out (401 afterwards). `GET /api/admin/dashboard` and
`GET /api/admin/settings` still answer 404 — the permission check passes, the route arrives
with prompts 08/09.

**Issues left**

`BUG-03` still open for the routes of prompts 08–09. `BUG-14` is closed on the server and open
on the client: `AdminAuthContext` still posts the boilerplate's login shape, stores the session
twice and never enforces the expiry, so the admin panel cannot sign in against this mock until
prompt 12 (prompt 11 rewrites the services first). Nothing else was added to "Pending
rewrites"; the `/api/admin/*` row of that table is removed — it is done.

### Prompt 08 — Mock server: property and lead domain routes (2026-09-15)

**Files added**

| Path                                       | What it is                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `mock-server/routes/properties.js`         | The public search, `featured`, `suggestions`, `slug`, `similar`, `view` and the admin property CRUD |
| `mock-server/routes/leads.js`              | `POST /leads` and the CRM: list, detail, patch, delete, claim, notes, bulk, CSV export              |
| `mock-server/lib/propertyFilters.js`       | Every §5.7 filter and the six sort options, with the price / area / bedrooms accessors              |
| `mock-server/lib/facets.js`                | `meta.facets` — counted after the filters, before pagination                                        |
| `mock-server/lib/leadFilters.js`           | The CRM's filters and sorting, with the UTC date comparison of D96                                  |
| `mock-server/lib/activities.js`            | The lead timeline: `addActivity` and the sentences it writes                                        |
| `mock-server/lib/viewCounter.js`           | One counted view per IP per property per hour, in memory                                            |
| `mock-server/__tests__/helpers.js`         | The shared harness: `createApp()` on an ephemeral port over a temp copy of the seed                 |
| `mock-server/__tests__/properties.test.js` | 22 cases — filters, sorting, facets, featured, suggestions, similar, view, admin CRUD, RBAC         |
| `mock-server/__tests__/leads.test.js`      | 18 cases — honeypot, throttle, source mapping, scope, activities, notes, bulk, export               |

**Files changed**

- `mock-server/routes/index.js` — registers `properties.js` and `leads.js`.
- `mock-server/lib/embed.js` — `embedAgent()` fills an agent's display fields from the team
  member the listing names, without overwriting anything typed on the property itself.
- `mock-server/lib/scope.js` — `canSeeLead()` and `scopeLeads()`, the sales scope of D15.
- `mock-server/middleware/publicScope.js` — `PUBLIC_WRITES` removed: `POST /leads` has its own
  router now, so the private collections are the flat rule prompt 07 described.
- `mock-server/__tests__/auth.test.js` — moved onto the shared harness; the 24 cases are
  unchanged.
- `mock-server/README.md` — "Properties" and "Leads" sections: the filters, the three accessor
  rules, facets, the write invariants, the lead pipeline and the sales scope.
- `docs/API_CONTRACT.md` — worked examples: a filtered property list with its facets, the view
  counter, the type-ahead, a lead as `POST /leads` stores it, the honeypot answer and the CSV
  header.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and 16 decision records.

**Endpoints served**

`GET /api/properties` (all of §5.7 + `meta.facets`), `/properties/featured`,
`/properties/suggestions`, `/properties/slug/:slug`, `/properties/:id/similar`,
`POST /properties/:id/view`; `GET|POST /api/admin/properties`,
`GET|PUT|PATCH|DELETE /api/admin/properties/:id`, `POST /api/admin/properties/:id/duplicate`,
`POST /api/admin/properties/bulk`, `GET /api/admin/properties/check-slug`; `POST /api/leads`,
`GET /api/admin/leads`, `GET /api/admin/leads/export`, `GET|PATCH|DELETE /api/admin/leads/:id`,
`POST /api/admin/leads/:id/claim`, `POST /api/admin/leads/:id/notes`,
`DELETE /api/admin/leads/:id/notes/:noteId`, `POST /api/admin/leads/bulk`.

**npm scripts** none added. **Env vars** none added.

**Acceptance checklist**

- [x] Every endpoint of §5 for properties and leads answers per contract — `npm run test:mock`
      runs **64** cases in 17 suites (24 auth, 22 properties, 18 leads), all passing.
- [x] `?bedrooms=3` returns only 3-BHK listings (including via unit configurations),
      `?amenityIds=1,2` only listings holding both, `?ids=3,1` returns them in that order.
- [x] `meta.facets` is present on the public and the admin property list, counted after the
      filters and before the page is cut.
- [x] `POST /leads` increments the property's `enquiryCount` (12 → 13), maps
      `property_enquiry` → `property-enquiry`, stores `activities[0]`, honours the honeypot
      (200, nothing stored) and the 10/min throttle (the 11th is a 429).
- [x] The sales scope is enforced on the list (5 of 6 leads), the detail read (404 for the
      manager's lead), `PATCH` (403 for `assignedTo`), `claim`, `DELETE` (403) and the export
      (5 rows of 6).
- [x] The CSV starts with the BOM and the contract's header row; a `PATCH` appends
      "Status changed from New to Contacted", "Assigned to Sales User",
      "Priority changed from Medium to High" and "Follow-up set for 20 Sep 2026".
- [x] `npm run test:mock`, `npm run lint`, `npm run test:ci`, `npm run build:ci`,
      `npm run check:traces`, `npm run validate:seed` and `npm run format:check` pass.
- [x] One commit, clean tree.

**Edge cases verified**

`bedrooms=5` matches 5 and above and returns nothing in this seed (the largest home has four);
a plot never matches a bedrooms filter; `minPrice=0` still excludes a listing quoted on
request while no price filter excludes nothing; `similar` skips picks that were deactivated;
`duplicate` of a `-copy` slug becomes `-copy-2`; `PATCH { images: [...] }` replaces the array
and re-derives the single cover; `PATCH { seo: { title } }` keeps the other 18 `seo` keys, the
five images and `viewCount`; a lead phone arrives as `+91 98765 43210`, `09876543210` or
`9876543210` and is stored as `+919876543210`, while `12345` is a 422; `assignedTo=me` and
`assignedTo=unassigned` both work for an admin; an export with no matching rows is the header
row and the BOM alone; `from=2026-09-05&to=2026-09-05` selects the whole UTC day.

**Manual QA**

`npm run mock` in a second terminal, then curl: the filter matrix above; `sort=price-asc`
orders the rent, lease and sale listings by their own price field; `/properties/suggestions?q=w`
answers four empty groups and `?q=whi` the locality, the listing and its price;
`POST /properties/1/view` twice returns 185 both times; the admin CRUD end to end (create →
409 on a duplicate slug → PUT → PATCH → duplicate → bulk → delete, with the deleted id
disappearing from the two `similarPropertyIds` that held it); `POST /leads` as the enquiry
form, the honeypot and the throttle; `GET /admin/leads/export -o leads.csv`, opened in a text
editor: BOM, header row, six rows for the admin and five for the sales user.

**Issues left**

`BUG-03` is open only for the article, CMS, SEO, settings and dashboard routes of prompt 09.
The React side is untouched by design: the services still call the boilerplate's paths
(`NEW-26`, `NEW-27`, prompt 11) and the admin panel still cannot sign in (prompt 12). The
seed is still the six-property starter fixture — prompt 10 replaces it, and the assertions in
`properties.test.js` that count listings will move with it.

### Prompt 09 — Mock server: content, master data, SEO, sitemaps and smoke tests (2026-09-16)

**Files added**

| Path | What it is |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `mock-server/lib/crud.js` | `makeCrudRouter()` — the eight endpoints twenty resources share, written once |
| `mock-server/lib/usage.js` | `findUsages()` / `findMediaUsages()` / `describeUsages()` — the delete guard of D88 |
| `mock-server/lib/previewTokens.js` | 24-hour in-memory draft tokens (D28) |
| `mock-server/lib/html.js` | `stripHtml`, `wordCount`, `readingTime` |
| `mock-server/lib/articleFilters.js` | Publication visibility, the `scheduled` promotion, the public filters and sorts |
| `mock-server/lib/dashboard.js` | The whole §6.16 payload, with the sales scope of D15 |
| `mock-server/lib/sitemapBuilder.js` | `PUBLIC_PATHS`, the five `<urlset>` builders, the index, RSS, robots and `llms.txt` |
| `mock-server/routes/masterData.js` | Fourteen collections configured on the factory: filters, embeds, counters, delete guards |
| `mock-server/routes/articles.js` | The public blog, `trending`, the preview token, and the admin CRUD with the derived fields |
| `mock-server/routes/pages.js` | The CMS: block ids, `order` renumbering, the `<script` rejection, preview tokens |
| `mock-server/routes/media.js` | The library: inferred `provider`/`type`/`format`, `usedIn` |
| `mock-server/routes/settings.js` | `GET /settings`, `GET                                                                                    | PUT /admin/settings` and the known-keys deep merge |
| `mock-server/routes/seo.js` | `GET /seo/settings`, `GET                                                                                | PUT /admin/seo/settings`, the overview, the `llms.txt` preview |
| `mock-server/routes/dashboard.js` | `GET /admin/dashboard` |
| `mock-server/routes/newsletter.js` | Subscribe with dedupe and honeypot, the admin list, the CSV export |
| `mock-server/routes/jobs.js` | The open-role rule, `apply`, the admin openings and the application triage |
| `mock-server/routes/redirects.js` | The public list, `resolve`, the loop/chain validation, `import` and `export` |
| `mock-server/routes/sitemap.js` | The nine SEO files, served at `/api/...` and mirrored at the root |
| `mock-server/__tests__/content.test.js` | 36 cases — articles, previews, master data, pages, settings, SEO, dashboard, newsletter, jobs, redirects |
| `mock-server/__tests__/sitemap.test.js` | 16 cases — the index, the five children, the overrides, robots, RSS, `llms.txt`, the root mirrors |
| `scripts/smoke-api.js` | Walks `allEndpoints()` against a running server and checks the behaviours behind the status codes |

**Files changed**

- `mock-server/routes/index.js` — registers the eleven new routers.
- `mock-server/app.js` — the 501 placeholder is gone; the root rewrite now reaches
  `routes/sitemap.js`.
- `mock-server/middleware/errors.js` — `ApiError` carries an optional `data`, so the 409 of a
  delete-in-use can name what is in the way (`data.usedBy`).
- `mock-server/middleware/publicScope.js` — `GENERIC_COLLECTIONS`: what is left for the JSON
  Server fallback now that every §5.14 path has an owner.
- `mock-server/__tests__/helpers.js` — exposes the server's `origin`, so the root mirrors of
  the SEO files can be tested where they are actually served.
- `package.json` — `"smoke": "node scripts/smoke-api.js"`. It is **not** in `check:all`: it
  needs a server on the other end, and a check suite that fails because nobody started a
  second process is one people learn to ignore.
- `mock-server/README.md` — the full route list, the rules worth knowing, "Adding a
  collection" and the smoke-test section; the obsolete "What is not here yet" is gone.
- `docs/API_CONTRACT.md` — captured examples (`GET /settings`, `GET /admin/dashboard`,
  `GET /admin/seo/overview`, a `sitemap.xml` snippet, `robots.txt`), the four operational
  endpoints outside the registry, and the corrected `SeoSettings` public scope.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and 18 decision records.

**Endpoints served**

Every endpoint of §5.14. New in this prompt: the public lists and slug lookups for
localities, cities, property types, amenities, badges, developers, banks, article
categories, article tags, authors, FAQs, testimonials, team and partners, and their admin
CRUD with `bulk` and `check-slug`; `GET /articles`, `/articles/slug/:slug`,
`/articles/trending` and the admin article CRUD with `preview-token`;
`GET /pages/slug/:slug` and the admin page CRUD with `preview-token`; `/admin/media`;
`GET /settings`, `GET|PUT /admin/settings`; `GET /seo/settings`,
`GET|PUT /admin/seo/settings`, `GET /admin/seo/overview`; `GET /admin/dashboard`;
`POST /newsletter/subscribe`, `GET /admin/newsletter-subscribers` with `export`;
`GET /jobs`, `/jobs/slug/:slug`, `POST /jobs/:id/apply`, the admin openings and
`/admin/job-applications`; `GET /redirects` with the admin CRUD; and the sitemap family at
both `/api/...` and the root. Plus four operational paths outside the registry:
`GET /redirects/resolve`, `POST /admin/redirects/import`, `GET /admin/redirects/export`,
`GET /admin/seo/llms-preview`.

**Verification**

| Command | Result |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:mock` | **117 tests, 117 pass, 0 fail** (was 64 before this prompt) |
| `npm run smoke` | **269/269 checks pass, 0 failures** — 235 registry endpoints + 34 targeted assertions |
| `npm run lint` | 0 errors, 0 warnings; `check:endpoints` 185 files scanned, 0 blocking findings |
| `npm run test:ci` | 10 suites, 573 tests, all pass |
| `npm run build:ci` | Compiled, no warnings |
| `npm run check:traces` | 360 files scanned, 0 findings |
| `npm run validate:seed` | `db.json is valid.` |
| ADD-26 | `db.json`: mixed `leads[].propertyId`, `.mp4` in a property gallery, hardcoded `neighborhoods.propertyCount`, `(555) 123-4567`, off-scope Mumbai article, lorem-ipsum "Test Article" and Guwahati "Test Property", `faqs[6]` double `??` | 10 — `db.json` is regenerated from `scripts/seed/`: lead `propertyId` is always an integer, no video sits in a gallery, `propertyCount` is computed rather than stored, the phone numbers are synthetic Indian mobiles, and there is no off-scope, lorem-ipsum or test record left. `npm run validate:seed` now enforces the §10 quality rules as well as the types. |

The smoke run was repeated twice against the same server: the second run passes identically
and leaves nothing behind but the `apiTokens` its logins created and the one `propertyViews`
row `POST /properties/:id/view` legitimately records.

**Decisions worth carrying forward**

- The CRUD factory is the shape of every plain resource; a resource with real behaviour owns
  its router and mounts the factory for the rest. `docs/DECISIONS.md` (P09) has the hook list.
- Publication is a moment, not a flag: a `scheduled` article whose `publishedAt` has passed is
  public, and a read settles it.
- The delete guard counts only **named** references, so a catch-all CMS block never makes a
  record undeletable.
- `GET /seo/settings` returns the whole singleton; the earlier "public subset" in
  `docs/API_CONTRACT.md` described a rule nothing could justify.
- Public URLs live in one map (`PUBLIC_PATHS`), read by both the sitemaps and the SEO overview.

**Known issues**

`BUG-03` is closed: every endpoint the frontend declares is served, and `npm run smoke`
fails if one disappears. `BUG-15` and `BUG-18` are closed on the server — the honeypot, the
throttle, the newsletter dedupe, `/articles/trending` and the FAQ filters all work — and stay
open for the components that consume them (27, 28, 31, 34). The React app still calls the
boilerplate's paths (prompt 11) and cannot sign in (prompt 12), so the API is exercised with
`curl`, `npm run test:mock` and `npm run smoke`.

### Prompt 10 — Full Bangalore seed data (`db.json`) and seed guide (2026-09-16)

**What changed**

`db.json` is no longer hand-written. It is generated by `npm run seed:build`
from `scripts/seed/`, and it now holds the complete dataset of §10 rather than
the six-listing starter fixture of prompt 06.

**Files added**

| Path                                             | What it is                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `scripts/seed/build-seed.js`                     | Assembles every collection, derives `media`, checks the result, writes the file       |
| `scripts/seed/lib/rng.js`                        | mulberry32 with a fixed seed; named child generators per collection                   |
| `scripts/seed/lib/dates.js`                      | `GENERATED_AT` and every relative-date helper                                         |
| `scripts/seed/lib/stamps.js`                     | `createdAt` / `updatedAt` spread over 180 days                                        |
| `scripts/seed/lib/seo.js`                        | The §9.6 object and the 120–160 character description fitter                          |
| `scripts/seed/lib/media.js`                      | The media registry: minting a URL registers its record                                |
| `scripts/seed/lib/text.js`                       | ₹ and area formatting (D33), HTML paragraph helpers                                   |
| `scripts/seed/lib/property.js`                   | Expands a property spec into the full §6.1 record                                     |
| `scripts/seed/data/*.js` (23 modules)            | The data: localities, properties, articles, pages, leads, settings, …                 |
| `mock-server/__tests__/fixtures/starter-db.json` | The frozen prompt-06 seed the mock suites read                                        |
| `mock-server/__tests__/seed.test.js`             | Four cases over the **shipped** seed: reserved slugs, the path slug, sizes, dashboard |

**Files changed**

- `db.json` — regenerated in full (1.4 MB).
- `scripts/validate-seed.js` — the §10 quality rules, the path-slug rule for CMS
  pages, an asset scan that matches `mock-server/lib/usage.js`, the collection
  counts, and a non-blocking warning channel.
- `mock-server/routes/pages.js` — `slug/:slug(*)` so a page slug containing a
  slash resolves (the prompt's manual QA case).
- `mock-server/__tests__/helpers.js` — reads the frozen fixture; exports
  `LIVE_SEED` for the new suite.
- `package.json` — `"seed:build": "node scripts/seed/build-seed.js"`.
- `docs/SEED_GUIDE.md` — rewritten: contents, how to regenerate, the rules, what
  is fictional versus placeholder, how to add a property, an article or a page.
- `docs/DECISIONS.md`, `docs/PROJECT_STATE.md` — 19 decision records and this report.

**Counts (`npm run validate:seed`)**

| Collection        | Count | Collection            | Count  |
| ----------------- | ----- | --------------------- | ------ |
| properties        | 40    | testimonials          | 8      |
| localities        | 20    | teamMembers           | 6      |
| cities            | 1     | partners              | 6      |
| propertyTypes     | 17    | pages                 | 15     |
| amenities         | 46    | jobOpenings           | 4      |
| badges            | 8     | jobApplications       | 3      |
| developers        | 8     | media                 | 389    |
| banks             | 6     | redirects             | 3      |
| leads             | 45    | newsletterSubscribers | 12     |
| articles          | 12    | adminUsers            | 3      |
| articleCategories | 4     | siteSettings          | object |
| articleTags       | 15    | seoSettings           | object |
| authors           | 3     | apiTokens             | 0      |
| faqs              | 20    | propertyViews         | 0      |

Of the 40 properties: **38 active, 2 drafts**, 10 featured, 20 verified, all 17
property types, all three listing types, all four construction statuses and all
twenty localities. Of the 12 articles: 10 published (838–1 154 words each), 1
scheduled for 2026-10-31, 1 draft. The 45 leads cover all 29 sources and all
seven statuses, with 15 assigned to sales, 5 to the manager and 25 unassigned.

**Generation date: 2026-09-16T09:00:00.000Z.** Every relative date is measured
from that instant, which is what makes the build deterministic; the validator
warns once the scheduled article's date has drifted into the past.

**Verification**

| Command                  | Result                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| `npm run seed:build`     | Written twice, byte-identical (`diff` empty)                           |
| `npm run validate:seed`  | `db.json is valid.` — 0 errors, 0 warnings                             |
| `npm run smoke`          | **269/269 checks pass**, 0 failures                                    |
| `npm run test:mock`      | **121 tests, 121 pass** (was 117; the new seed suite adds 4)           |
| `npm run lint`           | 0 errors, 0 warnings; `check:endpoints` 185 files, 0 blocking findings |
| `npm run test:ci`        | 10 suites, 573 tests, all pass                                         |
| `npm run build:ci`       | Compiled, no warnings                                                  |
| `npm run check:traces`   | 391 files scanned, 0 findings                                          |
| `grep -c picsum db.json` | 807 (> 200 required)                                                   |
| File size                | 1.4 MB (< 4 MB required)                                               |

Manual QA, against a running mock: `GET /api/properties?localityId=1&bedrooms=3`
returns the Whitefield 3-BHK only; `GET /api/articles?categorySlug=legal-rera`
returns the RERA, khata and stamp-duty pieces; `GET
/api/pages/slug/buyer-assistance/home-loan` resolves after the route fix; `GET
/api/admin/dashboard` shows 21 of 30 days with leads, 29 sources, five top
properties and eight upcoming follow-ups.

The un-migrated React app was loaded at `/` in headless Chromium: it renders
(seven children under `#root`, full page content) with **no uncaught
exception**. The console errors it logs are the known ones — the boilerplate
service still calling `/neighborhoods/active` and `/partners/active`, which do
not exist (NEW-27, prompt 11).

**Decisions worth carrying forward**

- The seed is generated and deterministic. Edit `scripts/seed/data/*`, run
  `npm run seed:build`, never edit `db.json`.
- A data module holds what a person must decide; everything implied is derived.
  That is what keeps forty listings consistent.
- `enquiryCount` is **at least** the number of leads naming a property, not
  equal to it: the counter is a lifetime total, `leads` is a ninety-day window.
- The mock's unit suites read a frozen fixture, not the shipped seed; the
  shipped seed is covered by `seed.test.js` and by `npm run smoke`.
- CMS page slugs are URL paths, and the pages route matches them greedily.

**Known issues**

`ADD-26` is closed: the seed's mixed types, off-scope records and test rows are
gone, and the validator now enforces the §10 quality rules rather than only the
field types. The data half of `BUG-11` is prepared — every hardcoded page of the
boilerplate is a seeded CMS record with its blocks — and the components that
read them land in prompts 27–31. The React app still uses the boilerplate's
shapes and endpoints (prompt 11), so the new data is exercised through
`curl`, `npm run test:mock` and `npm run smoke` rather than through the UI.

### Prompt 11 — Frontend data layer, hooks, contexts and page rewiring (2026-09-16)

**What changed**

`src/services/api.js` is gone. In its place the frontend has one HTTP client,
one thin service per domain, two hooks and two contexts, and every page that
used to read the boilerplate's field names now reads the contract of
`00_MASTER_CONTEXT.md` §5–§6 — directly where the screen is small enough to
rewrite here, and through a named temporary adapter where prompts 18–40 own the
rewrite.

**Files added**

| Path                                                    | What it is                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/services/http.js`                                  | The axios instance, the token, the scoped 401, `request()`, `buildUrl()`         |
| `src/services/apiError.js`                              | `ApiError` — the one error shape of §5.3, with `fieldError()` and `isValidation` |
| `src/services/authService.js`                           | login / logout / profile / updateProfile / changePassword                        |
| `src/services/propertyService.js`                       | public search, featured, slug, similar, view, suggestions + the admin CRUD       |
| `src/services/leadService.js`                           | create + the CRM: list, get, patch, claim, notes, bulk, `exportUrl()`            |
| `src/services/articleService.js`                        | list (incl. `ids`), slug, trending, taxonomy, authors + the admin CRUD           |
| `src/services/seoService.js`                            | settings, admin settings, update, overview, `llms.txt` preview                   |
| `src/services/settingsService.js`                       | public, admin, update                                                            |
| `src/services/masterDataService.js`                     | eleven collections built by one factory from the registry groups                 |
| `src/services/pageService.js`                           | CMS pages, public and admin, with the preview token                              |
| `src/services/mediaService.js`                          | the media library metadata CRUD                                                  |
| `src/services/userService.js`                           | admin users                                                                      |
| `src/services/dashboardService.js`                      | `GET /admin/dashboard`                                                           |
| `src/services/newsletterService.js`                     | subscribe, admin list, remove, `exportUrl()`                                     |
| `src/services/careerService.js`                         | job postings, applications, the public apply call                                |
| `src/services/redirectService.js`                       | the active rules, a pure `resolve()`, the admin CRUD                             |
| `src/services/index.js`                                 | the barrel                                                                       |
| `src/hooks/useApi.js`                                   | one call, four states, an AbortController per call                               |
| `src/hooks/useApiList.js`                               | a paginated list whose params live in the query string                           |
| `src/contexts/SiteSettingsContext.js`                   | settings + SEO settings, once per page load, session-cached                      |
| `src/contexts/MasterDataContext.js`                     | seven master-data lists in parallel, session-cached for ten minutes              |
| `src/routes/paths.js`                                   | every route builder, public and admin                                            |
| `src/utils/adapters/legacyArticle.js`                   | **temporary** — the §6.8 record under the old field names                        |
| `src/components/common/LegacyHtml.jsx`                  | **temporary** — renders CMS HTML until `SafeHtml` (prompt 32)                    |
| `src/services/__tests__/http.test.js`                   | 20 cases: URL building, error mapping, the scoped 401, the token                 |
| `src/hooks/__tests__/useApi.test.js`                    | 8 cases, including abort-on-unmount with no `act()` warning                      |
| `src/hooks/__tests__/useApiList.test.js`                | 9 cases over a `MemoryRouter`, including the URL round-trip                      |
| `src/components/common/__tests__/PropertyCard.test.jsx` | 7 cases over the contract shape                                                  |
| `src/contexts/__tests__/SiteSettingsContext.test.js`    | 6 cases: the cache seed, the refresh, the helpers                                |

**Files deleted**

- `src/services/api.js` (820 lines: the axios instance, `transformPropertyPayload`,
  `normalizePropertyResponse`, `normalizeListResponse` and eleven services).
- The old `src/services/seoService.js` was replaced in place by the
  registry-based one; its snake↔camel mappers are gone.

**Files changed (44)**

`App.js` (the two new providers), `AdminAuthContext`, `MainLayout`,
`Footer`, `NewsletterSection`, `LeadForm`, `PropertyCard`, `HeroSection`,
`ExploreNeighborhoods` → `ExploreLocalities`, `PartnersSection`, `FaqSection`,
`FeaturedProperties`, `TrendingTopics`, `SimilarProperties`, `EnquiryForm`,
`FinanceGuide`, `Articles`, `ArticleDetail`, `FAQs`, `Contact`, `Careers`,
`PropertyListing`, `PropertyDetails`, `AdminLayout`, `Dashboard`,
`AdminProperties`, `PropertyForm`, `SimilarPropertiesTab`, `AdminLeads`,
`LeadDetail`, `AdminArticles`, `ArticleForm`, `FaqManager`,
`AdminNeighborhoods`, `AdminPartners`, `AdminSettings`, `AdminSeo`,
`UserManagement`, four CSS modules, `setupTests.js`,
`scripts/check-endpoints.allow.json` (now `[]`) and `package.json`.

**How the layer is shaped**

- A service function is one line. It names a registry entry and passes
  `{ pathParams, params, body, signal }`; it never builds a URL, never reshapes
  a record and never catches an error. `masterDataService` builds its eleven
  collections from one factory rather than ninety hand-written lines.
- `http.request()` fills `:param` placeholders (encoding each segment when the
  parameter is a `(*)` wildcard), drops any query key the endpoint does not
  declare, turns arrays into csv and booleans into `true`/`false`, and returns
  the envelope untouched.
- Every failure is an `ApiError`. A 422 carries `errors` for the form, a
  dropped connection carries one sentence for the toast, and a cancellation
  carries `isCanceled` so callers ignore it.
- A 401 signs the session out only when the call was an admin or auth call.
  A public page whose token has gone stale keeps rendering (NEW-13), and
  concurrent 401s redirect once, not once each.

**Two calls became one per page load**

`GET /settings` and `GET /seo/settings` are loaded once by
`SiteSettingsProvider`, master data once by `MasterDataProvider`, and
`GET /articles/trending` once per page. Verified in the browser network panel
on `/` and `/insights/articles`.

While checking that, the trace caught a real defect in the new code:
`articleService.trending({ signal })` passed the abort signal in the `params`
slot, so the request was not abortable and React's StrictMode double-mount sent
it twice. Both call sites now pass `(undefined, { signal })`.

**Verification**

`npm run lint` (0 blocking endpoint findings, allow-list `[]`), `npm run test:ci`
(15 suites, 622 tests), `npm run test:mock` (121), `npm run build:ci`,
`npm run check:traces` (0 findings) and `npm run smoke` (269/269) all pass.

Driven in a real browser against the mock: the hero type-ahead groups
localities and properties for "whi"; the featured row renders seed prices
(`₹1.42 Cr`, `₹1.73 Cr – ₹2.83 Cr`, `₹11.4 L/month`); eight featured localities;
`?page=2` and `?categorySlug=market-trends` round-trip on the articles list;
`?category=home-loan` on the FAQ page; an article renders 17 HTML paragraphs and
its related row; `/properties` and
`/properties/lakeview-heights-3-bhk-whitefield` render with no console error;
admin login lands on the dashboard with the API's own figures; the property,
lead, SEO and settings screens list real rows. With the API unreachable the
public pages show an error state with a working Retry and never redirect to
login; an expired token on an admin call clears the session and redirects once.

**Known issues**

BUG-02, BUG-04, BUG-14, ADD-08, NEW-07, NEW-12, NEW-13, NEW-14, NEW-16, NEW-24,
NEW-26 and NEW-27 are closed. BUG-01 is closed for every write this prompt
touched and stays open until the module prompts confirm the rest. BUG-07,
BUG-18, ADD-07, ADD-10, ADD-16 and NEW-23 are annotated with what changed.

Nine temporary items are listed under "Pending rewrites", each with its owner
prompt. Four of them are disabled saves — `PropertyForm`, `ArticleForm`,
`AdminSettings` and `AdminSeo` — each behind an info `Alert` that names the
prompt which restores it. None of those saves could ever have succeeded against
this contract: they wrote snake_case columns, flat category strings and a
flattened settings object that the API does not accept.

### Prompt 12 — Auth, admin shell, RBAC routes, notifications and profile (2026-09-16)

**What changed**

The admin panel now has a session it can trust, a route table instead of
hand-written `<Route>`s, a shell built from that table, one lead poller for the
whole panel, and a profile screen every role can use.

**Files added**

| Path                                                      | What it is                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/contexts/LeadNotificationsContext.js`                | The panel's one lead poller: badge, bell rows, `lastUpdatedAt`, `markSeen()` |
| `src/components/admin/RoleRoute.jsx`                      | Guard 2 of §7 — `permission={['area','action']}` through `can()`             |
| `src/components/admin/Forbidden.jsx` (+ css)              | The 403 screen, in the layout, with a router link back to the dashboard      |
| `src/components/admin/AdminPlaceholderPage.jsx` (+ css)   | "Coming in prompt NN" for the screens prompts 13–39 write                    |
| `src/components/layout/AdminSidebar.jsx` (+ css)          | `NAV_ITEMS` filtered by role, collapsible groups, the leads badge            |
| `src/components/layout/AdminTopbar.jsx` (+ css)           | Title, "View site", the bell, the account menu                               |
| `src/components/layout/NotificationsMenu.jsx` (+ css)     | The bell: five newest `new` leads, relative times, "View all leads"          |
| `src/pages/admin/settings/ProfilePage.jsx` (+ css)        | `/admin/profile` — profile card + change-password card                       |
| `src/pages/admin/AdminLogin.module.css`                   | The login screen's own styles (no inline `sx` colours left)                  |
| `src/routes/adminRouteConfig.js`                          | The route table: path, title, permission, element, owning prompt             |
| `src/routes/adminRoutes.js`                               | `ProtectedRoute > AdminLayout > RoleRoute`, built from the table             |
| `src/routes/publicRoutes.js`                              | The public URL map, moved out of `routes/index.js` unchanged                 |
| `src/contexts/__tests__/AdminAuthContext.test.js`         | 6 cases: restore, expiry, revoked, offline, login, `can()`                   |
| `src/contexts/__tests__/LeadNotificationsContext.test.js` | 3 cases: the single request, the badge, the hidden tab                       |
| `src/components/admin/__tests__/RoleRoute.test.jsx`       | 3 cases over the real provider and the real matrix                           |

**Files changed**

`AdminAuthContext`, `ProtectedRoute`, `AdminLayout` (+ css), `AdminLogin`,
`AdminLeads`, `routes/index.js`, `routes/paths.js`.

**The session (§5.4)**

`AdminAuthContext` holds `{ user, token, expiresAt, status }` where `status` is
`loading | authenticated | anonymous`, and exposes
`{ user, role, status, isAuthenticated, login, logout, can, refreshProfile, updateUser }`.

- On mount it reads the three `sna_auth_*` keys. A token still in date signs the
  user straight back in and `GET /auth/profile` confirms it with the server; a
  token past its date is dropped without a request.
- Expiry is enforced three ways and all three end in one place: a `setTimeout`
  armed for `expiresAt` (capped at 24 h), a check on every admin route change,
  and the server's 401 through `http.onUnauthorized`. Each clears storage,
  shows "Your session has expired. Please sign in again." once, and redirects
  to the login page carrying `state.from`.
- A teardown latch keeps a burst of 401s — and the 401 the sign-out call itself
  may answer — to one toast and one redirect.
- A failed `GET /auth/profile` that is _not_ a 401 leaves the session alone: the
  API being unreachable is not a sign-out.
- A `storage` listener signs the other tabs out when the token key disappears.
- "Remember me" is gone.

**The routes**

`adminRouteConfig.js` holds all 42 admin routes — 16 wired to screens that
exist, 26 to `AdminPlaceholderPage` with the number of the prompt that writes
them (13, 14, 15, 16, 17, 30, 31, 33, 37, 39). Each row carries its §7
permission as `[area, action]`, so `RoleRoute`, the sidebar and the login
redirect all read the same table: `canAccessAdminRoute()` is what stops the
login page sending a role back to a route it would then be refused.

Titles feed the topbar and `document.title`
(`<title>Leads | Admin | Squares N Acres</title>` plus `noindex,nofollow`),
replacing the hand-kept `PAGE_TITLES` map that ADD-28 was about.

**One poller (D45/D55)**

`LeadNotificationsProvider` is mounted inside `AdminLayout`, so the public site
never polls. It asks for
`GET /admin/leads?status=new&perPage=5&sort=createdAt&order=desc` immediately
and every 30 s, stops while `document.hidden` and fetches the moment the tab
returns. `AdminLeads` refetches when `lastUpdatedAt` moves and has no interval
of its own. A failing poll is silent — the screens surface their own error
state, and a toast every 30 s would be worse than the failure.

**Verification**

`npm run lint` (0 problems, 0 blocking endpoint findings), `npm run test:ci`
(18 suites, 635 tests), `npm run build:ci` (compiled successfully, 0 warnings),
`npm run check:traces` (0 findings), `npm run validate:seed` and `npm run smoke`
(269/269) all pass. `npm run format:check` is clean.

Driven in headless Chromium against the mock, at 1280 px and at 390 px, with
the console watched throughout (0 app warnings or errors on every admin screen):

- Wrong password → the inline `Alert` "Invalid email or password.", still on
  `/admin/login`, no credentials printed anywhere on the page. Correct password
  → the dashboard; reload keeps the session; the sidebar collapse persists
  across a reload (`sna_admin_sidebar_collapsed`).
- A sales user sees only Dashboard, Properties, Leads and Profile; typing
  `/admin/settings`, `/admin/settings/users` or a master-data URL renders the
  403 page inside the shell, on that URL, with no redirect loop. A manager may
  open `/admin/settings` but not `/admin/settings/users`, and their sidebar does
  not link it.
- All 26 placeholder routes render their title and "Coming in prompt NN"; all
  16 existing screens still render.
- `POST /api/leads` → within 30 s the bell count grows, the dot appears and the
  toast reads "New lead: QA Poller Lead (Contact Page)" with a working "View"
  that opens `/admin/leads/46`. Opening the bell writes `sna_leads_seen_at` and
  clears the dot; `Escape` closes the menu.
- Network panel: exactly one `GET /admin/leads?status=new…` per 30 s, none at
  all across 65 s with the tab hidden, one immediately when it returns, and
  `/admin/leads` adds no request of its own beyond its refetch.
- `/admin/profile`: saving name, phone and avatar updates the topbar and
  `sna_auth_user`; a weak new password is refused client-side; a wrong current
  password renders the server's 422 on the field; success toasts the
  other-sessions note; logout clears all three keys and the new password signs
  in. (The seed account was restored afterwards.)
- Reload on `/admin/leads/12` stays there. With an expired `expiresAt` it goes
  to the login page and signing in returns to `/admin/leads/12`; signing in as
  sales from `/admin/settings/users` lands on the dashboard instead.
- Revoking the token server-side and then navigating gives exactly one toast and
  one redirect. Signing out in one tab signs the second tab out.
- `MOCK_TOKEN_TTL_HOURS=0.01`: sitting still on the dashboard, the timer alone
  signed the session out after 35 s with the one toast, then the default TTL was
  restored.
- With the API unreachable the panel stays signed in, shows "Unable to reach the
  server…" on the screen and does not toast on every poll.
- At 390 px: 16 px gutters on the login card, no desktop sidebar, no horizontal
  scroll on any admin screen, every topbar control ≥ 44 px, a 280 px drawer with
  the same navigation, `Escape` closes it and focus returns to the hamburger,
  tapping a link navigates and closes it, and `sna_admin_nav_open` persists.
- The public site is unaffected: 10 pages plus the 404 render with their header
  and no admin chrome, and the home page still links nothing under `/admin`
  (D24).

**Known issues**

ADD-07 (pollers), ADD-19 (the `AdminLogin` half) and ADD-28 are closed. BUG-14
and BUG-17 were already closed in prompts 11 and 02/03 and this prompt does not
reopen them: the client-side expiry, the 401 scope and the single session store
all still hold. The `AdminSettings` / `UserManagement` half of ADD-19 stays open
as ADD-19 (settings/users) for prompts 13 and 40.

One new entry under "Pending rewrites": the 26 `AdminPlaceholderPage` routes,
each with its owner prompt. The component must not exist after prompt 43.

### Prompt 13 — Admin UI kit: DataTable, FilterBar, useForm, fields, MasterDataPage, users page (2026-09-16)

**What changed**

The admin panel now has a kit instead of a pattern. A table that pages, sorts
and filters on the server; a filter row that lives in the URL; forms built from
field descriptions with the contract's own validation behind them; and
`MasterDataPage`, which is all of it wired together from one configuration
object. Prompts 14–17 write configurations, not screens. `UserManagement` is the
first thing rebuilt on it, and the `IconPicker`'s dead ids and dead keyboard are
gone.

**Files added**

| Path                                                     | What it is                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/components/admin/DataTable.jsx` (+ css)             | Server-side table: sort, select, bulk, row actions, skeleton/empty/error, phone cards |
| `src/components/admin/FilterBar.jsx` (+ css)             | Search + selects + ranges, "More filters" below 900 px, removable chips, reset        |
| `src/components/admin/PageHeader.jsx` (+ css)            | The one `<h1>` of an admin screen, its count and its primary action                   |
| `src/components/admin/FormSection.jsx` (+ css)           | `<fieldset>` + two-column grid ≥ 900 px; `FormColumn half`                            |
| `src/components/admin/AdminTabs.jsx` (+ css)             | Scrollable tabs with per-tab error badges and a roving tab order                      |
| `src/components/admin/StatusChip.jsx`                    | A record's state as a tone, never a hex                                               |
| `src/components/admin/ImageField.jsx` (+ css)            | URL + preview + Clear, and Upload / Media library **only** when handlers exist        |
| `src/components/admin/MultiSelect.jsx` (+ css)           | Ids in, ids out; searchable, creatable, `max`                                         |
| `src/components/admin/SlugField.jsx` (+ css)             | Follows the title until edited; debounced availability with a "use suggestion"        |
| `src/components/admin/SortableList.jsx` (+ css)          | Drag, Alt + ↑/↓, always-present move buttons, `aria-live` announcements               |
| `src/components/admin/EntityPicker.jsx` (+ css)          | Search-as-you-type over a service, chips, drag order when `orderable`                 |
| `src/components/admin/ToneSelect.jsx` (+ css)            | Badge colours as tone swatches painted from the tokens themselves                     |
| `src/components/admin/MasterDataPage.jsx` (+ css)        | The generic screen, plus `useMasterDataCrud(config)` for custom layouts               |
| `src/components/admin/MasterDataForm.jsx` (+ css)        | 16 field types from a list of descriptions; unowned 422 keys shown as an alert        |
| `src/components/admin/BulkActionsBar.jsx` (+ css)        | "3 selected · Activate · Deactivate · Delete", destructive actions behind a confirm   |
| `src/components/admin/RowActions.jsx` (+ css)            | Icon buttons ≥ 900 px, kebab menu below                                               |
| `src/components/admin/DeleteGuardDialog.jsx` (+ css)     | The 409 of a master-data delete, as links to what is still pointing at it (D88)       |
| `src/components/admin/index.js`                          | The kit's barrel                                                                      |
| `src/hooks/useForm.js`                                   | values / errors / touched / dirty / submit, with 422 mapping                          |
| `src/hooks/useUnsavedChanges.js`                         | `beforeunload` + the in-app guard                                                     |
| `src/contexts/NavigationGuardContext.js`                 | One `useBlocker` for the app; every dirty form registers with it (D97)                |
| `src/utils/validation.js`                                | `validate(values, descriptor, { partial })` — the mock validator's rules, client-side |
| `src/utils/slug.js`                                      | `slugify` (title → slug) and `toSlugInput` (what a slug looks like while typed)       |
| `src/pages/admin/settings/UsersPage.jsx` (+ css)         | `/admin/settings/users` — the kit's first screen                                      |
| `src/utils/__tests__/validation.test.js`                 | 27 cases: every rule, nested keys, array indices, `partial`, `fillDefaults`           |
| `src/hooks/__tests__/useForm.test.js`                    | 21 cases: dirty, dotted paths, validation, `setServerErrors`, submit, 422 and 500     |
| `src/components/admin/__tests__/DataTable.test.jsx`      | 19 cases: sort, select-all, bulk confirm, states, footer, the 390 px cards            |
| `src/components/admin/__tests__/MasterDataPage.test.jsx` | 10 cases: list, create, delete, the 409 guard, the optimistic toggle, bulk            |
| `src/components/admin/__tests__/SlugField.test.jsx`      | 10 cases: generation, the manual-edit lock, four availability states                  |
| `src/components/admin/__tests__/IconPicker.test.jsx`     | 13 cases: id shape, the retired ids, tiles, roving focus, category-aware search       |

**Files changed**

`IconPicker.jsx` (rewritten), `routes/adminRouteConfig.js` (users → `UsersPage`),
`routes/index.js` + `App.js` (data router, D97), `pages/admin/AdminSettings.js`
(tab removed, admin-only link added), `config/enums.js` (`AMENITY_CATEGORIES`
icons), `components/common/SkeletonLoaders.jsx` (`TableSkeleton`),
`services/apiError.js` + `services/http.js` (`data` on a failure,
`firstFieldMessage`), the four property tabs that used `ImageUrlHelperText`,
`property-tabs/constants.js` (two dead icon ids), `package.json` (`slugify`).

**Files removed**

`components/admin/UserManagement.jsx`, `components/admin/ImageUrlHelperText.jsx`,
`components/admin/imageFieldConfig.js` — the last two folded into `ImageField`'s
`hint` presets, which the four property tabs now read through `ImageHint`.

**Endpoints**

None added. The users page consumes `GET|POST /admin/users`,
`GET|PUT|PATCH|DELETE /admin/users/:id` and `POST /admin/users/bulk`; the kit
reads `config.service.checkSlug` for the generic `check-slug` endpoints.

**npm / env**

`slugify@1.6.9` added (§3.3). No env var, no script.

**Acceptance checklist**

- [x] `src/components/admin/index.js` exports every component of tasks 1–5; tests pass.
- [x] `/admin/settings/users` works end to end for an admin — list, filter, sort,
      paginate, create, edit, reset password, toggle, delete, bulk — and manager
      and sales get the 403 screen with no Users link in the sidebar.
- [x] `IconPicker` renders no blank tile (431 tiles across 15 categories, checked
      in the browser), is keyboard-operable, and search respects the category.
- [x] `useForm` + `useUnsavedChanges` block navigation with a confirm when dirty,
      on a link click and on the back button (router migrated to
      `createBrowserRouter`).
- [x] `npm run lint`, `npm run test:ci` (770 tests, 25 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`
      and `npm run smoke` (269/269) all pass; no console message of any kind on
      `/admin/settings/users` at 1280 px or 390 px.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 px and 390 px, console open)**

- `/admin/settings/users` as admin: 3 seed users; created a manager, renamed it,
  toggled it inactive from the row switch, filtered by role (`?role=manager`,
  one chip), reset the filters, sorted by name (`?order=desc`, `aria-sort`
  follows), changed the page size (`?perPage=10`), searched, bulk-deactivated a
  selection ("1 user updated."), reset a password, deleted the user.
- The safety rules come back from the server and are shown as the server's own
  sentence, not Laravel's generic one: deactivating yourself reverts the switch
  and toasts "The last active admin cannot be deactivated, demoted or deleted.";
  deleting yourself leaves the row in place with the same message; your own role
  select is disabled with a hint saying why.
- Unsaved changes: `Escape` on a dirty dialog asks before discarding and "Keep
  editing" returns the half-typed value; a sidebar link and the back button are
  both blocked with "You have unsaved changes…", "Stay on this page" keeps the
  URL and "Discard changes" proceeds; a clean form navigates without asking.
- 390 px: the table becomes cards — status, email and role under the name, a
  kebab with Edit / Reset password / Delete, the filters behind "More filters",
  and no horizontal scroll (`scrollWidth === clientWidth === 390`).
- `IconPicker`, opened from the property form's Amenities tab (the same
  component the legacy tabs import): 431 tiles across all 15 categories, **zero**
  without an SVG; arrow keys move the roving focus; searching "home" inside
  Finance says so instead of silently showing everything.
- Console across all of it: nothing. (The MUI Grid v2 deprecation warnings that
  appear on `/admin/dashboard` are pre-existing and belong to prompt 29.)

**Known issues**

ADD-23 is closed and the `UserManagement` half of ADD-19 is closed; the
`AdminSettings` form half stays open for prompt 40. Two new rows: NEW-28
(`mdi:stamp` on the public awareness page, owner 31) and NEW-29
(`mdi:home-check-outline` in `db.json`, which §12 puts out of reach here).

### Prompt 14 — Localities and cities: admin CRUD, public index and guide (2026-09-16)

**What changed**

Localities became a module instead of a row in a table. The admin gets a list
that filters, reorders and toggles, and a form page wide enough for a guide —
the description, the coordinates, the highlights, the connectivity pairs and the
pincodes — plus a small cities screen behind the same kit. The public site gets
`/localities` and `/localities/:slug`, so the home strip's links resolve for the
first time. `AdminNeighborhoods.js`, which knew four of a locality's twenty
fields, is gone.

**Files added**

| Path                                                               | What it is                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/pages/admin/master-data/LocalitiesPage.jsx` (+ css)           | The list: filters, drag reorder, star/active toggles, bulk, delete guard |
| `src/pages/admin/master-data/LocalityFormPage.jsx` (+ css)         | Add/edit on their own routes: five sections, map preview, repeaters      |
| `src/pages/admin/master-data/CitiesPage.jsx`                       | Name, state, slug, active — the kit's dialog, with the 409 guard         |
| `src/pages/public/Localities.jsx` (+ css)                          | `/localities`: zone chips and a sort in the URL, cards, states           |
| `src/pages/public/LocalityDetail.jsx` (+ css)                      | `/localities/:slug`: hero, guide, connectivity, trend, map, CTA          |
| `src/components/sections/locality/LocalityCard.jsx` (+ css)        | One card, two variants — the index grid and the home strip               |
| `src/components/sections/locality/LocalityHero.jsx`                | Image, breadcrumbs, the page's one `<h1>`, three key figures             |
| `src/components/sections/locality/LocalityGuide.jsx`               | The description (through `LegacyHtml`) and the checked highlights        |
| `src/components/sections/locality/LocalityConnectivity.jsx`        | The `{label, value}` pairs as a definition list                          |
| `src/components/sections/locality/LocalityProperties.jsx`          | **temporary** — six listings and a link to the search (prompt 26)        |
| `src/components/sections/locality/LocalityCta.jsx`                 | `LeadForm`, source `locality-page`, the locality in the requirement      |
| `src/components/sections/locality/LocalitySections.module.css`     | The guide's shared styles                                                |
| `src/components/sections/locality/index.js`                        | The barrel the detail page imports                                       |
| `src/components/common/MapEmbed.jsx` (+ css)                       | A map from `lat,lng` with no key (D42), and its "no coordinates" box     |
| `src/pages/public/__tests__/LocalityDetail.test.jsx`               | 6 cases: every section, the thin locality, 404, the failure state        |
| `src/components/sections/locality/__tests__/LocalityCard.test.jsx` | 8 cases: both variants, the empty fields, the monogram box               |

**Files changed**

`routes/publicRoutes.js` (two URLs), `routes/adminRouteConfig.js` (four screens
off the placeholder), `components/sections/home/ExploreLocalities.jsx` (+ css —
now `LocalityCard` and a "View all localities" link), `components/common/LeadForm.jsx`
(`hiddenFields`), `services/masterDataService.js` (`adminCrud`),
`components/admin/MasterDataPage.jsx` (`onCreate` / `onEdit` / `onMutated` /
`renderOrderItem`, reordering gated on `sort=order`, page-aware `order` values),
`components/admin/RowActions.jsx` (`href` actions open in a new tab),
`components/admin/index.js` (a note on import order), `src/test-utils.jsx`
(`initialEntries`).

**Files removed**

`src/pages/admin/AdminNeighborhoods.js` — every capability it had is on the new
screens: the image is an `ImageField` with a preview, the city is a select over
`MasterDataContext.cities` rather than a free-text name match, the active toggle
is the kit's optimistic switch, and delete now explains itself instead of
toasting the 409.

**Endpoints**

None added. The screens consume `GET /localities`, `GET /localities/slug/:slug`,
`GET /cities`, `GET /properties?localityId=`, `POST /leads` and the
`/admin/localities*` + `/admin/cities*` CRUD, bulk and `check-slug` of §5.14.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Admin: create, edit, reorder, toggle and delete work end to end against
      the mock — verified in the runtime db through `GET /api/admin/localities/1`
      after each write (coordinates, highlights, order, `isFeatured`).
- [x] Public: `/localities?zone=east` filters to five; `/localities/whitefield`
      renders the hero, the guide, connectivity, the trend note, the map, three
      listings with "View all 3 properties" and the CTA; a lead submitted there
      arrives as `{ source: 'locality-page', requirement: { localityId: 1 } }`.
- [x] `AdminNeighborhoods.js` deleted; the home strip's links resolve.
- [x] `npm run lint`, `npm run test:ci` (784 tests, 27 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`
      and `npm run smoke` (269/269) all pass; no console message of any kind on
      the four new screens at 1280 px or 390 px.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 px and 390 px, console open)**

- `/localities`: 20 cards, one `<h1>`, "20 localities". "East Bengaluru" writes
  `?zone=east` and leaves five cards, all east; the sort select writes
  `?sort=name` and Bellandur comes first; `?zone=unknown` shows all twenty
  rather than none (§7).
- `/localities/whitefield`: `<h1>` "Properties in Whitefield", breadcrumbs Home ›
  Localities › Whitefield, then About / Connectivity / Price trend / the map /
  Properties in Whitefield / the CTA. The map iframe is
  `…maps?q=12.9698,77.75&z=15&output=embed` (no key, D42). Three listings and
  "View all 3 properties" → `/properties?localityId=1`.
- The CTA filed lead #46: `source: locality-page`, `requirement.localityId: 1`,
  phone normalised to `+91…`; the form swaps to its thank-you panel and toasts.
- An unknown slug and an inactive locality both render the 404 page; the admin
  still opens the inactive one.
- `/admin/master-data/localities`: sorted by `order` it is the reorder list —
  two "Move up" presses put Electronic City on top and a reload reads
  `Electronic City:0, Whitefield:1, Sarjapur Road:2` from the API. Sorting by
  name brings the table back (Image, Name, Zone, Avg ₹/sq ft, Properties,
  Updated, Featured, Active, Actions). The star toggles `isFeatured` on the
  server, `?zone=east` leaves five rows, and "View on site" is a real link to
  `/localities/<slug>` with `target="_blank"`.
- Deleting Whitefield (three listings point at it) answers 409 and the guard
  dialog lists them with links to their admin pages; deleting Bengaluru on the
  cities screen lists all twenty localities the same way (D88).
- The form: changing the coordinates and leaving the field moves the preview to
  `…q=12.9,77.6…`; adding a highlight, moving it up and saving writes exactly
  that, and `seo.focusKeyword` survives the `PUT` untouched. Naming a new
  locality "Whitefield" shows "Already taken" under the slug before the save and,
  on the save, "The slug has already been taken. Try “whitefield-2”." under the
  same field. Creating lands on `…/edit/21`; "Save & view" lands on the public
  page; leaving a dirty form asks first and "Stay on this page" keeps the URL.
- Unfeaturing Devanahalli in the admin removes it from the home strip on the
  next visit — the master-data cache (D93) is refreshed by the write.
- 390 px: `scrollWidth === clientWidth === 390` on all four screens; the zone
  chips scroll sideways; the hero is 320 px on the desktop and 220 px minimum on
  a phone (285 px with all three figures); the admin table becomes cards; the
  form's actions sit in a sticky bar above the safe area and the header's copy
  of them is hidden, so only one "Save" is reachable.
- Console: nothing on any of the new screens. (`/admin/dashboard` still logs the
  MUI Grid v2 deprecations — pre-existing, prompt 29.)

**Known issues**

BUG-10's `?area=` half is closed. Nothing new was found. The "Updated" column of
the localities table is display-only: the contract's locality sorts are
`order|name|propertyCount` (§6.2, `mock-server/schemas/models.js`), and a header
that sorts by nothing is worse than a header that does not offer to.

### Prompt 15 — Master data: property types, amenities, badges and banks (2026-09-16)

**What changed**

The four collections the rest of the site reads — property types, amenities,
badges and banks — are manageable at last, and the public site reads them from
the context instead of from constants in the bundle. `src/config/adminConstants.js`
is gone with them, and with it `DEFAULT_BANKS`, which named six real banks
(HDFC, SBI, Axis, ICICI, Kotak, LIC Housing) and gave each of them an invented
interest rate on every property page.

**Files added**

| Path                                                              | What it is                                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/admin/master-data/masterDataConfigs.js` (+ css)        | The four `MasterDataPage` configurations, and the cells they share                                                                               |
| `src/pages/admin/master-data/PropertyTypesPage.jsx`               | `/admin/master-data/property-types`                                                                                                              |
| `src/pages/admin/master-data/AmenitiesPage.jsx`                   | `/admin/master-data/amenities`                                                                                                                   |
| `src/pages/admin/master-data/BadgesPage.jsx`                      | `/admin/master-data/badges`                                                                                                                      |
| `src/pages/admin/master-data/BanksPage.jsx`                       | `/admin/master-data/banks`                                                                                                                       |
| `src/hooks/useMasterData.js`                                      | `usePropertyTypes`, `useAmenitiesGrouped`, `useAmenities`, `useBadgeMap`, `useBanks`, `useLocalities`, `useDevelopers`, `useCities`, `toOptions` |
| `src/hooks/__tests__/useMasterData.test.js`                       | 17 cases: order, segment, grouping, the inactive ones, no provider                                                                               |
| `src/pages/admin/master-data/__tests__/masterDataConfigs.test.js` | 56 cases: every config against its write schema, plus the rules                                                                                  |

**Files changed**

`mock-server/lib/crud.js` (`?withUsage=true` on `GET /admin/<resource>/:id`),
`mock-server/routes/masterData.js` (`propertyCount` + `sort=propertyCount` for
amenities and badges), `mock-server/__tests__/content.test.js` (two suites),
`src/services/endpoints.js` (`withUsage` on the `adminResource` read),
`src/contexts/MasterDataContext.js` (`refresh(collection)`),
`src/components/admin/MasterDataPage.jsx` (`subtitle`, `formFooter`, `groupBy` /
`groupSort`, `reorderHint`, `confirmSave`, `onMutated(config.key)`),
`src/components/admin/DataTable.jsx` (+ css — `groupBy` heading rows),
`src/components/admin/DeleteGuardDialog.jsx` (an optional confirm),
`src/components/admin/MasterDataForm.jsx` (+ css — the icon placeholder),
`src/routes/adminRouteConfig.js` (four screens off the placeholder),
`src/config/enums.js` (`LEAD_STATUS` icons, `FAQ_CATEGORIES` tones,
`LEAD_SOURCES.labelOfAny`), `src/utils/validation.js` (`ICON_ID_PATTERN`),
`src/components/common/PropertyCard.jsx` (+ css — badges through `ui/Chip`),
`src/components/common/PropertyFilters.jsx`, `src/pages/public/PropertyListing.jsx`,
`src/utils/adapters/legacyProperty.js` (`propertyTypeId`),
`src/components/sections/property/FinanceGuide.jsx` (+ css),
`src/pages/admin/property-tabs/AmenitiesTab.jsx` + `constants.js`,
`src/pages/admin/AdminLeads.js`, `LeadDetail.js`, `FaqManager.jsx`,
`AdminArticles.js`, `ArticleForm.jsx`,
`src/components/layout/NotificationsMenu.jsx`,
`src/contexts/LeadNotificationsContext.js`, `src/components/ui/tones.js`,
`.prettierignore`, `docs/*`.

**Files removed**

`src/config/adminConstants.js`. Everything in it now lives where §6.17 says it
should: `LEAD_STATUS_CONFIG`/`LEAD_STATUS_OPTIONS` → `LEAD_STATUS` (which gained
an `icon` per entry), `formatLeadSource`/`LEAD_SOURCE_OPTIONS` →
`LEAD_SOURCES.labelOfAny` and `LEAD_SOURCES.options`, `FAQ_CATEGORIES` +
`FAQ_CATEGORY_TONES` → `FAQ_CATEGORIES` (which gained a `tone` per entry),
`ARTICLE_CATEGORIES` → `articleService.categories()`, and `DEFAULT_BANKS` →
the `banks` collection. The five-group `AMENITY_CATEGORIES` of
`property-tabs/constants.js` went with them.

**Endpoints**

None added. `GET /admin/<resource>/:id` accepts `withUsage=true` on every
resource the CRUD factory serves, answering with the `usedBy` list a 409 would
have carried; `/admin/amenities` and `/admin/badges` now compute `propertyCount`
and accept `sort=propertyCount`. Both are in `src/services/endpoints.js` and
`docs/API_CONTRACT.md`.

**npm / env**

Nothing added. `.prettierignore` gained `docs/archive/`.

**Acceptance checklist**

- [x] The four screens list, filter, sort, reorder, toggle, create, edit, delete
      and bulk end to end — verified through `GET /api/admin/<collection>` after
      every write, and the collections end the run at their seed totals (17 types,
      46 amenities, 8 badges, 6 banks).
- [x] Delete guards render their usages (9 listings for "New Launch", 40 for
      "Power Backup", 16 for "Apartments"); the segment-change confirm quotes
      "Used by 16 properties" and cancelling leaves `segment: residential`.
- [x] Card badges, the listing's type select, the finance bank cards and the
      property form's amenities all read master data; `grep -rn DEFAULT_BANKS src`
      → 0.
- [x] `npm run lint`, `npm run test:ci` (857 tests, 29 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`,
      `npm run test:mock` (123 tests) and `npm run smoke` (269/269) all pass.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 px and 390 px, console open)**

- `/admin/master-data/amenities` opens on the grouped table: a
  `<th scope="colgroup">` per category, 46 rows, an icon, the slug under the
  name, a category chip and the listing count. Creating "Pet Park" with the icon
  `DOG` is refused under the field ("Use an Iconify MDI id in lower case, like
  mdi:home-city-outline") and the preview shows the muted placeholder; `mdi:dog`
  saves, the slug having followed the name to `pet-park`. `?category=kids` leaves
  one group and one row, the row switch turns it inactive on the server, and the
  public `GET /amenities?category=kids` stops returning it. Deleting it says so.
- `/admin/master-data/badges` shows the tone swatch, the badge as a card will
  render it, the slug, the icon id, the count and the order. Deleting "New Launch"
  answers 409 and the guard lists the nine listings with links to their admin
  pages.
- `/admin/master-data/property-types` opens as the reorder list (17 rows, each
  with its icon, segment and count) because `order` is the default sort; sorting
  by anything else brings the table back. Editing "Apartments" shows the SEO
  placeholder, and changing its segment to Commercial asks first — "Used by 16
  properties — each keeps its own segment, so any that should move have to be
  edited too" — with the sixteen listed. Cancelling leaves the record untouched.
- `/admin/master-data/banks` shows the logo, the name over its fee note, the rate
  range, the tenure and the LTV. Saving 9 % from / 8 % up to is refused on the
  field; 8.35–8.95 saves.
- A property type created in the admin appears in `/properties`' type select in
  the same session without a reload — the `sna_master_data_cache` entry is
  rewritten by the write (D93). The select lists all seventeen types, not the two
  hardcoded ones.
- A property page's "Bank Loan Assistance" tab shows the six seed banks with
  their own rates, max loans and fee notes, and the banner and the two tiles read
  "8.35 % p.a." and "Up to 90 %" off those records instead of asserting them.
- 390 px: `scrollWidth === clientWidth === 390` on all four screens; the tables
  become cards with the category heading between them.
- Console: nothing on any of the four screens or on the property page.
  (`/admin/dashboard` still logs the MUI Grid v2 deprecations — pre-existing,
  prompt 29.)

**Known issues**

BUG-05's bank half is closed. Two notes rather than new defects: the admin
amenities table groups its categories in the API's alphabetical order
(`sort=category` is a string sort on the field) while the public site groups them
in `AMENITY_CATEGORIES` order — the contract's sort, not a defect of the screen;
and three legacy admin screens (`AdminArticles`, `FaqManager`, `AdminSeo`) still
carry `rgba(201,168,108,0.04)` — the HOM gold as a row hover — which
`check:traces` does not catch because it only scans hex literals (owners 33, 17,
37).

### Prompt 16 — Developers (builders): admin CRUD and the public builder pages (2026-09-16)

**What changed**

Builders became a module. The admin gets a list that filters, reorders and
toggles, and a form page wide enough for a profile — the logo, the cover, the
counts, the RERA registrations and the highlights — and the public site gets
`/builders` and `/builders/:slug`, so the eight fictional developers in the seed
have somewhere to be read rather than only being a foreign key on a property.

Only the name is required, which is what the property form's quick-create needs
in prompt 20: `POST /admin/developers { "name": "Test Builders" }` already
answers 201 with the slug generated and every other field at its default, so no
schema had to be relaxed.

**Files added**

| Path                                                                 | What it is                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/pages/admin/master-data/DevelopersPage.jsx` (+ css)             | The list: filters, drag reorder, star/active toggles, bulk, delete guard    |
| `src/pages/admin/master-data/DeveloperFormPage.jsx` (+ css)          | Add/edit on their own routes: Basics, Facts, Highlights, Status, SEO note   |
| `src/pages/public/Builders.jsx` (+ css)                              | `/builders`: a search and a sort in the URL, the card grid, the states      |
| `src/pages/public/BuilderDetail.jsx` (+ css)                         | `/builders/:slug`: hero, figures, profile, projects, CTA                    |
| `src/components/sections/developer/DeveloperCard.jsx` (+ css)        | One card, two variants — the index grid and the home row (27)               |
| `src/components/sections/developer/DeveloperLogo.jsx`                | The white logo box, with the builder's initials when there is no logo       |
| `src/components/sections/developer/DeveloperHero.jsx`                | Cover, logo, the page's one `<h1>`, headquarters and the website link       |
| `src/components/sections/developer/DeveloperStats.jsx`               | Established / total / ongoing / completed as `StatCard`s, RERA ids as chips |
| `src/components/sections/developer/DeveloperProperties.jsx`          | **temporary** — twelve listings and a link to the search (prompt 26)        |
| `src/components/sections/developer/DeveloperCta.jsx`                 | `LeadForm`, source `developer-page`, the page and the builder carried in    |
| `src/components/sections/developer/DeveloperSections.module.css`     | The sections' shared styles                                                 |
| `src/components/sections/developer/index.js`                         | The barrel the detail page imports                                          |
| `src/components/sections/developer/__tests__/DeveloperCard.test.jsx` | 9 cases: both variants, the empty fields, zero projects, the initials box   |
| `src/pages/public/__tests__/BuilderDetail.test.jsx`                  | 7 cases: every section, the name-only builder, the lead, 404, the failure   |

**Files changed**

`routes/publicRoutes.js` (two URLs), `routes/adminRouteConfig.js` (three screens
off the placeholder), `components/common/LeadForm.jsx` (a field may carry a
`defaultValue`; empty optional boxes are left out of the body — NEW-31),
`docs/*`. `routes/paths.js` already carried `builders` / `builder(slug)` /
`adminDevelopers*`, as prompt 14 left it.

**Files removed**

None.

**Endpoints**

None added. The screens consume `GET /developers`, `GET /developers/slug/:slug`,
`GET /properties?developerId=`, `POST /leads` and the `/admin/developers*` CRUD,
bulk and `check-slug` of §5.14.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Admin: create, edit, reorder, toggle, bulk and delete work end to end
      against the mock — verified through the API after each write (`order`
      rewritten by a drag, `isFeatured` by the star, the public list re-sorted).
- [x] Minimal create succeeds: `POST /admin/developers { name }` → 201,
      `slug: "test-builders"`, `propertyCount: 0`, every other field defaulted.
- [x] Deleting `aurelia-estates` answers 409 and the guard lists its eight
      listings; deleting a builder with none is allowed.
- [x] `/builders` renders the eight seed builders with their project counts and
      featured badges; `?q=test` narrows to one and `?sort=name` reorders.
- [x] `/builders/aurelia-estates` renders the hero, the figures, the RERA chip,
      the profile, the highlights, twelve projects with "View all 8 projects"
      and the CTA; the CTA filed lead #46 with `source: developer-page`,
      `pageSlug: aurelia-estates`-style slug and the prefilled message.
- [x] `npm run lint`, `npm run test:ci` (873 tests, 31 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`
      and `npm run smoke` (269/269) all pass. `test:mock` was not needed — no
      schema changed.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, 1280 px and 390 px, console captured)**

- `/builders`: one `<h1>`, "8 builders", four columns of cards, each with the
  logo box, the name, "N projects" and two lines of summary. The sort select
  writes `?sort=name`; the search box writes `?q=` after a 300 ms pause and
  `?q=test` leaves one card.
- `/builders/aurelia-estates`: breadcrumbs Home › Builders › Aurelia Estates, the
  charcoal hero with the logo box and the headquarters, "At a glance" with
  Established 2004 and the three counts, the RERA registration as a chip, "About
  Aurelia Estates" with the four highlights beside it, "Projects by Aurelia
  Estates" with "View all 8 projects" → `/properties?developerId=1`, and the CTA.
- A builder created from a name alone (`Test Builders`) renders the hero with its
  initials in the logo box, no "At a glance", no profile, no projects — and the
  CTA, which is never hidden. Submitting it filed the lead; deleting the builder
  afterwards was allowed.
- The website link carries `rel="noopener noreferrer nofollow"` and
  `target="_blank"`. (`noopener` alone is an ESLint warning `build:ci` treats as
  an error, so the pair the rest of the site uses is what it carries.)
- 390 px: `scrollWidth === clientWidth` on both pages, the figures wrap to 2 × 2,
  the RERA chip wraps to its own line, the card grid is one column.
- `/admin/master-data/developers` opens as the reorder list (eight rows, each
  with its headquarters and count) because `order` is the default sort; sorting
  by name brings the table back — Logo, Name (with the slug and the
  headquarters), Projects, Established, Updated, Featured, Active.
- The form shows all five sections and loads the seed record intact; the slug
  field reports "This URL is available", the short description counts 115/300,
  and the SEO note says the panel arrives in prompt 36.
- Console: nothing but React's own "Download the React DevTools" notice on either
  public page.

**Known issues**

NEW-31 (`LeadForm` refused a lead whose optional e-mail box was empty) was found
here and is closed here; it was refusing leads on the locality CTA too. NEW-30 is
new and belongs to prompt 41: a counted figure is still at zero in a render that
never gets a second animation frame, so the prerenderer has to emulate
`prefers-reduced-motion: reduce`. Two notes rather than defects: the "Updated"
column is display-only, because the contract's developer sorts are
`order|name|propertyCount` (§6.5, `mock-server/schemas/models.js`) and a header
that sorts by nothing is worse than a header that does not offer to; and
`/properties?developerId=` does not filter yet — the legacy listing only knows
`?developer=<name>` — which prompt 26 fixes with the rest of the engine.

**Next prompt: 17 — Testimonials, team, partners and FAQs.**

### Prompt 17 — Testimonials, team members, partners and FAQs (2026-09-16)

**What changed**

The four small content collections of §6.9 became screens, and the pieces the
public site renders them with became components rather than page-local markup.

The FAQ manager is a rewrite rather than a repair: the boilerplate's screen
computed a swap against the **filtered** array and wrote two sequential `PUT`s,
so dragging inside a category filter moved the wrong records (NEW-23, ADD-21).
A move is now one `PATCH { order }` on the record that travelled, carrying the
position of the row it landed on, and the API settles the rest of the collection
— sorted by `order`, ties to the newest `updatedAt`, renumbered `1..n` (D98,
`docs/API_CONTRACT.md` §5.8). That rule holds for every collection with an
`order`, so the reorder on localities, property types, amenities, badges and
banks became correct under a filter at the same time.

`FaqAccordion` is now the only accordion an FAQ is rendered by — the home band,
`/insights/faqs`, a property page's questions (prompt 24) and the CMS `faq` block
(prompt 30) all mount it — and `/insights/faqs` reads its contact details from
`siteSettings.general` instead of printing a US phone number (ADD-17, D83).

**Files added**

| Path                                                                    | What it is                                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/pages/admin/content/contentConfigs.js` (+ css)                     | The four `MasterDataPage` configurations, and `stripHtml` for the answer cell |
| `src/pages/admin/content/FaqsPage.jsx`                                  | `/admin/faqs` — replaces `FaqManager`                                         |
| `src/pages/admin/content/TestimonialsPage.jsx`                          | `/admin/testimonials` — was a placeholder                                     |
| `src/pages/admin/content/TeamPage.jsx`                                  | `/admin/team` — was a placeholder                                             |
| `src/pages/admin/content/PartnersPage.jsx`                              | `/admin/partners` — replaces `AdminPartners`                                  |
| `src/components/sections/shared/FaqAccordion.jsx` (+ css)               | One accordion for every FAQ on the site, with `<mark>` search highlighting    |
| `src/components/sections/shared/TestimonialsSection.jsx` (+ css)        | The quote carousel, with the D41 sample gate and a "Read more" dialog         |
| `src/components/sections/shared/TeamSection.jsx` (+ css)                | Advisor cards: photo or initials, RERA, contact and social links              |
| `src/components/sections/shared/ContactMethods.jsx` (+ css)             | Phone / e-mail / WhatsApp from the settings, each hidden when unset (D83)     |
| `src/components/sections/shared/index.js`                               | The barrel the pages import                                                   |
| `src/components/sections/shared/__tests__/FaqAccordion.test.jsx`        | 12 cases: single-open, keyboard, `aria-controls`, highlighting, empty state   |
| `src/components/sections/shared/__tests__/TestimonialsSection.test.jsx` | 9 cases: the cards, the sample gate with `NODE_ENV` both ways, "Read more"    |
| `src/components/sections/shared/__tests__/TeamSection.test.jsx`         | 6 cases: the card, the contact links, initials, no contact row, empty         |

**Files changed**

`mock-server/lib/crud.js` (the `order` renumbering, D98),
`mock-server/routes/masterData.js` (the testimonials `isSample` admin filter, the
`name` and `updatedAt` sorts the tables offer), `mock-server/schemas/models.js`
(the same two `sortable` lists), `mock-server/__tests__/content.test.js` (4 cases
for the renumbering), `src/services/endpoints.js` (`isSample` on the admin
testimonial list), `src/components/admin/MasterDataPage.jsx` (the single-`PATCH`
reorder, `render(row, helpers)`, "Back to the table"),
`src/components/admin/SortableList.jsx` (`onReorder` reports the move),
`src/components/admin/MasterDataForm.jsx` (+ css — the `rating` control),
`src/components/sections/home/FaqSection.jsx` (+ css — `FaqAccordion`),
`src/components/sections/home/PartnersSection.jsx` (+ css — the §6.9 fields, a
`category` prop, `LazyImage` with a fallback, no greyscale filter, a static grid
under reduced motion), `src/pages/public/FAQs.js` → `FAQs.jsx` (+ css — rewritten),
`src/routes/adminRouteConfig.js`, `docs/*`.

**Files removed**

`src/pages/admin/FaqManager.jsx` (726 lines) and
`src/pages/admin/AdminPartners.jsx` (573 lines), with the `logo`/`website`
adapter the second one carried.

**Endpoints**

None added. `GET /admin/testimonials` gained the `isSample` filter and the
`name`/`updatedAt` sorts; `GET /admin/faqs` gained `updatedAt`. `PATCH` on any
resource with an `order` now renumbers that collection (D98) — documented in
`docs/API_CONTRACT.md` §5.8 as its own sub-section.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Four admin pages work end to end against the mock: a partner created in the
      dialog reached the home marquee, was edited, bulk-deactivated and deleted;
      the FAQ reorder is correct under a category filter; deleting a team member
      nine listings point at answers 409 and the guard lists all nine with links.
- [x] `/insights/faqs` renders `FaqAccordion`, settings-driven contacts and the
      search + category URL sync (`?q=RERA` highlights two matches across three
      results, `?category=legal` narrows to two). The home FAQ band renders the
      same accordion from `showOnHome`.
- [x] `TestimonialsSection`, `TeamSection` and `PartnersSection` render from seed
      data — the first two through their unit tests (the pages that mount them
      are prompts 27 and 30), the third on the home page.
- [x] `FaqManager.jsx` and `AdminPartners.jsx` are deleted.
- [x] `npm run lint`, `npm run test:ci` (900 tests, 34 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run test:mock`
      (127 tests) and `npm run smoke` (269/269) all pass; `npm run validate:seed`
      too, since `models.js` changed.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, 1360 px and 390 px, console captured)**

- `/insights/faqs`: one `<h1>`, breadcrumbs Home › FAQs, nine tabs (All plus the
  eight categories the seed fills), questions grouped under a heading per
  category while All is active. Opening a question sets `aria-expanded="true"`
  and reveals the panel its `aria-controls` names. Typing "RERA" writes `?q=RERA`
  after the debounce and marks the matches; "zzzz" shows "No questions match"
  with "Clear search". The Legal tab writes `?category=legal`.
- The contact cards read `tel:+919800000001`, `mailto:info@squaresnacres.com` and
  `https://wa.me/919800000000?text=…` — all three from the settings record.
- `/admin/faqs` filtered to Legal: the ↑ button on the second row moved it to the
  top; `GET /api/admin/faqs?perPage=all&sort=order` then read `1..20` with no gap
  and the eighteen other questions in their original places. The same move
  downwards put the row back.
- "Back to the table" shows Order, Question (with two clamped lines of the
  answer), Category, Home, Updated, Active and the row menu. Toggling Home on
  "Can an NRI buy property in Bengaluru?" put it on the home page under the NRI
  tab within one reload.
- `/admin/testimonials`, `/admin/team`, `/admin/partners`: the columns of §4.1,
  the dialog forms with their fields, the five-star rating as a radio group.
- Home: the partner marquee draws six logos; with `prefers-reduced-motion: reduce`
  the same six are a static grid. A logo that cannot load falls back to the
  partner's name, clamped to two lines.
- 390 px: `scrollWidth === clientWidth` on `/insights/faqs`, the tabs scroll
  horizontally, the contact cards and the lead form stack.
- Console: no errors or warnings from the app on any page (the only entries are
  the sandbox's own TLS refusals for the Cloudinary and Iconify hosts).

**Known issues**

None opened. NEW-23 is closed; the FAQ halves of ADD-21 and ADD-17 are closed and
annotated. One note for prompt 32: `FaqAccordion` renders answers through the
temporary `LegacyHtml`, which is now in "Pending rewrites" under its own row —
`SafeHtml` replaces it, and the same prompt turns the FAQ form's HTML textarea
into the editor.

**Next prompt: 18 — Property form foundation.**

### Prompt 18 — Property form foundation: reducer, validators, rail, autosave, payload (2026-09-16)

**What changed**

`/admin/properties/add` and `/admin/properties/edit/:id` are a new screen. The
boilerplate's `PropertyForm.jsx` held the HOM shape in `useState`, autosaved
every thirty seconds whether or not anything had changed, and has had saving
disabled since prompt 11 because its payload builder wrote snake_case columns
that no longer exist. What replaces it is an architecture rather than a screen:
a reducer that owns the §6.1 record, section validators keyed by dotted path,
`fromRecord`/`toPayload` as the only two places the contract is translated, and
a shell of sixteen tabs with a status rail beside them.

The point of the split is that prompts 19–21 write **fields**, not plumbing. A
tab reads `values`, writes through `setField`/`addItem`/`removeItem`/`moveItem`/
`updateItem`, and renders `errors[path]`; it knows nothing about the route, the
draft, the API or the rail. Every field of §6.1 is already carried — the reducer
holds it, the validators check it and `toPayload` sends it — so the fifteen tabs
that are still placeholders lose nothing when a listing is saved through them.

Saving works end to end today for the fields the shell owns: a listing created
from the Basics fields alone reaches the API, and the `PUT` that replaces a
seeded property returns a record byte-identical to the one it started from
except for `updatedAt`/`updatedBy` (verified against the mock, see the QA below).

**Files added**

| Path                                                      | What it is                                                                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/properties/PropertyFormPage.jsx` (+ css) | The route: the fetch, the four states of §8.2, the header, the layout                                                            |
| `…/property-form/initialState.js`                         | `createInitialState()` (every key of §6.1) and the ten row factories, with `tmp-<n>` ids                                         |
| `…/property-form/reducer.js`                              | Twelve actions with creators; `createFormState({ propertyId, record })`                                                          |
| `…/property-form/usePropertyForm.js`                      | The hook: dirty tracking, the draft, the unsaved guard, `save`/`duplicate`/`remove`, 422/409 mapping, tab jumps                  |
| `…/property-form/fromRecord.js`                           | Admin record → form values: defaults filled, embeds dropped, lists sorted and renumbered                                         |
| `…/property-form/toPayload.js`                            | Form values → the write body: tmp ids and empty rows gone, `''` → `null`, one cover, `order` 1..n, `seo.slug` mirrored           |
| `…/property-form/validators/property.js`                  | The seventeen validators of §4.4, including `validateForActivation` (blockers + warnings)                                        |
| `…/property-form/validators/index.js`                     | The barrel, `validateAll` and `validateSection`                                                                                  |
| `…/property-form/completeness.js`                         | `computeCompleteness` — fourteen weighted items totalling 100 — and `completenessTone`                                           |
| `…/property-form/tabs.js`                                 | The sixteen-tab registry (key, label, icon, component, validator, field prefixes) + `groupErrorsByTab` / `firstTabWithErrors`    |
| `…/property-form/PropertyFormShell.jsx`                   | Draft banner, tab strip, panels, rail placement, the phone's sticky Save bar                                                     |
| `…/property-form/StatusRail.jsx` (+ css)                  | Status switches, availability, priority, the meter and its checklist, the address, "Last saved", the save menu, duplicate/delete |
| `…/property-form/DraftBanner.jsx`                         | "Restore unsaved draft from 5 minutes ago?" — Restore / Discard                                                                  |
| `…/property-form/PropertyFormContext.js`                  | What a tab is given; `usePropertyFormContext()`                                                                                  |
| `…/property-form/tabs/PlaceholderTab.jsx`                 | The alert naming the prompt that writes a tab                                                                                    |
| `…/property-form/tabs/BasicsTab.jsx`                      | The shell-owned fields, inside that alert until prompt 19                                                                        |
| `…/property-form/__tests__/*.test.js`                     | 102 cases across reducer, `toPayload`, `fromRecord`, validators and completeness                                                 |

**Files changed**

`src/routes/adminRouteConfig.js` (both property routes → `PropertyFormPage`),
`src/utils/format.js` (`formatTime`, for the rail's "Draft saved 10:42"),
`docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Files removed**

`src/pages/admin/AddProperty.js` and `src/pages/admin/EditProperty.js` — two
wrappers whose whole body was `<PropertyForm propertyId={id} />`. The legacy
`PropertyForm.jsx` and `property-tabs/*` stay on disk, unrouted, until prompt 21.

**Endpoints**

None added. The form consumes `GET/POST/PUT/DELETE /admin/properties`,
`POST /admin/properties/:id/duplicate` and `GET /admin/properties/check-slug`.
Storage: `sna_property_draft:<id|new>` (§4.2), written every 10 s while dirty.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] The sixteen-tab shell, the rail, autosave with a restore banner, the
      unsaved guard, the completeness meter and the save/duplicate/delete flows
      all work against the mock; a create redirects to `/admin/properties/edit/<id>`
      and a `PUT` keeps `viewCount`, `enquiryCount` and `publishedAt`.
- [x] Reducer, `toPayload`, `fromRecord`, validators and completeness are unit
      tested (102 cases; the suite is 1 000 tests over 39 files).
- [x] Sales open the form read-only — banner, disabled controls, no actions, no
      autosave. Activation blockers refuse a publication and jump to the tab
      holding the first one. A 409 paints the slug field with the free variant.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` (0 warnings),
      `npm run check:traces` (0 findings) and `npm run smoke` (269/269) pass, as
      do `npm run test:mock` (127) and `npm run validate:seed`, untouched though
      they are.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, console captured)**

- `/admin/properties/add` at 1360 px: one `<h1>` "Add property", breadcrumb
  Properties › Add property, sixteen tabs in the §4.6 order, the rail beside the
  form. Saving an empty form toasts "Please fix 4 fields." and badges Basics (3)
  and Location (1); the strip's red counts name exactly the fields refused.
- Typing a title fills the slug (`qa-prompt-eighteen-listing`) while it is
  locked. Turning "Published on site" on with no images leaves the switch off,
  toasts "This listing is not ready to publish…" and opens Basics on the first
  blocker. "Save as inactive" then creates the listing: the URL becomes
  `/admin/properties/edit/41`, the heading becomes "Edit: …" and the rail reads
  "Last saved 0 seconds ago".
- Editing the title and waiting ten seconds writes
  `sna_property_draft:41`; a reload offers "Unsaved changes were found in this
  browser" and Restore puts the edited title back. Saving clears the key.
- Duplicate opens the copy at `/edit/42` titled "… (Copy)", inactive; Delete
  confirms and returns to `/admin/properties`. `/admin/properties/edit/99999`
  renders "Property not found" with a link back.
- `/admin/properties/edit/1` (a complete seeded listing): the meter reads 100 %
  and the checklist 14 of 14, "View on site" links to
  `/properties/lakeview-heights-3-bhk-apartment-in-whitefield`, and the publish
  switch turns off and on again without complaint. ←/→/Home/End move the tabs.
- A slug that is already taken: the field says "Already taken." with
  "Use “…-2”" before the save, and the 409 that follows paints the field with
  "The slug has already been taken. Try “lakeview-heights-3-bhk-whitefield-2”."
  and badges Basics.
- 390 px: `scrollWidth === clientWidth`, the rail is a "Status & actions"
  accordion above a horizontally scrolling tab strip, and Save / Save as
  inactive sit in the sticky bottom bar.
- Signed in as sales: the "Read-only access" banner, every control disabled, no
  Save, Duplicate or Delete, and no draft written.
- Console: no errors or warnings from the app (the only entries are the
  deliberate 404 of the missing-property check, the 409 of the slug clash, and
  the sandbox's TLS refusals for the Cloudinary and Iconify hosts).
- Against the API directly: `POST` with `toPayload(basics only)` → 201 inactive
  with zeroed counters; `PUT` of `toPayload(fromRecord(record))` on the seeded
  property 1 → 200, and the record that comes back is identical to the one that
  went in apart from `updatedAt`/`updatedBy` — images, unit configurations,
  FAQs, specifications, amenity ids and the whole `seo` branch included.

**Known issues**

None opened. Three rows joined "Pending rewrites": the unrouted legacy form and
its tabs (prompt 21), the Basics fields living inside a placeholder alert
(prompt 19), and the fifteen placeholder tabs (19–21, with the SEO panel in 36).
`PropertyForm saving disabled` is closed — saving works, on the new form.

**Next prompt: 19 — Property form tabs 1–6.**

### Prompt 19 — Property form tabs 1–6: basics, location, pricing, area, units, media (2026-09-16)

**What changed**

Six of the sixteen tabs stopped being placeholders. Prompt 18 built the
machinery — a reducer holding the §6.1 record, validators keyed by dotted path,
`fromRecord`/`toPayload`, a rail — and put nine fields inside an alert so a
listing could be created at all. This prompt writes the fields: everything of
§6.1 that belongs to Basics, Location, Pricing, Area & configuration, Unit
configurations and Media now has a control, and the alert is gone.

The tab that decides what the other five show is Basics, and the rules it
decides by are not written inside it. `fieldRules.js` answers "does this listing
have bedrooms / a possession date / a plot width / a monthly rent?" for the
tabs, for the confirm dialogs that clear what no longer applies, and for a unit
test that never renders anything. A plot has no BHK fields to leave blank and a
rental has no price range to ignore: the fields are not there.

Three numbers on this form are arithmetic an editor should not have to do. The
price preview prints exactly what `formatPrice` will print on the card and the
details page (`₹1.42 Cr onwards`, `₹45,000/month`, `Price on Request`) while it
is being typed; the per-sq-ft rate follows the price until somebody types their
own; and a plot's area follows length × width until somebody types their own.
In all three cases the derived figure is shown and the typed one wins.

**Files added**

| Path                                                        | What it is                                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `…/property-form/fieldRules.js`                             | Which fields a listing has: the segment/status/listing-type rules, `priceFieldsFor`, the segment-change patch, the rate and plot-area arithmetic |
| `…/property-form/tabs/BasicsTab.jsx`                        | Identity, classification, status, the unit, the two descriptions — with the two confirm dialogs                                                  |
| `…/property-form/tabs/LocationTab.jsx`                      | Locality (searchable + quick create), city, address, coordinates, the map, nearby places                                                         |
| `…/property-form/tabs/PricingTab.jsx`                       | The fields of one listing type, the live preview, the rate, the other charges                                                                    |
| `…/property-form/tabs/AreaConfigurationTab.jsx`             | Built areas or plot dimensions, the rooms, the two "this lives elsewhere" notes                                                                  |
| `…/property-form/tabs/UnitConfigurationsTab.jsx`            | The price table: sortable cards, duplicate, the auto range and "Apply as pricing range"                                                          |
| `…/property-form/tabs/PropertyTabs.module.css`              | The layouts the six tabs share                                                                                                                   |
| `…/property-form/tabs/MediaTab.jsx`                         | The gallery, the video with its thumbnail, the virtual tour, the brochure and its gate                                                           |
| `…/property-form/components/NumberWithUnit.jsx` (+ css)     | A number with `₹` or a unit attached, right-aligned, with the formatted figure underneath                                                        |
| `…/property-form/components/NearbyPlacesRepeater.jsx`       | The flat `nearbyPlaces` list, shown grouped by category and reordered inside a group                                                             |
| `…/property-form/components/OtherChargesRepeater.jsx`       | Label / amount / note rows, with the lease clause presets                                                                                        |
| `…/property-form/components/Repeaters.module.css`           | Shared by the two repeaters                                                                                                                      |
| `…/property-form/components/ImageGalleryEditor.jsx` (+ css) | The gallery grid: drag and keyboard reorder, the cover radio, alt and caption, "Add multiple URLs", the counters                                 |
| `…/property-form/components/PricePreview.jsx` (+ css)       | What the public page will print, as it is typed                                                                                                  |
| `…/property-form/components/MapPinPicker.jsx` (+ css)       | The draggable pin where a Maps key exists, the keyless embed where it does not (D42)                                                             |
| `…/property-form/components/LocalityQuickCreateDialog.jsx`  | Name / city / zone → `POST /admin/localities`, straight back into the select                                                                     |
| `src/utils/loadScript.js`                                   | Loads a third-party script once, on demand; a failure rejects rather than throwing into a render                                                 |
| `…/property-form/__tests__/fieldRules.test.js`              | 24 cases over the visibility rules, the price-field sets, the segment patch and the arithmetic                                                   |
| `…/property-form/__tests__/PricingTab.test.jsx`             | 18 cases: sale vs rental fields, every preview line, price-on-request, the rate, the charge rows, read-only                                      |
| `…/property-form/__tests__/ImageGalleryEditor.test.jsx`     | 22 cases: the counters, the cover (including promotion on removal), alt, reorder, both ways of adding, read-only                                 |

**Files changed**

`…/property-form/tabs.js` (the six components wired in; `badgeIds` moves to the
Basics tab's field list, because that is where the picker is),
`…/property-form/validators/property.js` (a RERA number when the switch is on; a
name on every nearby row; "Add an area or a price" for a unit configuration
priced on request; exactly one cover image), `…/property-form/toPayload.js` (the
per-sq-ft derivation moves into `fieldRules.derivedPricePerSqft`, so the tab and
the payload compute one figure), `src/components/admin/MultiSelect.jsx` (a
read-only picker no longer renders a live × on its chips),
`docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Files removed**

None. `PlaceholderTab` still serves the ten tabs of prompts 20–21.

**Endpoints**

None added. The locality quick create uses `POST /admin/localities`
(`masterDataService.localities.create`) and then `refresh('localities')` on
`MasterDataContext`, so the new record is in every locality list in the session.

**npm / env**

Nothing added. `REACT_APP_GOOGLE_MAPS_KEY` was already in `.env.example`; it is
read together with `settings.integrations.googleMapsApiKey`, which wins.

**Acceptance checklist**

- [x] Tabs 1–6 carry every §6.1 field of their scope, shown per `fieldRules.js`,
      and a `PUT` of the form's payload comes back from
      `GET /api/admin/properties/1` with every one of them intact (checked field
      by field against the mock, see the QA below).
- [x] Locality quick create, the map (keyed pin and keyless embed), the price
      preview, the per-sq-ft auto-compute, the plot-area auto-fill and the
      gallery's cover/alt/reorder all work in the browser.
- [x] 64 new unit tests; the suite is 1 064 tests over 42 files.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` (0 warnings),
      `npm run check:traces` (0 findings), `npm run smoke` (269/269),
      `npm run test:mock` (127), `npm run validate:seed` and
      `npm run check:contrast` all pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, console captured)**

- `/admin/properties/edit/1` at 1360 px: sixteen tabs, the first six rendering
  fields rather than an alert. Basics lists Title, Project name, URL, Listing
  type, Segment, Property type, Badges, Construction status, Availability,
  Possession, RERA registered (+ RERA number), Furnishing, Facing, Ownership,
  Floor number, Total floors, Short description and Description.
- Pricing: clearing the range leaves `₹1.5 Cr onwards`; clearing the rate puts
  it back on the price (`10000`), and changing the price to 18000000 moves it to
  `12000` and the preview to `₹1.8 Cr onwards`. "Price on request" disables and
  empties the price and the rate, and the preview reads `Price on Request`; the
  booking amount stays editable. `+ ₹2,500/month maintenance` and
  `Stamp duty: ₹7.5 L` print under the headline.
- Basics → Rent asks "Change this listing to Rent? … the prices this one already
  holds … will be cleared"; confirming leaves Rent per month, Security deposit
  and Maintenance, and no Price. Lease calls the same field "Advance" and offers
  "Add lock-in period" / "Add annual escalation".
- Basics → Plots & Land asks before clearing, and afterwards Basics has no
  Furnishing and no floors, and Area has no super built-up area and no bedrooms
  — only Plot area, Dimension unit, Length and Width. 30 × 40 feet fills 1200
  sq ft; 30 × 40 metres fills 12 916.68 sq ft; an area typed by hand survives a
  change of length.
- Area: a carpet area above the built-up area raises the inline warning
  ("Carpet ≤ built-up ≤ super built-up is what a buyer expects") without
  blocking the save.
- Location: "Metro" adds a row to that group (the heading counts `Metro (2)`);
  "Add a new locality" → Test Nagar / Bengaluru / East is created, selected and
  the city fills itself in.
- Media: pasting two URLs takes the counter to "8 images · 2 missing alt";
  saving is refused with "Please fix 1 field.", the Media tab badges "1 error in
  this section" and the alt field carries the message. Describing them and
  saving again persists across a reload — 8 images, every one described, the
  cover where it was put. The alt hint on property 1 reads
  "Describe what is shown. Use: 3 bhk apartment in whitefield", from the SEO
  focus keyword.
- Unit configurations: the seeded rows summarise as `₹1.2 Cr`; adding "4 BHK Sky
  Villa" at 21000000 makes it `₹1.2 Cr – ₹2.1 Cr`, and "Apply as pricing range"
  writes 12000000/21000000 into Pricing, where the preview follows.
- The map: with `integrations.googleMapsApiKey` set, the tab injects
  `https://maps.googleapis.com/maps/api/js?key=…&v=weekly` once and renders the
  pin container; when that script cannot load it falls back to the embed plus
  the coordinate fields, raises "The interactive map is unavailable" and toasts
  "The Google map could not be loaded. Type the coordinates instead — the
  preview still works." With no key at all it starts on the embed and offers
  "Use the centre of \<locality\>".
- 390 px: `scrollWidth === clientWidth` on all six tabs.
- Signed in as sales: the read-only banner, and not one operable control in any
  of the six panels (the two that survived — the × on a badge chip — are fixed
  in `MultiSelect`).
- Console: no errors and no warnings from these tabs. The only warnings on the
  admin shell are MUI Grid v2 deprecations from the untouched `Dashboard.js`
  (prompt 29).
- Against the API directly: `toPayload` of a record edited across all six tabs
  → `PUT /admin/properties/1` → 200, and the `GET` that follows returns the RERA
  number, the furnishing, the floors, the possession month, the badges, the
  address, the pincode, the six-decimal coordinates, `showExactLocation`, both
  nearby rows in order with their travel times, the price, the derived
  `pricePerSqft` of 10000, the range, the other charge, the three areas, the
  nine configuration fields, both unit configurations (one priced, one on
  request) and both images with exactly one cover — while `viewCount`,
  `amenityIds` and the whole `seo` branch are untouched.

**Known issues**

None opened. Two rows left "Pending rewrites" (the Basics fields in a
placeholder, and five of the fifteen placeholder tabs); one joined it — the
description textarea that prompt 32 turns into the Tiptap editor.

**Next prompt: 20 — Property form tabs 7–12.**

### Prompt 20 — Property form tabs 7–12: amenities, highlights & specifications, floor plans, documents, project & builder, FAQs (2026-09-16)

**What changed**

Six more tabs stopped being placeholders. Prompt 19 wrote the fields a listing
is described by; these six are the lists it is made of — what it offers, what
it is built from, what a buyer downloads, who built it and what they will ask.
Four of them are repeating lists, and all four had the same two problems in the
boilerplate: a drag that rewrote every row, and a blank list with no way to
start.

So each list has a way to start that is not typing. The construction
specifications lay themselves out from a preset of twenty-one labels; the
timeline lays itself out from five milestones; the floor plans generate
themselves from the unit configurations that already carry a drawing; the
highlights can be split out of the short description; and the FAQs can be
written from the listing itself. Every one of them adds only what is missing,
says how many that is, and disappears when there is nothing left to add.

The FAQ generator is the one that writes prose, so it is the one with a rule:
**an answer never claims more than the record holds.** A listing with no price
says the price is on request; a project with no possession date says no date
has been announced; a listing with no amenities is not asked what amenities it
offers. `suggestFaqs` is pure, the dialog previews exactly what it would add
with a checkbox each, and nothing is written until somebody has read it.

**Files added**

| Path                                                           | What it is                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `…/property-form/suggestFaqs.js`                               | Six questions written out of the record, deduplicated against what is already asked; pure, `<p>` HTML answers |
| `…/property-form/tabs/AmenitiesTab.jsx` (+ css)                | Grouped chips with a search, a tri-state select-all per group, the counts, the master-data link               |
| `…/property-form/tabs/HighlightsSpecificationsTab.jsx`         | Highlights, the specifications repeater, the construction repeater and its twenty-one-row preset              |
| `…/property-form/tabs/FloorPlansTab.jsx`                       | The drawing cards, and "Generate from unit configurations"                                                    |
| `…/property-form/tabs/DocumentsTab.jsx`                        | The brochure summary with a link to Media, and the document rows with their gate                              |
| `…/property-form/tabs/ProjectBuilderTab.jsx`                   | The developer picker and quick create, the project figures, the approvals, the timeline and the progress      |
| `…/property-form/tabs/FaqsTab.jsx`                             | Question and answer rows, and the suggestion dialog                                                           |
| `…/property-form/components/SpecificationsRepeater.jsx` (+css) | One grouped `{group,label,value,icon?}` list, used twice; sticky group headings, one `moveItem` per drag      |
| `…/property-form/components/TimelineRepeater.jsx` (+ css)      | Milestone rows with a status dot, the presets, "Auto from milestones" and the progress bar                    |
| `…/property-form/components/DeveloperQuickCreateDialog.jsx`    | Name + website → `POST /admin/developers`, straight back into the picker; duplicates refused inline           |
| `…/property-form/__tests__/suggestFaqs.test.js`                | 30 cases: every branch's wording, the five-item limit, the dedupe, the escaping                               |
| `…/property-form/__tests__/AmenitiesTab.test.jsx`              | 17 cases: the writes, the order, the counts, the tri-state header, the search, the tab order, read-only       |
| `…/property-form/__tests__/TimelineRepeater.test.jsx`          | 16 cases: the arithmetic, the disabled button at zero, the presets, the rows                                  |
| `…/property-form/__tests__/floorPlansFromUnits.test.js`        | 10 cases: what becomes a plan, and the two rules that stop a second press duplicating it                      |

**Files changed**

`…/property-form/tabs.js` (the six components wired in; the `prompt:` markers
gone), `…/property-form/validators/property.js` (highlights capped at 12 × 140
characters; a FAQ question 10–200 characters; a script, an iframe, an `on…=`
handler or a `javascript:` URL in an answer refused; a specification label
without a value no longer an error), `…/property-form/validators/index.js` (the
four new constants re-exported), `…/property-form/toPayload.js` (a
specification row needs both halves to be sent — the schema requires a value),
`…/property-form/PropertyFormShell.jsx` + `PropertyFormContext.js` (`goToTab`),
`src/hooks/useMasterData.js` (`useDeveloperSearch`), `src/utils/format.js`
(`formatMonthYear`), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Files removed**

None. `PlaceholderTab` still serves the four tabs of prompt 21.

**Endpoints**

None added. The developer quick create uses `POST /admin/developers`
(`masterDataService.developers.create`) and then `refresh('developers')`.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Tabs 7–12 carry every §6.1 field of their scope, and a save comes back
      from `GET /api/admin/properties/2` with every one of them intact (the
      JSON is quoted in the QA below).
- [x] Every preset and generator works and is idempotent: the construction
      rows, the standard milestones, the floor-plan generator, the highlight
      import and the FAQ suggestions all add only what is missing and say how
      many that is.
- [x] Developer quick create works, and a duplicate name is refused inline.
- [x] 73 new unit tests (30 + 17 + 16 + 10); the suite is 1 137 tests over 46
      files.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` (0 warnings),
      `npm run check:traces` (0 findings) and `npm run smoke` (269/269) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over CDP, console captured)**

- `/admin/properties/edit/2` at 1360 px: sixteen tabs, the first twelve
  rendering fields rather than an alert.
- Amenities: the eight groups with their counts ("4 of 5 selected"); searching
  `pool` leaves Lifestyle and Kids with Swimming Pool and Kids' Pool and hides
  the other six groups; `helipad` says so. "Select all in Lifestyle" takes the
  total from 18 to 21 and leaves the Sports header indeterminate; unticking one
  of a full group puts its own header back to indeterminate. The footer link is
  `/admin/master-data/amenities`, `target="_blank" rel="noreferrer"`.
- Highlights: ↓ moves a highlight and the list follows; "Add highlight" stops
  at 12 of 12; on property 1, a three-sentence summary makes the button read
  "From short description (3)" and adds "Corner unit with two balconies",
  "Khata transferred and the loan is pre-approved" and "1.2 km from the metro"
  — the decimal does not split a sentence — after which it reads (0) and is
  disabled. Property 2's one-sentence, 152-character summary makes it read (0)
  from the start.
- Specifications: "Add standard rows (17)" takes the construction list from 8
  rows to 25 across 9 groups; the four labels the seed already had are not
  repeated. Two rows filled in, the rest left blank: the counter reads "15 rows
  have no value yet and are not saved", the save is accepted, and the record
  comes back with 10 rows — the eight seeded plus
  `structure · RCC framed structure = Filled by QA one` and
  `flooring · Living / Dining = Filled by QA two`.
- Floor plans: with the three seeded plans present the generator is offered for
  three unit configurations; removing one and pressing it adds the missing
  drawings and the button then says "Nothing left to generate", so a second
  press cannot duplicate.
- Documents: the brochure card prints the attached URL and "A visitor gives
  their details before downloading it", with "Change it on Media". Adding
  "Price list — March 2027" (type `price-list`, gate off) makes the counter
  read "4 documents · 3 behind the lead form, 1 open", and the record comes
  back with `{title:"Price list — March 2027", type:"price-list",
leadGated:false, order:4}`.
- Project & builder: "Add new developer" → Test Developers (+ website) is
  created, selected, and the card reads "Edit Test Developers in master data";
  trying "test developers" again keeps the dialog open with "A developer called
  “test developers” already exists…"; a website without a scheme is refused the
  same way. Taking RERA out of `reraRegistered` while it is listed as an
  approval raises the warning with "Open Basics"; putting the switch back takes
  it away.
- The timeline: clearing it disables "Auto from milestones (0%)"; "Add standard
  milestones" lays out the five; marking two of five completed makes the button
  read 40 % and pressing it writes 40 into the field and the bar.
- FAQs: "Generate suggested FAQs" offers five of the six (the configuration
  question falls outside the limit), each with its answer; unticking two and
  pressing "Add selected (3)" takes the list from 5 to 8, and the record comes
  back with them at orders 6–8. An answer carrying `<script>` and a
  three-character question are both refused ("Please fix 2 fields.", the FAQs
  tab badged "2 errors in this section").
- Save and reload: 21 amenities, 10 construction specifications, 4 documents,
  Test Developers, the timeline statuses, 40 % and 8 questions all come back.
- The public page (legacy layout) renders every section from the new data:
  Property Amenities (including the three added), Floor Plans & Pricing,
  Property Documents (the new price list behind "View 2 More Documents"),
  Construction Specifications, Construction Status, "Test Developers" and
  "FAQs About This Project". No console errors.
- 390 px: `scrollWidth === clientWidth` on all six tabs.
- Signed in as sales: not one operable control in any of the six panels — the
  only enabled button is "Change it on Media", which changes tab rather than
  the record.
- Console: no errors and no warnings from these tabs. The only warnings on the
  admin shell are the MUI Grid v2 deprecations from the untouched `Dashboard.js`
  (prompt 29).

**Known issues**

NEW-31 opened: `SlugField` rewrites an existing listing's slug from its title
because the form's tabs mount one render before the record reaches the reducer.
It is a shared admin-kit component used by five forms, so prompt 20 left it
alone; prompt 21 owns the fix.

**Next prompt: 21 — Property form tabs 13–16 and publish.**

### Prompt 21 — Property form tabs 13–16 (similar, section visibility, agent, SEO), admin preview and publish polish (2026-09-16)

**What changed**

The last four tabs stopped being placeholders, so the property form is now
complete except the SEO panel's internals. Three of them are small; the fourth,
Section visibility, was the one with a question worth answering properly.

Eighteen switches say what a page _may_ show. What a page _does_ show is that
answer and the data together — and the boilerplate wrote that second half twice,
once in the admin toggle and once in `PropertyDetails`, which is how they came
to disagree (BUG-06). So `src/utils/propertySections.js` is written now rather
than with the public page in prompt 23: one ordered `SECTION_DEFINITIONS` with a
label, a description, an anchor and a `hasData(property, context)` per key;
`getVisibleSections()` for the page and its sticky navigation; and
`getSectionHints()` for the chips beside the switches. The chip is the part an
editor reads: "No data yet — add at least two images in Media" while a switch is
on over nothing, "Hidden" while it is off, and — for the one section a listing
cannot fill by itself — "Hidden automatically — no active banks".

The other decision worth recording is the preview. Articles and pages carry a
signed 24-hour token (D28) because a draft article is shown to somebody who is
not an editor. Nobody asks to be shown an unfinished listing, so a property
needs no token at all: `/properties/<slug>?preview=admin` reads the record
through a new `GET /admin/properties/slug/:slug` **only while an admin session
exists**, and the page answers 404 to everybody else, query string or not. The
rail's "View on site" becomes "Preview" while a listing is unpublished, which is
exactly when somebody wants to look at it.

Two defects the form had been carrying closed with it. `SlugField` mounted
"following the title" over the empty slug of a record that had not arrived yet,
and then rewrote a live URL from the title (NEW-31); it now treats a value it
did not write itself as an edit. And `toLegacyProperty` had been handing the
public "Property Highlights" section an empty array since prompt 11, so the
section had silently stopped rendering — D40 says `highlights` is what feeds it,
and it does again.

**Files added**

| Path                                                      | What it is                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/utils/propertySections.js`                           | The eighteen `SECTION_DEFINITIONS`, `getVisibleSections()`, `getSectionHints()`, `isSectionEnabled()`           |
| `src/utils/__tests__/propertySections.test.js`            | 30 cases: every rule with and without its data, the order, the anchors, the eighteen keys against the enum      |
| `…/property-form/tabs/SimilarPropertiesTab.jsx`           | Search over active listings, cards with thumbnail/locality/price, drag order, max 6, "Suggest similar"          |
| `…/property-form/tabs/SectionVisibilityTab.jsx`           | Eighteen 56 px rows with a switch, a description and a hint chip; "Enable all" / "Disable all"                  |
| `…/property-form/tabs/AgentTab.jsx`                       | Team member or manual, the copied display fields, the overwrite confirm, `showOnListing` and the preview card   |
| `…/property-form/tabs/SeoPlaceholderTab.jsx`              | `seo.title` (/60), `seo.description` (/160), `seo.focusKeyword`, the slug mirror, and what prompt 36 adds (D87) |
| `…/property-form/__tests__/SimilarPropertiesTab.test.jsx` | 12 cases: the search, the cards, the cap of six, the suggestion dialog, read-only                               |
| `…/property-form/__tests__/SectionVisibilityTab.test.jsx` | 13 cases: the eighteen rows, the explicit booleans, enable/disable all, every kind of hint, read-only           |

**Files changed**

`…/property-form/tabs.js` (the four components wired in; `prompt`/`note` gone),
`…/property-form/validators/property.js` (`validateVisibility` refuses a
non-boolean toggle; `validateSimilar` refuses a duplicate; `validateSeo` caps
the focus keyword; a rail warning for `showOnListing` over an empty agent),
`…/property-form/validators/index.js` (`FOCUS_KEYWORD_MAX`),
`…/property-form/usePropertyForm.js` (Ctrl/Cmd+S; `viewPathOf`/`viewUrlOf`;
"Property saved" / "Property published" / "Saved as inactive"),
`…/property-form/StatusRail.jsx` + `.module.css` (Preview, the keyboard hint),
`…/property-form/PropertyFormShell.jsx` (the placeholder props gone),
`…/property-form/tabs/PropertyTabs.module.css`,
`src/components/admin/EntityPicker.jsx` + `.module.css` (`renderSelected`,
`action`, a labelled Remove per row), `src/components/admin/SlugField.jsx`
(NEW-31), `src/hooks/useMasterData.js` (`useTeamMembers`),
`src/services/endpoints.js` + `.test.js` + `src/services/propertyService.js`
(`adminProperties.bySlug`), `mock-server/routes/properties.js` +
`mock-server/__tests__/properties.test.js` (the route and two tests),
`scripts/smoke-api.js` (three targeted checks),
`src/pages/public/PropertyDetails.jsx` + `.module.css` (`?preview=admin`, the
banner, `noindex`), `src/utils/adapters/legacyProperty.js`,
`src/components/ui/tones.js` (a comment naming a deleted constant),
`docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `docs/PROJECT_STATE.md`,
`docs/DECISIONS.md`.

**Files removed**

`src/pages/admin/PropertyForm.jsx` (654 lines) and the whole of
`src/pages/admin/property-tabs/` (16 tabs + `constants.js` + `index.js`, ~3 100
lines), unreachable since prompt 18. `…/property-form/tabs/PlaceholderTab.jsx`
went with them — every tab renders fields now. `grep -rn "property-tabs" src`
returns nothing. `src/components/admin/imageFieldConfig.js` was already gone
(prompt 13 folded it into `ImageField`). `src/utils/seoScoring.js` and
`seoGenerator.js` stay: `AdminSeo.js` still reads them until prompt 36.

**Endpoints**

One added: `GET /admin/properties/slug/:slug` (any admin role; returns the
record whether or not it is published). Registry, mock route, two mock tests,
three smoke checks and `docs/API_CONTRACT.md` all carry it. Consumed by the
tabs: `GET /admin/properties?q=&isActive=true`, `GET /admin/properties?ids=`,
`GET /properties/:id/similar`, `GET /team`.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Tabs 13–16 persist their fields: a save of property 2 came back with
      `seo.title/description/focusKeyword`, `sectionVisibility.virtualTour`
      flipped and all eighteen keys present, the agent's six fields copied from
      Team Member 3, and `similarPropertyIds` intact.
- [x] `propertySections.js` passes 30 tests and is exported for the public page
      (prompt 23 wires it).
- [x] Legacy `PropertyForm.jsx` and `property-tabs/` deleted; the admin preview
      endpoint works; the smoke suite is 273/273.
- [x] `npm run lint`, `npm run test:ci` (1 193 tests over 49 files),
      `npm run build:ci` (compiled successfully, 0 warnings),
      `npm run check:traces` (0 findings), `npm run test:mock` (129/129) and
      `npm run smoke` (273/273) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over CDP, console captured)**

- `/admin/properties/edit/1` at 1360 px: sixteen tabs, none of them an alert
  naming a later prompt.
- Similar: the four seeded picks arrive as cards ("Aurelia Park Residences –
  2 BHK Apartment in Sarjapur Road · Sarjapur Road, Bengaluru · ₹98 L · Under
  Construction"), not as `#2`. Searching `villa` offers five, each with its
  locality, price and status; adding one takes the counter to 5/6 and the option
  reads "Added". "Suggest similar" then offers exactly one — the room that is
  left — and accepting it fills 6/6. At 6/6 every option is disabled, the
  warning appears and "Suggest similar" is disabled; removing one takes both
  away.
- Visibility: property 1 reads "17 of 18 sections show on the page · 1 switched
  off". Switching Video off turns its chip from "Showing" to "Hidden"; the
  record comes back with `virtualTour` flipped and eighteen keys. Finance on a
  rental reads "Hidden automatically — sale listings only"; with no active bank,
  "Hidden automatically — no active banks".
- Agent: the six team members are offered; picking Team Member 3 while the
  listing names Team Member 2 asks "Replace the details you typed?" and, on
  confirming, the preview card reads Team Member 3 with `+91 9880000023` and
  `team3@squaresnacres.com`.
- SEO: typing a 60-character title turns the counter green ("Inside the length a
  search result prints"); 29 characters reads "Short — aim for 50–60". The
  address line prints `/properties/lakeview-heights-3-bhk-whitefield`.
- Publish: Ctrl+S from inside a tab saves and toasts "Property saved" without
  the browser's own save dialog. Turning "Published on site" on and saving
  toasts "Property published"; the split menu's "Save as inactive" toasts "Saved
  as inactive" and the rail's link goes back to "Preview".
- Preview: a new inactive listing's rail shows "Preview →
  `/properties/<slug>?preview=admin`" and the note "Only you see this". That URL
  signed in renders the page under "Admin preview — this property is not
  published. Visitors see a 404 at this address." with
  `robots: noindex, nofollow`; without the query string it is 404; signed out it
  is 404.
- The public page's "Property Highlights" section renders again, with the five
  highlights of property 1.
- 390 px: `scrollWidth === clientWidth` on all four tabs; the sticky bar shows
  "Save as inactive" and "Save".
- Signed in as sales: not one operable control on any of the four panels (the
  Agent tab's radios are inside a disabled `<fieldset>`).
- Console: no errors and no warnings from any of it.

**Known issues**

BUG-01 closed on the property-form side; BUG-06 has its utility (the public
wiring is prompt 23's); ADD-22 and NEW-09 closed with the legacy tabs; NEW-31
(SlugField) closed. Nothing new opened.

**Next prompt: 22 — Admin property list.**

---

### Prompt 22 — Admin property list: server-side table, filters, bulk actions, toggles and CSV export (2026-09-16)

**What changed**

`/admin/properties` was the last screen still reading a list through the legacy
adapter, and the last one that fetched everything and then filtered it in the
browser (ADD-21, BUG-19). It is now `PropertiesListPage`: `useApiList` with
`syncToUrl`, eleven filters, six sortable headers, paging and page size — every
one of them a query parameter the API answers and the address bar carries, so a
filtered view is a link somebody can send and a catalogue of four thousand
listings still costs one page of rows.

Three decisions are worth recording. The first is what a **flag chip** is: the
Active / Featured / Verified cells are buttons for an editor and labels for a
sales user, so read-only is the absence of a handler rather than a second table
(§7). They patch optimistically, spin while the `PATCH` is in flight and put the
old value back with the server's own sentence when it refuses (§8.2).

The second is the **export** (D44). It repeats the current filter with
`perPage=all` and builds the CSV here, so there is no export endpoint to keep in
step with eleven filters — and `src/utils/csv.js` is now the one place that
knows what a spreadsheet needs: the UTF-8 BOM Excel wants, CRLF records, quoting
around anything holding a comma, a quote, a line break or an edge space, and a
guard on the leading characters Excel would evaluate as a formula. That last one
is for the exports that follow: a lead's name and message are typed by strangers
(NEW-22 names the same file's ancestor).

The third is the **row menu**. Six actions is a kebab, not six 44 px icons in a
cell, so `DataTable` gained `rowActionsMenu` and `rowActionsLabel` — the menu is
named after the row it belongs to ("Actions for Lakeview Heights") and its items
stay short. A sales user has one action, which stays an inline icon and carries
the listing's title itself.

**Files added**

| Path                                                                | What it is                                                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/properties/PropertiesListPage.jsx` + `.module.css` | The screen: header, filters, table, bulk bar, row actions, export, delete confirm                                                 |
| `src/pages/admin/properties/propertyColumns.jsx`                    | Eleven columns, the flag chips, the phone card and the 25 CSV columns                                                             |
| `src/pages/admin/properties/propertyFilters.js`                     | The eleven `FilterBar` fields, the URL parameter spec, `exportParamsOf()`, `hasActiveFilters()`                                   |
| `src/pages/admin/properties/publicUrl.js`                           | `PREVIEW_QUERY`, `publicUrlOf()`, `viewPathOf()`, `viewUrlOf()` — shared by the list and the form                                 |
| `src/utils/csv.js`                                                  | `toCsv()`, `escapeCsvValue()`, `csvFileName()`, `csvDateStamp()`, `CSV_MIME`                                                      |
| `src/utils/download.js`                                             | `downloadBlob()` and `downloadAuthenticated()` (D46; the leads export of prompt 29 is its second caller)                          |
| `src/components/seo/SeoScoreChip.jsx`                               | The band chip from `seo.score` — "Not analysed" when there is no number (articles and the SEO dashboard reuse it)                 |
| `src/utils/__tests__/csv.test.js`                                   | 13 cases: the BOM, CRLF, the header-only file, quoting, booleans, the formula guard, the IST file name                            |
| `src/pages/admin/properties/__tests__/PropertiesListPage.test.jsx`  | 17 cases: the rows, the request, the URL filters, the chips and their rollback, bulk, the row menu, the three empty states, sales |

**Files changed**

`src/routes/adminRouteConfig.js` (the route lazy-loads `PropertiesListPage`),
`src/components/admin/DataTable.jsx` + `.module.css` (`rowActionsMenu`,
`rowActionsLabel`; the footer of an out-of-range page reads "Page 5 of 2 — no
rows on this page" instead of counting a slice that is not there; a card's
checkbox and kebab keep their 44 px targets),
`src/pages/admin/properties/property-form/usePropertyForm.js` (the four URL
helpers moved to `../publicUrl` and are re-exported),
`src/utils/adapters/legacyProperty.js` (the admin-list mappings
`toLegacyProperties()` and `tags` removed with the table that read them).

**Files removed**

`src/pages/admin/AdminProperties.js` (1 056 lines).

**Endpoints / env vars / npm scripts**

None added. The screen consumes `GET /admin/properties` (every §5.7 filter,
the six admin sorts, `perPage=all`), `PATCH /admin/properties/:id`,
`POST /admin/properties/:id/duplicate`, `POST /admin/properties/bulk` and
`DELETE /admin/properties/:id` — all of them already in the registry.

**Acceptance checklist**

- [x] `/admin/properties` works server-side: the network shows
      `page/perPage/sort/order` and the filters as query parameters, with all
      filters, sorts, toggles, bulk actions, duplicate, delete and export.
- [x] Sales sees a read-only list; manager and admin the full one.
- [x] Legacy `AdminProperties.js` deleted; tests pass.
- [x] `npm run lint`, `npm run test:ci` (1 223 tests over 51 files),
      `npm run build:ci` (compiled successfully, 0 warnings),
      `npm run check:traces` (0 findings), `npm run test:mock` (129/129) and
      `npm run smoke` (273/273) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium against `npm run dev`, console captured)**

- 1440 px, signed in as admin: 20 rows of 41, `h1` "Properties 41", the cover,
  title + "Whitefield · Apartments", listing and status chips, price,
  configuration, the three flags, the SEO chip, views/enquiries, priority and
  updated.
- Filtering to Rent rewrites the URL to `?listingType=rent` and the list to 7
  rows; sorting by Price adds `&sort=price&order=asc` and the column runs
  ₹21,000/month → ₹1.25 L/month. The active filter shows as a removable chip
  beside "Reset".
- Clicking a Featured chip turns it to "Featured" and toasts "… is now
  featured."; the record comes back featured.
- Ticking two rows shows "2 selected · Activate · Deactivate · Feature ·
  Unfeature · Verify · Unverify · Delete"; Deactivate toasts "2 properties
  updated." and the list refreshes. Delete asks first, naming the count.
- Export CSV downloads `properties-2026-09-17.csv` (the IST day): it begins with
  the BOM, its header is the 25 columns in order, and a filtered export of 7
  rows holds 7 rows — the filter, not the page.
- Duplicating from the row menu creates an inactive copy (`…-copy`) and opens
  its edit page; deleting the copy works from the row menu's confirm.
- 390 px: 20 cards, `scrollWidth === clientWidth`, and the kebab is a 44 × 44
  target whose menu reads Preview · Edit · Duplicate · Activate · Feature ·
  Delete.
- `?page=5` of a two-page list: an empty table, the footer "Page 5 of 2 — no
  rows on this page" and "Go to first page" in the empty state.
- Signed in as sales: the subtitle reads "Read-only", there is no Add button, no
  checkboxes, no row menu and no clickable flag; "View on site" and "Export CSV"
  remain. The server agrees — `PATCH /admin/properties/1` answers 403 for that
  token.
- Console: no errors or warnings from the app (only the sandbox proxy refusing
  the external image and font hosts).

**Known issues**

The property-list half of ADD-21 is closed; the `AdminLeads`/`Dashboard` half
stays open for prompt 29. Nothing new opened.

**Next prompt: 23 — Property details, part 1.**

---

### Prompt 23 — Property details part 1: page shell, gallery, price card, key facts, section nav, shortlist (2026-09-16)

**What changed**

`/properties/:slug` was the last public page still reading the boilerplate's
field names through `toLegacyProperty` — 1 100 lines with thirty `useState`s,
four copy-pasted lead modals (one of them unreachable), a hardcoded
sub-navigation and an `EnquiryForm` mounted three times (ADD-12). It is now a
210-line shell over the contract record of §6.1: one `useApi` call, one
`getVisibleSections` call, and seven components that each do one thing.

Four things are worth recording.

The **gallery** is a cover with a thumbnail column (a strip below it on a
phone), the arrow keys move between photographs and `Enter` opens the
full-screen lightbox. That lightbox is `yet-another-react-lightbox` behind
`React.lazy` (D7) — the library is ESM-only and carries three stylesheets, and
the build confirms it stays out of the main bundle: a 36 kB JS chunk and an
8 kB CSS chunk that are fetched the first time somebody opens a photograph.
Video and virtual tour are tabs, offered only when the listing carries one
**and** its section is switched on; a `videoUrl` that is neither a YouTube
page, a Vimeo page nor a file a browser can play does not get a tab at all,
because a tab that opens on nothing is worse than no tab.

The **section navigation** closes BUG-06. `StickyNav` and its hardcoded
`ALL_NAV_ITEMS` are deleted; `SectionNav` renders `getVisibleSections(property,
{ banksAvailable, similarAvailable })` — the same `propertySections.js` rule
the admin's Section-visibility tab reads — so the chips, the section wrappers
and the toggles are one list. `SectionGuard` went with it: a section either is
in that list or is not rendered, which is one rule instead of three booleans
per call site.

The **price card** prints what the record holds and nothing else. A range shows
"onwards", a rent shows the deposit and the maintenance under the monthly
figure, and `priceOnRequest` shows exactly that — with no EMI line under it,
because there is no principal to compute one from. Where there is one, the EMI
is `utils/finance.js` over the cheapest **active** lender's advertised rate at
80 % for twenty years, and the footnote says so: with no active bank the line
is absent rather than falling back to an invented rate (§6.6, BUG-05).

The **shortlist** is a real one. `ShortlistContext` keeps ids in
`localStorage` under `sna_shortlist` — the one visitor-side list that is not in
the session, because somebody comparing four projects over a fortnight expects
to find them still there — and follows the `storage` event so two open tabs
cannot disagree. The heart on a card and the count on the bottom navigation
read the same provider; the boilerplate's heart remembered nothing (ADD-10).

**Files added**

- `src/components/sections/property/`: `TitleBlock.jsx`, `PriceCard.jsx`,
  `AgentCard.jsx`, `KeyFacts.jsx`, `SectionNav.jsx`, `MobileCtaBar.jsx`,
  `PropertyLightbox.jsx` (lazy), `SectionPlaceholder.jsx` (development only),
  `LeadModalTemp.jsx` (temporary) + CSS modules
- `src/components/common/`: `ShortlistButton.jsx`, `ShareButton.jsx` + CSS
- `src/contexts/ShortlistContext.js`
- `src/utils/`: `finance.js` (`estimateEmi`, `emiBreakdown`, `foirScore`,
  `eligibleLoanAmount`, `startingEmi`), `analytics.js` (`track` → `dataLayer`),
  `recentlyViewed.js` (`sna_recent_properties`, max 8), `viewTracker.js`
  (`sna_viewed_properties`)
- Tests: `src/utils/__tests__/finance.test.js` (15),
  `src/contexts/__tests__/ShortlistContext.test.js` (9),
  `src/components/sections/property/__tests__/KeyFacts.test.jsx` (6),
  `SectionNav.test.jsx` (6)

**Files changed**

- `src/pages/public/PropertyDetails.jsx` + CSS — rewritten on the §6.1 shape
- `src/components/sections/property/PropertyGallery.jsx` + CSS — rewritten
- `src/pages/public/NotFound.jsx` — optional `title` / `subtitle` /
  `description` props, and `noindex, follow`, so a detail page can say what was
  not found ("Property not found") instead of the generic sentence
- `src/components/layout/BottomNav.jsx` + CSS — stands down on
  `/properties/:slug` (that page has a contact bar of its own); "Insights"
  becomes "Saved" with the shortlist count
- `src/components/common/PropertyCard.jsx` + CSS — the heart is
  `ShortlistButton`; the boilerplate's dead `.heartBtn` rules are gone
- `src/components/common/LeadForm.jsx` — an additive `onSuccess(values)` (part
  of ADD-09, which prompt 28 finishes)
- `src/components/common/ToastProvider.jsx` — the live region is portalled to
  `document.body`: a `position: fixed` element inside a transformed ancestor
  (`MainLayout`'s page transition, a sticky column) is positioned against that
  ancestor, and its `--z-toast` means nothing outside its stacking context
- `src/components/common/SkeletonLoaders.jsx` — `PropertyDetailSkeleton` now
  mirrors the new layout (breadcrumb, 16/9 gallery + thumbnail column, title
  lines, key-facts grid, price card) at the page's own proportions
- `src/utils/format.js` (+ its test) — `formatWhatsappNumber` / `whatsappLink`;
  the seed stores team numbers as ten digits, and `wa.me/9876543210` is a dead
  link. `SiteSettingsContext` now uses the shared helper instead of its own
- `src/utils/adapters/legacyProperty.js` — listing-only (see Pending rewrites)
- `src/routes/index.js` — `ShortlistProvider` in the app shell (the providers
  live here rather than in `App.js`, D97)
- `src/test-utils.jsx` — `ToastProvider` and `ShortlistProvider` in `renderWith`
- `package.json` — `yet-another-react-lightbox@3.32.2`

**Files removed**

- `src/components/sections/property/StickyNav.jsx` (+ CSS)
- `src/components/common/SectionGuard.jsx`

**Endpoints / env vars / npm scripts**

No endpoint, environment variable or script changed. The page calls
`GET /properties/slug/:slug`, `GET /admin/properties/slug/:slug` (preview),
`POST /properties/:id/view`, `POST /leads` and `GET /banks` (through
`MasterDataContext`), all of which already existed. One dependency was added:
`yet-another-react-lightbox@3.32.2`, the only one §3.3 allows this prompt.

**Storage keys**

`sna_shortlist` (local), `sna_recent_properties` (local, max 8),
`sna_viewed_properties` (session), `sna_lead` (session, existing).

**Acceptance checklist**

- [x] `/properties/lakeview-heights-3-bhk-whitefield` renders the new shell:
      breadcrumbs (Home › Buy › Whitefield › title), gallery + lightbox, title
      block, price card with EMI, key facts, section nav whose items are the
      visible sections, mobile CTA bar; an unknown slug renders the 404 page
      titled "Property not found".
- [x] `POST /properties/1/view` fires once and does not fire again after
      navigating away and back; the shortlist heart persists in
      `sna_shortlist`; `BottomNav` is absent on the page and reads
      "Saved (1)" elsewhere.
- [x] `StickyNav` and `SectionGuard` are deleted;
      `yet-another-react-lightbox` is a separate chunk
      (`6794.chunk.js` 36 kB + `5317.chunk.css` 8 kB; the main bundle contains
      no `yarl__` string).
- [x] `npm run lint`, `npm run test:ci` (1 263 tests, 55 suites),
      `npm run build:ci` (compiled, no warnings), `npm run check:traces`
      (0 findings), `npm run validate:seed`, `npm run smoke` (273/273) pass;
      no console errors or warnings from the app.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 and 390 px, console open)**

- Desktop 1280: one `<h1>`; breadcrumbs Home › Buy › Whitefield › title; 17
  section chips; key facts print 15 rows and no em dash; the price card sticks
  at `--header-height + 16px` in the 8/4 grid.
- Gallery: focus the cover, `ArrowRight` moves "photograph 1 of 8" → "2 of 8",
  `Enter` opens the lightbox with its counter ("2 / 8") and the image's caption,
  `Escape` closes it and focus returns to the cover.
- Share on desktop (no `navigator.share`): the menu offers Copy link ·
  WhatsApp · X · Facebook · LinkedIn · E-mail, and copying toasts "Link copied".
- Shortlist: the heart writes `["1"]` and flips `aria-pressed`; saving from a
  card on `/properties` at 390 px turns the bottom-nav item into "Saved (1)".
- Section nav: clicking Unit configurations / Amenities / Location / FAQs
  scrolls to each and the chip that lights up is the one clicked; free
  scrolling moves the highlight the same way. With `prefers-reduced-motion`
  the scroll is an instant jump.
- Price-card CTAs open the dialog titled by their lead source; submitting
  name + phone files the lead (visible in the admin) and the dialog switches to
  "Request received" with WhatsApp and Call buttons; `sna_lead` remembers the
  details for the next one.
- Network: exactly one `POST /api/properties/1/view` on the first visit and
  none on the second.
- 390 px: gallery 4/3, then the title, then the price card, then the key facts,
  then the scrolling chip strip; `scrollWidth === clientWidth` (no horizontal
  scroll); the fixed bar reads Call · WhatsApp · Enquire with
  `tel:+919880000022` and a `wa.me/91…` link, and the site's bottom navigation
  is not rendered on this page.
- Edge cases: one image → no thumbnails, no arrows, "View photo"; zero images →
  the monogram placeholder; `priceOnRequest` → "Price on Request" and no EMI
  line; `showExactLocation: false` → neither the address nor the coordinates
  appear anywhere in the DOM and the page says "Exact location shared on
  request"; a `videoUrl` that is not YouTube/Vimeo/MP4 → no Video tab (an
  `.mp4` gets a `<video controls>`); an inactive listing 404s publicly and,
  at `?preview=admin` while signed in, shows the amber banner and
  `noindex, nofollow`.
- Console: no errors or warnings from the app. The only console output is the
  sandbox proxy refusing the external image, font and Iconify hosts
  (`ERR_CERT_AUTHORITY_INVALID`), which is an artefact of this environment.

**Known issues**

BUG-06 closed. BUG-05 and ADD-12 move forward (the shell carries no default or
placeholder content and every enquiry path is reachable); their remaining
halves are the section content, owned by 24/25, 28 and 38. One new row:
**NEW-32** — the "Saved" item and the toast's "View" link point at
`/shortlist`, which prompt 26 writes; until then both land on the 404 page.

**Next prompt: 24 — Property details, part 2 (content sections).**

### Prompt 24 — Property details part 2: the eleven content sections (2026-09-16)

**What changed**

The property page stopped being a shell. Eleven sections are written against the
§6.1 record and rendered only where `getVisibleSections` says the listing both
switched the section on and carries something to put in it, so the sub-navigation
and the page cannot disagree about what exists: **Overview** (the description
clamped to about twelve lines with a measured "Read more", then the project
snapshot chips), **Highlights** (a two-column check list, six then "Show N
more"), **Unit configurations** (a captioned table on a desktop, the same rows as
cards below 900 px, "On request" and a "Get price" dialog where a unit has no
price, the drawing opening in the lightbox), **Specifications** (grouped in
`SPEC_GROUPS` order with the construction specifications as a second block —
D39), **Amenities** (grouped chips, commercial first for a commercial listing),
**Floor plans** (tabs, the drawing blurred behind a lock until a lead is filed,
then the lightbox and the PDF), **Gallery** (a grid of every photograph),
**Construction progress** (a progress bar and the milestone timeline),
**About the builder**, **What is nearby** and **Location** (the two separate
`sectionVisibility` keys of §6.1), and **FAQs**.

Ten legacy section components went with them, and with them the last of the
defaults the boilerplate printed where it had no data: the `'—'` cards of
`PropertyOverview`, the `'Feature'` fallback of `PropertySpecialities`, the
unreachable legacy-object branch of `PropertySpecs`, the `Infinity%` of
`ConstructionStatus`, the self-nullifying `BuilderOverview` and the "Map view
available on live version" box of `NearbyPlaces`.

**How the gate works**

`leadStorage` gained `unlock(propertyId, kind)` and `isUnlocked(propertyId,
kind)` over a new `unlocks: { [propertyId]: ['floorPlans', 'documents'] }`
branch of `sna_lead`, and `useGatedContent(propertyId, kind)` is the hook a
section reads it through. Unlocks are **per kind**, because asking for a floor
plan is not asking for the title deed; the one exception is a
`property-enquiry`, which is a visitor identifying themselves about the whole
listing and therefore opens every kind on it. A locked drawing is blurred
rather than removed, so the box keeps its size and the page does not jump when
the gate opens.

**Files added**

- `src/components/sections/property/`: `SectionShell.jsx`, `GatedOverlay.jsx`,
  `OverviewSection.jsx`, `HighlightsSection.jsx`,
  `UnitConfigurationsSection.jsx`, `SpecificationsSection.jsx`,
  `AmenitiesSection.jsx`, `FloorPlansSection.jsx`, `GallerySection.jsx`,
  `ConstructionSection.jsx`, `BuilderSection.jsx`, `LocationSection.jsx`
  (default `LocationSection` + named `NearbySection`), `FaqsSection.jsx` + CSS
  modules
- `src/hooks/useGatedContent.js`
- Tests: `src/components/sections/property/__tests__/` —
  `UnitConfigurationsSection.test.jsx` (8),
  `ConstructionSection.test.jsx` (9), `FloorPlansSection.test.jsx` (6)

**Files changed**

- `src/pages/public/PropertyDetails.jsx` — `SECTION_COMPONENTS` maps a
  `sectionVisibility` key to its component; the bands alternate white/surface by
  index; the six keys with no component yet keep the development-only
  placeholder. `NotFound` moved to the head of the component imports because
  `BuilderDetail` imports it before the developer sections too and
  `mini-css-extract-plugin` refuses a stylesheet whose module order two chunks
  disagree about (the build failed until they agreed).
- `src/utils/leadStorage.js` — `unlock` / `isUnlocked` / `UNLOCK_KINDS`, a
  `save()` that no longer loses `capturedSources` on a second call, and writes
  that survive a blocked session store
- `src/utils/propertySections.js` (+ its test) — `overview.hasData` now means
  "the Overview section has something to print": a description or one of the
  project-snapshot facts. Highlights alone used to satisfy it, which promised a
  navigation item the section could not fill.
- `src/components/sections/property/LeadModalTemp.jsx` — two additive props:
  `message` (prefills the message box, e.g. "Price for 3 BHK") and
  `onCaptured(values)` (what a gated section unlocks itself with)
- `src/components/sections/developer/DeveloperStats.jsx` — optional
  `headingLevel` / `headingId`, so the block can be an H3 inside the property
  page's builder section without two H2s or a duplicated element id

**Files removed**

`PropertyOverview.jsx`, `PropertySpecialities.jsx`, `PropertySpecs.jsx`,
`PropertyAmenities.jsx`, `FloorPlans.jsx`, `ConstructionSpecs.jsx`,
`ConstructionStatus.jsx`, `BuilderOverview.jsx`, `NearbyPlaces.jsx`,
`PropertyFaq.jsx` and their CSS modules.

**Endpoints / env vars / npm scripts**

None added. The sections consume the record the page already fetched plus the
developer and locality lists `MasterDataContext` already holds; the two new lead
sources travel through the existing `POST /leads` (`price-request`,
`floor-plan-request`). One analytics event is new: `floor_plan_download`.

**Storage keys**

`sna_lead` gains `unlocks: { [propertyId]: string[] }` (session).

**Acceptance checklist**

- [x] All eleven sections render from seed data on property 1 and property 2
      exactly per the visibility rules, and the section-navigation items match
      the rendered sections one for one on both (17 keys on property 1, 16 on
      property 2, 13 on the Devanahalli plot).
- [x] Floor-plan gating: locked → lead (`sna_lead` gains
      `unlocks: {"1":["floorPlans"]}`, the lead reaches the mock with
      `source: floor-plan-request` and the prefilled message) → the drawing is
      clear, opens full size in the lightbox and offers "Download PDF".
- [x] No `'—'` placeholder, no `Feature` fallback and no "Map view available…"
      box anywhere: the only em dashes on a rendered page are the ones the
      content itself contains ("Ready to move — no waiting period", "2 BHK —
      1,180 sq ft", "Approximate location — exact address shared on request").
- [x] The ten legacy section components are deleted and nothing imports them.
- [x] `npm run lint`, `npm run test:ci` (1 286 tests, 58 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run validate:seed`,
      `npm run smoke` (273/273) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 and 390 px)**

- Property 1 (`lakeview-heights-3-bhk-whitefield`), 1280 px: one `<h1>`;
  17 section wrappers whose ids match the 17 navigation anchors exactly;
  "Read more" expands the description and becomes "Read less"; the unit table
  prints `Configuration | Carpet area | Super built-up | Price | Floor plan |
Enquire` with the caption "Unit configurations, areas and prices for …";
  no progress bar (ready-to-move); `document.documentElement.scrollWidth ===
clientWidth`.
- Gate: "View floor plans" opens the dialog titled "Price Request"/"Floor Plan
  Request" with the message prefilled; submitting name + phone files lead 46
  (`source: floor-plan-request`, `propertyId: 1`, `message: "Floor plans for
Lakeview Heights"`), writes `unlocks: {"1":["floorPlans"]}` into `sna_lead`,
  and closing the dialog opens the drawing in the lightbox. Afterwards the
  section shows "Open full size" and a `target="_blank" rel="noopener"` PDF
  link.
- Toggles: amenities 12 → 18 with the button turning into "Show fewer";
  construction specifications 8 → 18 rows; highlights (5 items) offers no
  toggle; the first FAQ closes to `aria-expanded="false"` and its panel is the
  `aria-controls` target.
- Property 2 (`aurelia-park-residences-2-bhk-sarjapur-road`): the progress bar
  reads the editor's 74 % with `aria-valuenow="74"`, five milestones with dates,
  statuses and the one site photograph, "Last updated 23 May 2026", and no
  `NaN` or `Infinity` anywhere in the page text. The builder section prints the
  card, "8 projects", the three developer highlights and the counted "At a
  glance" figures.
- Devanahalli plot (`nandi-ridge-meadows-plots-devanahalli`), 390 px: no unit
  configurations and no floor-plan sections, no "BHK" anywhere, the map is the
  property's own coordinates at zoom 16 (`showExactLocation: true`) with no
  "Approximate location" note, nearby grouped into Schools / Hospitals /
  Railway / Airport / IT Parks, the locality guide links to
  `/localities/devanahalli`, and no horizontal scroll.
- Property 1 at 390 px: the unit table is replaced by three cards
  ("2 BHK · 2 baths", carpet and super built-up, ₹88.5 L, "4 available",
  "Enquire"); the gallery is a two-column grid of 8 tiles under "8 photos";
  `showExactLocation: false` gives the **locality's** coordinates at zoom 13
  with "Approximate location — exact address shared on request".
- Heading outline on both pages: one H1, an H2 per section, H3 for a sub-block
  and H4 only under an H3 — no level is skipped.
- Console: the React DevTools notice and nothing else. The sandbox proxy still
  refuses the external image, font and Iconify hosts
  (`ERR_CERT_AUTHORITY_INVALID`), which is an artefact of this environment.

**Known issues**

BUG-05's section-content half is closed; what remains of the row is
`PropertyDocuments`' `Document` label and `FinanceGuide`, both owned by 25.
ADD-14 closed. One new row: **NEW-33** — the Jest suites that drive a MUI
dialog with `@testing-library/user-event@13` report "not wrapped in act(…)".
It is not new to this prompt (IconPicker reports 95 of them, the `Modal` suite 8) and no test is flaky because of it; the fix is the `userEvent.setup()` API of
user-event v14, which is a dependency bump nobody has authorised yet.

**Next prompt: 25 — Property details, part 3 (documents, finance, similar,
enquiry, recently viewed).**

### Prompt 25 — Property details part 3: documents, finance, similar, enquiry, recently viewed (2026-09-17)

**What changed**

The property page is finished. The four remaining `sectionVisibility` keys have
components, the two media keys have navigation targets, and the last three
legacy components on the page are gone.

**Documents & brochure** is a list of 56-px rows: the brochure card first
(`brochureUrl`), then each `documents[]` entry with its `DOCUMENT_TYPES` chip.
Each button is named after its own file (`aria-label="Open Current price list"`),
so a screen reader does not read four identical "Open"s in a row.
A row the editor left open opens its file on the first click. A gated row asks
for a name and a phone number, files the lead (`brochure-download` /
`document-request`, with the requested title prefilled in the message), records
the unlock in `sna_lead` and **then opens the file** — from inside the form's
own success handler, so the browser still counts it as the visitor's click.
When a blocker swallows the tab anyway (`window.open` returns `null`) a toast
carries the address as a link, and the dialog's success panel always offers an
"Open <file>" button. That is BUG-08's last half; the boilerplate's
`PropertyDocuments` called an `onDownloadClick` nobody ever passed, so no file
was ever delivered at all.

**Home loan & EMI** replaces `FinanceGuide`'s 1 858 lines with seven components
of at most 292 lines under `sections/property/finance/`, plus one copy file and
one stylesheet. Three tabs: **Check eligibility** (the FOIR questionnaire →
the reading → the acknowledgement), **Bank loans** (three lender cards from
`useBanks()` and "View all banks (6)"), **EMI calculator** (three sliders whose
bounds the lenders set). Every claim the section makes is now traceable: a
lender's rate, funding share, tenure, loan size, features and processing-fee
note come from its §6.6 record and nothing else, and the sentences come from
`financeCopy.js`. Gone with the old component: "8.35 % / 48 Hrs / Up to 90 % /
0.5 % + GST", "Banks Approved", "Pre-Approved", "Minimal documentation",
"Disbursement within 48 hrs", "advisors will reach out within 24 hours", and
the heading typo "Home Finance Clearity".

Two things the old section got wrong are now structural rather than incidental.
A score is shown **only after `POST /leads` has succeeded** — `AssessmentForm`
owns the submission and calls its host's `onComplete` from the success path, so
a failed request leaves the visitor on the form with their answers and a retry.
And the six answers FOIR cannot use are used: `recommendations()` turns the
credit band, the existing EMIs, the down payment, the co-applicant and the time
in the job into named next steps (D57), while the whole questionnaire travels
to the CRM in `leads.meta` (D56) instead of being flattened into a
pipe-separated sentence.

**Similar properties** finally uses the endpoint prompt 08 built: the page
fetches `GET /properties/:id/similar` (the editor's `similarPropertyIds` first,
topped up to six by locality and type) and the carousel prints `PropertyCard`s
in that order. The fetch lives in the page because the sub-navigation may only
offer the item once the API has answered with something — with an empty answer
the section and its navigation item are both absent (BUG-07).

**Enquiry** is one `LeadForm` on a surface, with the message prefilled and
WhatsApp/call follow-ups in its success panel; the boilerplate mounted the same
form three times. Under it, **Recently viewed** reads `sna_recent_properties`
and prints every listing but the one being read.

**How one lead now opens a whole listing**

`leadStorage.UNLOCKS_EVERYTHING` gained the two eligibility sources: a
questionnaire that asks for an income and a credit band has identified the
visitor at least as well as an enquiry has, so it opens every gated kind on the
listing. Because `sessionStorage` fires no event in the tab that wrote it,
`leadStorage` now announces each write on a `sna:lead-change` window event and
`useGatedContent` listens — which is what makes the floor plans and the
documents open on screen, not only in storage, when the enquiry is filed
somewhere else on the page.

**Files added**

- `src/components/sections/property/`: `DocumentsSection.jsx` + CSS,
  `SimilarSection.jsx` + CSS, `EnquirySection.jsx` + CSS,
  `RecentlyViewedSection.jsx`
- `src/components/sections/property/finance/`: `FinanceSection.jsx`,
  `BankCards.jsx`, `BankCard.jsx`, `EmiCalculator.jsx`,
  `EligibilityAssessment.jsx`, `AssessmentForm.jsx`, `AssessmentResult.jsx`,
  `EligibilityModal.jsx`, `assessmentLead.js`, `financeCopy.js`,
  `finance.module.css`
- `src/components/common/RecentlyViewed.jsx` + CSS — the shared strip; the
  listing sidebar reuses it in prompt 26
- Tests: `finance/__tests__/AssessmentForm.test.jsx` (13),
  `finance/__tests__/EmiCalculator.test.jsx` (10),
  `property/__tests__/DocumentsSection.test.jsx` (11)

**Files changed**

- `src/utils/finance.js` — `MONTHLY_INCOME_VALUES`, `EMI_NUMERIC_VALUES`,
  `FOIR`, `applicantIncomeOf`, `monthlyIncomeOf`, `existingEmiOf`, `scoreBand`,
  `SCORE_BANDS`, `affordableProperty`, `recommendations`; `foirScore` and
  `eligibleLoan` now read the form's bracket answers as well as plain rupees,
  and `emiBreakdown` takes `{ price, loanPercent, rate, years }` and returns the
  down payment beside the split. Its test grew from 16 to 30 cases.
- `src/utils/leadStorage.js` — `UNLOCKS_EVERYTHING` exported and widened,
  `LEAD_CHANGE_EVENT` announced on every write
- `src/hooks/useGatedContent.js` — listens for that event
- `src/utils/analytics.js` — `brochure_download`, `document_download` and the
  `floor_plan_download` prompt 24 sends but had not registered
- `src/utils/propertySections.js` (+ test) — `similar.hasData` prefers
  `context.similarAvailable` and falls back to the editor's picks only when the
  caller leaves it out, so the page follows the API and the admin's visibility
  tab still follows the picks
- `src/components/sections/property/LeadModalTemp.jsx` — `successTitle` and
  `successAction`, which is how a gated download is handed over
- `src/pages/public/PropertyDetails.jsx` (+ CSS) — sixteen keys now map to a
  component, the two media keys get a 1 px anchor at the top of the gallery, and
  "Recently viewed" closes the page

**Files removed**

`PropertyDocuments.jsx`, `FinanceGuide.jsx`, `SimilarProperties.jsx`,
`EnquiryForm.jsx`, `SectionPlaceholder.jsx` and their CSS modules — 4 726
lines of component code and stylesheets, replaced by 2 925 lines across
eighteen files (plus 550 lines of test).

**Endpoints / env vars / npm scripts**

None added. `GET /properties/:id/similar` is consumed for the first time;
`POST /leads` carries `meta` for the first time, from the two eligibility
sources. Three analytics events are new: `brochure_download`,
`document_download`, `floor_plan_download`.

**Storage keys**

No new key. `sna_lead` unlocks now also open on `financial-assessment` and
`bank-eligibility`; `sna_recent_properties` is read by the new strip.

**Acceptance checklist**

- [x] Gated brochure and document rows deliver the actual file after the lead,
      and a row the editor left open opens without any dialog (BUG-08 closed).
- [x] Finance: bank cards carry only what the records say, the EMI calculator's
      formulas are unit-tested, both eligibility checks create leads with `meta`
      visible in the mock db, and no reading appears before the POST succeeds.
- [x] Similar uses the API rule and disappears — section and navigation item —
      when the answer is empty; one enquiry form on the page; recently viewed
      works; the five legacy components are deleted and every finance component
      file is ≤ 300 lines (largest: `AssessmentForm.jsx`, 292).
- [x] `npm run lint`, `npm run test:ci` (1 335 tests, 61 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run validate:seed`,
      `npm run smoke` (273/273) pass; the public property page logs nothing to
      the console.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- Property 1 (`lakeview-heights-3-bhk-whitefield`), 1280 px: one `<h1>`,
  17 navigation items and 17 matching section ids with none missing, no
  horizontal scroll. The brochure row is the only document row — the seed
  attaches the same PDF as `brochureUrl` and as `documents[0]`, and one file is
  now one row.
- Gated download: "Download brochure" → the dialog titled "Brochure Download"
  with "Requested: Project brochure (PDF)" prefilled → name + phone → lead 46
  reaches the mock (`source: brochure-download`, `propertyId: 1`),
  `window.open` is called with the PDF and `noopener,noreferrer`,
  `sna_lead.unlocks` gains `{"1":["documents"]}`, `dataLayer` receives
  `brochure_download`, and the success panel offers "Open Project brochure
  (PDF)". Afterwards the row shows no lock.
- Eligibility: the questionnaire (salaried, 3–5 years, ₹1.5–2.5 L, existing
  EMIs ₹10–25 k over 12–24 months, credit 700–749) files lead 47 with
  `source: financial-assessment` and a `meta` holding all eight answers, the
  score and `propertyPrice: 12400000`, and only then prints 85/100 "Excellent",
  the six-row breakdown (₹2 L income → ₹1.2 L FOIR → ₹1.02 L free → ₹1.19 Cr
  loan → ₹1.49 Cr property), three recommendations and the disclaimer.
  Completing it opens the floor plans and the documents on the same page
  without a reload.
- Per-bank check: "Check eligibility" on Garden City Bank opens a dialog headed
  "Check eligibility — Garden City Bank" that says the answers are recorded by
  Squares N Acres and nothing is sent to the lender; the result quotes 8.35 %,
  the lender's own published rate, and a declared co-applicant's ₹50 k–1 L is
  added to the ₹2.5 L exact income (₹3.25 L counted).
- EMI calculator: sliders 50–90 % (the most generous active lender funds 90 %),
  6–15 % starting at 8.35 % (the cheapest), 5–30 years starting at 20;
  ₹1.24 Cr × 80 % at 8.35 % over 20 years → ₹85,149 a month, a 49/51 split and
  "Raising your down payment to 25% would save about ₹6.57 L in interest over
  20 years" — computed from the two scenarios, not from a flat 8 %.
- Similar: six cards, `aurelia-park-residences-…` first, which is the editor's
  own `similarPropertyIds` order. With the endpoint answered empty (CDP request
  interception) both the section and its navigation item disappear and every
  other section stays.
- Enquiry: one form, message prefilled "I'm interested in Lakeview Heights…";
  submitting it shows the thank-you with WhatsApp and call buttons and opens the
  floor plans and the documents behind it.
- Recently viewed: after three listings the third page ends with the other two,
  newest first, and never itself.
- 390 px: the Devanahalli plot has no horizontal scroll, its document rows stack
  to 144 px with the button full width; the Koramangala rental has no finance
  section and no "Finance & EMI" navigation item (not a sale listing).
- Admin: `/admin/leads` lists the three new leads with the sources "Financial
  Assessment", "Bank Eligibility" and "Brochure Download" (the `meta` card is
  prompt 29).
- Console: nothing on any public property page. The admin shell prints four MUI
  Grid v7 migration warnings from `Dashboard.js`, which this prompt does not
  touch — recorded as NEW-34 for prompt 29.

**Not exercised against the seed**

No seed listing switches `sectionVisibility.documents` or `.enquiry` off and no
seed document has `leadGated: false`, so the ungated-row path and D86 were
verified by unit test (`DocumentsSection.test.jsx`, `propertySections.test.js`)
rather than in the browser; `db.json` is off-limits to this prompt. Every
published listing has similar properties, so the empty case was produced by
intercepting the request.

**Known issues**

BUG-05, BUG-07, BUG-08, ADD-12 and ADD-13 are closed. One new row: **NEW-34**
(pre-existing MUI Grid v7 warnings on the admin dashboard, owner 29). NEW-33
still stands — the new dialog suites report the same user-event v13 `act(…)`
notices and no test is flaky because of them.

**Next prompt: 26 — Public listing and search.**

### Prompt 26 — Public listing engine, filters, global search and shortlist (2026-09-17)

**What changed**

The listing is one engine. `src/components/listing/ListingEngine.jsx` serves
`/properties`, `/buy`, the four `/buy/<status>` pages, `/buy/:type`, `/rent`,
`/rent/:type`, `/lease`, `/commercial`, `/commercial/:type` and `/plots`, plus
the locality tabs and the builder profile as embeds — thirteen `<Route>`s
generated from one table. A route contributes nothing but the filters it fixes
and the words it uses (`listingRoutes.js`); everything else is the same code.

`GET /properties` does the filtering, the sorting, the paging and the counting
(D94). That is BUG-19 closed: the page this replaces asked for `perPage=100` and
then narrowed, sorted and paginated the answer in the browser, so page 9 of a
search was a page the visitor's own machine had invented. The only thing
computed here now is how `meta.facets` is drawn.

**The filters** live in the URL under the contract's own names — `localityId=1,4`,
`minPrice=10000000`, `constructionStatus=ready-to-move` — so a shared link is a
request the API could answer as it stands, and a reload, the back button and a
second tab all reproduce the same view. A route's own filters are **fixed**:
merged into every request, absent from the URL, drawn as a locked chip, and
their group is hidden in the rail. Removing Whitefield on
`/localities/whitefield` is therefore not possible, which is the point.

Thirteen groups, one component (`FilterGroups.jsx`), two hosts. The desktop rail
applies live 300 ms after the last click and keeps a Reset; the mobile sheet
keeps an Apply that says what it would return ("Show 34 results", a `perPage=1`
count request) because behind a sheet the results are invisible. That closes
ADD-11, whose panel applied live on desktop, needed an Apply on mobile, offered
two property types, dropped the fourth locality, wrote `50000000-Infinity` into
addresses and wiped `q`, `sort` and `page` on "Clear filters" (NEW-06).

**`listingSeo.js`** is the §9.4 rules as a pure function: the canonical carries
only `listingType`, `segment`, `propertyTypeId`, `localityId`,
`constructionStatus`, `bedrooms` and `page`, in that order and never a parameter
the route already fixed; anything else — a price, an amenity, a sort, a search —
makes the page `noindex, follow`. The `<h1>` is rebuilt from the filters, so
`/buy?localityId=1&bedrooms=3` heads itself "3 BHK Properties for sale in
Whitefield, Bengaluru", and `Pagination` emits `rel=prev/next` from the same
object. Prompt 38 hands it to `<Seo type="listing">` unchanged.

**`GlobalSearch`** is one box for three places: the hero, a header dialog and the
listing's results header. It reads `GET /properties/suggestions`, so "hebbal"
offers the **locality page** before it offers a listing in it, keeps the last
five searches in `sna_recent_searches`, and is operable from the keyboard as a
combobox. The hero used to own three hundred lines of type-ahead nobody else
could use — which is why the header had no search at all and `NotFound` sent
`?search=`, a parameter the listing has never read (BUG-10).

**`/shortlist`** exists (NEW-32). It holds ids and asks the API for the live
records, so a list kept for a fortnight cannot show last week's price and a
listing that has been taken down simply stops appearing — the page says how many
are missing. `?ids=` makes it shareable to somebody who has never been to the
site, with a "Save all" for them.

**Files added**

- `src/components/listing/`: `ListingEngine.jsx` (+ `ListingEngine.module.css`),
  `FilterRail.jsx`, `FilterSheet.jsx`, `FilterGroups.jsx` (+
  `filters.module.css`), `ActiveFilters.jsx`, `SortSelect.jsx`,
  `ResultsHeader.jsx`, `ViewToggle.jsx`, `ListingGrid.jsx`, `ListingEmpty.jsx`,
  `useListingParams.js`, `listingRoutes.js`, `listingSeo.js`
- `src/components/common/GlobalSearch.jsx` + CSS
- `src/pages/public/Shortlist.jsx` + CSS
- `src/utils/listingFilters.js`
- `src/components/sections/locality/LocalityListings.jsx`,
  `src/components/sections/developer/DeveloperListings.jsx` — the two embeds
- Tests: `utils/__tests__/listingFilters.test.js` (24),
  `listing/__tests__/listingSeo.test.js` (27),
  `listing/__tests__/ListingEngine.test.jsx` (13)

**Files changed**

- `src/hooks/useApiList.js` — a `fixedParams` option, merged into every request
  last and never written to the URL
- `src/pages/public/PropertyListing.jsx` (+ CSS) — rewritten: resolve the route,
  render the engine, answer 404 for an unknown category slug (D25)
- `src/routes/publicRoutes.js` — the listing routes are generated from
  `LISTING_ROUTES`; `/shortlist` added
- `src/components/common/PropertyCard.jsx` (+ CSS) — `variant="list"`: the same
  card on its side above 900 px, with room for the editor's highlights
- `src/components/common/RecentlyViewed.jsx` (+ CSS) — an optional `heading`, so
  an empty history is no heading
- `src/contexts/ShortlistContext.js` (+ test) — `add`/`remove`/`toggle` read the
  saved ids through a ref: two hearts pressed in the same tick both stick
- `src/pages/public/LocalityDetail.jsx`, `BuilderDetail.jsx` (+ their tests) —
  the embeds replace the two temporary preview rows
- `src/components/sections/home/HeroSection.jsx` (+ CSS) — mounts `GlobalSearch`
- `src/components/sections/home/QuickActions.jsx` — six tiles, real routes (D92)
- `src/components/layout/Header.jsx`, `MobileHeader.jsx` (+ CSS) — a search icon
  opening `GlobalSearch` in a `Modal`
- `src/components/layout/BottomNav.jsx` — Search → `/properties?filters=open`
- `src/pages/public/NotFound.jsx` — searches to `?q=`
- `src/utils/analytics.js` — the `search` event

**Files removed**

`PropertyFilters.jsx` + CSS, `PreLaunch.js`, `UnderConstruction.js`,
`ReadyToMove.js`, `RentApartments.js`, `RentVillas.js`,
`utils/adapters/legacyProperty.js`, `sections/locality/LocalityProperties.jsx`,
`sections/developer/DeveloperProperties.jsx` — 1 192 lines out, 524 net lines of
new source in (3 090 lines across the eighteen new modules, against the deleted
listing, its filter panel, its adapter and the five wrapper pages).
`grep -rn "legacyProperty\|PropertyFilters" src` → 0.

**Endpoints / env vars / npm scripts**

None added. `GET /properties` is consumed with every §5.7 filter and with `ids`
for the first time; `meta.facets` is read for the first time;
`GET /properties/suggestions` now serves three surfaces instead of one.

**Storage keys**

`sna_listing_view` (grid or list) and `sna_recent_searches` (max 5) are new;
`sna_shortlist` is read by `/shortlist`.

**Acceptance checklist**

- [x] Every listing route resolves from the table; filters, sort and page are
      URL-synced; facet counts are shown; the grid/list choice is remembered;
      the empty state suggests which filter to drop; pagination emits
      `rel=prev/next`.
- [x] Global search works from the header, the hero and the listing, with
      grouped suggestions and recent searches; `NotFound` and `QuickActions`
      links fixed.
- [x] The locality Buy/Rent tabs and the builder's projects run the engine;
      `/shortlist` works, including a shared `?ids=` link.
- [x] The legacy listing, its filter panel, the five wrapper pages and
      `legacyProperty.js` are deleted; `listingSeo` is unit-tested.
- [x] `npm run lint`, `npm run test:ci` (1 402 tests, 64 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run smoke` (273/273) pass; no
      console output on any listing page.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- The twelve listing routes all answer with one `<h1>`, a count, a canonical and
  no horizontal scroll: `/properties` "Properties in Bengaluru – 38 Listings",
  `/buy` 26, `/buy/pre-launch` 2, `/buy/ready-to-move` 14, `/buy/resale` 4,
  `/buy/villas` 4 (a property type), `/rent` 7, `/rent/apartments` 4,
  `/rent/villas` 1 ("1 Listing", singular), `/lease` 5, `/commercial` 5,
  `/plots` 5. `/buy/unknown` renders the 404 page.
- `/properties?localityId=1&bedrooms=3&minPrice=10000000&maxPrice=15000000` →
  title "3 BHK Properties in Whitefield, Bengaluru", canonical
  `/properties?localityId=1&bedrooms=3` (the price is dropped),
  `robots: noindex, follow`, and three removable chips beside the "Clear all".
- Ticking Whitefield in the rail wrote `?localityId=1` and renamed the page to
  "Properties for sale in Whitefield, Bengaluru" ~300 ms later; removing the
  chip took it away and did **not** let the rail put it back.
- Choosing Rent in the rail while a sale budget was set cleared `minPrice` and
  `maxPrice` and switched the buckets to "Up to ₹10 K …" (D90). Back restored
  the sale budget and the sale buckets; forward restored the rent view.
- A six-filter URL restored the rail exactly: "6 filters applied", Apartments,
  Whitefield and Semi-furnished ticked, "3 BHK" pressed, sort "price-asc",
  `noindex`.
- `?bedrooms=5` highlights the "5+ BHK" chip; `?minPrice=abc` is ignored.
- `/localities/whitefield`: tabs "Buy (1)" and "Rent (1)", locked chips "Buy"
  and "Whitefield", the page's own `<h1>` untouched. `/builders/aurelia-estates`
  lists its eight projects under "Projects by Aurelia Estates".
- Shortlist: two hearts on `/buy` → `["6","23"]` in `sna_shortlist` → two cards
  with a "Remove" each and a Share button; `/shortlist?ids=1,2` shows a shared
  list with "Save all"; an empty list offers "Browse properties". Both are
  `noindex, follow`.
- Search: "hebbal" in the hero offers the locality first (2 properties), then
  two listings, then "Search for “hebbal”"; following the locality lands on
  `/localities/hebbal` and the term is remembered, so the next focus offers it
  back. The header dialog focuses its input and answers "aurelia" with five
  listings and the builder. The 404 page's box goes to `/properties?q=…`.
- 390 px: `/properties?filters=open` opens the sheet with the parameter consumed
  from the address; ticking Whitefield changed the footer from "Show 38 results"
  to "Show 3 results" and applying it wrote `?localityId=1`. No rail is
  rendered, and nothing scrolls sideways.
- Console: nothing on any listing, locality, builder or shortlist page at either
  width.

**Known issues**

BUG-10, BUG-16, BUG-19, ADD-10, ADD-11, ADD-15, NEW-05, NEW-06 and NEW-32 are
closed. No new defect was recorded: the one found while testing — two hearts
pressed in the same tick losing the first, because `ShortlistContext` read the
render's copy of the list under React 18 batching — is fixed here with a test.
NEW-33 (user-event v13 `act(…)` notices around MUI dialogs) still stands.

**Next prompt: 27 — Home page.**

### Prompt 27 — Data-driven home page, navigation and footer (2026-09-17)

**What changed**

The home page no longer contains a sentence a component made up. Fifteen bands,
and every one of them is data: the hero and its search tabs are
`siteSettings.hero`; the tiles and the four listing rows are `GET /properties`
with different filters; the localities, property types and builders are master
data; "Why choose Squares N Acres" and "How it works" are the `features` and
`steps` blocks of the `home` CMS page (D81); the testimonials, articles, FAQs
and partners are their own collections. `WhyChoose.jsx` and `HowItWorks.jsx` —
eight hardcoded objects between them — are deleted. That is the home half of
BUG-11 closed.

**A section with nothing behind it renders nothing at all.** No heading, no
empty state, no gap. A row below three results is absent; a tile whose count
request failed shows no count rather than "0"; the CMS bands disappear the
moment the page is unpublished, because there is no fallback copy by design —
a fallback would mean quietly ignoring what an editor did.

**The hero search** is the `HERO_SEARCH_TABS` strip over a card that overlaps
the hero: a locality/keyword box, a property type, a budget and — for the two
residential tabs — BHK chips. Each tab is a listing route and the form is that
route's first filters, so Search lands on
`/rent?localityId=7&bedrooms=2`, the same address the listing's own rail
produces. A locality picked from the type-ahead becomes `localityId`; free text
becomes `q`. Switching tab always drops the budget: the sale and rent scales are
two orders of magnitude apart (D90). Searching is **not** a lead — it sends the
`search` event and navigates, and `LEAD_SOURCES.hero-search` stays unused.

**The navigation is one module.** `src/config/navigation.js` builds the header
menus, the header actions, the footer columns, the legal line and the bottom bar
from master data, the published CMS pages and `siteSettings`. `Header`,
`MobileDrawer`, `BottomNav` and `Footer` all read those builders, so the two
copies of `navItems` that `Header` and `MobileHeader` each carried are gone
(BUG-20). A menu with no pages behind it is not rendered; a property type an
editor adds appears in the Buy mega-menu, the type grid and the footer without
a code change.

**`GET /pages?showInHeader=&showInFooter=`** is the one new endpoint: published
pages as `{slug,title,headerMenu,footerColumn,order}`, unpaginated, because a
menu arrives whole or it is wrong. `useNavPages()` caches both lists in memory
for the page load, so four components share one pair of requests (the D93
reasoning, applied to the CMS).

**Files added**

- `src/config/navigation.js`, `src/config/copy.js`
- `src/hooks/useNavPages.js`
- `src/components/layout/`: `MegaMenu.jsx`, `MobileDrawer.jsx` (+ their CSS)
- `src/components/sections/home/`: `HeroSearch.jsx`, `CategoryTiles.jsx`,
  `PropertyRow.jsx`, `PropertyTypeGrid.jsx`, `TopBuilders.jsx`,
  `HomeFeatures.jsx`, `HomeSteps.jsx`, `LatestInsights.jsx`, `CtaBand.jsx`
  (+ their CSS), `useCategoryCounts.js`
- Tests: `config/__tests__/navigation.test.js` (28),
  `sections/home/__tests__/HeroSearch.test.jsx` (14),
  `sections/home/__tests__/PropertyRow.test.jsx` (7)

**Files changed**

- `src/pages/public/Home.jsx` (+ CSS) — rewritten around the fifteen bands and
  the `home` CMS page
- `src/components/sections/home/HeroSection.jsx` (+ CSS) — media, headline, the
  trust badges and the stats row (both only when settings carry them), and the
  search card
- `src/components/sections/home/ExploreLocalities.jsx` (+ CSS) — the shared
  `Section`/`SectionHeader` and a "View all"
- `src/components/layout/Header.jsx`, `MobileHeader.jsx`, `BottomNav.jsx`,
  `Footer.jsx` (+ their CSS) — all four rebuilt on the builders
- `src/components/layout/MainLayout.jsx` (+ CSS) — the home page's `<main>`
  drops the header offset so the hero runs under the transparent bar (D52)
- `src/components/common/GlobalSearch.jsx` (+ CSS) — an `inline` variant with no
  `<form>` of its own, `inputId`, `onChange` and an `onSelect` a host may consume
- `src/components/common/LeadForm.jsx` — a field may declare `group` (nest under
  `requirement`), `toBody` (one budget select fills two fields) and a function
  `options` (choices that follow the other answers)
- `src/components/sections/property/LeadModalTemp.jsx` — a `requirement` prop
  adding the six selects of D82
- `src/components/ui/Drawer.jsx` (+ CSS) — `padded={false}`
- `src/routes/paths.js` — `PATHS.page()` encodes each segment, so a nested page
  slug keeps its slashes
- `mock-server/routes/pages.js`, `src/services/endpoints.js`,
  `pageService.js`, `endpoints.test.js`, `mock-server/__tests__/content.test.js`,
  `docs/API_CONTRACT.md` — the navigation endpoint

**Files removed**

`QuickActions.jsx`, `WhyChoose.jsx`, `HowItWorks.jsx`, `FeaturedProperties.jsx`,
`TrendingTopics.jsx` and their five stylesheets — 2 867 lines out against 1 393
in across the whole diff, with 2 550 lines of new source in the twenty-eight new
modules. `grep -rn "QuickActions\|WhyChoose\|HowItWorks\|FeaturedProperties\|TrendingTopics" src` → 0.

**Endpoints / env vars / npm scripts**

One endpoint added: `GET /pages?showInHeader=&showInFooter=` (`pages.list`,
public, published only). No env var, no npm script, no dependency.

**Acceptance checklist**

- [x] Home renders every section of the objective from data; the hero search
      navigates with the right parameters for each tab; the tiles show counts;
      rows below three items are absent.
- [x] Header, mega-menu, drawer, bottom bar and footer are built from data and
      settings; no "Sign In"; the CTA opens the post-requirement modal; the
      phone and WhatsApp buttons follow `settings.navigation`.
- [x] The five legacy sections are deleted; `GET /pages?showInHeader` is
      smoke-tested (`pages.list` in the walk) and unit-tested on the mock.
- [x] `npm run lint`, `npm run test:ci` (1 452 tests, 67 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run test:mock` (131) and
      `npm run smoke` (274/274) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- `/` renders one `<h1>` and fifteen `<h2>` bands in the objective's order, with
  no horizontal scroll and no console output. The tiles read "Ready to move 14
  listings", "Under construction 6", "New launch 2", "Plots & land 5", "Rent a
  home 7", "Commercial 5".
- Hero: the Rent tab switched the budget select to "Up to ₹10 K / ₹10 K – ₹20 K
  / ₹20 K – ₹35 K"; typing "koramangala" offered the locality first, then three
  listings; picking it, ticking 2 BHK and pressing Search landed on
  `/rent?localityId=7&bedrooms=2`, headed "2 BHK Properties for rent in
  Koramangala, Bengaluru".
- Mega-menu keyboard: `Space` on "Buy" opened the four-column panel and focused
  "Pre-Launch", `ArrowDown` moved to "Under Construction", `End` jumped to "HSR
  Layout", `Escape` closed it and returned focus to the trigger with
  `aria-expanded="false"`. The budget column links
  `/buy?minPrice=5000000&maxPrice=10000000` … `/buy?minPrice=25000000`, and that
  first link opens the listing as `noindex, follow` (§9.4).
- Header width: measured at 900, 1024, 1280 and 1536 px — nav overflow 0 at all
  four. Below 1200 px the tail folds into "More" (five menus + More at 900 and
  1024; all ten at 1280 and 1536).
- 390 px: no horizontal scroll; the bottom bar is Home · Search · Shortlist ·
  Enquire · Menu; the tiles are two per row; the drawer lists all ten menus as
  48 px accordion rows over a Call · WhatsApp · Post Requirement row, with no
  "Sign In"; expanding Buy showed its four groups and 26 links.
- "Enquire" opened the post-requirement dialog with the six D82 selects; filling
  it in filed a lead whose `requirement` reads
  `{listingType:'rent', bedrooms:3, budgetMin:20000, budgetMax:35000, timeline:'1-3-months'}`
  — nested, not flattened. Choosing Rent first had switched the budget options to
  the rent bands.
- Settings: `PUT /api/admin/settings {"navigation":{"showWhatsappButton":false}}`
  then a fresh load left `tel:` and the CTA in the header and no WhatsApp button;
  restoring it brought the button back.
- Edge cases: with `GET /properties?perPage=1` failing, every tile rendered
  without a count and no "0" appeared anywhere; with the `home` page set to
  `draft`, "Why choose Squares N Acres" and "How it works" were absent and the
  page went from "Top builders" straight on with no gap.

**Known issues**

BUG-20 and ADD-15 are closed; BUG-11 and ADD-06 keep rows for the pages and the
duplicates prompts 29–40 own. No new defect was recorded. Two things worth
writing down for the next reader:

- The header genuinely does not fit ten top-level menus below about 1200 px, so
  `collapseMenus()` folds the tail into "More" between 900 px and 1199 px. That
  is a decision, not a bug (see `docs/DECISIONS.md`), and the same measurement
  is why the call and WhatsApp buttons are icons on desktop.
- In this container every request to an external host (`picsum.photos`,
  `res.cloudinary.com`, the Iconify API) fails TLS verification through the
  agent proxy, so the QA screenshots show empty image and icon boxes and the
  browser console carries `ERR_CERT_AUTHORITY_INVALID` lines. `curl` reaches the
  same URLs from the shell (302), and nothing in the page's own JavaScript
  reports an error; the "no console output" claims above exclude those transport
  failures.

**Next prompt: 28 — Lead capture unification.**

### Prompt 28 — Unified lead capture, spam protection and click tracking (2026-09-17)

**What changed**

There is one lead system. `LeadForm` is the only form on the site that files a
lead, `LeadCaptureModal` is the only dialog that asks for one,
`LeadCaptureContext` is the only thing that opens it, and
`src/utils/leadSources.js` is the only place a `LEAD_SOURCES` value is written
down. Fifteen pages that each declared their own field array and their own
source string now name an **entry point** and take the rest from the table —
which is what closes BUG-09 in the client: `home_loan`, `faq_contact` and
`website` are not discouraged, they are unreachable.

**Every box has a label.** Each control is a `ui/FormField`, so it carries a
visible `<label>`, `aria-describedby` for its hint and its error, and
`aria-invalid` when it is wrong (§8.3). `required: false` is honoured — an
untouched optional box is left out of the body rather than sent as `''`, which
is what used to make an e-mail-less enquiry come back 422. That is ADD-09
closed.

**Spam protection is unconditional.** Every form — the newsletter band
included — carries the `website` honeypot (off-screen, `tabindex="-1"`,
`aria-hidden`, autofill off) and a ten-second throttle per instance (D43) whose
countdown is announced through `aria-live`. The server's own 429 reads back as
"Too many requests, please wait a minute". The consent box is a real control:
unticking it blocks the submit rather than filing `consent: false`.

**Nothing is dropped on the way to the API any more.** A field whose name is
not one of the four `POST /leads` stores at the top level goes to `lead.meta`
(D56) — `monthlyIncome`, `workspaceType`, `serviceType`, `askingPrice` were all
being posted and silently discarded by the mock's `sanitize()`. The six
requirement selects nest under `requirement` (D82). The phone is normalised to
`+91XXXXXXXXXX`. The campaign that brought the visit rides along, captured once
into `sna_utm` on the first landing and attached four pages later.

**A gated download asks once per listing, not once per file.** When
`sna_lead` already holds a phone number and either a capture for this listing
or an open gate of the kind being asked for, `LeadCaptureModal` skips the form,
delivers the file and **files no second lead** — the first capture is the
record that matters, and the analytics events (`brochure_download`,
`document_download`) are what say which file was taken. The retry offered after
a blocked pop-up is a real `<a href>` rather than a second `window.open`.

**WhatsApp and call clicks are leads only for somebody we can call back.**
`WhatsAppButton` and `CallButton` replace nine hand-rolled `tel:`/`wa.me`
anchors across the header, the drawer, the price card, the CTA bar, the agent
card and the success panel. Every click sends its event; a click by an
identified visitor also files a `whatsapp-click` / `call-click` lead,
fire-and-forget so the link is never delayed. An anonymous visitor's click is
an event and nothing more — `POST /leads` needs a name and a number — and a
signed-in staff member is never treated as a visitor at all. The floating
56 px WhatsApp circle is on every public page and names the listing a visitor
is reading.

`LeadModalTemp` and its stylesheet are deleted.

**Files added**

- `src/utils/leadSources.js` (`ENTRY_POINTS`, `leadFormProps`, `withDefaults`,
  `requirementFields`), `src/utils/clickLead.js`
- `src/contexts/LeadCaptureContext.js`
- `src/components/common/`: `LeadCaptureModal.jsx` (+ CSS), `LeadFormField.jsx`,
  `LeadSuccess.jsx`, `RequirementFields.jsx`, `ConsentCheckbox.jsx`,
  `Honeypot.jsx`, `NewsletterForm.jsx`, `WhatsAppButton.jsx`, `CallButton.jsx`,
  `ContactButtons.module.css`
- Tests: `common/__tests__/LeadForm.test.jsx` (23),
  `common/__tests__/LeadCaptureModal.test.jsx` (13),
  `utils/__tests__/leadStorage.test.js` (17),
  `utils/__tests__/leadSources.test.js` (18)

**Files changed**

- `src/components/common/LeadForm.jsx` (+ CSS) — rewritten to the new contract
- `src/utils/leadStorage.js` — v2 (`getVisitor`, `saveVisitor`, `markCaptured`,
  `isCapturedFor`, `isIdentified`, `unlock`, `isUnlocked`, `clear`) plus
  `captureUtm`/`getUtm`; a record written by an older bundle is migrated, not
  discarded
- `src/utils/validators.js` — Indian mobile only, `normalizePhone`,
  `localPhoneDigits`, per-field labels in the messages
- `src/utils/analytics.js` — a GA4 `gtag` bridge beside the `dataLayer` push,
  and `newsletter_subscribe`
- `src/routes/index.js` — `LeadCaptureProvider` in the app shell;
  `src/components/layout/MainLayout.jsx` — the floating button
- `src/components/layout/`: `Header.jsx`, `MobileHeader.jsx`, `MobileDrawer.jsx`,
  `BottomNav.jsx` — the CTA opens the shared dialog, the contact glyphs are the
  shared buttons
- `src/components/sections/property/`: `PriceCard.jsx`, `MobileCtaBar.jsx`,
  `AgentCard.jsx`, `EnquirySection.jsx` (+ CSS), `UnitConfigurationsSection.jsx`,
  `FloorPlansSection.jsx`, `DocumentsSection.jsx`, `finance/AssessmentForm.jsx`
- `src/components/sections/locality/LocalityCta.jsx`,
  `sections/developer/DeveloperCta.jsx`
- `src/components/common/NewsletterSection.jsx` (+ CSS) — the shared form
- `src/pages/public/`: `PropertyDetails.jsx`, `FAQs.jsx`, `ArticleDetail.js`,
  `Articles.js` (+ CSS), `Contact.jsx`, `Careers.jsx`, `HomeLoan.jsx`,
  `LegalAssistance.jsx`, `InteriorDesigning.jsx`, `SellLet.jsx`,
  `Partnership.jsx`, `FlexibleWorkspace.jsx`, `DirectLeaseRetails.jsx`,
  `RealEstateAwareness.js`
- Tests updated for the new markup: `DocumentsSection.test.jsx`,
  `FloorPlansSection.test.jsx`, `BuilderDetail.test.jsx`

**Files removed**

`src/components/sections/property/LeadModalTemp.jsx` and its stylesheet.

The whole diff is 64 files, **4 399 lines in against 2 310 out**; `src/` alone
is 4 118 in / 2 250 out across 62 files, of which 856 added lines are the four
new test suites. What came out is the duplication: the hand-rolled forms of
`Contact.jsx` and `Careers.jsx`, the eight `leadFields` arrays, the nine
`tel:`/`wa.me` anchors and `LeadModalTemp` itself.

**Endpoints / env vars / npm scripts**

None added. `POST /leads` and `POST /newsletter/subscribe` are used exactly as
§5.14 already defines them. One new storage key: `sna_utm` (sessionStorage),
beside the v2 `sna_lead`.

**Acceptance checklist**

- [x] Every lead entry point uses `LeadForm`/`LeadCaptureModal` with a canonical
      source. The prompt's grep for the fifteen legacy spellings returns **0**,
      and `leadSources.test.js` asserts every entry's source is a
      `LEAD_SOURCES` value and that every canonical value but the CRM's `other`
      has an entry.
- [x] All 29 canonical sources were posted through the running mock and read
      back from `GET /admin/leads` under their own label (three batches, to
      stay inside the ten-a-minute limit; the probe leads were deleted after).
- [x] Gated flows skip the form when the visitor is already identified, still
      deliver, and file no second lead; WhatsApp/call clicks create leads only
      for identified visitors.
- [x] Honeypot, throttle, consent, 422/429 handling, prefill and the success
      actions work; `LeadModalTemp` is deleted.
- [x] `npm run lint` (0 findings), `npm run test:ci` (**1 523 tests, 71
      suites**), `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings) and `npm run smoke` (274/274) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- **Header "Post Requirement"** opened "Post your requirement" with the
  fieldset "What are you looking for?" and its six selects in order. Choosing
  Rent switched the budget options from the sale bands to
  `0-10000 … 500000-` (D90); the lead stored
  `requirement: {listingType:'rent', bedrooms:3, budgetMin:20000, budgetMax:35000, timeline:'1-3-months'}`,
  `phone: '+919876543210'` (typed as `+91 98765-43210`), `consent: true` and the
  `pageUrl`. The success panel offered "Message on WhatsApp" and "Call …";
  `window.dataLayer` held `lead_submit`.
- **Gated brochure, fresh session:** the row read "Shared on request"; the
  dialog asked for name, phone and e-mail only (no message box); the lead was
  filed as `brochure-download` with `propertyId: 34` and
  `message: 'Requested: Project brochure (PDF)'` from the hidden field; the
  file was offered as a real link with `target="_blank"`; `sna_lead` held
  `{"version":2,…,"unlocks":{"34":["documents"]}}`.
- **Second gated action, same session:** after a reload the section no longer
  said "Shared on request", the click opened the PDF straight away, **no form
  was shown and no second lead was filed** (the newest lead id was unchanged).
- **Floating WhatsApp** (56×56, bottom-right) linked to
  `wa.me/919800000000?text=Hi Squares N Acres, I am interested in a property. — Greenfield Axis – Office Space for Lease in Bellandur http://localhost:3000/properties/…`
  — the configured default plus the listing and its address.
- **`/insights/faqs`** carried two forms: the question form (name, phone,
  e-mail, "Your question", honeypot, consent; submit "Ask us") and the
  newsletter band (e-mail + honeypot, submit "Subscribe"). The question filed a
  `faq` lead carrying its text.
- **`/contact`** (the legacy page) filed `contact-page` with
  `meta: {subject: 'property-enquiry'}` — the subject select's seven options
  come from `ENTRY_POINTS`. Controls measured 44 px (the textarea 112 px) and
  the submit was full width.
- **Throttle:** with the browser taken offline, the submit showed the inline
  "Unable to reach the server…" error and left the form up; the button then
  read **"Please wait 9s"**, was `disabled`, and the `aria-live` line said "You
  can send this again in 9 seconds." A second click did nothing.
- **390 px:** no horizontal scroll; the property CTA bar is Call · WhatsApp ·
  Enquire at 48 px each, pinned to the viewport bottom (top 715 in a 780 px
  viewport); the floating circle sits 71 px above it. "Enquire" opened a bottom
  sheet — full width, bottom-anchored, 40×4 grabber, 44 px controls, the
  consent line and a full-width "Send".
- **Console:** nothing but React's "Download the React DevTools" notice at
  either width. As in prompt 27, every request to an external host
  (`picsum.photos`, `res.cloudinary.com`, the Iconify API) fails TLS through
  this container's proxy, so images and icons render as empty boxes and the
  transport errors are excluded from that claim.

**Known issues**

BUG-09 (client half), BUG-15 (client half) and ADD-09 are closed; `LeadModalTemp`
and the post-requirement modal leave the pending-rewrites table. One new defect
was recorded:

- **NEW-35** — for about half a second after a route change, framer-motion's
  page-transition wrapper in `MainLayout` carries a `transform`, which makes it
  the containing block for every `position: fixed` element inside `<main>`. The
  property page's mobile CTA bar therefore sits far below the fold until the
  spring settles (`top: 9041` at 0 ms, `top: 715` from ~500 ms). It
  self-corrects, and the floating WhatsApp button is outside `<main>` and never
  affected. Pre-existing — the wrapper is prompt 04's and the bar prompt 23's —
  so it is recorded rather than fixed here.

Two things worth writing down for the next reader:

- The seed points a listing's brochure **and** all four of its documents at the
  same dummy PDF, and `orderedDocuments` de-duplicates a document that is the
  brochure again, so a seeded listing shows exactly one download row. That is
  prompt 25's intended behaviour, not a regression — but it means "the second
  document" can only be exercised against the same row after a reload.
- `LEAD_SOURCES` carries a 29th value, `other`, that §6.17 does not list;
  prompt 05 added it as the CRM's catch-all. No entry point claims it, and
  `leadSources.test.js` exempts it by name rather than by a loophole.

**Next prompt: 29 — Admin leads CRM and dashboard.**
