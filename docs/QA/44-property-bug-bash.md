# Prompt 44 — property module bug bash

**Date:** 2026-09-18 · **Toolchain:** Node `v22.22.2`, npm `10.9.7`, Chromium
`153.0.8010.12` (Playwright 1.63.0) · **Backend:** the mock on `:4000`, seeded
from the committed `db.json` (40 properties, 38 published).

The whole property path — master data → the sixteen-tab form → the admin list →
the listing engine → the details page → lead capture → the mock's own rules —
exercised for **admin, manager and sales**, at **1280 px and 390 px**, with the
console open. Six defects were found; all six are fixed in this commit, each
with a regression test. Nothing is left open inside the property module.

---

## 1. What was run, and how

| Pass                | What it covers                                                                        | Result                    |
| ------------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| **Scenario matrix** | 145 request-level scenarios across master data, the form, the admin list, the listing, the details endpoints and the contract, for all three roles | **145 / 145 ✓** (1 min)   |
| **Interactive pass**| 11 flows a request cannot reach: gated downloads, the EMI calculator, the eligibility questionnaire, recently viewed, the header search, the CSV export, the admin preview, the 422 mapping, the lead bell, a repeat enquiry | **11 / 11 ✓**             |
| **Console audit**   | 74 page loads (26 public + 11 admin routes × 1280 px and 390 px), console and horizontal-scroll watched | **0 application findings** (1 min) |
| **Playwright e2e**  | 38 specs over login, create + publish, details, leads, listing filters, shortlist      | **38 / 38 ✓** (1 min 24 s)|
| **Jest**            | 143 suites, 2 961 tests — 138 / 2 642 before this prompt, plus the five suites it adds  | **all green** (43 s)      |
| **`test:mock`**     | 150 assertions over the mock's own routes, four of them new                            | **150 / 150 ✓** (3 s)     |
| **`smoke`**         | The endpoint catalogue end to end                                                       | **282 / 282 ✓**           |

The matrix and the interactive pass were driven from scripts written for this
session; every scenario they proved that was worth keeping has been folded into
the durable suites — `mock-server/__tests__/properties.test.js` for the contract
regressions, `e2e/tests/*` for the flows, and the five new Jest suites for the
pure logic. The mock database is restored with `npm run mock:reset` between
runs; every pass also deletes its own fixtures, and the matrix ends by asserting
that nothing it created is left behind (`CLN-01`).

---

## 2. Defects found and fixed

| Id         | What was wrong                                                                                                                                                                                                                                                                                                                                         | Where it was fixed                                                                              | Regression test                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **BB-01**  | **An empty slug was refused.** §5.9 has the API derive a slug from the title when the client sends an empty one, and every slugged model types `slug` with `default: ''`. The validator's pattern required at least one character, so `POST /admin/properties` with `slug: ''` — which is exactly what `toPayload` sends when an editor has not chosen a URL — answered `422 {slug, seo.slug}`. It affected **every** slugged resource: properties, localities, cities, property types, amenities, badges, developers, banks, articles and the SEO branch. | `mock-server/middleware/validate.js` — the `slug` type accepts the empty string, with the reason written beside it | `mock-server/__tests__/properties.test.js` — "derives the slug from the title when the client sends an empty one" |
| **BB-02**  | **`location.pincode` accepted anything six characters long.** `'12'` and `'abc123'` were stored. The form checks six digits, so the rule existed only in the browser — a second client, or the Laravel port generated from these descriptors, would have stored nonsense. §5.3 uses `location.*` as its example of a dotted 422 key, and this was the one such field with no rule behind it. | `src/services/schemas/property.js` (`pattern: '^\\d{6}$'`), and the same for `localities.pincodes[]` in `src/services/schemas/masterData.js` | `mock-server/__tests__/properties.test.js` — "refuses a pincode that is not six digits"   |
| **BB-03**  | **`possessionDate` was not required for a pre-launch or under-construction listing**, although §6.1 says it is and the form enforces it. The API accepted a pre-launch project with no date and a `PATCH` could move a finished listing into "under construction" without one.                                                                              | A `requiredIf` rule in `mock-server/middleware/validate.js` — Laravel's `required_if`, reading the body as Laravel does — and the descriptor on `possessionDate` | `mock-server/__tests__/properties.test.js` — "requires a possession date while a project is pre-launch or under construction" |
| **BB-04**  | **A duplicated property inherited the original's canonical URL and redirect**, and reset `seo.analysis` to `[]` where §9.6 types it as an object of four lists, leaving `testsTotal` untouched. A copy therefore canonicalised itself to the listing it was copied from — and, if the original had a redirect, sent its own visitors away — while an SEO panel reading `analysis.basic` got `undefined`. The browser-side `copySeo()` had all three rules right; the endpoint had none of them. | `mock-server/routes/properties.js`, now matching `src/utils/duplicateRecord.js`                   | `mock-server/__tests__/properties.test.js` — "clears the seo branch a copy cannot inherit" |
| **BB-05**  | **A blank string rendered as `₹0`.** `Number('   ')`, `Number([])` and `Number(false)` are all `0`, so `formatPrice`, `formatArea`, `formatNumber` and `formatBhk` turned a field of spaces into a price of zero, a size of zero and "Studio" — a wrong number shown to a visitor where the honest answer is the em dash.                                     | `src/utils/format.js` — `toNumber` accepts a number or a non-blank numeric string and nothing else | `src/utils/__tests__/format.edge.test.js` — the `NOTHINGS` table                          |
| **BB-06**  | **`₹99,99,999` printed as `₹100 L`.** The unit was chosen from the raw figure and the rounding happened afterwards, so every price between ₹99,95,000 and ₹99,99,999 came out in a quantity nobody writes. The price card is the most-read number on the page.                                                                                             | `src/utils/format.js` — `unitOf()` picks the unit after rounding                                   | `src/utils/__tests__/format.edge.test.js` and the updated case in `src/utils/format.test.js` |

### Fixed but not defects of this module

None. Everything above is inside the property path.

---

## 3. Observations that are not defects

| Id        | Observation                                                                                                                                                                                                                                                                                                                              | Disposition                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **OBS-1** | `scripts/lib/inPageAudit.js` calls horizontal scroll when `document.documentElement.scrollWidth > window.innerWidth`. Chromium's root `scrollWidth` counts a wide element that sits inside its **own** `overflow-x: auto` scroller, so `/admin/properties` reports 721 px of overflow at 1280 px while `window.scrollX` stays 0 and the page does not move. It is a false positive on a failing rule; the honest measure is to try to scroll. | Logged for prompt 46 (owns the a11y run) |
| **OBS-2** | Seed property #26 (farm land) is the only record with `pricing.pricePerSqft: null`; D33 has the form derive the rate on the first save, so opening and saving it writes ₹390/sq ft that the editor did not type. The behaviour is the documented one and the derivation is correct; the seed is simply inconsistent with its thirty-nine siblings. | Cosmetic; `db.json` is prompt 10's       |
| **OBS-3** | `/properties/<unknown-slug>` logs one `404 (Not Found)` in the browser console — Chrome's own record of the API answering 404, which is what that address should answer. The page renders the 404 state correctly. It cannot be suppressed from script.                                                                                      | Expected                                 |
| **OBS-4** | `e2e/**` is outside the `lint` and `format` globs, so the specs are neither linted nor Prettier-checked. Widening `lint` would need Playwright's globals in the ESLint environment.                                                                                                                                                         | Logged for prompt 48                     |
| **OBS-5** | The listing engine reads 25 of §5.7's 27 parameters; `cityId` and `isVerified` are deliberately not offered (one city is seeded, and "verified" is a badge rather than a filter). A URL carrying either is therefore dropped by `parseFilters`.                                                                                             | By design; asserted in the round-trip suite |
| **OBS-6** | This sandbox proxies HTTPS through its own certificate authority, so every third-party asset (picsum, Google Fonts, Cloudinary) fails with `ERR_CERT_AUTHORITY_INVALID`. The console audit filters those out; they are the environment, not the application.                                                                                 | Environment                              |

---

## 4. The scenario matrix

Every row was executed for the role named in it; a row with no role named was
executed as **admin** and repeated as **manager** wherever the RBAC matrix gives
manager the same rights (§7). ✓ means the scenario passed after the fixes of
§2; the fix that a row found is named in the last column.

### 4.1 Master data (17 ✓)

| Id                    | Scenario                                                              | Result |
| --------------------- | --------------------------------------------------------------------- | ------ |
| `MD-01-admin`         | admin creates a locality                                              | ✓ BB-01 |
| `MD-01-manager`       | manager creates a locality                                            | ✓ BB-01 |
| `MD-01-sales`         | sales cannot create a locality (403)                                  | ✓      |
| `MD-02-property type` | admin creates a property type                                         | ✓ BB-01 |
| `MD-02-amenity`       | admin creates an amenity                                              | ✓ BB-01 |
| `MD-02-badge`         | admin creates a badge                                                 | ✓ BB-01 |
| `MD-02-developer`     | admin creates a developer                                             | ✓ BB-01 |
| `MD-02-bank`          | admin creates a bank                                                  | ✓ BB-01 |
| `MD-03`               | delete guard: a locality in use cannot be deleted                     | ✓      |
| `MD-04`               | delete guard: a property type in use cannot be deleted                | ✓      |
| `MD-05`               | delete guard: an amenity in use cannot be deleted                     | ✓      |
| `MD-06`               | delete guard: a developer in use cannot be deleted                    | ✓      |
| `MD-07`               | delete guard: a badge in use cannot be deleted                        | ✓      |
| `MD-08`               | an unused master-data record deletes cleanly                          | ✓      |
| `MD-09`               | a reorder `PATCH` moves the row and renumbers the collection 1..n (D98)| ✓      |
| `MD-10`               | the featured toggle reflects on the home feed                         | ✓      |
| `MD-11`               | a new locality is usable by the property form immediately             | ✓      |

### 4.2 The property form (32 ✓)

| Id       | Scenario                                                                      | Result  |
| -------- | ----------------------------------------------------------------------------- | ------- |
| `FRM-01` | admin creates a full sale apartment with every tab filled (201)               | ✓ BB-01 |
| `FRM-02` | the slug is derived from the title when it is left empty                      | ✓ BB-01 |
| `FRM-03` | `seo.slug` mirrors the entity slug (D34)                                      | ✓       |
| `FRM-04` | a new listing starts unpublished, `publishedAt` null, counters at zero        | ✓       |
| `FRM-05` | an inactive listing answers 404 on the public detail route                    | ✓       |
| `FRM-06` | publishing sets `publishedAt`                                                 | ✓       |
| `FRM-07` | the published page shows every section the listing filled                     | ✓       |
| `FRM-08` | the public read embeds locality, city, property type and developer            | ✓       |
| `FRM-09` | the public read hides `createdBy` / `updatedBy`                               | ✓       |
| `FRM-10` | `PUT` keeps `createdAt`, `viewCount`, `enquiryCount` and `publishedAt`        | ✓       |
| `FRM-11` | an explicit duplicate slug is a 409 with `errors.slug`                        | ✓       |
| `FRM-12` | `check-slug` reports a taken slug and offers a suggestion                     | ✓       |
| `FRM-13` | `check-slug` with `excludeId` reports the record's own slug free              | ✓       |
| `FRM-14` | an invalid pincode is a 422 keyed `location.pincode`                          | ✓ BB-02 |
| `FRM-15` | a title under ten characters is a 422 keyed `title`                           | ✓       |
| `FRM-16` | an image without a description is a 422 keyed `images.N.alt`                  | ✓       |
| `FRM-17` | manager may create and edit a property                                        | ✓       |
| `FRM-18` | sales may read the admin list and may not write (403 on POST/PATCH/DELETE)    | ✓       |
| `FRM-19` | manager may delete a property; sales may not (§7)                             | ✓       |
| `FRM-20` | duplicate copies the record unpublished, with fresh counters and a new slug   | ✓       |
| `FRM-21` | duplicate resets the `seo` branch a copy cannot inherit                       | ✓ BB-04 |
| `FRM-22` | a rent listing saves the rent fields and no sale price                        | ✓       |
| `FRM-23` | a plot saves with no BHK and a plot area                                      | ✓       |
| `FRM-24` | a commercial listing saves with specifications and no BHK                     | ✓       |
| `FRM-25` | a pre-launch listing keeps its possession date and its timeline               | ✓       |
| `FRM-26` | a pre-launch listing **without** a possession date is a 422                   | ✓ BB-03 |
| `FRM-27` | a price-on-request listing saves with no price                                | ✓       |
| `FRM-28` | unit prices out of order still produce a min/max range                        | ✓       |
| `FRM-29` | a listing with no amenities, FAQs or documents publishes on images + description | ✓    |
| `FRM-30` | latitude 90 / longitude 180 are accepted; 91 is a 422                         | ✓       |
| `FRM-31` | a very long title is accepted or refused with a field error, never silently truncated | ✓ |
| `FRM-32` | two editors saving at once: the second write wins, no crash, no partial record | ✓      |

Autosave, the draft banner and "restore" were exercised by hand in the browser
at 1280 px and 390 px: a draft is written to `sna_property_draft:new`, the
banner offers it on the next visit, "Discard" removes the key, and publishing
clears it.

### 4.3 The admin list (22 ✓)

| Id                    | Scenario                                                           | Result |
| --------------------- | ------------------------------------------------------------------ | ------ |
| `LST-01`              | pagination and `meta`                                              | ✓      |
| `LST-02`              | a page beyond the last returns empty `data` with a correct `meta`  | ✓      |
| `LST-03`              | `perPage=all` is honoured on the admin list                        | ✓      |
| `LST-04`              | `perPage=all` is **not** honoured on the public list (§5.6)        | ✓      |
| `LST-05`              | the `isActive` filter is admin-only and narrows correctly          | ✓      |
| `LST-06-*` (7 rows)   | every admin sort column, ascending and descending                  | ✓      |
| `LST-07`              | `seoScoreBand` narrows to the bands asked for                      | ✓      |
| `LST-08`              | `createdBy` narrows                                                | ✓      |
| `LST-09-*` (6 rows)   | every bulk action reports `affected`                               | ✓      |
| `LST-10`              | an action the resource does not support is a 422                   | ✓      |
| `LST-11`              | sales cannot run a bulk action                                     | ✓      |

The CSV export, URL sharing of a filtered table and the row actions were driven
in the browser — see `e2e/tests/property-create.spec.js` ("exports the filtered
table as a CSV") and §4.7 below.

### 4.4 The public listing (42 ✓)

| Id                   | Scenario                                                                    | Result |
| -------------------- | --------------------------------------------------------------------------- | ------ |
| `PUB-01`             | inactive listings never appear                                              | ✓      |
| `PUB-02-*` (15 rows) | every single-value filter group narrows correctly                           | ✓      |
| `PUB-03`             | `bedrooms=5` means five **or more**                                         | ✓      |
| `PUB-04`             | `bedrooms=2,3` matches either, against the property or an active unit       | ✓      |
| `PUB-05`             | a sale budget compares against `pricing.price`                              | ✓      |
| `PUB-06`             | a rent budget compares against `pricing.rentPerMonth`                       | ✓      |
| `PUB-07`             | a budget excludes price-on-request listings                                 | ✓      |
| `PUB-08`             | `minArea=100&areaUnit=sqm` matches the same set as `minArea=1076`           | ✓      |
| `PUB-09`             | `amenityIds` requires **all** to match                                      | ✓      |
| `PUB-10`             | `badgeIds` matches **any**                                                  | ✓      |
| `PUB-11`             | `possessionBy` honours the deadline and admits ready-to-move                | ✓      |
| `PUB-12`             | `q` searches title, project, locality and developer                         | ✓      |
| `PUB-13`             | `ids=3,1,2` answers in that order and ignores the other filters             | ✓      |
| `PUB-14-*` (6 rows)  | every sort option answers                                                   | ✓      |
| `PUB-15`             | `price-asc` really ascends and puts "on request" last                       | ✓      |
| `PUB-16`             | facets are present and total the result set before pagination               | ✓      |
| `PUB-17`             | facets respect the other filters                                            | ✓      |
| `PUB-18`             | an impossible filter set is an empty list with a correct `meta`             | ✓      |
| `PUB-19`             | unknown query parameters are ignored                                        | ✓      |
| `PUB-20`             | `minPrice=abc` is dropped rather than answered with nothing                 | ✓      |
| `PUB-21`             | suggestions group localities, listings, types and builders, five each       | ✓      |
| `PUB-22`             | suggestions need two characters                                             | ✓      |
| `PUB-23`             | `/properties/featured` returns only featured, active listings               | ✓      |

Every route of `listingRoutes` was opened in the browser —
`/properties`, `/buy`, `/buy/:status` ×4, `/buy/:type`, `/rent`, `/rent/:type`,
`/lease`, `/commercial`, `/commercial/:type`, `/plots` — plus a slug that is
neither a status nor a type (404). The rail, the mobile sheet, the chips, the
grid/list toggle, the widen offers and the back/forward buttons were exercised
at both widths; the deep-link and back-button cases are pinned in
`e2e/tests/listing-filters.spec.js` and the URL contract in
`src/utils/__tests__/listingFilters.roundtrip.test.js`.

### 4.5 The details page (8 ✓ + the browser pass)

| Id       | Scenario                                                            | Result |
| -------- | ------------------------------------------------------------------- | ------ |
| `DET-01` | an unknown slug is a 404                                            | ✓      |
| `DET-02` | `similar` puts the editor's picks first, in their order             | ✓      |
| `DET-03` | `similar` fills to six and never includes the listing itself        | ✓      |
| `DET-04` | `similar` on an inactive listing is a 404                           | ✓      |
| `DET-05` | a view is counted once per IP per hour                              | ✓      |
| `DET-06` | a view does not move `updatedAt`                                    | ✓      |
| `DET-07` | the agent's direct line is hidden unless `showOnListing`            | ✓      |
| `DET-08` | active banks exist, so the finance section may render               | ✓      |

In the browser, for every one of the **38 published seed listings** (the Jest
suite `src/__tests__/seedProperties.render.test.jsx` repeats this in jsdom):
the gallery and its photo/video/tour tabs, the lightbox, the price card in each
of its four shapes (a figure, a range, "on request", a monthly rent with an
EMI), the key facts per property type, the section navigation against the
sections actually printed, the gated brochure and document flows for a new
visit and for a visit that has already identified itself, the EMI calculator,
the eligibility questionnaire and its bank step, the enquiry form, the share
menu, the shortlist heart, "recently viewed", the admin preview of an
unpublished listing, and the 404.

### 4.6 Leads (23 ✓)

| Id                   | Scenario                                                         | Result |
| -------------------- | ---------------------------------------------------------------- | ------ |
| `CON-03`             | `enquiryCount` increments when a lead names the property         | ✓      |
| `CON-04`             | a honeypot submission answers 200 and stores nothing             | ✓      |
| `CON-05`             | `meta` carries an assessment's answers and score through (D56)   | ✓      |
| `CON-06`             | an admin lead read embeds the property it came from              | ✓      |
| `CON-07-*` (11 rows) | every property-page lead source is accepted and filterable       | ✓      |
| `CON-08`             | sales sees only leads assigned to itself or unassigned (D15)     | ✓      |
| `CON-09`             | sales cannot delete a lead                                       | ✓      |
| `CON-10`             | an invalid phone is a 422 keyed `phone`                          | ✓      |
| `CON-11`             | an unauthenticated admin read is a 401                           | ✓      |
| `CON-12`             | an unknown property sub-path is a 404, not a JSON Server answer  | ✓      |
| `CON-13`             | deleting a listing clears the `similarPropertyIds` that named it | ✓      |

The lead bell counts new leads and opens onto them; a second enquiry from the
same visitor is stored and shown beside the first; the property link on a lead
row opens the listing.

### 4.7 The mock's own rules (2 ✓ + the four regressions of §2)

| Id       | Scenario                                                  | Result |
| -------- | --------------------------------------------------------- | ------ |
| `CON-01` | `PATCH` keeps every nested field it did not mention        | ✓      |
| `CON-02` | `PATCH` does not re-slug a listing it merely renamed       | ✓      |

---

## 5. Edge cases of §7

| Edge case                                                     | Where it is proved                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| No amenities, FAQs or documents — publishes on images + description | `FRM-29`                                                          |
| `ids` ordering in the shortlist                                | `PUB-13`, `e2e/tests/shortlist.spec.js`                               |
| Concurrent edits in two tabs — the second save wins, no crash  | `FRM-32`                                                              |
| Very long titles                                               | `FRM-31`                                                              |
| Latitude / longitude at the boundary                           | `FRM-30`                                                              |
| Unit prices out of order — the range is min/max                | `FRM-28`, and `payload.seed.test.js` over every seed record           |
| The admin preview link for an inactive listing                 | `e2e/tests/property-details.spec.js`                                  |
| A page beyond the last                                         | `LST-02`, `PUB-18`, `e2e/tests/listing-filters.spec.js`               |
| A blank or unreadable value wherever a number is rendered      | `src/utils/__tests__/format.edge.test.js` (BB-05)                     |

---

## 6. Console and layout

74 page loads — 26 public routes and 11 admin routes, each at **1280 × 900** and
**390 × 844** — with `console.error`, `console.warn` and uncaught exceptions
recorded, and horizontal scroll measured by trying to scroll rather than by
reading `scrollWidth` (see OBS-1).

**Application findings: none.** The only console output is Chrome's own note of
the 404 that `/properties/<unknown-slug>` is supposed to answer (OBS-3), and the
sandbox's certificate errors for third-party images and fonts (OBS-6). No page
scrolls horizontally at either width.

The jsdom counterpart is stricter still: `seedProperties.render.test.jsx` fails
if **any** seed property's page writes a single line to `console.error` or
`console.warn`, React key and prop warnings included.

---

## 7. Tests added by this prompt

| Suite                                                                    | What it pins                                                                                                   | Size |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---- |
| `src/__tests__/seedProperties.render.test.jsx`                           | every active seed property renders: one `<h1>`, no console output, every section chip pointing at a real section | 39   |
| `src/pages/admin/properties/property-form/__tests__/payload.seed.test.js`| `fromRecord → toPayload → fromRecord` is stable for all 40 seed records, and no editable field is lost on the way | 123  |
| `src/utils/__tests__/listingFilters.roundtrip.test.js`                   | URL → params → URL is a fixed point for every §5.7 parameter; the admin table's own serialisation and its export | 43   |
| `src/utils/__tests__/format.edge.test.js`                                | the lakh/crore boundary, zero, blanks, IST dates, relative time and six ways of typing a phone number            | 84   |
| `src/components/listing/__tests__/listingRoutes.test.js`                 | every listing URL, D25's resolution order, the pending state and the 404                                        | 29   |
| `mock-server/__tests__/properties.test.js` (+4)                          | the four contract regressions of §2                                                                            | +4   |
| `e2e/tests/*.spec.js`                                                    | six specs, 38 tests, in a real browser                                                                          | 38   |

---

## 8. Playwright

Installed and passing: `@playwright/test@1.63.0` with Chromium
`153.0.8010.12`, on Node `v22.22.2` (D6 wants ≥ 20). `npm run e2e` runs the
suite; `e2e/README.md` says what to do when Node is older or the browser cannot
be downloaded. The suite starts the mock and the development server itself and
reuses either if it is already listening, so it runs beside a development
session without a second set of ports.

**38 / 38 passing** from a freshly reset seed, in 1 minute 24 seconds.

---

## 9. Verification

```
npm run lint          0 errors, 0 warnings
npm run test:ci       143 suites, 2 961 tests, all green
npm run build:ci      compiled, 0 warnings
npm run check:traces  1 085 files scanned, 0 findings
npm run validate:seed db.json is valid
npm run test:mock     150 / 150
npm run smoke         282 / 282
npm run e2e           38 / 38
```
