# Prompt 45 — modules bug bash

**Date:** 2026-09-18 · **Toolchain:** Node `v22.22.2`, npm `10.9.7`, Chromium
`141.0.7390.37` (`/opt/pw-browsers`, reached through `CHROME_PATH`) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json`.

Everything prompt 44 did not cover — leads and the CRM, articles and the blog,
the SEO Manager, the pages CMS, careers and the newsletter, the media library,
site settings, users and profiles, and authentication itself — driven for
**admin, manager and sales**, at **1280 px and 390 px**, with the console open.
Seven defects were found; all seven are fixed in this commit, each with a
regression test. Two of them (NEW-38, NEW-39) are the rows prompt 44 left open
for this one, and one (NEW-41) was left for prompt 46 and is closed here because
`check:links` is an acceptance criterion of this prompt.

---

## 1. What was run, and how

| Pass               | What it covers                                                                                                   | Result                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **RBAC sweep**     | every authenticated entry of `src/services/endpoints.js` × three roles, against the running mock                 | **579 / 579 ✓**, 0 mismatches |
| **Module matrix**  | 197 request-level scenarios over leads, articles, SEO, the CMS, content, media and settings, for all three roles | **197 / 197 ✓**               |
| **Auth & expiry**  | 23 browser and API scenarios with `MOCK_TOKEN_TTL_HOURS=0.01`                                                    | **23 / 23 ✓**                 |
| **Console audit**  | every public route and every admin route, anonymous + three roles, 1280 px and 390 px                            | see §6                        |
| **Playwright e2e** | 52 specs — the six of prompt 44, plus article publish, SEO panel, CMS page and settings                          | **52 / 52 ✓** (1 min 42 s)    |
| **Jest**           | the suites of prompt 44 plus the four this prompt adds                                                           | see §8                        |
| **`test:mock`**    | the mock's own routes, seven of them new                                                                         | **157 / 157 ✓**               |
| **`smoke`**        | the endpoint catalogue end to end                                                                                | **282 / 282 ✓**               |

The sweeps were driven from scripts written for this session. Everything they
proved that is worth keeping has been folded into the durable suites —
`mock-server/__tests__/*` for the contract regressions, `e2e/tests/*` for the
flows, and four new Jest suites for the pure logic. The mock database is
restored with `npm run mock:reset` between runs; every sweep also deletes what
it created and ends by re-counting the collections.

---

## 2. Defects found and fixed

| Id         | What was wrong                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Severity | Where it was fixed                                                                                                                                                                                                     | Regression test                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MB-01**  | **A read-only form asked a question it was not allowed to ask.** `SlugField` debounces a `check-slug` call on every value it is given, including while `disabled`. §7 maps `check-slug` to the area's `create` permission, so a sales user opening the property form read-only fired `GET /admin/properties/check-slug` and collected a **403 and a console error** on a screen they were meant to be able to read. The answer could not have been acted on either way: the field is disabled.                                                                         | medium   | `src/components/admin/SlugField.jsx` — the check is skipped while the field is read-only, and resumes the moment it is not                                                                                             | `src/components/admin/__tests__/SlugField.test.jsx` — "asks nothing at all while the field is read-only", "starts asking the moment the field becomes editable again"          |
| **MB-02**  | **A lead sent from a nested CMS page was refused.** §6.10 types a page's slug as a URL **path**, and the seed publishes four pages that use one — `buyer-assistance/home-loan`, `…/legal-assistance`, `…/interior-designing`, `insights/real-estate-awareness`. Every lead-capture block passes `page.slug` through verbatim, but `lead.pageSlug` was typed as a single-segment `slug`, so **every enquiry from those four pages was a 422**. The Home Loan, Legal Assistance and Interior Designing pages are three of the site's five lead-generating service pages. | **high** | `src/services/schemas/lead.js` — `pageSlug` carries the page's own pattern; the stale comment in `DeveloperCta.jsx` corrected                                                                                          | `mock-server/__tests__/leads.test.js` — "stores the whole slug path of the page a lead came from", "still refuses a page slug that is a URL rather than a slug"                |
| **MB-03**  | **A page refused an empty slug instead of deriving one.** §5.9 has the API derive a slug from the title when the client sends an empty one, and prompt 44's BB-01 made the `slug` **type** accept the empty string for exactly that reason. Pages type their slug as a patterned string rather than as a `slug`, so they were missed: `POST /admin/pages` with `slug: ''` answered `422 {slug}`. That is the 422 that made `pageService.duplicate()` resolve a slug of its own in prompt 33 (NEW-36).                                                                  | medium   | `src/services/schemas/page.js` — the path pattern accepts the empty string and `create.slug` carries a default instead of `required`                                                                                   | `mock-server/__tests__/content.test.js` — "derives a page slug from the title when the client sends an empty one", "de-duplicates a derived page slug rather than refusing it" |
| **MB-04**  | **The reserved-path rule lived only in the browser.** `PageFormPage` has refused a slug whose first segment belongs to a static route since prompt 30 — `/properties`, `/buy`, `/insights` and nine others are answered by the router before the CMS catch-all is reached, so a page saved under one exists and can never be opened (D11). The API had no such rule: `POST /admin/pages { slug: 'properties' }` answered **201**. A second client, and the Laravel port generated from these descriptors, would both have stored an unreachable page.                  | medium   | `mock-server/routes/pages.js` — `rejectReservedSlug` in `beforeValidate`, reading `src/routes/paths.js` so there is one list; a page already living under a reserved prefix keeps its slug, exactly as the form allows | `mock-server/__tests__/content.test.js` — three cases; `e2e/tests/cms-page.spec.js` — "a slug under a reserved prefix is refused on the field"                                 |
| **NEW-38** | **`EntityPicker` rendered two children with the same key.** Its `add()` refuses a duplicate it is asked for, but a `value` array that arrives from outside has never been through it. Both renderings key on the id — the chip row and, when the picker is `orderable`, `SortableList` — so a repeated id collided, React kept the first and dropped the second, and the editor had a row that disappeared on the next reorder. Opened by prompt 36, owned by this one.                                                                                                | low      | `src/components/admin/EntityPicker.jsx` — the ids are de-duplicated where they are read, first occurrence winning, so the editor's order survives and the next change writes the clean list back                       | `src/components/admin/__tests__/EntityPicker.test.jsx` — six cases, including the orderable list and the write-back                                                            |
| **NEW-39** | **`cleanTitle` left a comma leaning on the separator.** `'%bhk% in %locality%, %developer% %sep% %sitename%'` on a listing with no builder resolved to `"3 BHK in Whitefield, – Squares N Acres"`: §9.5's clean-up removes the unresolved variable and handles a leading separator, a doubled one and `in , Bengaluru`, but not punctuation left immediately in front of the separator. Opened by prompt 37, owned by this one.                                                                                                                                        | low      | `src/seo/variables.js` — one more rule, written so that `"Whitefield, Bengaluru – …"` and `"₹1,20,000 - ₹1,50,000"` are untouched                                                                                      | `src/seo/__tests__/variables.test.js` — "drops a comma left standing in front of the separator", "leaves a comma that is doing its job alone"                                  |
| **NEW-41** | **Two seeded links pointed at articles that are not published.** `npm run check:links` exited 1 on `/insights/articles/under-construction-vs-ready-to-move` (linked from the bodies of articles 4 and 6) and `/insights/articles/first-time-homebuyer-checklist-bengaluru` (linked from page 12). The 404 is correct behaviour — both records are a draft and a scheduled article, and the seed guide pins that distribution — so the defect is in the seed **copy**, which prompt 38 could not touch.                                                                 | low      | `scripts/seed/data/articles.js` and `pages.js` — the three anchors point at published guides that carry the same information; `db.json` rebuilt with `npm run seed:build`                                              | `npm run check:links` — 0 broken links (§8)                                                                                                                                    |

### Fixed but not defects of these modules

None. MB-01 is reachable from the property form, which prompt 44 owns, but the
cause is `SlugField` — shared by every slugged form — and the symptom is the
console error this prompt is responsible for clearing.

---

## 3. Observations that are not defects

| Id        | Observation                                                                                                                                                                                                                                                                                        | Disposition                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **OBS-1** | `POST /auth/login` is throttled to ten attempts a minute per IP (§5.11) and a whole Playwright run spends three of them. Running the suite three or four times inside one minute makes every spec fail at `signIn` with a 429.                                                                     | Working as specified; now written down in `e2e/README.md`                 |
| **OBS-2** | Playwright 1.63 expects a Chromium build this sandbox does not carry. The suite now honours `CHROME_PATH`, which is already how `check:links`, `check:jsonld` and the prerender find a browser (D16).                                                                                              | Configuration, not a defect; documented in `e2e/README.md`                |
| **OBS-3** | `create-react-app` collects **every** file under a `__tests__` directory as a test, not only `*.test.js`. A helper module placed there is a suite with no tests and fails the run.                                                                                                                 | Why `src/components/cms/__fixtures__/blocks.js` lives outside `__tests__` |
| **OBS-4** | `create-react-app` sets `resetMocks: true`, which strips the implementation off every `jest.fn` before each test. A module mocked at import time then answers `undefined` to every call — a very quiet way for a suite to stop testing anything.                                                   | Why the block-render suite's mock factories return plain functions        |
| **OBS-5** | Editing `mock-server/.runtime/db.json` while the mock is running has no effect: lowdb holds the collection in memory and writes it back over the edit. Revoking a token by hand needs a restart; `POST /auth/logout` produces the same state on a live server and is what `AUTH-11`/`AUTH-12` use. | Environment, documented here                                              |
| **OBS-6** | This sandbox proxies HTTPS through its own certificate authority, so every third-party asset (picsum, Google Fonts, Cloudinary) fails with `ERR_CERT_AUTHORITY_INVALID`. The console audit filters those out; they are the environment, not the application.                                       | Environment                                                               |
| **OBS-7** | A seeded property's SEO score is `null` until a panel saves one. The seed is honest about that (`scoreBand: 'none'`), the dashboard sorts `none` last, and the panel writes both the moment it runs — asserted by `e2e/tests/seo-panel.spec.js`.                                                   | By design (§9.6)                                                          |

---

## 4. The scenario matrix

Every row was executed against the running mock. A row with no role named was executed as **admin** and repeated as **manager** wherever §7 gives manager the same rights. ✓ means it passed after the fixes of §2; a row that found one names it.

### 4.1 Leads and the CRM (68 ✓)

Every entry point, the contract of a stored lead, the admin list, the CRM actions, the sales scoping and the rate limit.

| Id                              | Scenario                                                             | Result  |
| ------------------------------- | -------------------------------------------------------------------- | ------- |
| `LEAD-01-property-enquiry`      | entry point property-enquiry files source property-enquiry           | ✓       |
| `LEAD-01-brochure-download`     | entry point brochure-download files source brochure-download         | ✓       |
| `LEAD-01-floor-plan-request`    | entry point floor-plan-request files source floor-plan-request       | ✓       |
| `LEAD-01-document-request`      | entry point document-request files source document-request           | ✓       |
| `LEAD-01-price-request`         | entry point price-request files source price-request                 | ✓       |
| `LEAD-01-site-visit-request`    | entry point site-visit-request files source site-visit-request       | ✓       |
| `LEAD-01-callback-request`      | entry point callback-request files source callback-request           | ✓       |
| `LEAD-01-post-requirement`      | entry point post-requirement files source post-requirement           | ✓       |
| `LEAD-01-contact-page`          | entry point contact-page files source contact-page                   | ✓       |
| `LEAD-01-home-loan`             | entry point home-loan files source home-loan                         | ✓       |
| `LEAD-01-financial-assessment`  | entry point financial-assessment files source financial-assessment   | ✓       |
| `LEAD-01-bank-eligibility`      | entry point bank-eligibility files source bank-eligibility           | ✓       |
| `LEAD-01-legal-assistance`      | entry point legal-assistance files source legal-assistance           | ✓       |
| `LEAD-01-interior-design`       | entry point interior-design files source interior-design             | ✓       |
| `LEAD-01-sell-let`              | entry point sell-let files source sell-let                           | ✓       |
| `LEAD-01-careers`               | entry point careers files source careers                             | ✓       |
| `LEAD-01-partnership`           | entry point partnership files source partnership                     | ✓       |
| `LEAD-01-flexible-workspace`    | entry point flexible-workspace files source flexible-workspace       | ✓       |
| `LEAD-01-direct-lease-retail`   | entry point direct-lease-retail files source direct-lease-retail     | ✓       |
| `LEAD-01-real-estate-awareness` | entry point real-estate-awareness files source real-estate-awareness | ✓       |
| `LEAD-01-article`               | entry point article files source article                             | ✓       |
| `LEAD-01-faq`                   | entry point faq files source faq                                     | ✓       |
| `LEAD-01-locality-page`         | entry point locality-page files source locality-page                 | ✓       |
| `LEAD-01-developer-page`        | entry point developer-page files source developer-page               | ✓       |
| `LEAD-01-whatsapp-click`        | entry point whatsapp-click files source whatsapp-click               | ✓       |
| `LEAD-01-call-click`            | entry point call-click files source call-click                       | ✓       |
| `LEAD-01-hero-search`           | entry point hero-search files source hero-search                     | ✓       |
| `LEAD-01`                       | all 27 entry points map to their source                              | ✓       |
| `LEAD-02`                       | a property enquiry is created with 201                               | ✓       |
| `LEAD-03`                       | the lead stores propertyId                                           | ✓       |
| `LEAD-04`                       | the lead stores utm                                                  | ✓       |
| `LEAD-05`                       | the lead stores meta                                                 | ✓       |
| `LEAD-06`                       | the lead stores pageUrl                                              | ✓       |
| `LEAD-07`                       | a new lead opens at status new                                       | ✓       |
| `LEAD-08`                       | the first activity records the source                                | ✓       |
| `LEAD-09`                       | the property enquiryCount is incremented                             | ✓       |
| `LEAD-10`                       | a requirement lead stores the six selects                            | ✓       |
| `LEAD-11`                       | an article lead stores articleId                                     | ✓       |
| `LEAD-12`                       | a lead from a nested CMS page stores its whole slug path             | ✓ MB-02 |
| `LEAD-13`                       | the honeypot answers 200 and stores nothing                          | ✓       |
| `LEAD-14`                       | a whatsapp click files a lead                                        | ✓       |
| `LEAD-15`                       | an invalid lead is a 422 keyed by field                              | ✓       |
| `LEAD-16`                       | an unknown source is a 422                                           | ✓       |
| `LEAD-17`                       | a legacy source is mapped to its canonical value                     | ✓       |
| `LEAD-18`                       | the admin list paginates with meta                                   | ✓       |
| `LEAD-19`                       | the status filter narrows                                            | ✓       |
| `LEAD-20`                       | the source filter narrows                                            | ✓       |
| `LEAD-21`                       | sorting by createdAt ascending really ascends                        | ✓       |
| `LEAD-22`                       | the search finds a lead by name                                      | ✓       |
| `LEAD-23`                       | assigning a lead succeeds and embeds the user                        | ✓       |
| `LEAD-24`                       | a status change appends an activity                                  | ✓       |
| `LEAD-25`                       | a follow-up date and priority are stored                             | ✓       |
| `LEAD-26`                       | a note is appended                                                   | ✓       |
| `LEAD-27`                       | sales see only their own and unassigned leads                        | ✓       |
| `LEAD-28`                       | sales may claim an unassigned lead                                   | ✓       |
| `LEAD-29`                       | sales cannot reassign a lead to a colleague                          | ✓       |
| `LEAD-30`                       | sales cannot delete a lead                                           | ✓       |
| `LEAD-31`                       | sales cannot run a bulk action                                       | ✓       |
| `LEAD-32`                       | sales may export their own leads                                     | ✓       |
| `LEAD-33`                       | the export starts with a BOM                                         | ✓       |
| `LEAD-34`                       | the sales export is scoped narrower than the admin export            | ✓       |
| `LEAD-35`                       | an admin bulk status change reports affected                         | ✓       |
| `LEAD-36`                       | an unsupported bulk action is a 422                                  | ✓       |
| `LEAD-37`                       | leads are findable by phone for the duplicate chip                   | ✓       |
| `LEAD-39`                       | the public lead endpoint answers 429 once the limit is hit           | ✓       |
| `LEAD-38-admin`                 | the dashboard answers for admin                                      | ✓       |
| `LEAD-38-manager`               | the dashboard answers for manager                                    | ✓       |
| `LEAD-38-sales`                 | the dashboard answers for sales                                      | ✓       |

### 4.2 Articles, the editor and the blog (30 ✓)

The form, the slug rules, the preview token, the schedule that flips on its own, the taxonomy and its guards, and the public reads.

| Id        | Scenario                                                | Result |
| --------- | ------------------------------------------------------- | ------ |
| `ART-01`  | an article is created with 201                          | ✓      |
| `ART-02`  | the slug is derived from the title                      | ✓      |
| `ART-03`  | the slug is clean ASCII                                 | ✓      |
| `ART-04`  | seo.slug mirrors the entity slug                        | ✓      |
| `ART-05`  | a draft article is a 404 publicly                       | ✓      |
| `ART-06a` | a preview token is issued for a draft                   | ✓      |
| `ART-06`  | the preview token opens the draft                       | ✓      |
| `ART-07`  | a wrong preview token is still a 404                    | ✓      |
| `ART-08`  | an article can be scheduled                             | ✓      |
| `ART-09`  | a scheduled article is not public before its time       | ✓      |
| `ART-10`  | a unicode title produces a clean ASCII slug             | ✓      |
| `ART-11`  | an explicit duplicate slug is a 409 keyed slug          | ✓      |
| `ART-12`  | check-slug reports a taken slug with a suggestion       | ✓      |
| `ART-13`  | an article category is created                          | ✓      |
| `ART-14`  | a category in use cannot be deleted (409)               | ✓      |
| `ART-15`  | an article tag is created                               | ✓      |
| `ART-16`  | an author is created                                    | ✓      |
| `ART-17`  | the public author list never carries an e-mail address  | ✓      |
| `ART-18`  | bulk publish reports affected                           | ✓      |
| `ART-19`  | the feed is well-formed and carries a channel           | ✓      |
| `ART-20`  | the trending endpoint answers a list                    | ✓      |
| `ART-21`  | the adjacent endpoint answers prev/next                 | ✓      |
| `ART-22`  | the public article search finds a title                 | ✓      |
| `ART-23`  | the category filter narrows                             | ✓      |
| `ART-24`  | the tag filter narrows                                  | ✓      |
| `ART-25`  | the author filter narrows                               | ✓      |
| `ART-26`  | sales cannot read the admin article list                | ✓      |
| `ART-27`  | a manager may create an article                         | ✓      |
| `ART-28`  | a scheduled article becomes public once its time passes | ✓      |
| `ART-29`  | and appears in the next public list fetch               | ✓      |

### 4.3 The SEO Manager (24 ✓)

The dashboard, the settings and what they change, robots and llms, every sitemap, the redirects, and the two writes a manager may not make.

| Id                              | Scenario                                                 | Result |
| ------------------------------- | -------------------------------------------------------- | ------ |
| `SEO-01`                        | the dashboard overview answers rows                      | ✓      |
| `SEO-02`                        | the SEO settings read                                    | ✓      |
| `SEO-03`                        | a title template saves                                   | ✓      |
| `SEO-04`                        | the public settings endpoint serves the new template     | ✓      |
| `SEO-05`                        | the template is restored                                 | ✓      |
| `SEO-06`                        | robots.txt carries a Sitemap line and no placeholder     | ✓      |
| `SEO-07`                        | llms.txt is Markdown with the brand heading              | ✓      |
| `SEO-08-sitemap.xml`            | sitemap.xml is well-formed                               | ✓      |
| `SEO-08-sitemap-properties.xml` | sitemap-properties.xml is well-formed                    | ✓      |
| `SEO-08-sitemap-localities.xml` | sitemap-localities.xml is well-formed                    | ✓      |
| `SEO-08-sitemap-developers.xml` | sitemap-developers.xml is well-formed                    | ✓      |
| `SEO-08-sitemap-articles.xml`   | sitemap-articles.xml is well-formed                      | ✓      |
| `SEO-08-sitemap-pages.xml`      | sitemap-pages.xml is well-formed                         | ✓      |
| `SEO-09`                        | a property excluded from the sitemap disappears from it  | ✓      |
| `SEO-10`                        | and comes back when the toggle is put back               | ✓      |
| `SEO-11`                        | a redirect is created                                    | ✓      |
| `SEO-12`                        | the redirect resolves to its target                      | ✓      |
| `SEO-13`                        | resolving a redirect counts a hit                        | ✓      |
| `SEO-14`                        | the public redirect list carries the new record          | ✓      |
| `SEO-15`                        | a redirect survives the slug it was created for changing | ✓      |
| `SEO-16`                        | a manager cannot write custom head HTML (403)            | ✓      |
| `SEO-17`                        | a manager may read the SEO dashboard                     | ✓      |
| `SEO-18`                        | sales cannot read the SEO dashboard                      | ✓      |
| `SEO-19`                        | a SEO panel save leaves the rest of the record alone     | ✓      |

### 4.4 The pages CMS (19 ✓)

A page carrying one of every block type, the draft/preview/publish path, nested and reserved slugs, the navigation toggles and the legal pages.

| Id                      | Scenario                                                        | Result  |
| ----------------------- | --------------------------------------------------------------- | ------- |
| `CMS-01`                | a page carrying every block type is created with a derived slug | ✓ MB-03 |
| `CMS-02`                | all 25 block types survive the round trip                       | ✓       |
| `CMS-03`                | a draft page is a 404 publicly                                  | ✓       |
| `CMS-04`                | the preview token opens the draft page                          | ✓       |
| `CMS-05`                | publishing the page succeeds                                    | ✓       |
| `CMS-06`                | the published page is served publicly                           | ✓       |
| `CMS-07`                | a nested slug is accepted                                       | ✓       |
| `CMS-08`                | the nested page resolves publicly                               | ✓       |
| `CMS-09`                | a reserved slug is refused with a 422 keyed slug                | ✓ MB-04 |
| `CMS-09b`               | a title that would derive a reserved slug is refused too        | ✓ MB-04 |
| `CMS-09c`               | a page already living under a reserved prefix keeps its slug    | ✓ MB-04 |
| `CMS-10`                | a header/footer placement toggle reaches both navigation lists  | ✓       |
| `CMS-10b`               | and unticking it takes the page back out                        | ✓       |
| `CMS-11-privacy-policy` | the privacy-policy page is published                            | ✓       |
| `CMS-11-terms-of-use`   | the terms-of-use page is published                              | ✓       |
| `CMS-11-disclaimer`     | the disclaimer page is published                                | ✓       |
| `CMS-12`                | sales cannot read the admin page list                           | ✓       |
| `CMS-13`                | a manager may create a page                                     | ✓       |
| `CMS-14`                | a page duplicates into an unpublished copy with its own slug    | ✓       |

### 4.5 Careers, newsletter, FAQs, testimonials, team, partners, localities, developers (25 ✓)

CRUD, the delete guards, the public reads, the honeypots and the exports.

| Id                              | Scenario                                                  | Result |
| ------------------------------- | --------------------------------------------------------- | ------ |
| `CON-01`                        | a job is created                                          | ✓      |
| `CON-02`                        | the job is served publicly                                | ✓      |
| `CON-03`                        | a job application is accepted (URL mode)                  | ✓      |
| `CON-04`                        | the application reaches the admin list and embeds its job | ✓      |
| `CON-05`                        | the apply honeypot answers 200 and stores nothing         | ✓      |
| `CON-06`                        | a newsletter subscription is accepted                     | ✓      |
| `CON-07`                        | a repeat subscription is answered, not duplicated         | ✓      |
| `CON-08`                        | the address is stored exactly once                        | ✓      |
| `CON-09`                        | the subscriber export is a CSV with a BOM                 | ✓      |
| `CON-10`                        | a FAQ is created                                          | ✓      |
| `CON-11`                        | a FAQ reorder is a PATCH that succeeds                    | ✓      |
| `CON-12`                        | the FAQ category filter narrows                           | ✓      |
| `CON-13`                        | a testimonial record is created                           | ✓      |
| `CON-14`                        | a team record is created                                  | ✓      |
| `CON-15`                        | a partner record is created                               | ✓      |
| `CON-16`                        | the seeded testimonials are flagged isSample              | ✓      |
| `CON-17`                        | a locality is created                                     | ✓      |
| `CON-18`                        | a developer is created                                    | ✓      |
| `CON-19`                        | a locality in use cannot be deleted (409 with usages)     | ✓      |
| `CON-20-faqs`                   | sales cannot read /admin/faqs                             | ✓      |
| `CON-20-testimonials`           | sales cannot read /admin/testimonials                     | ✓      |
| `CON-20-team`                   | sales cannot read /admin/team                             | ✓      |
| `CON-20-partners`               | sales cannot read /admin/partners                         | ✓      |
| `CON-20-jobs`                   | sales cannot read /admin/jobs                             | ✓      |
| `CON-20-newsletter-subscribers` | sales cannot read /admin/newsletter-subscribers           | ✓      |

### 4.6 The media library (8 ✓)

Adding by URL, editing, the in-use delete guard and the force delete, search and the role gate.

| Id       | Scenario                               | Result |
| -------- | -------------------------------------- | ------ |
| `MED-01` | a media record is added by URL         | ✓      |
| `MED-02` | a media record is edited               | ✓      |
| `MED-03` | deleting media that is in use is a 409 | ✓      |
| `MED-04` | a forced delete is allowed             | ✓      |
| `MED-05` | the media library is searchable        | ✓      |
| `MED-06` | the media type filter narrows          | ✓      |
| `MED-07` | sales cannot reach the media library   | ✓      |
| `MED-08` | a manager may reach the media library  | ✓      |

### 4.7 Settings, users and the profile (23 ✓)

The deep merge, what the public copy may not carry, the manager's read-only settings, the user safety rules and the password rules.

| Id               | Scenario                                                     | Result |
| ---------------- | ------------------------------------------------------------ | ------ |
| `SET-01`         | an admin may save the settings                               | ✓      |
| `SET-02`         | the save deep-merges rather than replacing                   | ✓      |
| `SET-03`         | the public settings reflect the change                       | ✓      |
| `SET-04`         | the public settings never carry an integration secret        | ✓      |
| `SET-05`         | the public settings never carry the lead configuration       | ✓      |
| `SET-06`         | a manager cannot save the settings (403)                     | ✓      |
| `SET-07`         | a manager may read the settings                              | ✓      |
| `SET-08`         | sales cannot read the settings                               | ✓      |
| `SET-09`         | an admin may create a user                                   | ✓      |
| `SET-10`         | the created user never echoes a password                     | ✓      |
| `SET-11`         | a manager may read the staff directory (for assignment)      | ✓      |
| `SET-12`         | a manager cannot create a user                               | ✓      |
| `SET-13`         | deleting the only admin is refused                           | ✓      |
| `SET-14`         | deactivating the signed-in user is refused                   | ✓      |
| `SET-15-admin`   | admin may read their own profile                             | ✓      |
| `SET-16-admin`   | admin's profile never carries a password                     | ✓      |
| `SET-15-manager` | manager may read their own profile                           | ✓      |
| `SET-16-manager` | manager's profile never carries a password                   | ✓      |
| `SET-15-sales`   | sales may read their own profile                             | ✓      |
| `SET-16-sales`   | sales's profile never carries a password                     | ✓      |
| `SET-17`         | a profile update succeeds                                    | ✓      |
| `SET-18`         | a wrong current password is a 422 keyed currentPassword      | ✓      |
| `SET-19`         | a password under eight characters is a 422 keyed newPassword | ✓      |

### 4.8 Authentication, sessions and expiry (23 ✓)

Run against a mock restarted with `MOCK_TOKEN_TTL_HOURS=0.01` — a thirty-six-second token, which is what makes the client-side auto-logout watchable. The browser half is driven in a real Chromium, one browser context per scenario so that one sign-in cannot leak into the next.

| Id         | Scenario                                                                 | Result |
| ---------- | ------------------------------------------------------------------------ | ------ |
| `AUTH-01`  | the mock issues a ~36-second token under MOCK_TOKEN_TTL_HOURS=0.01       | ✓      |
| `AUTH-02`  | a fresh session opens the dashboard                                      | ✓      |
| `AUTH-03`  | the expired session is sent to the login page                            | ✓      |
| `AUTH-04`  | and says the session expired                                             | ✓      |
| `AUTH-05`  | the expired session is cleared from storage                              | ✓      |
| `AUTH-06`  | an unauthenticated deep link lands on the login page                     | ✓      |
| `AUTH-07`  | signing in returns to the deep link that was asked for                   | ✓      |
| `AUTH-08`  | a role that may not open the deep link lands on the dashboard instead    | ✓      |
| `AUTH-09a` | the account menu carries a logout item                                   | ✓      |
| `AUTH-09`  | signing out sends the tab it happened in to the login page               | ✓      |
| `AUTH-10`  | the other tab is signed out too                                          | ✓      |
| `AUTH-11`  | the token row is gone from the runtime database                          | ✓      |
| `AUTH-12`  | the API answers 401 for a revoked token                                  | ✓      |
| `AUTH-13`  | the browser is sent to the login page exactly once                       | ✓      |
| `AUTH-14`  | the password change succeeds                                             | ✓      |
| `AUTH-15`  | the older session is revoked                                             | ✓      |
| `AUTH-16`  | the session that changed it survives                                     | ✓      |
| `AUTH-17`  | the old password no longer signs in                                      | ✓      |
| `AUTH-18`  | the new account can sign in while it is active                           | ✓      |
| `AUTH-19`  | a deactivated account cannot sign in                                     | ✓      |
| `AUTH-20`  | and its live session stops working                                       | ✓      |
| `AUTH-21`  | repeated failed logins are rate limited with a 429                       | ✓      |
| `AUTH-22`  | the login form shows the rate-limit message rather than failing silently | ✓      |

---

## 5. The SEO Manager, followed until it says Good

§4.5 of the prompt asks for a record taken from Poor to Good by doing what the
panel says, with the steps recorded. Three records were walked: the seed's
lowest-scoring listing, seed property 3 (the one the prompt names), and a
published article. Each step is one of the messages the panel actually shows,
applied literally — nothing was invented to make a number move.

### 5.1 Property 33 — `Trident Commons`, **Poor 50 → Good 88**

The panel opens with nine failing tests and nine warnings.

| #   | What the panel said                                                                                   | What was done                                                                                                                           | Score | Band     |
| --- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- |
| 0   | —                                                                                                     | as seeded                                                                                                                               | 50    | Poor     |
| 1   | "The title does not carry the focus keyword" + "…at all"                                              | the SEO title rewritten to open with `PG and Coliving in Marathahalli`                                                                  | 62    | OK       |
| 2   | "The description does not carry the focus keyword"                                                    | the meta description rewritten around it                                                                                                | 67    | OK       |
| 3   | "The URL does not carry the focus keyword"                                                            | the permalink changed to `pg-and-coliving-in-marathahalli-trident-commons`                                                              | 72    | OK       |
| 4   | "The keyword does not appear in the opening tenth", "There are no subheadings", "Keyword density 0 %" | the description rewritten with the keyword in the first sentence, four `<h2>` subheadings and the phrase used four times over 184 words | 86    | **Good** |
| 5   | "No alt text carries the keyword", "No share image"                                                   | the cover image's alt text and an OG image                                                                                              | 88    | **Good** |

Nothing is failing at the end; seven warnings remain, and every one of them is a
judgement the editor is allowed to make — a title of 63 characters, a
description a little over 920 px, no RERA number on a co-living room, no floor
plan. This walk is now a test: `src/seo/__tests__/seedEntities.analyze.test.js`
→ "following the panel, a Poor record reaches Good", which also asserts that the
score never goes backwards on the way and that no failing test is left behind.

### 5.2 Property 3 — `Nandi Skyline Towers`, **OK 63 → Good 97**

The property §4.5 names. Six steps: focus keyword, a title that carries it, a
description that carries it and fits 920 px, a slug that carries it, a body with
the keyword in the opening sentence and in three subheadings, and a share image.
Two warnings remain — a 48-character title and no power word in it.

### 5.3 Article 7 — `North Bengaluru and the Airport Corridor`, **OK 69 → Good 94**

Five steps, the same shape: the keyword at the start of the title, in the
description, in the slug, in the opening tenth and in a subheading, then a share
image. The article already had eleven subheadings and 1 100 words, so the work
was all in the keyword, which is what the panel said.

### 5.4 The rest of the SEO Manager

| What                                                                      | How it was checked                                                                    | Result                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The dashboard lists every entity type with its band                       | `GET /admin/seo/overview` and the screen                                              | `SEO-01` ✓, and `e2e/tests/seo-panel.spec.js`                                                                    |
| A panel save stores the score and the band (§9.6)                         | the form saved, then the record read back                                             | `e2e/tests/seo-panel.spec.js` ✓ — `score` numeric, `scoreBand` one of three, `lastAnalyzedAt` set                |
| A panel save touches nothing else (§5.8)                                  | the same read, compared field by field with the record before                         | ✓ title, slug, price, `viewCount` and `enquiryCount` unchanged                                                   |
| A title template reaches the public head                                  | `seoSettings.titleTemplates.article` changed, `GET /seo/settings` read, then put back | `SEO-03`, `SEO-04`, `SEO-05` ✓                                                                                   |
| An entity's SEO title reaches the public `<title>`                        | the record patched, the page opened in a browser                                      | `e2e/tests/seo-panel.spec.js` ✓                                                                                  |
| `robots.txt` and `llms.txt` are served from the settings                  | both fetched                                                                          | `SEO-06`, `SEO-07` ✓ — a `Sitemap:` line, no `%siteurl%` placeholder left                                        |
| Every sitemap is well-formed                                              | the index and all five per-type files                                                 | `SEO-08-*` ✓                                                                                                     |
| A per-entity sitemap toggle is honoured                                   | property 3 excluded, the sitemap re-read, the toggle put back                         | `SEO-09`, `SEO-10` ✓                                                                                             |
| A redirect resolves, counts a hit and survives its entity's slug changing | created, resolved, the page renamed and renamed back                                  | `SEO-11`–`SEO-15` ✓                                                                                              |
| The knowledge graph and the JSON-LD of every type                         | `npm run check:jsonld` over 127 rendered pages                                        | 0 errors (§8)                                                                                                    |
| A manager may read the dashboard and may not write custom head HTML       | both attempted                                                                        | `SEO-16`, `SEO-17` ✓ 403 on the write                                                                            |
| Sales reach none of it                                                    | the dashboard, the settings and the redirects                                         | `SEO-18` ✓ 403                                                                                                   |
| A 20 000-character article analyses in under 200 ms (§7)                  | the seed's longest article grown to **31 308 characters** and analysed twenty times   | **133 ms** a run, and 4.3 ms for a seed property. `useSeoAnalysis` debounces on top, so the panel stays typeable |

---

## 6. The console audit

Every public route and every admin route, opened in a real Chromium with the
console, the network and the page-error stream attached: **352 page loads** —
50 public URLs at 1280 px and 390 px, and 42 admin URLs for **each** of the
three roles at both widths.

| Measure                                                                 | Result                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `console.error` / `console.warn` from the application                   | **0**                                                                                                                                                                                                                         |
| Uncaught page errors                                                    | **0**                                                                                                                                                                                                                         |
| Failed requests (excluding this sandbox's certificate authority, OBS-6) | **0**                                                                                                                                                                                                                         |
| HTTP 4xx/5xx                                                            | **1 URL**, `/this-route-does-not-exist`, at both widths — the API answering 404 for a CMS page that does not exist, which is the 404 page working. Chrome logs it and it cannot be suppressed from script (prompt 44's OBS-3) |
| Horizontal scroll, measured by _trying_ to scroll (prompt 44)           | **0** at 390 px and at 1280 px                                                                                                                                                                                                |
| Routes that landed somewhere other than where they were asked for       | **0** — every admin route rendered its own screen or the 403, never the login page                                                                                                                                            |
| Pages with a thin `<main>` (under 40 characters)                        | **0** — nothing rendered as an empty shell                                                                                                                                                                                    |

Before the fixes of §2 the same walk found MB-01: `/admin/properties/edit/:id`
as **sales** logged `403 …/admin/properties/check-slug` at both widths. It is
the only application finding the audit has ever produced on these routes, and
it is gone.

### 6.1 The 50 public routes walked

Derived from the seed, so each entity type is represented by real records:

- `/`
- `/properties`
- `/buy`
- `/buy/ready-to-move`
- `/buy/under-construction`
- `/buy/pre-launch`
- `/buy/resale`
- `/buy/apartment`
- `/rent`
- `/rent/apartment`
- `/lease`
- `/commercial`
- `/commercial/office-space`
- `/plots`
- `/localities`
- `/builders`
- `/insights/articles`
- `/insights/faqs`
- `/careers`
- `/contact`
- `/shortlist`
- `/this-route-does-not-exist`
- `/properties/greenfield-axis-office-lease-bellandur`
- `/properties/skyline-crest-4-bhk-bellandur`
- `/localities/whitefield`
- `/localities/sarjapur-road`
- `/builders/aurelia-estates`
- `/builders/nandi-ridge-developers`
- `/insights/articles/plot-buying-checklist-bda-bmrda-biaapa`
- `/insights/articles/rental-yields-by-locality-bengaluru`
- `/insights/articles/category/buying-guides`
- `/insights/articles/category/market-trends`
- `/insights/articles/tag/checklist`
- `/insights/articles/tag/emi`
- `/insights/authors/editorial-team`
- `/insights/authors/legal-desk`
- `/careers/customer-relations-manager`
- `/home`
- `/about`
- `/sell-let`
- `/partnership`
- `/buyer-assistance/home-loan`
- `/buyer-assistance/legal-assistance`
- `/buyer-assistance/interior-designing`
- `/flexible-workspace`
- `/direct-lease-retails`
- `/insights/real-estate-awareness`
- `/privacy-policy`
- `/terms-of-use`
- `/disclaimer`

### 6.2 The 42 admin routes walked

Every entry of `src/routes/adminRouteConfig.js`, for **admin**, **manager** and
**sales** — a role that may not open a route sees the `Forbidden` page, which is
a render like any other and is audited like one:

- `/admin/dashboard`
- `/admin/properties`
- `/admin/properties/add`
- `/admin/properties/edit/1`
- `/admin/leads`
- `/admin/leads/1`
- `/admin/articles`
- `/admin/articles/add`
- `/admin/articles/edit/1`
- `/admin/articles/categories`
- `/admin/articles/tags`
- `/admin/articles/authors`
- `/admin/pages`
- `/admin/pages/add`
- `/admin/pages/edit/1`
- `/admin/faqs`
- `/admin/master-data/localities`
- `/admin/master-data/localities/add`
- `/admin/master-data/localities/edit/1`
- `/admin/master-data/cities`
- `/admin/master-data/property-types`
- `/admin/master-data/amenities`
- `/admin/master-data/badges`
- `/admin/master-data/developers`
- `/admin/master-data/developers/add`
- `/admin/master-data/developers/edit/1`
- `/admin/master-data/banks`
- `/admin/testimonials`
- `/admin/team`
- `/admin/partners`
- `/admin/jobs`
- `/admin/jobs/applications`
- `/admin/newsletter`
- `/admin/media`
- `/admin/seo`
- `/admin/seo/settings`
- `/admin/seo/redirects`
- `/admin/seo/guide`
- `/admin/settings`
- `/admin/settings/users`
- `/admin/profile`
- `/admin/403`

---

## 7. The flows a request cannot reach

Ten things needed a browser rather than a request. They were driven at
**1280 px** and, where the answer could differ, at **390 px**.

| Id       | Flow                                                                                                                                                                | Result                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —        | An enquiry sent from `/buyer-assistance/home-loan` — a **nested** CMS page — through the lenders band's "Check eligibility", then read back from the CRM            | ✓ `e2e/tests/lead-submit.spec.js` — stored with `pageSlug: 'buyer-assistance/home-loan'`. This is MB-02 as a visitor meets it: before the fix the same enquiry was a 422 and the form said so |
| `INT-04` | The media picker opened from the three fields that offer it — Site settings → Logo, Page → Hero image, Article → Featured image                                     | ✓ all three open the library dialog and close again                                                                                                                                           |
| `INT-05` | The FAQ screen narrowed to one category, then a row moved **inside the filter**, then the stored order re-read                                                      | ✓ the list narrows, the move is stored, and the collection comes back numbered 1…n (D98)                                                                                                      |
| `INT-06` | The lead bell: the count in its accessible name, and the menu it opens, for a **sales** user                                                                        | ✓                                                                                                                                                                                             |
| `INT-07` | Sample testimonials on `/about`, in the development build and in the **production** build served by `npm run serve:build`                                           | ✓ see §7.1                                                                                                                                                                                    |
| —        | The article editor: the headline, the slug, the body typed into Tiptap, the category, the author and the featured image, then published and read on the public page | ✓ `e2e/tests/article-publish.spec.js`, with the draft 404 and the preview token on the way                                                                                                    |
| —        | The CMS block chooser: a hero and a rich-text band assembled, published and read on the public page                                                                 | ✓ `e2e/tests/cms-page.spec.js`                                                                                                                                                                |
| —        | A page slug typed under a reserved prefix, refused **on the field** rather than stored                                                                              | ✓ `e2e/tests/cms-page.spec.js` — MB-04 as an editor meets it                                                                                                                                  |
| —        | The settings tabs: all six opened, a tagline saved and read back in the public footer; the manager given no Save and refused by the API                             | ✓ `e2e/tests/settings.spec.js`                                                                                                                                                                |
| —        | The SEO panel: a focus keyword and a title typed, the analysis watched, the save made and the record compared field by field                                        | ✓ `e2e/tests/seo-panel.spec.js`                                                                                                                                                               |

Two things the pass established about the application on the way, both correct
behaviour rather than defects: an admin form left dirty registers an
unsaved-changes guard, so navigating away inside the same tab is a native
dialog rather than a page load; and `networkidle0` never settles on an admin
screen, because the shell polls for new leads (§4.3).

### 7.1 Sample testimonials, and the production build

D41: a testimonial marked `isSample` renders only while
`process.env.NODE_ENV !== 'production'`. All eight seeded testimonials carry it
(their names begin "Sample — "), and the `/about` page carries a `testimonials`
block, so the rule is visible as a whole band appearing and disappearing.

`npm run build:ci` (**compiled successfully, 0 warnings**) then
`npm run serve:build` on `:5000`, reading the same page in both builds after
scrolling every lazy section into view:

| Build                               | The "What clients say" band | Sample names in the DOM                      |
| ----------------------------------- | --------------------------- | -------------------------------------------- |
| development (`:3000`)               | present                     | **4** (what the carousel renders at 1280 px) |
| production (`serve:build`, `:5000`) | **absent**                  | **0**                                        |

The band does not render as an empty heading in production: `TestimonialsBlock`
draws nothing at all when its list comes back empty, which is §8.2's rule that a
section with nothing to say hides itself.

---

## 8. Verification

Every command §9 of the prompt names, in its order, from a working tree that
carries this commit's changes and a mock reset from the committed `db.json`.

| Command                  | Result                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`           | ✓ 0 errors, 0 warnings; `check-endpoints` scanned 752 files with 0 findings                                                                                      |
| `npm run test:ci`        | ✓ **147 suites, 3 344 tests** — 143 / 2 961 before this prompt, plus the four suites it adds                                                                     |
| `npm run build:ci`       | ✓ compiled successfully, **0 warnings**                                                                                                                          |
| `npm run check:traces`   | ✓ 1 090 files scanned, 0 brand traces, 0 hex literals, 0 copy placeholders                                                                                       |
| `npm run check:contrast` | ✓ 29 gated pairs, all pass (3 informational)                                                                                                                     |
| `npm run test:mock`      | ✓ **157 / 157**, 40 suites — seven assertions added for MB-02, MB-03 and MB-04                                                                                   |
| `npm run test:scripts`   | ✓ 27 pass, 1 skipped (the skip is prompt 41's, for a machine with no Chrome)                                                                                     |
| `npm run smoke`          | ✓ **282 / 282** checks, 0 failed                                                                                                                                 |
| `npm run check:links`    | ✓ 127 pages opened, 143 internal links followed, **0 broken** — NEW-41 closed                                                                                    |
| `npm run check:jsonld`   | ✓ 127 pages, **0 errors**, 34 warnings — twelve fewer than the 46 the baseline carried, because the retargeted seed links and `cleanTitle` shortened four titles |
| `npm run e2e`            | ✓ **52 / 52** Chromium specs, 1 min 42 s                                                                                                                         |
| `npm run validate:seed`  | ✓ `db.json` is valid                                                                                                                                             |
| `npm run format:check`   | ✓ all matched files use Prettier code style                                                                                                                      |

Manual QA, as §9 asks: tasks 1–9 executed at **1280 px and 390 px**; the expiry
pass run against a mock restarted with `MOCK_TOKEN_TTL_HOURS=0.01`; the
sample-testimonial rule checked in a real production bundle through
`npm run serve:build` (§7.1).

---

## 9. Known issues

**Open, owned by this prompt: none.**

Three rows are closed here:

| Row        | Closed by                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------- |
| **NEW-38** | `EntityPicker` de-duplicates the ids where it reads them; eight regression cases            |
| **NEW-39** | one more rule in `cleanTitle`, plus two cases in `variables.test.js`                        |
| **NEW-41** | the seed's three dead internal links retargeted at published guides; `check:links` is green |

NEW-38 and NEW-39 are the two rows prompt 44 assigned to this one. NEW-41 was
assigned to prompt 46; it is closed here because `check:links` is an acceptance
criterion of _this_ prompt and the fix is seed copy inside this prompt's own
modules.

The rows that stay open all name a later prompt and a reason, and none is of
high severity: **NEW-40**, **NEW-42**, **NEW-47**, **NEW-48** (owner 46 — the
SEO-validation and accessibility run), **NEW-49**, **NEW-50** (owner 48),
**NEW-30**, **NEW-35** (owner 41). Nothing in this prompt's modules is deferred.
