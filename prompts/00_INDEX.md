# 00_INDEX — Execution guide, prompt table, coverage matrix and glossary

## 1. How to execute the prompts (read this first)

1. Open Claude Code at the repository root and, for each prompt in numeric order, start a **fresh session** and say: `Read and execute prompts/NN_<name>.md` (or paste the file). Never run two prompts in one session and never skip a number.
2. Every prompt tells the executor to read `prompts/00_MASTER_CONTEXT.md`, `docs/PROJECT_STATE.md` and `docs/DECISIONS.md` first; the executor never asks you questions — ambiguities are decided per the master context and logged in `docs/DECISIONS.md`.
3. Before starting a prompt make sure `git status` is clean and `npm install` has been run; from prompt 06 onward keep `npm run mock` (and `npm start`, or `npm run dev` for both) running in separate terminals when a prompt asks for it.
4. After each prompt: review `git diff HEAD~1 --stat` and the diff itself, run the prompt's verification commands (`npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke`…), execute its manual QA script (desktop 1280 px + mobile 390 px with the console open), then tick the checkbox in the table below.
5. The definition of done is identical for every prompt (`00_MASTER_CONTEXT.md` §12.1): zero lint errors/warnings, tests green, CI build green, zero HOM traces, smoke green, clean console, one Conventional-Commits commit, clean tree.
6. If a session crashes half-way: open a fresh session, read `docs/PROJECT_STATE.md` (last report + "Pending rewrites" + "Known issues"), run `git status` and `git log -5`, then say `Continue prompts/NN_<name>.md from where it stopped` — the prompt's §0 instructs the executor to resume, not redo.
7. If a prompt's verification fails after execution, do **not** move on: start a fresh session with `Fix the failing verification of prompts/NN_<name>.md` (the executor must fix causes, never disable rules/tests).
8. Prompts 44–46 are QA passes that may modify any module; prompt 47 generates the backend handover package; prompt 48 is the release audit and creates the `v1.0.0` tag.
9. Optional tooling: Playwright e2e (prompt 44) requires Node ≥ 20 and browser downloads; the prerender (41/46) and the Chrome-based audits (38/42/46) require `CHROME_PATH` pointing at a local Chrome — every prompt documents what to record when they are unavailable.
10. Keep `docs/PROJECT_STATE.md` as your dashboard: it lists executed prompts with commit hashes, cumulative scripts/env vars/endpoints, pending rewrites and open issues; it must read `Status: COMPLETE` after prompt 48.

## 2. Execution table

| # | File | Phase | Title | Scope (one line) | Depends on | Size | Done |
|---|---|---|---|---|---|---|---|
| 01 | `01_repo-audit-tooling-and-project-state.md` | Foundation | Repo audit, tooling, state files | Inventory, baseline, ESLint/Prettier, cross-platform scripts, `check:traces` skeleton, PROJECT_STATE/DECISIONS | — | M | - [ ] |
| 02 | `02_rebrand-identity-and-environment.md` | Foundation | Rebrand identity & environment | package name, env files (no Cloudways), `site.js`, brand assets, index.html/manifest, README v1 | 01 | S | - [ ] |
| 03 | `03_purge-hom-traces-and-dead-code.md` | Foundation | Purge HOM traces & dead code | All HOM strings/keys/classes/images, dead code, no public admin link, strict `check:traces`, format | 02 | M | - [ ] |
| 04 | `04_design-system-theme-and-ui-kit.md` | Foundation | Design system & UI kit | Tokens, MUI theme, `ui/*`, hooks, layout restyle, replace swal/slick/countup/observer, one toast system | 03 | L | - [ ] |
| 05 | `05_api-contract-enums-and-data-model-docs.md` | Contract | API contract, enums, registry, schemas | `docs/API_CONTRACT.md`, `DATA_MODEL.md`, `RBAC.md`, `enums.js`, `endpoints.js`, schema descriptors, `rbac.js` | 04 | M | - [ ] |
| 06 | `06_mock-server-core.md` | Mock | Mock server core | Express + JSON Server library, envelope, PATCH/PUT, runtime db, starter seed, `validate:seed` | 05 | L | - [ ] |
| 07 | `07_mock-server-auth-and-rbac.md` | Mock | Mock auth & RBAC | Login/logout/profile/password, tokens TTL, role middleware, users CRUD, `test:mock` | 06 | M | - [ ] |
| 08 | `08_mock-server-properties-and-leads.md` | Mock | Mock properties & leads | Filters/facets/slug/featured/similar/view/duplicate/bulk; leads pipeline/notes/activities/export | 07 | L | - [ ] |
| 09 | `09_mock-server-content-seo-and-smoke-tests.md` | Mock | Mock content, SEO, smoke | Articles, master data, pages, media, settings, seo, dashboard, newsletter, jobs, redirects, sitemaps; `smoke` | 08 | L | - [ ] |
| 10 | `10_seed-data-bangalore.md` | Mock | Full Bangalore seed | 36+ properties, 20 localities, 12 articles, 15 pages, 45 leads…, validator rules, `SEED_GUIDE.md` | 09 | L | - [ ] |
| 11 | `11_frontend-services-and-data-hooks.md` | Data layer | Services, hooks, contexts | `http.js`, registry services, `useApi/useApiList`, settings/master-data contexts, formatters, rewire pages | 10 | L | - [ ] |
| 12 | `12_auth-admin-shell-and-rbac.md` | Admin core | Auth client & admin shell | Login, expiry, `ProtectedRoute/RoleRoute`, sidebar/topbar, single lead poller, profile page, 403 | 11 | M | - [ ] |
| 13 | `13_admin-ui-kit.md` | Admin core | Admin UI kit | `DataTable`, `FilterBar`, `useForm`, fields, `MasterDataPage`, users page, IconPicker fixes | 12 | L | - [ ] |
| 14 | `14_localities-and-cities.md` | Master data | Localities & cities | Admin CRUD pages, public `/localities`, `/localities/:slug` (properties tabs completed in 26) | 13 | M | - [ ] |
| 15 | `15_property-types-amenities-badges-banks.md` | Master data | Types, amenities, badges, banks | Admin CRUD via `MasterDataPage`, context hooks, consumers | 14 | M | - [ ] |
| 16 | `16_developers-builders.md` | Master data | Developers / builders | Admin CRUD page, public `/builders`, `/builders/:slug` | 15 | M | - [ ] |
| 17 | `17_testimonials-team-partners-faqs.md` | Content | Testimonials, team, partners, FAQs | Admin CRUD (FaqManager rewrite), shared public sections, FAQs page | 16 | M | - [ ] |
| 18 | `18_property-form-foundation.md` | Properties | Property form foundation | `usePropertyForm`, initial state, validators, rail, autosave, `toPayload`, slug check, completeness | 17 | L | - [ ] |
| 19 | `19_property-form-tabs-1-6.md` | Properties | Form tabs 1–6 | Basics, Location, Pricing, Area & configuration, Unit configurations, Media | 18 | L | - [ ] |
| 20 | `20_property-form-tabs-7-12.md` | Properties | Form tabs 7–12 | Amenities, Highlights & specs, Floor plans, Documents, Project & builder, FAQs (+ suggestions) | 19 | L | - [ ] |
| 21 | `21_property-form-tabs-13-16-and-publish.md` | Properties | Form tabs 13–16 & publish | Similar, Section visibility, Agent, SEO placeholder, admin preview, legacy form removal | 20 | M | - [ ] |
| 22 | `22_admin-property-list.md` | Properties | Admin property list | Server-side DataTable, filters, bulk, toggles, duplicate, CSV export, role behaviour | 21 | M | - [ ] |
| 23 | `23_property-details-part-1.md` | Properties | Details part 1 | Shell, gallery + lightbox, price card, key facts, section nav, mobile CTA, view tracking, shortlist | 22 | L | - [ ] |
| 24 | `24_property-details-part-2.md` | Properties | Details part 2 | Overview, highlights, units, specs, amenities, floor plans (gated), gallery, construction, builder, location, FAQs | 23 | L | - [ ] |
| 25 | `25_property-details-part-3-finance-and-gated-downloads.md` | Properties | Details part 3 | Documents with real downloads, FinanceGuide refactor, similar, enquiry, recently viewed | 24 | L | - [ ] |
| 26 | `26_public-listing-and-search.md` | Listing | Listing engine & search | Server filters, URL sync, category routes, global search, locality/builder tabs, shortlist page, listing SEO rules | 25 | L | - [ ] |
| 27 | `27_home-page.md` | Public | Home page & navigation | Tabbed hero search, tiles with counts, rows, CMS blocks, header mega-menu/footer/bottom nav from data | 26 | L | - [ ] |
| 28 | `28_lead-capture-unification.md` | Leads | Lead capture unification | `LeadForm`, `LeadCaptureModal`, context, canonical sources, spam protection, click tracking, analytics | 27 | M | - [ ] |
| 29 | `29_admin-leads-crm-and-dashboard.md` | Leads | Leads CRM & dashboard | Server-side CRM list/detail/pipeline/notes/assignment/export; real-data dashboard with recharts | 28 | L | - [ ] |
| 30 | `30_pages-cms-admin-and-renderer.md` | CMS | Pages CMS | Block editor, `PageRenderer`, `CmsPage` routes, all seed pages, legacy static pages removed | 29 | L | - [ ] |
| 31 | `31_careers-jobs-awareness-and-contact.md` | CMS | Careers, awareness, contact, newsletter | Jobs CRUD, job pages + applications with résumé upload, awareness/contact via CMS, subscribers admin | 30 | M | - [ ] |
| 32 | `32_rich-text-editor-tiptap.md` | Articles | Rich text editor | Tiptap v3 editor, custom blocks, sanitiser, `SafeHtml`, `.prose`, replace all HTML textareas | 31 | L | - [ ] |
| 33 | `33_articles-admin.md` | Articles | Articles admin | List, editor form, scheduling, preview, categories/tags/authors | 32 | M | - [ ] |
| 34 | `34_articles-public-blog.md` | Articles | Public blog | Index, taxonomy pages, article page (TOC, blocks, share, related, FAQs), RSS link | 33 | M | - [ ] |
| 35 | `35_seo-engine-core.md` | SEO | SEO engine core | Analyzers, scoring, readability, snippet widths, variables, schema generators/validator, tests | 34 | L | - [ ] |
| 36 | `36_seo-panel-admin-ui.md` | SEO | SEO panel (admin UI) | General/Social/Advanced/Schema tabs, previews, wiring into all forms, score chips | 35 | L | - [ ] |
| 37 | `37_seo-dashboard-settings-redirects.md` | SEO | SEO dashboard, settings, redirects, guide | `/admin/seo`, bulk tools, duplicates/issues, global SEO settings, redirects manager, playbook | 36 | L | - [ ] |
| 38 | `38_public-seo-wiring-and-structured-data.md` | SEO | Public SEO wiring | `<Seo>` everywhere, JSON-LD graphs, breadcrumbs, redirects runtime, analytics, link/JSON-LD validators | 37 | L | - [ ] |
| 39 | `39_media-library-and-cloudinary.md` | Media | Media library & Cloudinary | Media admin, picker, unsigned uploads, `cloudinaryUrl`, responsive images, replace image fields | 38 | M | - [ ] |
| 40 | `40_site-settings-users-profile.md` | Settings | Site settings | Settings tabs (General…Lead notifications), validation, previews, context refresh, manager read-only | 39 | M | - [ ] |
| 41 | `41_performance-and-prerender.md` | Quality | Performance & prerender | Code-splitting audit, LCP preloads, web-vitals, bundle report, optional prerender pipeline | 40 | M | - [ ] |
| 42 | `42_mobile-ux-and-accessibility-pass.md` | Quality | Mobile UX & accessibility | Every page at every width; focus/ARIA/contrast/targets/safe areas/reduced motion; a11y audit script | 41 | L | - [ ] |
| 43 | `43_ux-polish-states-and-copy.md` | Quality | UX polish, states, copy | Loading/empty/error/success audit, 404/500, centralised copy, leftover placeholders, trace checks | 42 | M | - [ ] |
| 44 | `44_qa-bug-bash-property-and-listing.md` | QA | Bug bash 1 — property | End-to-end property path for all roles, Jest additions, optional Playwright | 43 | L | - [ ] |
| 45 | `45_qa-bug-bash-leads-articles-seo-cms-settings-auth.md` | QA | Bug bash 2 — modules | Leads, articles, SEO, CMS, careers, media, settings, users, auth/RBAC/expiry; console clean | 44 | L | - [ ] |
| 46 | `46_qa-cross-device-lighthouse-and-seo-validation.md` | QA | Cross-device, Lighthouse, SEO validation | Lighthouse targets, JSON-LD/links/sitemap checks, robots/rss/llms, prerender dry run, browsers | 45 | M | - [ ] |
| 47 | `47_backend-developer-guidelines-package.md` | Handover | Backend developer guidelines | Generator, backend notes, full package (docs, schema.sql, Postman, OpenAPI, seed), parity tooling | 46 | L | - [ ] |
| 48 | `48_final-audit-and-release.md` | Release | Final audit & release | Re-run all checks, route walk, seed reset, client checklist, README, archive, 1.0.0, tag | 47 | M | - [ ] |

Ordering constraints honoured: cleanup 02–04 before UI work; contract + enums 05 before the mock 06–10; mock before every feature prompt; services 11 before UI modules; design system 04 and admin kit 13 before admin modules; SEO engine 35 after the editor 32; SEO panel 36 wired into properties (18–22), articles (33) and pages (30) that already exist; QA 44–46 after all modules; guidelines 47 after QA; final audit 48 last.

## 3. Coverage matrix

### 3.1 Requirement tags (master specification) → implementing prompts → verifying prompts

| Tag | Implemented in | Verified in |
|---|---|---|
| BRIEF-01 | 02, 03 | 48 |
| BRIEF-02 | 04–43 (all modules) | 44, 45, 46, 48 |
| BRIEF-03 | 04, 23–27, 34 | 46 |
| BRIEF-04 | 03, 04, §3.2 rows below | 48 |
| BRIEF-05 | 06–11, 47 | 09, 47, 48 |
| BRIEF-06 | 32–38 | 45 |
| BRIEF-07 | 04 (`format.js`), 28 (phone), 06 (dates) | 44 |
| BRAND-01, BRAND-02 | 02 | 48 |
| BRAND-03 | 02, 04 | 42, 48 |
| BRAND-04 | 02 | 48 |
| BRAND-05 | 04 | 04 (`check:contrast`, `theme.test.js`), 48 |
| BRAND-06 | 02, 04 | 46 |
| BRAND-07 | 04, 43 | 46 |
| BRAND-08 | 02, 10, 40, 48 | 48 |
| INV-01 | 01 | 01, 48 |
| BUG-01 | 11, 13–22, 29, 33, 40 | 44, 45 |
| BUG-02 | 05, 08, 11, 26 | 09, 44 |
| BUG-03 | 06, 07, 08, 09 | 09 |
| BUG-04 | 05, 11, 18–21 | 44 |
| BUG-05 | 15, 23, 24, 25 | 44 |
| BUG-06 | 21, 23 | 44 |
| BUG-07 | 08, 25 | 44 |
| BUG-08 | 25, 28 | 44 |
| BUG-09 | 05, 10, 28, 29 | 45 |
| BUG-10 | 14, 26, 27 | 44 |
| BUG-11 | 27, 29, 30, 31, 37, 40 | 45 |
| BUG-12 | 04, 43 | 48 (`check:traces`) |
| BUG-13 | 06, 10 | 10 |
| BUG-14 | 07, 11, 12 | 45 |
| BUG-15 | 09, 28, 31 | 45 |
| BUG-16 | 03, 11, 26 | 48 |
| BUG-17 | 02, 03 | 48 |
| BUG-18 | 08, 09, 27, 34 | 44, 45 |
| BUG-19 | 26 | 44 |
| BUG-20 | 04, 27, 43 | 42 |
| BUG-21 | 01 (records) → every module prompt (clears) | 43, 48 |
| ARCH-01 | 01, 04, 41 | 41 |
| ARCH-02 | 05, 11 | 47 |
| ARCH-03 | 06 | 09 |
| ARCH-04 | 11 | 45 |
| ARCH-05 | 11 | 45 |
| ARCH-06 | 13, 18 | 44 |
| ARCH-07 | 32 | 45 |
| ARCH-08 | 31, 39 | 45 |
| ARCH-09 | 38, 41 | 46 |
| ARCH-10 | 07, 12 | 45 |
| ARCH-11 | 01, 04, 13, 23, 29, 32, 38, 41, 44 (pins) | 48 |
| ARCH-12 | 01, 06 | 48 |
| ARCH-13 | 01, 06, 09, 38, 41, 47, 48 | 48 |
| ARCH-14 | 02 | 48 |
| API-01 | 02, 05, 11 | 09 |
| API-02 | 05, 06 | 09 |
| API-03 | 05, 06, 11, 13 | 09, 45 |
| API-04 | 05, 07, 12 | 09, 45 |
| API-05 | 05, 06, 08, 09 | 09 |
| API-06 | 05, 06, 08, 09, 11 | 09 |
| API-07 | 05, 06, 08, 09, 11, 13 | 09 |
| API-08 | 05, 06, 08, 09, 13 | 09 |
| API-09 | 05, 06, 08, 09 | 09 |
| API-10 | 05, 08, 09, 28 | 09 |
| API-11 | 06 | 09 |
| API-12 | 09, 38 | 09, 46 |
| API-13 | 05, 11 | 05, 09 |
| 9.5 RBAC matrix | 05, 07, 12 | 45 |
| 9.6 endpoint catalogue | 05, 08, 09, 21, 27, 30, 34 | 09 (smoke) |
| 9.7 registry | 05 | 05, 09, 47 |
| MOCK-01 | 06 | 06 |
| MOCK-02 | 06, 10 | 10, 48 |
| MOCK-03 | 06, 08, 09 | 09 |
| MOCK-04 | 07 | 07 |
| MOCK-05 | 08, 09 | 09 |
| MOCK-06 | 05, 06 | 09 |
| MOCK-07 | 09 | 09, 48 |
| MOCK-08 | 10 | 10 |
| DATA-01 | 05, 06, 10, 18–21 | 10, 44 |
| DATA-02 | 05, 10, 14 | 10 |
| DATA-03 | 05, 10, 15 | 10 |
| DATA-04 | 05, 10, 15 | 10 |
| DATA-05 | 05, 10, 16 | 10 |
| DATA-06 | 05, 10, 15, 25 | 10 |
| DATA-07 | 05, 08, 10, 28, 29 | 10, 45 |
| DATA-08 | 05, 09, 10, 33, 34 | 10 |
| DATA-09 | 05, 10, 17 | 10 |
| DATA-10 | 05, 10, 30, 31 | 10, 45 |
| DATA-11 | 05, 09, 10, 31 | 10 |
| DATA-12 | 05, 09, 10, 39 | 10 |
| DATA-13 | 05, 09, 10, 40 | 10, 45 |
| DATA-14 | 05, 09, 10, 37 | 10, 45 |
| 11.2 enums | 05 | 05 |
| UX-01 | 04 | 04, 42 |
| UX-02 | 04, 42 | 42, 46 |
| UX-03 | 04, 42 | 42, 46 |
| UX-04 | 04, 27 | 42 |
| UX-05 | 04, 11, 27 | 42 |
| UX-06 | 04, 23, 26, 27 | 42 |
| UX-07 | 26, 27 | 44 |
| UX-08 | 23, 26 | 44 |
| UX-09 | 28 | 45 |
| UX-10 | 28, 38 | 45 |
| UX-11 | 04, 43 | 43 |
| UX-12 | 41 | 46 |
| UX-13 | 43 | 43 |
| HOME-01 | 27 | 44 |
| HOME-02 | 27 | 44 |
| HOME-03 | 27 | 44 |
| HOME-04 | 27 | 44 |
| HOME-05 | 17, 27, 30 | 45 |
| HOME-06 | 38 | 46 |
| PROP-01 | 22 | 44 |
| PROP-02 | 18, 19, 20, 21, 36 | 44 |
| PROP-03 | 18, 19 | 44 |
| PROP-04 | 18 | 44 |
| LIST-01 | 26 | 44 |
| LIST-02 | 26 | 44 |
| LIST-03 | 11, 26 | 44 |
| LIST-04 | 26, 38 | 46 |
| DET-01 | 23, 24, 25 | 44 |
| DET-02 | 23 | 42 |
| DET-03 | 28 | 45 |
| DET-04 | 38 | 46 |
| DET-05 | 23 | 44 |
| LOC-01 | 14, 26, 38 | 44 |
| LOC-02 | 16, 26, 38 | 44 |
| LEAD-01 | 28 | 45 |
| LEAD-02 | 29 | 45 |
| LEAD-03 | 29 | 45 |
| LEAD-04 | 28, 29 | 45 |
| MASTER-01 | 13, 14, 15, 16, 17, 31, 33 | 45 |
| CMS-01 | 30 | 45 |
| CMS-02 | 30, 31 | 45 |
| CMS-03 | 17 | 45 |
| SET-01 | 40 | 45 |
| SET-02 | 39 | 45 |
| DASH-01 | 09, 29 | 45 |
| ART-01 | 32, 33, 34 | 45 |
| ART-02 | 32 | 45 |
| ART-03 | 32 | 45 |
| ART-04 | 32 | 45 |
| ART-05 | 32 | 45 |
| ART-06 | 33 | 45 |
| ART-07 | 33 | 45 |
| ART-08 | 33 | 45 |
| ART-09 | 34 | 45 |
| ART-10 | 34, 38 | 46 |
| ART-11 | 10 | 10 |
| SEO-01 | 35 | 35 |
| SEO-02 | 36 | 45 |
| SEO-03 | 38 | 46 |
| SEO-04 | 37 | 45 |
| SEO-05 | 35, 36 | 45 |
| SEO-06 | 35, 36 | 35, 45 |
| SEO-07 | 35, 36 | 35, 45 |
| SEO-08 | 35, 36 | 35, 45 |
| SEO-09 | 35, 36 | 35, 45 |
| SEO-10 | 36 | 45 |
| SEO-11 | 36 | 45 |
| SEO-12 | 35, 38 | 46 |
| SEO-13 | 05, 36 | 45 |
| SEO-14 | 38 | 46 |
| SEO-15 | 38, 43 | 46 |
| SEO-16 | 38 | 46 |
| SEO-17 | 09, 37, 38, 41 | 46 |
| SEO-18 | 47 | 47 |
| SEO-19 | 37 | 45 |
| SEO-20 | 37 | 45 |
| SEO-21 | 37 | 45 |
| SEO-22 | 22, 33, 36 | 45 |
| BDG-01 | 47 | 47 |
| BDG-02 | 47 | 47, 48 |
| BDG-03 | 47, 48 | 48 |
| QA-01 | every prompt | 48 |
| QA-02 | 41, 46 | 46 |
| QA-03 | 03 | 48 |
| QA-04 | 04 | 48 |
| QA-05 | 38, 46 | 46 |
| QA-06 | 44, 45 | 45 |
| QA-07 | 42 | 46 |
| QA-08 | 04, 05, 11, 13, 18, 35, 44, 45 | 48 |
| QA-09 | 48 | 48 |

### 3.2 Existing HOM features (inventory) → kept / rebranded / fixed by

Every item below survives as data-driven functionality; the "Successor" column names the component/page that carries it.

| HOM item (file) | Successor | Prompt(s) |
|---|---|---|
| Route `/` (`Home.jsx`) | `Home.jsx` (data-driven sections) | 27 |
| Route `/properties` (`PropertyListing.jsx`, `ROUTE_CONFIG`, client filters/pagination) | `ListingEngine` + `listingRoutes.js` | 26 |
| Route `/properties/:slug` (`PropertyDetails.jsx`, 4 lead modals, `visibleSections`, Helmet SEO) | `PropertyDetails.jsx` + sections + `LeadCaptureModal` + `<Seo>` | 23, 24, 25, 28, 38 |
| Routes `/buy/pre-launch`, `/buy/under-construction`, `/buy/ready-to-move` (wrappers) | `listingRoutes.js` status routes | 26 |
| Routes `/rent/apartments`, `/rent/villas` (wrappers) | `/rent/:propertyTypeSlug` | 26 |
| Route `/buyer-assistance/home-loan` (`HomeLoan.jsx`: EMI calculator, steps, documents, banks, form, FAQ) | CMS page `buyer-assistance/home-loan` (`banks` + EMI, `steps`, `checklist`, `leadForm`, `faq`) | 10, 30 |
| Route `/buyer-assistance/legal-assistance` (`LegalAssistance.jsx`) | CMS page (`stats`, `expandableCards`, `steps`, `leadForm`, `faq`) | 10, 30 |
| Route `/buyer-assistance/interior-designing` (`InteriorDesigning.jsx`) | CMS page (`features`, `steps`, `gallery`, `packages`, `leadForm`) | 10, 30 |
| Route `/insights/articles` (`Articles.js`) | `Articles.jsx` blog index | 34 |
| Route `/insights/articles/:slug` (`ArticleDetail.js`, Markdown renderer) | `ArticleDetail.jsx` + `SafeHtml` | 32, 34 |
| Route `/insights/faqs` (`FAQs.js`) | `FAQs.jsx` + `FaqAccordion` + `ContactMethods` | 17 |
| Route `/insights/real-estate-awareness` (`RealEstateAwareness.js`: facts, education, quiz, checklist) | CMS page (`facts`, `expandableCards`, `quiz`, `checklist`, `leadForm`) | 10, 30, 31 |
| Route `/contact` (`Contact.jsx`: info, hours, social, form, map) | CMS page (`contactInfo`, `leadForm`, `map`) with settings | 30, 31, 40 |
| Route `/about` (`About.jsx`: timeline, values, mission/vision, stats, team, testimonials, CTA) | CMS page (`richText`, `steps`, `features`, `stats`, `team`, `testimonials`, `cta`) | 10, 17, 30 |
| Route `/sell-let` (`SellLet.jsx`) | CMS page (`stats`, `features`, `steps`, `leadForm` sell-let) | 10, 30 |
| Route `/careers` (`Careers.jsx`: culture, jobs, perks, application modal) | CMS page + `jobOpenings` + `/careers/:slug` + applications | 10, 30, 31 |
| Route `/partnership` (`Partnership.jsx`) | CMS page (`features` ×2, `partners`, `leadForm`) | 10, 30 |
| Route `/flexible-workspace` (`FlexibleWorkspace.jsx`) | CMS page | 10, 30 |
| Route `/direct-lease-retails` (`DirectLeaseRetails.jsx`) | CMS page | 10, 30 |
| Route `*` (`NotFound.jsx`, `?search=` link) | `NotFound.jsx` (`?q=`, search, popular links) | 26, 43 |
| `PropertyDetail.js` (dead stub) | deleted | 03 |
| Admin `/admin/login` (`AdminLogin.js`, remember-me no-op) | `AdminLogin.js` contract auth | 12 |
| Admin `/admin/dashboard` (`Dashboard.js`, fake trends) | `DashboardPage` (recharts, real aggregates) | 29 |
| Admin `/admin/properties` (`AdminProperties.js`) | `PropertiesListPage` | 22 |
| Admin `/admin/properties/add|edit/:id` (`PropertyForm.jsx` + 16 `property-tabs/*`) | `PropertyFormPage` + `property-form/tabs/*` | 18, 19, 20, 21 |
| Admin `/admin/leads` (`AdminLeads.js`: filters, CSV, polling) | `LeadsListPage` + `LeadNotificationsContext` | 12, 29 |
| Admin `/admin/leads/:id` (`LeadDetail.js`: notes, simulated timeline) | `LeadDetailPage` (real activities) | 29 |
| Admin `/admin/seo` (`AdminSeo.js`: table, dialog, bulk auto-generate, guidelines) | `SeoDashboardPage` + `SeoEditDialog` + bulk tools + guide | 35, 36, 37 |
| Admin `/admin/articles` (`AdminArticles.js`) | `ArticlesListPage` | 33 |
| Admin `/admin/articles/add|edit/:id` (`ArticleForm.jsx`, Markdown) | `ArticleFormPage` (Tiptap) | 32, 33 |
| Admin `/admin/faqs` (`FaqManager.jsx`) | `FaqsPage` (`MasterDataPage`) | 17 |
| Admin `/admin/neighborhoods` (`AdminNeighborhoods.js`) | `LocalitiesPage` + `LocalityFormPage` | 14 |
| Admin `/admin/partners` (`AdminPartners.jsx`) | `PartnersPage` | 17 |
| Admin `/admin/settings` (`AdminSettings.js`: General/Hero/Social/Newsletter/Footer/User Management) | `SettingsPage` (7 tabs) + `UsersPage` | 13, 40 |
| `components/admin/IconPicker.jsx` | fixed `IconPicker` | 13 |
| `components/admin/ImageUrlHelperText.jsx`, `imageFieldConfig.js` | `ImageField` hints | 13 |
| `components/admin/ProtectedRoute.jsx` (+ inline Forbidden) | `ProtectedRoute`, `RoleRoute`, `Forbidden` | 12 |
| `components/admin/SeoGuidelines.jsx` | `SeoGuidePage` | 37 |
| `components/admin/UserManagement.jsx` | `UsersPage` | 13 |
| `components/common/AnimatedSection.jsx` (unused) | deleted (verified) | 03/04 |
| `components/common/BackToTop.jsx` | tokenised `BackToTop` | 04 |
| `components/common/LeadForm.jsx` | new `LeadForm` | 28 |
| `components/common/NewsletterSection.jsx` | settings-driven `NewsletterSection` | 11, 28 |
| `components/common/PropertyCard.jsx` (swipe, `TAG_OPTIONS`) | `PropertyCard` (badges, shortlist, list variant) | 11, 15, 23, 26 |
| `components/common/PropertyFilters.jsx` | `FilterRail`/`FilterSheet` | 26 |
| `components/common/ScrollToTop.jsx` | fixed `ScrollToTop` | 04 |
| `components/common/SectionGuard.jsx` | `getVisibleSections` | 21, 23 |
| `components/common/SkeletonLoaders.jsx` (`PageLoader` "H.O.M Advisory") | tokenised skeletons + monogram loader | 03, 04 |
| `components/common/ToastProvider.jsx` | single `ToastProvider` (public + admin) | 04 |
| `layout/Header.jsx` + `MobileHeader.jsx` (duplicated nav, "Sign In") | `Header` + `MegaMenu` + `MobileDrawer` from data | 03, 04, 27 |
| `layout/Footer.jsx` (HOM defaults, gallery collage) | settings-driven `Footer` (gallery optional) | 04, 11, 27, 40 |
| `layout/BottomNav.jsx` | `BottomNav` (Home/Search/Shortlist/Enquire/Menu) | 04, 23, 27 |
| `layout/MainLayout.jsx` | `MainLayout` (tokens, single breakpoint) | 04 |
| `layout/AdminLayout.jsx` (30 s polling, notifications, HOM e-mail) | `AdminLayout` + `AdminSidebar` + `AdminTopbar` + `LeadNotificationsContext` | 04, 12 |
| `sections/home/HeroSection.jsx` (suggestions, settings media) | `HeroSection` + `HeroSearch` + `GlobalSearch` | 11, 26, 27 |
| `sections/home/QuickActions.jsx` (`type=lease`) | `CategoryTiles` | 27 |
| `sections/home/WhyChoose.jsx`, `HowItWorks.jsx` (hardcoded) | CMS `home` page `features`/`steps` blocks | 10, 27, 30 |
| `sections/home/FeaturedProperties.jsx` (rAF marquee) | `PropertyRow` (Carousel) | 27 |
| `sections/home/ExploreNeighborhoods.jsx` (`?area=`) | `ExploreLocalities` + `LocalityCard` | 11, 14 |
| `sections/home/FaqSection.jsx` | `FaqSection` (`FaqAccordion`, `showOnHome`) | 11, 17 |
| `sections/home/PartnersSection.jsx` | `PartnersSection` (new fields) | 11, 17 |
| `sections/home/TrendingTopics.jsx` | `LatestInsights` | 27, 34 |
| `sections/property/PropertyGallery.jsx` | `PropertyGallery` + `PropertyLightbox` | 23 |
| `sections/property/PropertyOverview.jsx` (defaults "—") | `OverviewSection` | 24 |
| `sections/property/PropertySpecs.jsx` | `SpecificationsSection` | 24 |
| `sections/property/PropertySpecialities.jsx` ("Feature") | `HighlightsSection` | 24 |
| `sections/property/PropertyAmenities.jsx` | `AmenitiesSection` | 24 |
| `sections/property/FloorPlans.jsx` (blur, no download) | `FloorPlansSection` + `UnitConfigurationsSection` (gated → lightbox + PDF) | 24 |
| `sections/property/FinanceGuide.jsx` (1808 lines, `DEFAULT_BANKS`) | `finance/*` (bank cards, EMI, FOIR assessment, eligibility modal) | 15, 25 |
| `sections/property/NearbyPlaces.jsx` ("Map view available on live version") | `LocationSection` + `MapEmbed` | 14, 24 |
| `sections/property/PropertyDocuments.jsx` (no download) | `DocumentsSection` (real downloads) | 25 |
| `sections/property/ConstructionSpecs.jsx` | `SpecificationsSection` (construction block) | 24 |
| `sections/property/ConstructionStatus.jsx` (`Infinity%`) | `ConstructionSection` | 24 |
| `sections/property/BuilderOverview.jsx` (`react-countup`) | `BuilderSection` + `DeveloperStats` (`useCountUp`) | 04, 16, 24 |
| `sections/property/EnquiryForm.jsx` (mounted ×3) | `EnquirySection` (single `LeadForm`) + price-card CTAs | 25, 28 |
| `sections/property/PropertyFaq.jsx` | `FaqsSection` (`FaqAccordion`) | 24 |
| `sections/property/SimilarProperties.jsx` (ignores ids, `react-slick`) | `SimilarSection` (API rule, `Carousel`) | 04, 08, 25 |
| `sections/property/StickyNav.jsx` | `SectionNav` (from `getVisibleSections`) | 23 |
| `services/api.js` (`propertyService`, `leadService`, `neighborhoodService`, `partnerService`, `faqService`, `articleService`, `siteSettingsService`, `authService`, `adminService` (dup), `userService`, `dashboardService`, `visitService` (unused), `newsletterService`, transformers) | `http.js` + registry services (`propertyService`, `leadService`, `masterDataService.localities/partners/faqs`, `articleService`, `settingsService`, `authService`, `userService`, `dashboardService`, `newsletterService`, …) | 03, 11 |
| `services/seoService.js` (`/seo/*`, snake↔camel) | `seoService` (settings/overview/llms) + `src/seo` engine | 11, 35 |
| `utils/seoGenerator.js`, `utils/seoScoring.js` | `src/seo/*` (`autoGenerate.js`, `score.js`) | 35 |
| `utils/validators.js` | `validators.js` (Indian mobile rules) reused by `LeadForm` + `validation.js` | 28, 13 |
| `utils/leadStorage.js` (`hom_lead_data`) | `leadStorage.js` v2 (`sna_lead`) | 03, 23, 28 |
| `hooks/useDebounce.js`, `useThrottledScroll.js` | kept | 04 |
| `config/adminConstants.js` (statuses, sources, categories, `DEFAULT_BANKS`) | `enums.js` + master data (`banks`, `articleCategories`) | 05, 15 |
| `config/rbac.js` | `rbac.js` (`PERMISSIONS`, `can`, final `NAV_ITEMS`) | 05, 12 |
| `contexts/AdminAuthContext.js` | rewritten (expiry, profile re-validation) | 11, 12 |
| `routes/index.js` (lazy routes) | `routes/index.js` + `publicRoutes.js` + `adminRoutes.js` + `paths.js` (data router) | 11, 12, 13 |
| `theme.js`, `global.css` (HOM palette/fonts) | SNA tokens/theme | 04 |
| `App.js` (`ErrorBoundary` inline) | `ErrorBoundary.jsx` + providers | 04, 11, 43 |
| `db.json` → `properties` (9) | `properties` (36+, new shape) | 06, 10 |
| `db.json` → `leads` (28) | `leads` (45, canonical sources, activities) | 06, 10 |
| `db.json` → `neighborhoods` (6) | `localities` (20) + `cities` | 06, 10, 14 |
| `db.json` → `partners` (6) | `partners` (6 fictional, categories) | 06, 10, 17 |
| `db.json` → `faqs` (16) | `faqs` (20, HTML, `showOnHome`) | 06, 10, 17 |
| `db.json` → `articles` (10 Markdown) | `articles` (12+ HTML) + categories/tags/authors | 06, 10, 33 |
| `db.json` → `siteSettings` (HOM) | `siteSettings` (§6.13) + `seoSettings` | 06, 10, 40, 37 |
| `db.json` → `adminUsers` (HOM e-mails) | `adminUsers` (SNA placeholders) + `apiTokens` | 03, 06, 07 |
| Lead sources (24 legacy strings incl. `child_form`, `website`) | `LEAD_SOURCES` + `LEGACY_LEAD_SOURCE_MAP` | 05, 08, 28 |
| Storage keys (`authToken`, `adminUser`, `tokenExpiry`, `hom_lead_data`, `hom_property_draft`) | `sna_*` keys via `utils/storage.js` | 03, 04, 11, 12, 18 |
| `.hom-swal-*` + `sweetalert2` | `ConfirmDialog` | 03, 04 |
| `react-slick` carousel | `ui/Carousel` | 04 |
| Dead code (`adminService`, `visitService`, `extractPaginationMeta`, `handleOpenLeadForm`, unused imports/CSS) | deleted | 03 |

## 4. Glossary

- **Listing type** — `sale | rent | lease` (`LISTING_TYPES`): how a property is transacted; drives price fields and budget buckets ("Buy", "Rent", "Lease").
- **Segment** — `residential | commercial | land`: coarse class of a property that decides which fields (BHK, plot dimensions, washrooms) apply.
- **Construction status** — `pre-launch | under-construction | ready-to-move | resale` (`CONSTRUCTION_STATUS`): build/possession state; status routes under `/buy/…`.
- **Availability** — `available | sold | rented | reserved`.
- **Unit configuration** — a sellable variant inside a project (e.g. "3 BHK + Study") with its own areas/price/floor plan; source of the price range and the BHK filter.
- **Section visibility** — per-property toggles (`sectionVisibility.*`) that, together with data presence (`getVisibleSections`), decide which detail-page sections render.
- **Focus keyword** — the primary search phrase an entity targets (`seo.focusKeyword`); secondary keywords are up to four extra phrases.
- **SEO score / band** — 0–100 result of the engine's weighted tests; bands Good ≥ 81, OK 51–80, Poor ≤ 50, None = not analysed.
- **Snippet** — the Google search result preview (title ≈ 580 px / description ≈ 920 px; 50–60 / 120–160 characters).
- **Template variables** — `%title%`, `%locality%`, `%price%`… resolved into titles/descriptions (`variables.js`).
- **Knowledge graph** — the `Organization`/`RealEstateAgent` JSON-LD describing the company (`seoSettings.knowledgeGraph`).
- **Lead** — a captured enquiry (`leads`) with a canonical `source`, optional property/article/page context, `requirement`, `status` pipeline, `priority`, `assignedTo`, `notes`, `activities`, `meta`.
- **Lead source** — kebab-case enum (`LEAD_SOURCES`) identifying the entry point (`property-enquiry`, `brochure-download`, `post-requirement`, …); legacy strings are mapped by `LEGACY_LEAD_SOURCE_MAP`.
- **Gated content** — brochure/floor plan/document that requires a lead capture before delivery; unlocks are remembered per property in `sna_lead`.
- **Identified visitor** — a visitor whose name/phone were captured in the session (`leadStorage.getVisitor()`); enables WhatsApp/call-click leads.
- **Honeypot** — the hidden `website` field; non-empty submissions are silently discarded.
- **Master data** — admin-managed reference collections: localities, cities, property types, amenities, badges, developers, banks (+ article categories/tags/authors, FAQs, testimonials, team, partners, jobs, redirects).
- **Delete guard** — API rule (409 with `usedBy`) preventing deletion of master data in use.
- **Mock server** — `mock-server/` Express app embedding JSON Server 0.17.4 as a library; serves the exact production contract from `db.json`.
- **Seed** — the committed `db.json`; **runtime db** — `mock-server/.runtime/db.json`, the working copy (reset with `npm run mock:reset`).
- **Envelope** — response wrapper `{ data }`, `{ data, meta }`, `{ data: null, message }`; error envelope `{ message, errors }`.
- **Registry** — `src/services/endpoints.js`, the single description of every endpoint (also drives smoke tests and the guidelines generator).
- **Schema descriptor** — plain-JS field description (`mock-server/schemas/models.js`, `src/services/schemas/*`) used for validation (mock + client) and for generating Laravel rules/SQL.
- **Smoke test** — `scripts/smoke-api.js`: walks the registry against a base URL (mock or Laravel) and asserts the contract.
- **Facets** — counts per property type/locality/bedrooms/construction status returned in `meta.facets` for the current filter set.
- **Index-worthy params** — listing query params that keep a page indexable and appear in the canonical (`listingType, segment, propertyTypeId, localityId, constructionStatus, bedrooms, page`).
- **Preview token** — short-lived token allowing draft/scheduled articles/pages to be viewed at their public URL with `?preview=`.
- **Prerender** — optional build step writing static HTML snapshots of every public URL for crawlers (`npm run build:prerender`, needs Chrome).
- **Sample record** — seed testimonials flagged `isSample: true`; never rendered in production builds.
- **Placeholder** — a clearly labelled value the client must replace (listed in `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md`).
- **Tone** — a colour token family (`primary`, `success`, `warning`, `error`, `info`, `muted`, `charcoal`) used instead of hex colours for chips/badges.
- **Design tokens** — CSS custom properties in `global.css` (mirrored in `theme.js`), the only places hex colours may exist.
- **Breakpoint (md)** — 900 px, the single mobile/desktop switch (`useBreakpoint`).
- **RBAC** — roles `admin | manager | sales` with the matrix in `rbac.js` (`can(role, area, action)`), enforced in routes, navigation and the API.
- **DoD** — definition of done (`00_MASTER_CONTEXT.md` §12.1) every prompt must satisfy before committing.
- **Pending rewrites** — the `docs/PROJECT_STATE.md` list of temporary adapters/placeholders with the prompt that removes them (must be empty from prompt 43 on).
