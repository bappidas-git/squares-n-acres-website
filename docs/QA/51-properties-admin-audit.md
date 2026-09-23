# 51 — Properties admin audit (All properties + Add/Edit property)

**Date:** 2026-09-23 · **Toolchain:** Node 22, Chromium (Playwright 1.63.0) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json` (40
properties), reset with `npm run mock:reset` after the pass.

The two screens under **Properties** in the admin sidebar — the list at
`/admin/properties` and the sixteen-tab form at `/admin/properties/add` and
`/admin/properties/edit/:id` — exercised as admin, manager and sales at 1920,
1440, 1280 and 390 px: every filter, sort, page size, bulk action, row action and
the CSV export on the list; every tab, validation path, save mode, draft,
duplicate, delete and the SEO panel on the form. 71 defects were found
(19 on the list, 33 in the form's logic, 19 in its layout and copy). All 71 are
fixed in this change. One related issue outside the two screens — the public API
handing out the addresses of lead-gated files — was kept out of that commit
because it changes the public contract (§4), and is fixed by a follow-up commit
on the same branch (§5).

---

## 1. What was run

| Pass                                                                                                       | Result                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser pass (Playwright)                                                                                  | list + all 16 tabs, 4 widths, 3 roles; console and failed requests watched — 0 findings after the fixes                                                                                   |
| Jest                                                                                                       | **157 suites, 3 447 tests ✓** (new: `AgentTab`, `SortableList`, `LocationSection`, `AdminSidebar`, `propertyColumns`, `fieldFocus`, `priceDisplay`, plus new cases in 16 existing suites) |
| `test:mock`                                                                                                | **160 / 160 ✓** (price-sort cases added)                                                                                                                                                  |
| `test:scripts`                                                                                             | **53 / 53 ✓**                                                                                                                                                                             |
| Playwright e2e                                                                                             | **53 / 53 ✓**                                                                                                                                                                             |
| `build:ci`                                                                                                 | ✓ — no `mini-css-extract` "Conflicting order" (see §3)                                                                                                                                    |
| `lint`, `format:check`, `check:traces`, `validate:seed`, `check:contrast`, `check:guidelines`, `check:env` | all ✓                                                                                                                                                                                     |

---

## 2. Defects found and fixed

### A. All properties (the list)

| Id  | What was wrong                                                                                                                       | Fix                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | A selection survived a page, filter or sort change, so a bulk action hit rows no longer on screen.                                   | `DataTable` drops selected ids that are not on the page.                                                                                                                                                                             |
| A2  | The table was 1 728 px wide in a 1 400 px column: SEO, views, priority, updated and the row actions were off-screen at every width.  | Wider canvas for table screens (`AdminLayout` `WIDE_PATHS`), cover and priority hidden below 1 536 px, configuration folded into the price cell, compact density, sticky actions column with an edge shadow while the table scrolls. |
| A3  | The three flag chips wrapped, rows grew to 67–89 px.                                                                                 | 32 px icon toggles with a tooltip and `aria-pressed`; the chips stay on the mobile card.                                                                                                                                             |
| A4  | The Status multiselect filter looked unlike its neighbours, grew with each pick, reflowed the bar and repeated every pick as a chip. | `FilterMultiSelect`: a select-shaped face ("Under Construction +1") over a menu of checkboxes.                                                                                                                                       |
| A5  | The Updated date wrapped.                                                                                                            | `nowrap`.                                                                                                                                                                                                                            |
| A6  | Paging left the viewport at the bottom of the new page.                                                                              | The table scrolls back into view on a page change.                                                                                                                                                                                   |
| A7  | A refused flag change rolled back every flag of the row, and a successful one never refreshed the list.                              | Roll back only the refused field; refetch on success.                                                                                                                                                                                |
| A8  | CSV: no plot area; segment exported as its raw value.                                                                                | Plot-area column, segment label.                                                                                                                                                                                                     |
| A9  | Price sort mixed monthly rents with sale prices.                                                                                     | Sales first, then rents and leases, each ordered; "on request" last (`mock-server/lib/propertyFilters.js`, `docs/backend-notes/05_business_rules.md`).                                                                               |
| A10 | `?isActive=1` in the URL: UI and server disagreed.                                                                                   | `isActive` / `isFeatured` filters typed `bool`.                                                                                                                                                                                      |
| A11 | A page size from the URL that is not an option was shown under the wrong label.                                                      | `perPageOptionsFor` includes it.                                                                                                                                                                                                     |
| A12 | Deleting a row another user had already deleted left it on screen.                                                                   | A 404 refetches.                                                                                                                                                                                                                     |
| A13 | Reset also cleared the sort and page size.                                                                                           | They are kept.                                                                                                                                                                                                                       |
| A14 | No feedback while a filter change was loading.                                                                                       | `refreshing` dims the table, `aria-busy`.                                                                                                                                                                                            |
| A15 | Two clear buttons in the search box (native and custom).                                                                             | Native one hidden.                                                                                                                                                                                                                   |
| A16 | Row checkboxes were read as "Select row 20".                                                                                         | "Select <title>".                                                                                                                                                                                                                    |
| A17 | Placeholders mixed "All" and "Any".                                                                                                  | "Any".                                                                                                                                                                                                                               |
| A18 | The Properties sidebar group did not open or highlight on its routes; the edit route highlighted nothing.                            | Longest-match active child, group opens on its routes.                                                                                                                                                                               |
| A19 | Phone: search not full width; the filters popover had no way to close.                                                               | Full-width search; Reset and Done in the popover.                                                                                                                                                                                    |

### B. Add/Edit property — behaviour

| Id  | What was wrong                                                                                                                                                                                                      | Fix                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| B1  | Leaving an empty latitude or longitude wrote `0`.                                                                                                                                                                   | `roundCoordinate` keeps empty empty.                                                                                          |
| B2  | The plot area stopped following length × width after the first keystroke of the second dimension.                                                                                                                   | Follows while it equals the previous product.                                                                                 |
| B3  | The per-sq-ft rate froze after the first save; a rental kept a rate (seed #27 printed "₹44 per sq ft" when moved to Sale).                                                                                          | A stored rate that is the division still follows the price; rentals carry none.                                               |
| B4  | The field rules hid data the page prints: plot area on villas and houses, parking on commercial, facing and ownership on land (and cleared them); age shown for land; a commercial listing could never reach 100 %. | `fieldRules` rewritten; completeness counts rooms for homes only.                                                             |
| B5  | A hidden possession date or age was still saved.                                                                                                                                                                    | `toPayload` sends only what the status shows.                                                                                 |
| B6  | Form limits looser than the API: raw 422s, and a row error landed on the wrong row.                                                                                                                                 | `LIMITS` on every field; 422 row indexes mapped back to form rows.                                                            |
| B7  | Errors with no control — no cover, no described image, too many highlights, a section switch — counted on a badge and shown nowhere.                                                                                | Shown where they belong, plus an error summary above the tab (§3).                                                            |
| B8  | Rows added after restoring a draft shared ids with restored ones.                                                                                                                                                   | `reserveTmpIds`.                                                                                                              |
| B9  | Two uploads finishing together both became the cover.                                                                                                                                                               | The reducer keeps one cover.                                                                                                  |
| B10 | A new listing's URL stopped following its title after a tab switch.                                                                                                                                                 | `SlugField` stays locked over a generated slug on an unsaved record.                                                          |
| B11 | Pasted image URLs were split on commas, breaking Cloudinary transformations.                                                                                                                                        | Split on whitespace.                                                                                                          |
| B12 | An optional select could not be reset.                                                                                                                                                                              | Placeholder enabled when the field is not required.                                                                           |
| B13 | Ctrl+S twice created the listing twice (the second answered 409); a held key repeated.                                                                                                                              | One save at a time; `event.repeat` ignored; physical key.                                                                     |
| B14 | The lease presets stored months and percentages as rupee amounts ("₹36").                                                                                                                                           | Money-only presets; a note sends lease terms to the specifications.                                                           |
| B15 | Switching Rent → Sale cleared the maintenance charge.                                                                                                                                                               | Sale fields include it.                                                                                                       |
| B16 | "Price on request" claimed every amount would be cleared.                                                                                                                                                           | Says which.                                                                                                                   |
| B17 | Changing the area unit kept the numbers.                                                                                                                                                                            | Asks: convert, or keep the numbers.                                                                                           |
| B18 | The possession error asked for yyyy-mm-dd on a month picker.                                                                                                                                                        | Month wording.                                                                                                                |
| B19 | Leaving a tab wiped its publish blockers.                                                                                                                                                                           | They are re-read with the tab.                                                                                                |
| B20 | An inactive property type, locality or city looked empty although the record kept it.                                                                                                                               | Offered as "(inactive)"; a hint on the locality. Retired or deleted amenities are shown and can be removed.                   |
| B21 | Completeness ticked "address" without one.                                                                                                                                                                          | Checks it.                                                                                                                    |
| B22 | The SEO panel's slug lagged the Basics slug.                                                                                                                                                                        | One write sets both.                                                                                                          |
| B23 | The SEO checks reported a saved listing as the duplicate of its own keyword and description.                                                                                                                        | The panel is given the listing's id.                                                                                          |
| B24 | "Team member" on the Agent tab did nothing with two or more people on the team.                                                                                                                                     | The choice is kept until a member is picked.                                                                                  |
| B25 | "Save & view" always dragged the editor's tab to the page as well.                                                                                                                                                  | Opens without `noopener`, cuts the opener by hand.                                                                            |
| B26 | Duplicate silently dropped unsaved edits.                                                                                                                                                                           | "Save, then duplicate".                                                                                                       |
| B27 | Typing during a save was lost when the save returned.                                                                                                                                                               | Kept, and still marked unsaved.                                                                                               |
| B28 | Each save after a Duplicate pushed another history entry.                                                                                                                                                           | The redirect is spent once used.                                                                                              |
| B29 | A half-filled floor plan or milestone was dropped on save without a word.                                                                                                                                           | Validated once anything is filled.                                                                                            |
| B30 | "Suggest similar" on an unpublished listing ended in "Property not found".                                                                                                                                          | The same rule asked of the admin list.                                                                                        |
| B31 | Section-visibility chips disagreed with the page (blank rows counted; construction on a finished building).                                                                                                         | Read from the payload; the construction rule says why; an empty similar list reads "Automatic".                               |
| B32 | A read-only user's SEO tab stayed on its skeleton.                                                                                                                                                                  | The analysis runs; it is not written back.                                                                                    |
| B33 | "Fix SEO" and the hints focused the wrong control, or nothing (same sub-tab, SEO fields, the description's toolbar).                                                                                                | One focus path: ids, then the control carrying the message, then the error summary; the SEO panel takes nonce-keyed requests. |

### C. Add/Edit property — layout and copy

| Id  | What was wrong                                                                                                                                                                                           | Fix                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| C1  | The 16-tab strip scrolled behind a 4 px bar, hiding tabs and their error badges.                                                                                                                         | Wraps from 900 px; on a phone the active tab scrolls into view.                                                                    |
| C2  | The rail's Save button sat below the fold of a sticky rail 1 384 px tall.                                                                                                                                | Actions and "last saved" first; the rail scrolls inside itself.                                                                    |
| C3  | A failed save or publish did not bring the first error into view.                                                                                                                                        | It does, and the error summary lists every message on the tab.                                                                     |
| C4  | "Fix SEO" over "Nothing is failing".                                                                                                                                                                     | "Open the SEO tab".                                                                                                                |
| C5  | Servant room / study / pooja switches were ambiguous.                                                                                                                                                    | Boxed.                                                                                                                             |
| C6  | Floor number and total floors misaligned.                                                                                                                                                                | Top-aligned pair.                                                                                                                  |
| C7  | The description showed two counters with different numbers.                                                                                                                                              | One.                                                                                                                               |
| C8  | The rail's "under 300 words" contradicted the 300-character rule.                                                                                                                                        | Worded as advice.                                                                                                                  |
| C9  | Formatted readouts under money fields looked like errors or links.                                                                                                                                       | Neutral text.                                                                                                                      |
| C10 | "Add to it parks & offices".                                                                                                                                                                             | "Add to IT parks & offices".                                                                                                       |
| C11 | The Approvals field was an empty box.                                                                                                                                                                    | Placeholder.                                                                                                                       |
| C12 | Documents: five controls in one row, the file picker truncated.                                                                                                                                          | Title and type, then the file, then the gate.                                                                                      |
| C13 | The drag handle and arrows floated mid-card on tall rows.                                                                                                                                                | Top-aligned; on a phone above the row. Rows drag by the handle only.                                                               |
| C14 | The rail's slug broke mid-word.                                                                                                                                                                          | Breaks between words.                                                                                                              |
| C15 | "Save as inactive" unpublished a live listing without asking.                                                                                                                                            | Confirms, in the bar and the rail menu.                                                                                            |
| C16 | Hints promised what the site did not do: other charges, maintenance on a sale, the map embed URL, "onwards".                                                                                             | The page prints the charges and the maintenance; honours a Google embed; "onwards" follows one shared rule (`utils/priceDisplay`). |
| C17 | Copy: WhatsApp hint, "six" suggested FAQs (the generator writes five), "the six" similar, draft banner on a new listing, milestones appended after Handover, developer quick-create ignoring the search. | Corrected; standard milestones inserted in order; the dialog starts from the last search.                                          |
| C18 | Alt+↑/↓ inside a field moved the row.                                                                                                                                                                    | Only on the row itself.                                                                                                            |
| C19 | A similar-listing thumbnail that failed showed a broken image.                                                                                                                                           | `LazyImage` fallback.                                                                                                              |

---

## 3. Notes on two of the fixes

**The error summary.** Every message the active tab owns is listed above the
panels, each a link that puts the cursor in its control. A failed save focuses
the first message's control — found by id, else by the invalid control whose
`aria-describedby` carries the same text — and falls back to the summary only
when the message has no control at all.

**CSS order.** The `DataTable` growth changed how webpack splits the admin
chunks, which surfaced import orders that already disagreed between routes
sharing a chunk. `build:ci` refused 17 "Conflicting order" pairs. The fix is the
repo's usual one — imports reordered with a comment at each: `MasterDataForm`
(MultiSelect first), `PageFormPage` (master-data form before the block editor),
`SeoPanel` (Social before General), `JobApplicationsPage` (drawer after the kit)
and `LeadDetailPage` (leads stylesheet and table first).

---

## 4. Left open by the audit commit

| Id     | Issue                                                                                                                                                                                                          | Why not in the audit commit                                                                                                                                | Status                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| OPEN-1 | `GET /properties/slug/:slug` returns the URLs of lead-gated documents and of a gated brochure. The gate is enforced only by the page, so the files can be taken from the API response without leaving details. | A contract change for the public API (omit gated URLs, add a download endpoint that records the lead) and the details page; outside the two admin screens. | **Fixed** in the follow-up commit — §5 |

---

## 5. OPEN-1 — the gated files

**The API.** No public property read carries the address of a gated file any
more (`mock-server/lib/scope.js`):

- a gated brochure reads `brochureUrl: null` with `hasBrochure: true`;
- a gated document keeps its row with `url: null`, `leadGated: true` and
  `hasFile: true` — every document carries `hasFile`;
- one file, one gate: an open document or brochure that shares a gated file's
  address is gated with it, and a document that is the brochure's own file is
  left out (the P25 rule, which the page could no longer apply without the
  addresses);
- admin reads are unchanged.

`POST /leads` answers a lead about an active listing with
`access: { token, expiresAt }` — opaque, 24 hours, bound to the listing and the
lead, never stored (`mock-server/lib/fileAccess.js`). The new
`POST /properties/:id/documents/access` exchanges it for the addresses of every
file of that listing; `403` for a token that is unknown, expired, for another
listing or whose lead was deleted, `404` for an inactive listing, `422` without
one. It is one exchange per listing, not one per file, because the unlock
answers a question about the listing: the brochure and the papers are one kind
(P24), and a visitor with any lead about the listing is not asked again (P28).

**The page.** `LeadForm` and the eligibility form keep the token in
`sna_lead.access[propertyId]`. `DocumentsSection` renders a row for `hasFile` /
`hasBrochure`, fetches the addresses right after the lead — the tab opens from
the same click and the success panel's "Open <file>" links to the fetched
address — and fetches them ahead as soon as it finds the `documents` gate open,
so a later row opens synchronously. `LeadCaptureModal` takes a
`deliver.resolveUrl`; a visitor it would skip (P28) needs the token too, and one
whose token is missing or refused is shown the form instead. If the address does
not arrive after a submitted form, the lead stands and the panel offers a retry.

**The contract.** `docs/backend-notes/05_business_rules.md` → "Gated files"
(with the Laravel sketch), the note under "Versioning policy" in
`01_api_contract.md`, `docs/API_CONTRACT.md` §5.10, the catalogue (243 rows) and
the `Property`, `LeadCreated` and `DocumentAccess` shapes, the registry entry
`properties.documentAccess`, the schema `property.documentAccess`, the smoke and
capture steps, and the regenerated `backend_developer_guidelines/`.

**Not covered, on purpose.** Floor plans remain a soft gate: the blurred drawing
is the invitation (P24), so `floorPlans[].imageUrl` / `pdfUrl` and
`unitConfigurations[].floorPlanPdfUrl` stay in the public read. The seed uses one
placeholder PDF for every brochure, paper and floor plan, so on the seeded
listings that one file is still reachable through the floor-plan fields; the e2e
check of "no gated address anywhere in the JSON" therefore uses a listing of its
own with distinct files. See the QA-51 OPEN-1 entries in `docs/DECISIONS.md`.

**Verified.**

| Pass                                                                                               | Result                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test:mock`                                                                                        | **166 / 166 ✓** — six new cases: the public reads carry no gated address, admin reads unchanged, one file one gate, the token from `POST /leads`, no token without an active listing, every refusal |
| Jest                                                                                               | **157 suites, 3 467 tests ✓** — new cases in `DocumentsSection`, `LeadCaptureModal`, `leadStorage` and `propertySections`                                                                           |
| Playwright e2e                                                                                     | **54 / 54 ✓** — the brochure test now checks the public read and the opened tab; a new test keeps a gated paper's address out of the JSON and the page until the form is sent                       |
| `smoke`                                                                                            | **283 / 283 ✓**, including `POST /properties/1/documents/access` → 200                                                                                                                              |
| `check:guidelines`                                                                                 | **12 / 12 ✓** — the package regenerates byte-identical                                                                                                                                              |
| `lint`, `format:check`, `build:ci`, `check:traces`, `validate:seed`, `check:contrast`, `check:env` | all ✓                                                                                                                                                                                               |
| Browser                                                                                            | the flow driven by hand: no gated address in the page before the lead, the tab opens after it, a stale token asks again, the next row opens without a second request                                |
