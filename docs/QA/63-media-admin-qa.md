# 63 — Media admin QA (the library, Add by URL, file details, uploads, the picker)

**Date:** 2026-09-25 · **Toolchain:** Node 22, Chromium (Playwright 1.63), the CRA
development server · **Backend:** the mock on `:4000`, seeded from the committed
`db.json` (389 files, restored before each group of scenarios).

**Admin → Media** — the library at `/admin/media`, its "Add by URL" dialog, the
"File details" drawer, the upload queue (behind a Cloudinary configuration) and the
same library inside the media picker every image field opens — was exercised as
admin, manager and sales at 390, 768, 1 024, 1 280, 1 440 and 1 920 px, and its API
was driven directly as well as through the screens.

The screen loaded, and most of what it offers looked right; what was wrong showed
under use. **A reload that failed left the last answer on screen** — twenty-four
photographs under "Type: Document", page one under "page 2" — with nothing to say
so. **Tags could not be added at all.** **The Folder filter offered the folders of
the page on screen** — two of eleven — **and "Search … address" did not search
addresses.** Ten files the site shows read "Not used anywhere yet". And the API's
bulk delete answered "409 — still in use" after deleting the files ahead of the one
in use.

**33 defects were found — 3 High, 10 Medium, 20 Low. All 33 are fixed.** Every one
was reproduced in the browser or against the API before it was fixed (A2 was found
while verifying the fix of N1), and each is held by a unit, API or end-to-end test or
by the final browser pass (§4).

---

## 1. Scope

**Screens.** `/admin/media`: the header (count, Upload, Add by URL), the "Uploads
are switched off" notice, the filter row (search, Type, Folder, Stored, Reset,
chips, a phone's "More filters"), the grid (tiles, "Used in" badges, the copy
button), the pager, the empty, error and loading states. The "Add a file by
address" dialog. The "File details" drawer (preview, facts, address and Copy, alt,
title, folder, tags, "Used in", Remove with its in-use refusal and force). The
upload zone and its queue (folder, drop and choose, per-row progress, Cancel,
Retry, Remove, "Clear finished"). The media picker opened from a locality's hero
image (Library, Upload and By URL tabs). The API behind them:
`GET/POST /admin/media`, `GET/PUT/PATCH/DELETE /admin/media/:id`,
`POST /admin/media/bulk`.

**Workflows.**

- Create → view → edit → save → refresh → verify → remove → verify, through the
  dialog and the drawer and through the API; a file used by a listing refused, then
  removed with force.
- Filters and search one by one and together, Reset, the chips; the Folder filter
  from the first page and from a folder; search by alt text, title, folder,
  address, host and tag; special characters, `<script>`, quotes, spaces alone.
- State and sequence: refresh at every step; Back and Forward across paging and
  filters; first page to last and straight back; direct URLs no control produces
  (`?page=99`, `0`, `-3`, `abc`, `2.7`, `?perPage=1000`, `0`, `-5`, `?type=foo`,
  `?folder=nonexistent`, `?provider=ftp`, `?sort=hacked&order=sideways`,
  `?page=2&type=document`); dialogs and the drawer opened and closed repeatedly
  (Escape, backdrop, ×, Close); a usage link followed out of the drawer and Back.
- Edits: empty, whitespace-only and 250-character alt text and titles, emoji,
  Devanagari, HTML; tags new, duplicate, blank and 61 characters long; a save of
  nothing; Escape, the backdrop and a link away with unsaved edits; reopening the
  same file.
- Failure: the list offline, answering 500 and 401; a slow list (4 s) and a slow
  answer overtaken by a fast one; a save answering 500, 422 and 404; a removal of a
  file removed elsewhere; a create answering 500 and 422; Cancel and Escape during
  a create; a slow save with the drawer closed and another file opened.
- Uploads, with a Cloudinary configuration and the upload endpoint answered by the
  test browser: several files at once, a refused type, an oversized file, a
  Cloudinary refusal, the record failing after the upload, Cancel while uploading
  and while filing, Retry, Remove, "Clear finished", the zone hidden and shown
  mid-upload, leaving the page and reloading mid-upload, the picker cancelled
  mid-upload.
- Rapid input: double clicks on Add, Save and Remove; Enter held in the dialog.
- Roles: admin and manager (full), sales (403 and no sidebar entry).

**What held up.** The URL as the list's single source of truth (Back, Forward and
reload restore page and filters exactly; every odd URL above degrades to a sane
view), the race between a slow and a fast filter (the later answer wins), the 401
(sign-in page, "Your session has expired"), the first-load error and its Try again,
the dialog's type detection (extension, video hosts, Cloudinary resource type,
picsum as an image), its validation, the 500 answer ("Not added — Server
exploded"), a double click on Add (one record), the drawer's alt validation (no
request with an empty or blank alt), the in-use refusal and force, a double click
on Remove (one request), keyboard use (Enter opens a tile, Escape closes and hands
focus back, Tab reaches the copy button and shows it), Copy (the address on the
clipboard, "Address copied"), documents and videos ("Open this document" in a new
tab), usage links, the upload zone's refusals, automatic retry, Cancel and Retry
while uploading, cancelling the picker mid-upload (nothing filed, the field
untouched), the three roles, and the layout at every width (2, 4 and 6 columns, no
sideways scroll, a full-screen dialog and a full-height drawer on a phone, the copy
button always visible on touch).

---

## 2. Defects found and fixed

Severity: **High** — wrong data shown or kept, a feature that does nothing, or
silent data loss; **Medium** — a real error with a work-around, or a misleading
answer; **Low** — polish, wording, edge cases. "Console / network" says what the
browser showed; "Cause" is the root cause found; "Fix" is what was changed.

### A. The library (grid, filters, paging)

**G1 · High — A reload that failed left the last answer on screen.**

- **Where:** the grid (`MediaGrid`), the header count and the pager of
  `/admin/media`; the same grid in the media picker.
- **Steps:** open `/admin/media` → the API becomes unreachable (or answers 500) →
  choose Type = Document, or press page 2.
- **Expected:** "The library could not be loaded" with Try again; no count and no
  pages from an answer that was not given.
- **Actual:** the previous 24 photographs stay under the "Type: Document" chip with
  "389" in the header, "389 files" and a pager — or page one's files under "page 2"
  — and no message at all. The picker did the same.
- **Console / network:** `GET /api/admin/media?…&type=document` →
  `net::ERR_CONNECTION_REFUSED` (or 500).
- **Cause:** `useApi` keeps the last rows through an error (`keepPreviousData`);
  the grid showed its error only when it had no rows, and the page read the count
  and the pages from the last `meta`.
- **Fix:** the grid shows the error whenever the request failed; the page and the
  picker show no count and no pager while it stands.

**G2 · Medium — Every read of the library took about a second.**

- **Where:** `GET /admin/media?withUsage=true` (every filter, search and page).
- **Steps:** time the grid's request: 0.97–1.14 s; without `withUsage`, 8 ms.
- **Cause:** the CRUD factory decorates every row before filtering and paging, and
  media's decoration searched every property, article and page for each of the 389
  files — to show 24 badges.
- **Fix:** a factory option, `decoratePage`, decorates the page after paging;
  media's usage is worked out there, for the page's rows, with every record
  serialised once per request (`mediaUsageIndex`). 14–22 ms.

**G3 · Medium — The Folder filter offered only the folders of the page on screen.**

- **Where:** the Folder filter; the picker's; the folder suggestions of "Add by
  URL", the drawer and the upload zone.
- **Steps:** open `/admin/media` → Folder offers "developers" and "localities" (the
  library has eleven) → choose "localities" → only "localities" is left; moving to
  "banks" means resetting first.
- **Cause:** the options were `foldersOf(items)` — the 24 rows of the current page.
- **Fix:** the list answers `meta.folders`, every folder in the library whatever
  the filters and the page; the screens use it (the page's own folders for an API
  that does not send it), and the folder being filtered on is always an option.

**G4 · Medium — The search box promised addresses and searched none; tags neither.**

- **Where:** search on `/admin/media` and in the picker; `GET /admin/media?q=`.
- **Steps:** search "picsum", "sna-locality-whitefield" or "res.cloudinary.com" →
  "No files match"; search "east" (a tag on five localities) → one unrelated file.
  The box reads "Alt text, title or address"; the drawer calls tags "your own
  words for finding this file again".
- **Cause:** the model's `searchable` was `alt`, `title`, `folder`, `publicId`.
- **Fix:** `url` and `tags` are searched too (384, 1, 3 and 6 results).

**G5 · Low — Nothing showed that the grid was reloading.**

- **Steps:** change a filter on a slow connection → the old tiles stay at full
  strength for the whole request (4 s in the throttled test), `aria-busy` unset.
- **Cause:** the "stale" style was keyed to `loading`, which is true only for the
  first answer.
- **Fix:** the grid dims and is `aria-busy` while any answer is on its way
  (`refreshing`); a filter that had emptied it shows the skeleton.

**G6 · Low — Paging left the reader at the bottom of the new page.**

- **Steps:** scroll to the pager → page 2 → the view stays at the bottom. In the
  picker the grid's own scroll stayed at 222 px.
- **Fix:** as the data tables do, the top of the grid (the filter row) is brought
  back into view when it has scrolled away — measured against the admin's
  scrolling canvas, not the window; the picker's grid scrolls to its top.

**G7 · Low — "Nothing on this page", and no way back.**

- **Steps:** `/admin/media?page=2&type=document` (an old link, or Back into a list
  that has shrunk) → "Nothing on this page" and no pager. Removing the three files
  of the last page left "page 17 of 16".
- **Fix:** the empty page offers "Go to first page"; a removal that empties a page
  after the first steps back one.

**G8 · Low — A search of spaces alone made a blank "Search:" chip.**

- **Where:** `FilterBar` (every admin list), by typing or by an address
  (`?q=%20%20%20`). **Fix:** spaces alone are no search — nothing committed, no
  chip, no Reset.

### B. Add by URL

**N1 · Medium — The same address could be added again and again.**

- **Steps:** Add by URL → `https://picsum.photos/seed/sna-locality-whitefield/1600/900`
  (Whitefield's photograph) → "Duplicate of Whitefield" is created; the grid shows
  the picture twice, each "Used in 1".
- **Cause:** nothing made the address unique.
- **Fix:** `url` is `unique` (`unique:media,url`, 422 on `url`); the dialog says
  "This address is already in the library." under the address box.

**N2 · Low — The API took addresses longer than the column that stores them.**
A 5 000-character address was stored; `schema.sql` has `url VARCHAR(500)`. **Fix:**
`maxLength: 500` (`max:500`); the dialog says "That address is 524 characters long.
The library takes up to 500." before sending it.

**N3 · Low — Enter did nothing in the dialog.** **Fix:** the fields are a form;
Enter adds the file, as in every other dialog of the admin (one request, whatever
the key repeat does).

**N4 · Low — A file added while a folder was on screen vanished from it.** Viewing
`?folder=banks`, a file added by address was filed nowhere and did not appear.
**Fix:** the dialog starts in the folder being viewed.

**N5 · Low — A picture added by address had no size, and was filed unseen.** The
seed's pictures read "1600 × 900 · JPG"; one added by address read nothing, and an
address that was not a picture at all was accepted without a look. **Fix:** the
dialog previews the picture and measures it ("1200 × 800 — this is the picture that
will be filed"), sends `width` and `height`, and warns when the address does not
open as a picture (it is still recorded — some hosts refuse to be embedded).

### C. File details (the drawer)

**D1 · High — Tags could not be added.**

- **Steps:** open a file → Tags → type "aerial" → Enter, or click "Add "aerial"" →
  nothing.
- **Cause:** `MultiSelect` drops an "Add …" option unless the caller passes
  `onCreate`, and the drawer was the only creatable caller without one.
- **Fix:** the drawer's `onCreate` trims the tag, refuses one over 60 characters
  with a word ("A tag can be at most 60 characters.") and never adds one the file
  already has, in any case.

**D2 · Medium — Edits thrown away came back looking saved.**

- **Steps:** open "Hebbal" → change the alt text → Escape → open "Hebbal" again →
  the alt reads the discarded edit (the stored one is unchanged); a Save then
  writes it.
- **Cause:** the form was refilled only when a _different_ record object arrived;
  reopening the same tile handed back the same object.
- **Fix:** the form is filled on every opening.

**D3 · Medium — Unsaved edits were lost without a word.** Escape, the backdrop,
the × or Close, and a link out of "Used in", closed the drawer and dropped the
edits. **Fix:** the house pattern of the master-data dialogs (QA-59): "Discard
unsaved changes?" with Keep editing / Discard changes, and the in-app navigation
guard and `beforeunload` while the drawer holds edits.

**D4 · Medium — A save that landed late closed the next file's drawer.**

- **Steps:** slow network → open A → Save → Escape → open B and type → A's save
  lands: B's drawer closes and B's edits are gone; B's Save had been spinning and
  disabled all along.
- **Cause:** one drawer serves every file; its `saving` flag and its "close on
  save" were not tied to the file they were for.
- **Fix:** the drawer cannot be closed while its own save or removal is on its
  way; the page closes it only when it still shows the saved file; a result that
  comes back to a later opening is not painted into it (a toast says what
  happened).

**D5 · Low — The drawer emptied itself while sliding away** (title and buttons over
a blank panel). **Fix:** the file lingers until the transition ends
(`useLingering`, the QA-54 pattern).

**D6 · Low — A file removed elsewhere answered "Not found".** Saving it, or
removing it, printed "Not found" and left its tile. **Fix:** "“…” is no longer here
— it was deleted elsewhere. The list has been refreshed." (and "had already been
deleted" for a removal); the drawer closes and the grid is read again.

**D7 · Low — "Save changes" with nothing changed wrote the record and said "File
saved".** **Fix:** "No changes to save." — no request (`FORMS.noChanges`, QA-59).

**D8 · Low — A failed save showed its message out of sight.** The error sits at
the top of a drawer the editor had scrolled to the bottom of (to reach the tags):
368 px above the visible area. **Fix:** the message is scrolled into view.

### D. Removing a file

**R1 · Medium — Ten files the site shows read "Not used anywhere yet".**

- **Where:** the "Used in" badge and section, and the delete guard.
- **Steps:** Folder = banks → six logos "Not used yet"; open one → "Nothing on the
  site points at this address, so removing it here changes nothing a visitor
  sees"; Remove → no refusal. The same for the three author photographs and the
  default share image of the SEO settings.
- **Cause:** the usage search looked in seven collections and the site settings
  only — not banks, authors, testimonials, FAQs, job openings or the SEO settings.
- **Fix:** it looks in every record a visitor can see a file on, as a whole
  address (one followed by more of a path — `…/seed/sna-1` inside `…/seed/sna-10`
  — is another file); the drawer links each kind to where it is edited (a bank to
  Banks, the share image to SEO settings).

**R2 · Low — "The file itself stays on Cloudinary" — for files hosted elsewhere.**
386 of the 389 are picsum photographs. **Fix:** the copy names where the file
is: "stays on picsum.photos — this site has never held it".

**R3 · Low — The removal's controls did not match the file.** "Force delete
metadata, even if the file is in use" was offered for files nobody uses; after
"Keep it" the in-use warning stayed, pointing at "the box below" that was gone;
"It appears in 1 place(s)". **Fix:** the box ("Remove it from the library even
though it is in use") only for a file in use; "Keep it" clears the warning;
"1 place" / "2 places".

### E. Uploads (Cloudinary configured)

**U1 · Medium — Leaving the page or reloading during an upload abandoned it
silently.** Clicking Dashboard mid-upload: no question, the uploads aborted, no
record; reloading: no prompt. **Fix:** "Leave while files are uploading? Leaving
this page stops the files that are still uploading…" (Stay / Leave and stop them)
and the browser's `beforeunload` prompt while the queue runs. The navigation guard
takes a screen's own question for this (`useUnsavedChanges(…, { question })`).

**U2 · Medium — A retry after the record failed uploaded the file again.**

- **Steps:** a file uploads to Cloudinary, then `POST /admin/media` fails → the
  automatic retry sent the file to Cloudinary a second time, and every Retry one
  more: copies on Cloudinary that nothing points at.
- **Fix:** a row keeps Cloudinary's answer; a retry files the record without
  uploading again (one upload, three attempts at the record, in the test).

**U3 · Low — "Cancel" while "Saving to the library" said "Cancelled", then
"Added".** The file was already on Cloudinary and was filed anyway. **Fix:** no
Cancel once the file is uploaded.

**U4 · Low — "Retry" on a file the library does not take did nothing.** **Fix:**
such a row offers Remove only.

**U5 · Low — One toast and one full reload per finished file.** Eight files, eight
toasts, eight one-second reads of the library (G2). **Fix:** one toast ("4 files
are in the library.") and one read when the batch has finished; each row says
"Added" as before.

### F. The API

**A1 · High — A bulk delete answered "409 — still in use" after deleting files.**

- **Steps:** `POST /admin/media/bulk { action: 'delete', ids: [37, 47] }` (37 unused,
  47 a team member's photograph) → 409 "This file is still in use." →
  `GET /admin/media/37` → 404.
- **Cause:** the factory's bulk delete asked the resource's delete rule record by
  record between the removals, and without the query — so `?force=true` could
  never work either.
- **Fix:** every record is asked before any is removed, with the query; media's
  `beforeBulk` refuses the batch whole, naming each file in use
  (`data.refused[]`, "2 of the selected files are still in use, so none was
  removed."), and `?force=true` removes them all.

**A2 · Low — A `PATCH` of the address alone re-typed the file.** Found while
verifying N1: `PATCH /admin/media/6 { url: <extension-less picsum address> }` turned
an image into a "document". **Fix:** a `PATCH` infers nothing; `POST` and `PUT`
still fill in what they omit.

**A3 · Low — "Used by 1 teamMember".** The 409's sentence spelled the model's keys.
**Fix:** "team member", "bank", "the SEO settings", ….

**A4 · Low — Blank and duplicate tags were stored.** `["a","a","  ",""]` was kept
as sent. **Fix:** tags are trimmed, blanks dropped, each kept once (Laravel's
`TrimStrings` is on for media too: alt, title and folder are trimmed).

---

## 3. Notes on the fixes

**The usage search** is still a string search — the model has no join table for a
dozen differently shaped references — but it is now over every collection a
visitor can see, once per request, and for a whole address. `usedIn` entries name
`bank`, `author`, `testimonial`, `faq`, `job` and `seoSettings` besides the
earlier kinds; the two settings report `id: 0`.

**`meta.folders`** is additive: a client that does not read it sees the same list
as before, and the screens fall back to the page's own folders when it is absent.

**The unique address** applies to create, replace and patch (a record keeps its own
address). The seed has no duplicate addresses (`validate:seed`).

**The navigation guard's question.** `useUnsavedChanges(dirty, { question })` words
the dialog for one screen; when two screens have something to lose at once, the
house question is asked. The words stay put while the dialog fades out.

**Contract.** `docs/API_CONTRACT.md` (the media rows and a "Media" note under the
admin table), `docs/backend-notes/05_business_rules.md` ("Media library", with its
slot in the guidelines template) and the parity checklist in `08_testing.md`;
`backend_developer_guidelines/` regenerated from a freshly seeded mock (the
Laravel rule is now `required|url|max:500|unique:media,url`, `schema.sql` carries
`UNIQUE KEY media_url_unique`).

---

## 4. Verified

| Pass                                                                                                                                                                                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser (Playwright, dev server)                                                                                                                                                             | every defect above re-run as a scenario after the fix: the error state and Try again, the dimmed grid, all eleven folders before and after choosing one, search by address, host and tag, paging back to the top, "Go to first page", the step back after emptying a page, no blank chip; the duplicate refused under the box (by Enter), the long address, the preview measuring 1200 × 800 and the record carrying it, the folder carried in; a tag added and saved, a 61-character tag refused, "No changes to save.", Escape / backdrop / Close / a usage link asking first, the same file reopened clean, the drawer held open during its save, the content kept while it slides away, the gone file, the error in view; bank logos "Used in 1", "stays on picsum.photos", no force box for an unused file, the warning cleared by Keep it; one toast and one read per batch of four uploads, no Retry for a refused file, one Cloudinary upload for three record attempts, no Cancel while filing, the leave question and `beforeunload` — console clean apart from the refusals asked for (422, 409) |
| Regression (browser)                                                                                                                                                                         | paging, Back/Forward/reload and the odd URLs of §1, the picker (all folders, grid scroll, error), keyboard and Copy, usage links, documents and videos, the three roles, 390–1 920 px — unchanged or better                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Jest                                                                                                                                                                                         | 207 suites, 4 114 tests ✓ — new: `MediaLibraryQa63.test.jsx`, `useMediaUpload.test.js`, `MediaUrlForm.test.jsx`, and cases in the picker, `FilterBar` and navigation-guard suites; run against the code before the fixes, 30 of the new and changed cases fail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `test:mock`                                                                                                                                                                                  | 332 / 332 ✓ — the 8 new cases all fail on the API layer before the fixes (new: usage across banks, authors, testimonials, FAQs, job openings and the SEO settings; whole-address matching; `meta.folders`; search by address and tag; the unique and 500-character address; tags normalised; `PATCH` inferring nothing; bulk delete all or nothing, and with force)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Playwright e2e (`e2e/`)                                                                                                                                                                      | 69 / 69 ✓ — new: `media-library.spec.js` (every folder offered and switched between; a tag added, saved and searched for; a duplicate address refused under the box; a failed request shown as one)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| API timing                                                                                                                                                                                   | `GET /admin/media?perPage=24&withUsage=true`: 0.97–1.14 s before, 14–22 ms after                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `npm run check:all` (`lint`, `test:ci`, `test:mock`, `test:scripts`, `build:ci`, `check:traces`, `validate:seed`, `check:contrast`, `check:guidelines` 12 / 12, `check:env`), `format:check` | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

---

## 5. Not changed, and why

- **A hand-typed `?type=foo` shows "Any type" in the select** while its chip reads
  "Type: foo" and nothing matches. No control produces it; the chip and Reset say
  what is on. (A folder that does not exist is now shown in its select.)
- **The grid has no sort control.** Newest first is the library's order; `sort`
  and `order` in the address still work (`?sort=alt&order=asc`). A feature, not a
  defect.
- **`POST /admin/media` without `type` files an extension-less address as a
  "document".** The admin always sends the type it worked out (picsum is an image
  host); the existing API test documents the rule for other clients.
- **"Where it is stored: Elsewhere" in the drawer, "External URL" in the Stored
  filter.** Cosmetic; left for a copy pass.
- **"Configure Cloudinary in Settings → Integrations" is not a link.** The Settings
  screen keeps its tab in component state, so there is no address to link to.
- **A cancelled upload stays after "Clear finished".** It can still be retried;
  Remove takes it away.
- **The copy button shows on hover, on keyboard focus and always on touch** — by
  design (a button inside the tile's button is not valid HTML).
- **Jest's `act(...)` warnings** around the library's asynchronous updates predate
  this pass (441 lines for the one media suite before it) and fail nothing.

## 6. Could not be fully tested

- **Uploads to a real Cloudinary.** There is no cloud name here: the upload
  endpoint was answered by the test browser, so progress events and Cloudinary's
  own refusals (a wrong preset, a type the preset refuses) were not seen for real.
- **Files dragged from the desktop.** Files were given to the zone's input; a drop
  from the operating system — and one that misses the zone, which a browser opens
  as a page — cannot be produced by the test browser.
- **The Laravel API.** Everything ran against the mock; the new rules are specified
  for it in the business rules and the regenerated guidelines.
- **Other browsers, real touch devices and screen readers.** Chromium only, touch
  emulated, the accessible names and roles checked rather than listened to.
- **Scale.** 389 files. A page's usage costs a serialisation of every record that
  can show a file — fine here; a Laravel implementation over a large catalogue
  should search per address with an index, or keep a usage table.

## 7. Risks to watch

- **The Laravel backend must implement** `meta.folders`, `q` over the address and
  the tags, the unique address (a production table may already hold duplicates:
  de-duplicate before adding the index), the usage search over every collection
  listed in the business rules, the all-or-nothing bulk delete with `force`, and a
  `PATCH` that infers nothing. The admin degrades without `meta.folders` (the
  page's folders) but not without the rest.
- **The usage search reads addresses as written.** A picture referenced through a
  different Cloudinary transformation, or inside HTML that escaped its `&` as
  `&amp;`, is not counted: "Not used anywhere yet" is a hint, which is why force
  exists.
- **Uniqueness is case-insensitive** in the mock and under MySQL's
  `utf8mb4_unicode_ci`: two addresses that differ only in case are one. Cloudinary
  adds a version to every upload's address, so uploads do not collide.
