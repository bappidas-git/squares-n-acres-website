# 60 — Master data admin audit (localities, cities, segments, property types, amenities, badges, developers, banks)

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json`, reset with
`MOCK_FRESH=1` before every verification pass.

Everything under **Admin → Master data** was exercised as admin at 1 920, 1 440, 1 024,
768 and 390 px, and as manager and sales for what each may reach: the eight screens (Localities, Cities, Segments,
Property types, Amenities, Badges, Developers, Banks), their drag lists and tables,
search, filters, sort, paging and page size, the bulk bar, every row action, the Active
and Featured switches, the six dialogs field by field (the icon picker, the tone picker
and the SEO panel included), the two full-page forms (locality and developer) section by
section, the discard guard, delete and the in-use guard. Each was tried in the expected
order and out of it: refresh at each step, Back and Forward, direct URLs (unknown ids,
`edit/abc`, values no control can show, a page past the end), dialogs opened and closed
repeatedly, Escape, double clicks, quick keyboard moves, rapid navigation through all
eight screens and back, requests failed (500), refused (409/422) or slowed, and the
screen left while a write was on its way. Console errors, page errors and failed
requests were recorded throughout. The API was called directly as well, and the public
site was checked against what the admin did: property pages and cards, `/localities`,
`/builders`, `/buy/…` and `/rent/…`.

The owner's screenshot shows the screen Master data opens on, the Localities drag list.
The list itself held up — QA-59 had just rebuilt it — and the defects sat one step away
from it: **in the locality and developer forms it opens, in the defaults of the dialogs,
in the API behind them, and in what switching a record off or renaming it did to the
public site.**

**38 defects were found: 3 in the lists, 16 in the locality and developer forms, 7 in the
city, segment and property-type dialogs, 5 in amenities, badges and banks, 4 in the API,
2 on the public site and 1 on phones. All 38 are fixed.** Six are High: a keyboard move in
a form's list moved the wrong row (LF2); a locality whose city was switched off showed no
city at all, and a new one could not be given one (LF10); changing the URL of a property
type, a locality or a developer broke its public address without a word (PT1); a name or title with no Latin letter or digit was
stored with an empty slug (A1, A4); and a badge or amenity switched off stayed on every
listing (PUB1). Two further risks are documented rather than changed (§8).

Re-verification caught **three problems in the new work**, none of which left this branch
(§3), and the repository's gate caught a pre-existing flaky test, now fixed. The final
browser pass is **53 / 53** (§4); `npm run check:all` passes, and the end-to-end suite is
59 / 59.

---

## 1. Scope

**Sections.** `/admin/master-data/localities` (drag list, table, `…/add`, `…/edit/:id`),
`/cities`, `/segments`, `/property-types`, `/amenities`, `/badges`, `/developers` (drag
list, table, `…/add`, `…/edit/:id`) and `/banks`. The API behind them —
`/admin/<collection>` list, create, read, replace, patch, delete, bulk and `check-slug`,
and the public reads. The public consumers: property pages and cards, `/localities` and a
locality page, `/builders` and a builder page, `/buy/:type` and `/rent/:type`. The property
form's quick-creates, where they touch master data.

**Workflows.**

- Create → view → edit → save → refresh → verify → delete → verify, in each of the eight
  screens, in the dialog or the full-page form and through the API; the delete guard on a
  record in use ("“Aurelia Estates” is still used by: …").
- Reordering by drag, by the arrows and by Alt + ↑/↓ in each drag list, and inside the
  forms' own lists (highlights, connectivity, a developer's highlights, a dialog's string
  lists); "Table view" and "Reorder".
- Switching records off and on, singly and in bulk, and following each change to the
  public site; renaming a record's URL and opening the old one.
- Each role's reach: admin and manager edit everything; sales has no Master data menu,
  gets the 403 screen at every URL, and the API answers it 403.
- Failure paths: a list that answers 500 (error state, "Try again" recovers it), a switch
  whose `PATCH` fails (the switch goes back, the error is toasted), a dialog save that
  fails (the dialog stays open and dirty; a retry saves), a slow save (Cancel is disabled
  until it lands), leaving a form while its save is on the way (the discard guard asks; the
  save still lands), a delete that fails (the confirm stays for a retry), a double-clicked
  Save (one `PUT`), unknown ids (`/developers/edit/9999`, `/edit/abc`: "We could not load
  this developer · Not found · Back to developers").

**What held up.** Everything in the last two bullets; sort, filters, page and page size
surviving a reload and Back/Forward; bogus URL values ignored (QA-59); Escape and the
discard guard in every dialog; the in-use guard (Whitefield, Bengaluru, Aurelia Estates each
named what still uses them); bulk activate and deactivate; no page errors and no
console errors of the app's own anywhere in the pass.

---

## 2. Defects found and fixed

Severity: **Critical** (data loss or a screen that stops working), **High** (wrong data
published or kept, or a core action that misleads), **Medium** (a real error with a
work-around), **Low** (polish, wording, edge cases). Every item was reproduced in the
browser or against the API before it was fixed, and is held by a unit, API or end-to-end
test, or by a check of the final browser pass (§4). None of them logged an error of the
app's own in the console; where the network tells part of the story — a 404 page, a 409
or 422 answer, a write that should not have been sent — the row says so. The "Cause → fix"
column is both the likely root cause found and the fix made.

### A. The lists (`/admin/master-data/localities`, `/developers`, `/cities`)

| Id  | Sev | Steps → what happened (what should have)                                                                                                                                                                          | Cause → fix                                                                                                                                         |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Low | Localities → the menu of a switched-off locality → "View KR Puram on the site" → the site's 404 page (`GET /localities/slug/kr-puram` → 404). Developers the same. (Only a live record has a page to view.)       | The action was offered on every row → offered for a live record with a slug only; switched back on, the record gets it back.                        |
| L2  | Low | The home page's locality strip is the featured localities in drag-list order, and nothing in the drag list said which were featured: reordering the strip was blind. Developers (the home builders row) the same. | → " · Featured" in the row's line of detail.                                                                                                        |
| L3  | Low | Localities and Cities had no subtitle; every other master-data screen says what its records feed.                                                                                                                 | → "The neighbourhoods listings sit in — one guide page each at /localities." and "The cities a locality belongs to. A city has no page of its own." |

### B. The locality and developer forms (`/admin/master-data/localities/add`, `…/edit/:id`; the same for developers)

| Id   | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                                                                                                                                           | Cause → fix                                                                                                                                                                                                                                                            |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LF1  | Med  | Add locality → Save with nothing typed → three errors: "The name field is required.", "The slug may only contain lowercase letters, numbers and hyphens." under the empty URL box, and "The seo.slug may only contain…" at the top, about a field the editor never sees. (One: the name.) Every dialog with a slug the same (PT2).                                 | The client's `slug` rule refused `''`, which §5.9 and the API have always read as "derive one" → `''` passes; a slug that must be there is `required`.                                                                                                                 |
| LF2  | High | Edit Whitefield → focus the first highlight → Alt+↓, Alt+↓ → the first press moved it, the second moved its neighbour back. Enter twice on "Move … down" → the second press moved the neighbour. The connectivity rows, a developer's highlights and a dialog's string lists the same. (One row moves two places, and the focus stays with it.)                    | Rows were keyed by their index, so after a move the focus sat on whichever row now held that index → each row keeps a stable key (`useRowKeys`), and the list's focus follows the row by its key (QA-59).                                                              |
| LF3  | Med  | Messages named raw keys: "The avgPricePerSqft must be an integer.", "The cityId field is required.", "The connectivity.0.value field is required." — the last naming neither the row nor what it lacked, and landing on the wrong row when an empty one sat above it. The developer's: "The logoUrl must be a valid URL.", "The totalProjects must be at least 0." | The forms gave `useForm` no labels, and the schema counted connectivity rows after the empty ones were dropped → every such field is named by its label; a connectivity row asks for its missing half on that row ("Say how far or how — or remove the row.").         |
| LF4  | Med  | Edit a locality → Latitude 95 (below the fold) → Save at the top → nothing visible: no toast, no scroll, no focus; Save seemed broken. The developer form and the dialogs the same. (Say so, and take the editor there.)                                                                                                                                           | Only the fields' own messages were drawn → "Please fix the highlighted fields." and the first field in error is brought into view with the cursor in it (`focusFirstError`), opening a closed disclosure on the way and passing over warnings that do not stop a save. |
| LF5  | Med  | Edit → change a field far down → Save → the form was swapped for its skeleton and the page jumped to the top (scroll 2 819 → 0 px). (The form stays where it is.)                                                                                                                                                                                                  | The page read the record again after every save → the API's answer becomes the form; no second read.                                                                                                                                                                   |
| LF6  | Low  | Add → Save → the edit page opens; Back → a blank "New locality" form, offering to create it again.                                                                                                                                                                                                                                                                 | The move to the edit page pushed a history entry → it replaces the add route.                                                                                                                                                                                          |
| LF7  | Med  | A switched-off locality → "Save & view" → the site's 404 page (`GET /localities/slug/…` → 404). Developers the same.                                                                                                                                                                                                                                               | → it saves, stays, and says "This locality is switched off, so its page is not on the site — switch Active on to publish it."                                                                                                                                          |
| LF8  | Med  | The SEO panel's hints that name the guide, the hero image, the highlights, the connectivity or the URL did nothing when pressed: 15 of the 24 hints on Whitefield, 5 of the 13 on a developer. (Each takes the editor to the block it names.)                                                                                                                      | The hints target element ids no block carried → every block they name has its id; the final pass pressed all 19 hints on Whitefield's page and none was dead.                                                                                                          |
| LF9  | Low  | Pincodes → "5600667" → Enter → kept as "560066"; "abc123456" became "123456". (Refuse what is not six digits.)                                                                                                                                                                                                                                                     | The input was stripped to its digits and cut to six → spaces are dropped ("560 066" is how pincodes are often written); anything else that is not six digits is refused: "A pincode is six digits, like 560066."                                                       |
| LF10 | High | Switch off Bengaluru (the only city) → Add locality → the City select offers nothing, and Save says "The cityId field is required."; edit Whitefield → the City select reads "Select a city" over a locality that has one. (Show the locality's own city; say what is wrong.)                                                                                      | The select listed active cities only → it also offers the locality's own city, labelled "Bengaluru (inactive)", with a hint on switching it on or choosing another; with no city switched on, the add form says so and where to fix it.                                |
| LF11 | Low  | The URL box said "Generated from the title — unlock to edit." on a form that has a Name and no title.                                                                                                                                                                                                                                                              | The hint was fixed text in `SlugField` → it names the field it follows ("Generated from the name"), and says why a name with no Latin letter or digit makes no URL.                                                                                                    |
| LF12 | Low  | The locality form runs to seven screens, and on a desktop its only Save was at the top: an editor at the connectivity rows scrolled all the way back to save.                                                                                                                                                                                                      | The sticky action bar was drawn on phones only → sticky at every width, like the Pages form's.                                                                                                                                                                         |
| LF13 | Low  | The URL box stood 40 px tall and 4 px higher than the 46 px Name box beside it (and 40 px against the 46 px boxes of every dialog with a slug).                                                                                                                                                                                                                    | `SlugField` had a box and label spacing of its own → the kit's (`FormField`): the same minimum, padding, type size and gap under the label; both boxes are 46 px and level.                                                                                            |
| P1   | Low  | Edit → Save with nothing changed → a `PUT`, and "Locality saved". (The dialogs say "No changes to save." and send nothing.)                                                                                                                                                                                                                                        | → the same rule (QA-55, QA-56, QA-59).                                                                                                                                                                                                                                 |
| P2   | Low  | Ctrl+S on the locality or developer form → the browser's "Save page as". (Every other form saves.)                                                                                                                                                                                                                                                                 | → saves, once per press, not from a dialog of the form's own (a link being added to the description).                                                                                                                                                                  |
| DV1  | Low  | Developer → Total projects −1, Ongoing 4, Completed 3 → "Ongoing and completed add up to 7, which is more than the -1 total projects." beside the real error.                                                                                                                                                                                                      | → the sum is compared only with a total that is a count; the "at least 0" error stands alone. The warning is marked advisory, so a refused save takes the cursor past it to the field that stops the save.                                                             |

The two forms now save through one hook, `useRecordPage`, which holds LF4–LF7, P1 and P2
and PT1's redirect for both.

### C. Cities, segments and property types (the dialogs)

| Id   | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                                                                                                                                                                    | Cause → fix                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C2   | Low  | Add city "Bengaluru", Karnataka → Create → "The slug has already been taken." (`POST /admin/cities` → 409, which the browser logs as a failed resource), though the free "bengaluru-2" was known. (Name it.)                                                                                                                                                                                | Only the locality form fetched a suggestion after a 409 → every dialog does (`withSlugSuggestion`): "The slug has already been taken. Try “bengaluru-2”."                                                                                                                                                                                                                                                                         |
| CT1  | Low  | Add city → the slug was labelled "URL", with "/" in front of it, as if `/mysuru` were a page. A city has none.                                                                                                                                                                                                                                                                              | → "Slug", with no address in front of it (an empty base draws no prefix).                                                                                                                                                                                                                                                                                                                                                         |
| S1   | Med  | Segments → Add → the Order box read 0 → "Industrial" became the first segment, above Residential, and the property form's first choice. A new property type was first of 18; a new amenity (Jacuzzi) headed every listing's amenity block; a new badge or bank was first on the site. The locality and developer forms the same. (A new record goes last unless the editor says otherwise.) | 0 is "first" to an API that places records (QA-59) → the five master-data dialogs with an Order box propose the end of the collection — the total + 1, asked of the API when a filter narrows the list — and so do the two forms. FAQs and the other content lists keep QA-59's rule (see R1).                                                                                                                                    |
| PT1  | High | Property types → Edit "Villas" → URL "luxury-villas" → Save → no word, and `/buy/villas` and `/rent/villas` — in the menus, the home page and search results — answered 404. A locality (`/localities/…`) and a developer (`/builders/…`) the same. (Say so, and send the old address on.)                                                                                                  | Only the Pages form offered a redirect (QA-56) → the type dialog asks "Change the URL?" naming both addresses (one question with the segment's when both change); the locality and developer forms show a notice under the slug with a switch, on by default for a role that may write redirects; after the save, a 301 from each old address (`redirectMoves`, which first retires a rule from the new address that would loop). |
| PT2  | Med  | Property types → Add → Create with nothing filled → an alert at the top, "The seo.slug may only contain lowercase letters, numbers and hyphens.", and the same under the empty slug box, beside the real errors (name, icon).                                                                                                                                                               | LF1's cause, in a dialog with an SEO panel → fixed with it.                                                                                                                                                                                                                                                                                                                                                                       |
| SEO1 | Med  | Property types → Edit "Penthouses" → SEO panel → Advanced → redirect to `/buy/apartments` → Save → saved, and no redirect was written: `/buy/penthouses` still answered. (A 301 to the address set.)                                                                                                                                                                                        | `MasterDataPage` handed the SEO side effect the service's envelope, in which it found no slug → it hands over the record. Reproduced on the original code.                                                                                                                                                                                                                                                                        |
| IP1  | Low  | Property types → Add → Browse icons → type in the search box → two clear buttons, Chrome's own and the picker's.                                                                                                                                                                                                                                                                            | → Chrome's is hidden, as the filter bar's is (QA-59).                                                                                                                                                                                                                                                                                                                                                                             |

### D. Amenities, badges and banks

| Id    | Sev | Steps → what happened (what should have)                                                                                                                                                                                                    | Cause → fix                                                                                                                                                            |
| ----- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AM1   | Low | Amenities → "Table view" from the drag list → a list sorted by name, its category groups gone (`?sort=name`). (The screen's own table, grouped by category.)                                                                                | "Table view" took the first sortable column → it opens the screen's own sort when that is not `order`.                                                                 |
| AM2   | Low | The grouped table ordered the categories alphabetically — Basic, Commercial, Convenience… — while the property form and the listing pages group them Basic, Lifestyle, Safety….                                                             | The API sorted the category key as text → `sort=category` ranks the categories by `AMENITY_CATEGORIES`, then `order` (a sort entry may now rank a field by a list).    |
| BK1   | Med | Banks → Add → interest rate 25, maximum funding 99 → Create → saved, though the boxes declare 5–20 % a year and 50–95 % of the value. (Refused on the field.)                                                                               | The bounds were attributes of a `noValidate` form, which never asks the browser → the form checks each number box's own `min` / `max`: "Use a value between 5 and 20." |
| BK2   | Low | Banks → Create with nothing filled → "The interest rate from (% p.a.) field is required."                                                                                                                                                   | Labels carrying units were put into sentences → a field can name itself for one (`messageLabel`): "The lowest interest rate field is required."                        |
| BULK1 | Low | Tick several badges → Delete → the confirm said "One a property still points at is refused." — the API refuses the whole batch when one is in use (QA-59). Localities, developers, cities, segments, property types and amenities the same. | → "If a property still points at any of them, none is deleted and you are told which."                                                                                 |

### E. The API (`mock-server/`, and the contract it stands for)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                                                                        | Cause → fix                                                                                                                                                                                                                    |
| --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | High | `POST /admin/localities { name: "!!" }` and `{ name: "北京 नगर" }` → both 201 with `slug: ""`: they shared it, and neither had a page. Every slugged collection of the router.                                                                                                                  | A name with no Latin letter or digit slugifies to nothing, and nothing caught it → such a record keeps the slug it has, or is given `<noun>-<id>` (`locality-21`), de-duplicated as usual.                                     |
| A2  | Med  | `POST /admin/cities { name: "  Mysuru  ", state: " Karnataka " }` → stored with the spaces; " Mysuru " sorted above "Bengaluru" in every list and picker.                                                                                                                                       | → text is trimmed before it is checked and stored (`trimStrings`, Laravel's `TrimStrings`), inside lists and rows too; the dialogs trim their boxes before validating, so " A " fails a two-character minimum as the API does. |
| A3  | Med  | Add locality "Whitefield" (or " whitefield ") in Bengaluru → 201: a second Whitefield, offered twice by every locality picker, the listing filters and `/localities`. The data model has always said a locality's name is unique per city. Found while checking the data model for this report. | Never checked → 422 on `name`, "This locality is already in Bengaluru.", for a create or a write that changes the name or the city; the form and the property form's quick-create show it on the field.                        |
| A4  | High | A listing titled in Devanagari alone ("व्हाइटफील्ड में शानदार फ्लैट") → `slug: ""`, as in A1: the property router derives its slug on its own, without A1's fallback. Found when A1's reach was checked.                                                                                        | → the same fallback: `property-<id>`.                                                                                                                                                                                          |

### F. The public site

| Id   | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                                | Cause → fix                                                                                                                                                          |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUB1 | High | Badges → switch off "Ready to Move" → every listing carrying it still showed it, on its page and its card; an amenity switched off (Power Backup) stayed in the listings' amenity blocks. The public API answered both. (Switched off is off the site.) | `embedProperty` ignored `isActive` → the public read leaves out a switched-off amenity or badge; the admin read keeps them, so the property form never drops a tick. |
| PUB2 | Med  | Switch off a locality or a developer → its listings still linked to its page — the locality guide button, the builder button, the breadcrumb, the JSON-LD — which answered 404.                                                                         | → the public read keeps the name and answers `slug: null`; the site already draws those links only when there is a slug.                                             |

### G. Phones (390 px)

| Id   | Sev | Steps → what happened (what should have)                                                                                  | Cause → fix                                                                                                                     |
| ---- | --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| MOB1 | Med | Edit a locality or a developer at 390 px → the page scrolled sideways (`main` 428 px and 405 px wide in a 390 px window). | The SEO panel's "Canonical: https://…/localities/whitefield." is one unbreakable word → the panel's check lines break anywhere. |

---

## 3. What re-verification caught in the new work

None of these left the branch; each is fixed and held by a test or the gate.

| Id  | What happened                                                                                                                                                                                                                                                     | Fix                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| R1  | S1's end-of-list default was first built into the shared list screen, so it also moved new FAQs, testimonials, team members, partners and article categories to the end — undoing QA-59's rule for FAQs (created at 0, first). The FAQ end-to-end test caught it. | The default is opt-in (`appendNew`), on for the five master-data dialogs; a unit test holds the FAQ rule. |
| R2  | A locality filed under the only city, switched off, showed "No city is switched on…" instead of the hint about its own city.                                                                                                                                      | The hint about the chosen city comes first.                                                               |
| R3  | The new business-rules section ("Master data writes and reads") did not reach the backend guidelines: `check:guidelines` 11 / 12.                                                                                                                                 | The template has its slot; the guidelines are regenerated from a freshly seeded mock.                     |

**Found by the gate (pre-existing).** `seedProperties.render.test.jsx` failed once in a
full `test:ci` run and once alone: the property page's `GET /faqs?propertyTypeId=` (QA-59)
was left to the network in that test, reached the mock running on `:4000`, and its CORS
refusal was console output whenever it landed inside a test. The test now answers the call
with the seed's own FAQs, and reads each listing as the public API presents it
(`publicRead`).

---

## 4. Final browser pass

Chromium, a freshly seeded mock, every check by the id of the defect it holds. **53 / 53.**

- **Locality and developer forms (24):** the slug hint names the name (LF11), and the URL
  box is as tall as the Name box and level with it (LF13); a new locality
  proposes the end of the list and is created there, and a new developer proposes it (S1); an empty
  Save shows the name's error only (LF1) and "Please fix the highlighted fields." (LF4);
  Back after a create does not reopen the add form (LF6); an untouched Save sends nothing
  (P1); two Alt+↓ and two Enters on "Move down" move one highlight two places (LF2); errors
  name their labels (LF3, and the developer's); a latitude of 95 below the fold is focused
  and in view (LF4); the sticky Save is on screen at the connectivity rows (LF12), and a
  save there keeps the page (no skeleton, scroll 2 819 → 2 819, one `PUT`) (LF5); Ctrl+S
  saves once (P2); "5600999" is refused (LF9); all 19 SEO hints on Whitefield lead
  somewhere (LF8); a live locality's new URL shows the notice and writes
  `/localities/marathahalli → /localities/marathahalli-new` (PT1); "Save & view" on a
  switched-off locality stays and says why (LF7); "Bengaluru (inactive)" with its hint
  (LF10); no warning over a negative total (DV1).
- **Dialogs, API and site (27):** `"!!"` and `"北京 नगर"` get `locality-21` and `locality-22`
  (A1); " Mysuru " is stored as "Mysuru" (A2); amenity categories in the site's order in
  the API and the table (AM2); the Cities and Localities subtitles (L3); an empty city
  dialog shows the required errors only (LF1); the city slug is "Slug" with no "/" (CT1);
  the slug box as tall as the Name and State boxes (LF13); a taken city slug suggests "bengaluru-2" (C2); a new
  property type's Order is 18 of 17 (S1); an empty type dialog shows no `seo.slug` error
  (PT2); the icon search has one clear button (IP1); changing Villas' URL asks first and
  writes both redirects (PT1); the SEO panel's redirect is written (SEO1); "Table view" keeps the
  amenity groups (AM1); the bank labels (BK2) and ranges (BK1); a refused bank dialog
  focuses its first field (LF4); the bulk sentence (BULK1); "· Featured" in the drag list
  (L2); no "View" on a switched-off locality (L1); a switched-off amenity and badge are gone
  from the listing (PUB1); no link from a listing to a 404 page (PUB2); no sideways scroll
  on either edit page at 390 px (MOB1).
- **Duplicates (2):** a second " whitefield " in Bengaluru is refused on the Name field of the
  locality form, with the cursor there, and a second "Whitefield" on the Name field of the
  property form's quick-create (A3).

Two checks of the scripted pass read the wrong thing and were re-checked precisely: IP1
asked Chromium for a pseudo-element's computed style, which it does not report (the loaded
rule and a screenshot show one button), and PUB1 searched the whole page's text, where
"Ready to Move" is also the listing's possession status (the title chips and the amenity
list no longer carry them). No page errors, and no console errors beyond the browser's own
line for each deliberate 409 or 422.

---

## 5. Contract changes

All are in `docs/API_CONTRACT.md` §5.8–§5.10 and the master-data endpoints,
`docs/backend-notes/05_business_rules.md` ("Slugs", and the new "Master data writes and
reads"), `docs/backend-notes/08_testing.md` and `docs/DATA_MODEL.md` §6;
`backend_developer_guidelines/` is regenerated from a freshly seeded mock
(`check:guidelines` 12 / 12).

- **Text is trimmed** before it is checked and stored — Laravel's `TrimStrings`, on by
  default. The mock trims the writes of `routes/masterData.js` (`trimStrings`): string
  fields, and the strings of a list or of a list's rows. HTML, slugs and URLs are left as
  sent.
- **An empty slug is never stored.** A name or title with no Latin letter or digit keeps
  its record's slug or is given `<noun>-<id>` (`locality-21`, `property-45`), in every
  collection, properties included.
- **A city lists a locality once.** `name` is unique within its city, case and spacing
  aside: 422 on `name` for a create or a write that changes the name or the city.
- **`sort=category` on amenities** follows `AMENITY_CATEGORIES`, then `order` (Laravel's
  `ORDER BY FIELD(…)`).
- **A public property read shows only master data that is switched on:** an inactive
  amenity or badge is left out; an inactive locality or developer answers `slug: null`.
  Admin reads are unchanged.

---

## 6. Tests

| Where                                                              | Before → after | What they hold                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock-server/__tests__/content.test.js`                            | 133 → 137      | a slug of its own for `"!!"` and `"北京 नगर"`, kept on a replace, in two collections; trimming in fields, lists and rows, on a `PATCH`, before the length check; one locality of a name per city (case, spacing, another city, a rename, a move, a write that keeps its name); amenity categories in the site's order, both ways (the slug de-duplication test now makes its twin in another city) |
| `mock-server/__tests__/properties.test.js`                         | 38 → 40        | the public read without switched-off amenities, badges, locality and developer pages, on the page and the card, and the admin read with them; a title in Devanagari alone given `property-<id>`, kept on a replace                                                                                                                                                                                 |
| `src/components/admin/__tests__/MasterDataPage.test.jsx`           | 34 → 46        | the end of the list for a new record, and not on a screen that does not append; the collection's size under a filter; the first field in error brought into view; the saved record, not the envelope, for what runs after a save; a number box's bounds; a free slug suggested after a 409; "Table view" to the screen's own table; a list field's row moved twice; `messageLabel`; the helpers    |
| `src/components/admin/__tests__/SlugField.test.jsx`                | 15 → 18        | the field it follows named; why a name with no Latin letter or digit makes no URL; no address in front of a slug that has none                                                                                                                                                                                                                                                                     |
| `src/components/admin/__tests__/formHelpers.test.jsx`              | new, 11        | `useRowKeys` through moves, removals and additions; `focusFirstError` (the first control in error, a message's control, a closed disclosure, an advisory passed over); `withSlugSuggestion`; `redirectMoves` and its sentence                                                                                                                                                                      |
| `src/pages/admin/master-data/__tests__/LocalityFormPage.test.jsx`  | new, 15        | LF1–LF10 and PT1 on the form: no-op save, save in place, the refused save's focus, labels, connectivity halves, a highlight moved twice, the inactive and the missing city, the end of the list, the replaced add route, "Save & view" when switched off, the redirect and the switch that declines it, SEO hint targets, pincodes                                                                 |
| `src/pages/admin/master-data/__tests__/DeveloperFormPage.test.jsx` | new, 6         | the counts' labels and a negative total, the advisory passed over, the no-op save, the redirect, SEO hint targets, the end of the list                                                                                                                                                                                                                                                             |
| `src/pages/admin/master-data/__tests__/LocalitiesPage.test.jsx`    | new, 2         | "View on the site" for live records only, and "· Featured", for localities and developers                                                                                                                                                                                                                                                                                                          |
| `src/pages/admin/master-data/__tests__/masterDataConfigs.test.js`  | 82 → 97        | the five dialogs append; a live type's URL move — the question, an emptied box, a switched-off type, both questions at once, the redirects written, a commercial type's one address; the bulk-delete sentences                                                                                                                                                                                     |
| `src/utils/__tests__/validation.test.js`                           | 36 → 37        | an empty slug passes; a malformed one still does not                                                                                                                                                                                                                                                                                                                                               |
| `src/__tests__/seedProperties.render.test.jsx`                     | 39 → 39        | now answers the type-FAQ call and reads each listing as the public API presents it                                                                                                                                                                                                                                                                                                                 |

**Gate:** `npm run check:all` passes — lint, `test:ci` 194 suites / 3 951 tests (190 / 3 886
before), `test:mock` 309 (303), `test:scripts`, `build:ci`, traces, seed, contrast,
guidelines 12 / 12, env. `npm run e2e` 59 / 59.

---

## 7. What could not be fully tested

- **Real phones and touch.** 390 and 768 px were Chromium's emulation; HTML5 drag does not
  fire on touch, where the arrows are the way to move a row, and they were driven by taps
  and keys.
- **Screen readers.** Names, roles, focus and the `role="note"` of the moved-URL notice were
  checked in the DOM, not with NVDA, JAWS or VoiceOver.
- **Firefox and Safari.** Chromium only.
- **The Laravel API.** It does not exist yet; §5 is what it must implement.
- **Two editors at once.** No admin screen guards against a concurrent edit; a `PUT` of a
  stale form still overwrites.
- **Uploads.** Image fields were driven with URLs and the media library's existing files;
  uploading a new file to storage was not exercised. The locality form's map preview is a
  third-party embed, not checked tile by tile.
- **Icons and fonts** load from third-party hosts that the sandbox reaches through a proxy;
  icon buttons were checked by their names, and visually where the hosts answered.

## 8. Risks and follow-ups

- **Switching off a city in use asks nothing (C1).** The locality form now copes (LF10), but
  the city drops out of every list of active cities at once, the add form's choices among
  them. A confirm naming the localities and listings it reaches — the segment change's
  question (D88) — would make it deliberate.
- **A built-in segment can be switched off with one click (S2).** QA-52 decided a segment
  may be retired, and a retired one drops out of the property form's choices and every
  list of active segments at once, though `/commercial` and `/plots` are built on theirs.
  The same kind of confirm is worth adding.
- **The other master-data collections take a name twice** when the slug differs — two "HDFC
  Bank", two "Swimming Pool", "Villas" and "villas-2". Which scope each should be unique in
  (a city within its state, an amenity within its category) is a product decision; the
  locality check (A3) is the pattern.
- **Quick-created localities and developers still go first** (QA-59 kept them at 0), while
  the full forms now propose the end.
- **A delete leaves a gap** in `order` until the next placing write (QA-59).
- **The icon picker cuts long icon names to one line**; the icon itself is shown, and the
  full id is the tile's accessible name.
- **"Add locality" in the header and "New locality" on the page** is the admin's convention
  for every add form (articles, pages, developers too), left as it is.
