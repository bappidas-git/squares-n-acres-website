# 62 — Properties admin QA (All properties, Add/Edit property, and the featured row)

**Date:** 2026-09-25 · **Toolchain:** Node 22, Chromium (Playwright 1.63), the CRA
development server and a production build (`react-scripts build`, served on `:5000`) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json`.

The **Properties** group of the admin sidebar — the list at `/admin/properties` and the
sixteen-tab form at `/admin/properties/add` and `/admin/properties/edit/:id` — was
exercised as admin, manager and sales at 390, 768, 1 024, 1 280, 1 440, 1 600 and 1 920 px,
and followed through to what the public site shows: the home page's Featured row, the
listing, the property page and its admin preview.

The owner reported one defect, and it is the headline of this report: **the Featured
switch in the form and the star in the list set the flag, but a newly featured listing
never appeared on the website as featured** — only the ones already there did. That is
P1 below; two more defects made "featured" misbehave in ways an editor would read the same
way (P2, P3).

**23 defects were found — 7 High, 5 Medium, 11 Low. All 23 are fixed.** (P2 and F1 are
one cause seen twice: the featured flag undone by a form left open, and any field undone
the same way.) Every one was reproduced in the browser or against the API before it was
fixed (the one marked _code_ was found reading the code and confirmed in the browser
after the fix), and each is held by a unit, API or end-to-end test or by the final
browser pass (§4).

---

## 1. Scope

**Screens.** `/admin/properties` (filters, search, sort, paging, page size, the flag
toggles, the row menu, the bulk bar, the CSV export, the phone cards and the filter
popover) and the property form (all sixteen tabs, the status rail, the save menu, the
draft banner, Duplicate, Delete, the quick-create dialogs, the SEO tab). The public reads
they drive: `/`, `/properties?isFeatured=true`, `/properties/:slug` and its
`?preview=admin` view. The API behind them: `GET/POST /admin/properties`,
`GET/PUT/PATCH/DELETE /admin/properties/:id`, `…/bulk`, `…/duplicate`, `…/check-slug`,
`…/slug/:slug`, `GET /properties/featured`, `GET /properties/slug/:slug`.

**Workflows.**

- Create → view → edit → save → refresh → verify → delete → verify, through the form
  (every tab touched) and through the API, and the public page and the Featured row
  followed at each step.
- Featuring and unfeaturing from the star, the row menu, the bulk bar and the form's
  switch, published and unpublished, at every priority, and reading the home page after
  each.
- Publishing: the form's switch, "Save as inactive", "Save & preview", the list's eye
  toggle, the row menu and bulk Activate — on complete listings and on bare drafts.
- State and sequence: refresh at every step; Back and Forward across the list's filters
  and across Duplicate; first tab to last and straight back; direct URLs with values no
  control can show (`?page=99`, `?perPage=0`, `-5`, `100000`, `?sort=hacked`,
  `?isActive=1`, `?localityId=99999`, `?listingType=<script>`, `?q='"<>`); dialogs
  opened, cancelled and reopened; double clicks, rapid toggles down the page, Ctrl+S held.
- Concurrency: the same listing in two tabs; a listing starred in the list while its form
  is open; a listing deleted in another tab while the list or the form is open; the
  session revoked while the form holds unsaved work; explicit sign-out with unsaved work.
- Failure: the list answering 500, the network refused mid-filter, a slow answer
  overtaken by a faster one, a flag `PATCH` answering 500, 404 and 422, a save answering
  401, 404 and 409.
- Edge input: 300-character titles, HTML and emoji and Devanagari titles, a title that
  slugifies onto an existing URL, negative, zero, huge and exponent prices, 25 bedrooms,
  duplicate and malformed image addresses, a gallery emptied of every image.
- Roles: admin and manager (full), sales (read-only list and form; the 403 screen on
  `/add`; the export).

**What held up.** Search (debounced, one history entry), every filter and its chip,
Reset (keeps sort and page size), sort on every column in both directions, paging, the
page-size menu, the weird URLs above (all degrade to a sane view), Back/Forward/refresh
restoring the view exactly, the race between a slow and a fast filter (the later answer
wins), the row menu (View/Preview in a new tab, Edit, Duplicate, Delete with its
confirm), bulk Deactivate/Feature/Verify/Delete and their confirms, the CSV (every
filtered row, BOM, labels), the phone cards and filter popover, sales being read-only
everywhere (radios included — the fieldset disables them), the form's validation, error
summary and focus, the publish refusal inside the form, the unsaved-changes guard, the
ten-second draft and its restore, Ctrl+S, Duplicate, Delete, the quick-create dialogs
(duplicate names refused, a double click creates one record), "Save & preview", the admin
preview (an anonymous visitor gets "Property not found"), listing-type and
price-on-request switches (they ask before clearing), and no page errors of the app's
own anywhere in the pass.

---

## 2. Defects found and fixed

Severity: **High** — wrong data published or kept, or silent data loss; **Medium** — a
real error with a work-around, or a misleading answer; **Low** — polish, wording, edge
cases. "Console / network" says what the browser showed; "Cause" is the root cause found;
"Fix" is what was changed.

### A. Featured

**P1 · High — A newly featured listing never reached the home page's Featured row.**

- **Where:** the public home page, "Featured properties" (`PropertyRow`,
  `GET /properties/featured`); the same row in a CMS page's "properties" block.
- **Steps:** Admin → Properties → press the star of "Aurelia Court – 3 BHK Duplex in
  Koramangala" (priority 5), or open it and switch **Featured** on and save → open `/`.
- **Expected:** the listing is in the Featured row.
- **Actual:** it is not, though it is featured (the star is lit, `isFeatured: true`, and
  it is under "View all"). The seed already features ten listings; the row showed the
  eight with the highest priority, so two seeded listings (#13, #3) had never been shown
  either, and every listing featured later with a priority below 7 could not appear.
  Unfeaturing one of the eight visible listings did work — which is why only "the ones
  already displayed" seemed to respond.
- **Console / network:** clean; `GET /properties/featured?perPage=8` → `meta.total: 11`,
  eight rows.
- **Cause:** the featured row used the home page's row size (D23: eight), which suits the
  "new launches"/"ready to move"/"rentals" rows (samples of a larger search) but not an
  editorial list whose every member an editor chose.
- **Fix:** the featured row asks for every featured listing up to the §8.6 page cap
  (`FEATURED_PER_PAGE = 24`), still in `relevance` order (priority, then the latest edit).
  The rail's hint now says so: "Shown in the home page's Featured row, highest priority
  first." A CMS "properties" block of hand-picked listings keeps its own size too (P5).

**P2 · High — A form left open silently un-featured a listing starred in the list.**

- **Where:** the property form's save (`PUT /admin/properties/:id`).
- **Steps:** open listing 7's form → in another tab, star it in the list (the star
  lights; the API says `isFeatured: true`) → back in the form, fix a typo and Save.
- **Expected:** the listing stays featured, or the editor is told the listing changed.
- **Actual:** "Property saved." — and the listing is no longer featured. The same happens
  to anything changed elsewhere: of two editors (or two tabs), the later save silently
  undoes the earlier one (seen: a title change lost).
- **Console / network:** clean; two `PUT … → 200`.
- **Cause:** a `PUT` replaces the whole record with the form's copy, and the form's copy
  of `isFeatured` was the one it had read. Nothing compared versions.
- **Fix:** the form sends the `updatedAt` it read with every replace; the API refuses a
  replace made from an older version with **409** and
  `data: { conflict: 'stale', current: { updatedAt, updatedBy } }`, writing nothing. The
  form answers with a dialog (`ConflictDialog`): _"Admin User saved it 2 seconds ago,
  after you opened it"_ — **Load their version** (the listing as it now stands; this
  editor's own edits are kept as a draft, replayed on top of theirs by `rebase.js`, so
  restoring it does not undo their save), **Save mine anyway** (a replace over the
  version the refusal named), or **Keep editing**. A draft records the version it was
  made from, so a draft restored after somebody else's save is caught the same way. A
  body without `updatedAt` replaces as before (backward compatible).

**P3 · Medium — Featuring an unpublished listing said "is now featured", and nothing
showed.**

- **Where:** the list's star and row menu; the form's Featured switch.
- **Steps:** star a listing that is not published (e.g. a new listing saved as
  inactive).
- **Expected:** a word that the site shows it once it is published.
- **Actual:** "“…” is now featured", and the home page never shows it — the Featured row
  reads published listings only.
- **Cause / fix:** the toast and the rail hint did not know about publication. Now: "…
  is now featured. It is not published, so the home page shows it once it is." and the
  rail reads "Featured, but not published: the home page's Featured row shows it once it
  is."

**P4 · Medium — The Featured row's dots broke on a phone once it could hold more than
eight cards.**

- **Where:** `Carousel` (every rail on the public site).
- **Steps:** at 390 px, open `/` with eleven featured listings → scroll the rail to the
  end.
- **Expected:** a readable position marker; the last one lit at the end.
- **Actual:** eleven 44 px dot targets squeezed into 358 px (≈ 32 px each; at 24 cards
  they would be ≈ 15 px, the active dot wider than its own button), and the last dot
  never lit: pages were counted as one card each while a phone shows 1.15 cards a page.
- **Cause / fix:** page count from `ceil(items / floor(perView))` → from the rail's own
  scroll extent once measured; past `MAX_DOTS` (8 on a phone, 12 wider) the dots give way
  to a "3 / 10" counter.

**P5 · Low — A CMS "properties" block of hand-picked listings showed eight of them.**

- **Where:** `PropertiesBlock` → `PropertyRow`. **Steps:** pick ten listings in the block.
  **Actual:** eight shown — the row's own `perPage: 8` overrode the block's.
  **Fix:** a caller's `perPage` is kept, capped at 24.

**P6 · Low — `GET /properties/featured` ignored the filters it declares.**

- **Where:** the mock route (the registry and the contract list the §5.7 filters for it).
  **Steps:** `GET /properties/featured?listingType=rent`. **Actual:** every featured
  listing, sales included. **Fix:** the route applies `applyPropertyFilters` to the
  featured stock.

### B. All properties (the list)

**L1 · High — A flag toggle re-sorted the list, and the next click hit another listing.**

- **Where:** the Active / Featured / Verified toggles and the row menu.
- **Steps:** on the default view (sorted by Updated), press the Verified toggle of the
  fifth row.
- **Expected:** the row stays; the toggle flips.
- **Actual:** the list is fetched again and re-sorted: the row jumps to the top, and the
  toggle now under the pointer is another listing's ("Verified — Vasanth House…"). A
  quick second click — to undo, or on the next row — changes the wrong listing.
- **Cause:** every successful toggle refetched the page, and a toggle is an update, so
  under "Updated" the edited row moved to first place.
- **Fix:** the server's answer is applied to the row in place (the flag, `updatedAt`,
  `publishedAt`); the page is asked again only when the view is narrowed by that very flag
  (a "Featured" filter), where the row genuinely leaves.

**L2 · High — The list published listings the form refuses to publish.**

- **Where:** the eye toggle, the row menu's Activate, bulk Activate; the API behind them.
- **Steps:** Add property → title, type, locality → "Save as inactive" → in the list,
  press its eye toggle.
- **Expected:** the same refusal the form gives ("This listing is not ready to publish").
- **Actual:** it goes live with no photograph, no description, no summary and no price;
  its public page answers 200, and — featured — it is an empty card in the home page's
  Featured row.
- **Console / network:** clean; `PATCH /admin/properties/41 {"isActive":true} → 200`.
- **Cause:** the four publish rules lived in the form alone; the list's writes never go
  through the form and the API did not ask (the article module had the same gap, fixed in
  QA-55).
- **Fix:** the rules and their sentences move to `src/config/propertyRules.js`, read by
  the form and the mock. The API refuses (422, keyed by field, `data.notReady` naming
  what each listing lacks) a create or replace that leaves a listing live, a `PATCH` that
  publishes or sends what the rules read, and a bulk Activate (all or nothing). The list
  asks the rules before it calls: `ActivationCheckDialog` names each listing that is not
  ready, what it lacks and a link to it, and offers to activate the ones that are.

**L3 · High — After a failed request, "Select all" ticked twenty invisible rows of the
previous filter.**

- **Where:** `DataTable` (every admin table), the list's header and footer.
- **Steps:** load the list → choose Listing = Rent while the API is unreachable → "Select
  all rows on this page".
- **Expected:** nothing to select; no counts from an answer that was not given.
- **Actual:** "20 selected", with bulk Delete offered — on the previous filter's rows,
  kept in memory behind the error panel. The header said "Properties 40", the button
  "Export CSV (40)", the footer "Showing 1–20 of 40" with a pager, all under "Something
  went wrong".
- **Console / network:** `GET /admin/properties?…listingType=rent` → `ERR_CONNECTION_REFUSED`.
- **Cause:** `keepPreviousData` keeps the last rows and `meta` through an error; the table
  derived its selectable ids and its footer from them.
- **Fix:** a table in error (or first loading) offers no rows to select (the selection is
  cleared, select-all disabled) and no footer; the list shows no count while in error.

**L4 · Low — Export CSV was offered with nothing to export.** "Export CSV (0)" downloaded
a file of headings and said "0 properties exported." → disabled at zero.

**L5 · Low — Every flag save logged a React warning, and the toggle lost keyboard focus.**
`MUI: You are providing a disabled button child to the Tooltip component` (×3 per click).
A busy toggle was `disabled`, which fires no events and drops focus → it is
`aria-disabled` and ignores clicks while its write is in flight.

**L6 · Low — Deleting the last rows of a page left "Page 2 of 1 — no rows on this page".**
The list now steps back a page when a delete (single or bulk) empties it, as the articles
list does.

**L7 · Low — A toggle on a listing deleted elsewhere said "Not found".** It now says
"“…” is no longer here — it was deleted elsewhere. The list has been refreshed." and the
row goes.

**L8 · Low — The delete confirmation faded out without its sentence.** The dialog keeps
its text through the exit transition (`useLingering`, the QA-54 pattern).

### C. Add/Edit property (the form)

**F1 · High — Two editors, or one editor in two tabs, overwrote each other silently.**
The general form of P2 (the version check and `ConflictDialog` are its fix). Seen: tab A
retitles listing 4 and saves; tab B, opened earlier, changes the project name and saves →
A's title is gone, and both tabs said "Property saved."

**F2 · High — When the session ended with unsaved work, the editor was stranded on a
blank page.**

- **Where:** the form, the unsaved-changes guard, the sign-out.
- **Steps:** edit a field → the session ends (token expired or revoked; here
  `POST /auth/logout` from elsewhere) → press Save.
- **Expected:** the sign-in page, and the work back after signing in.
- **Actual:** a blank grey page behind "Discard unsaved changes?", two toasts ("Your
  session has expired…" and the API's raw "Unauthenticated."). "Stay on this page" left
  the editor on the blank page with no way out; "Discard" threw the work away — no draft
  had been written unless the ten-second autosave had happened to run. Signing out on
  purpose with unsaved work did the same: the question came after the session had
  already ended.
- **Console / network:** `PUT /admin/properties/11 → 401`.
- **Cause:** the guard blocked the navigation to the sign-in page like any other, after
  the session had been cleared; nothing wrote the draft on the way out.
- **Fix:** the guard lets a trip to the sign-in page through when it carries `from`
  (the session's end and `ProtectedRoute` both send it); the form writes its draft when
  it goes away dirty (unmount, `pagehide`) unless the editor chose Discard, and on a 401
  it keeps the draft and leaves the message to the sign-in page. Sign out now asks
  _before_ ending the session (`confirmDiscard`), so "Stay" keeps both. After signing in
  again the listing offers the draft back (verified).

**F3 · Medium — Saving a listing deleted elsewhere left the form stuck on "Not found".**
The form stayed, every further save failed the same way, and the work could only be
copied out by hand. Now: "This listing no longer exists — It was deleted elsewhere while
this page was open…" with **Save as a new listing** (a create from the work on screen;
its old address when free, a derived one when taken) and **Back to properties**.

**F4 · Medium — "Discard changes" did not discard the draft.** Edit → wait for the
autosave → leave → Discard → reopen: "Unsaved changes were found in this browser —
Restore the draft". The form now hands the guard its `onDiscard` (QA-55's mechanism for
articles), which forgets the draft.

**F5 · Medium — The description's counter read "0 words · 0 characters · 0 min read"
under a loaded description.**

- **Where:** `RichTextEditor` (the property description, and every article, page and FAQ
  body). Confirmed in development and in the production build.
- **Steps:** open listing 1 → Basics → the counter under the description.
- **Actual:** zeros under 1 022 characters, while the rail warned "171 words" and the hint
  below said "Long enough to publish"; right after the first keystroke it read 172 words.
- **Cause:** Tiptap replaces its first editor instance when the mount effect runs later
  than its 1 ms destroy timer (a sixteen-tab form always does); `useEditorState` kept
  its snapshot of the discarded, empty instance until a transaction, and the replacement
  is created already holding the description, so no transaction came.
- **Fix:** the counter's selector reads the editor `useEditor` holds now, not the
  snapshot's. A regression test re-creates the editor with a new value; it fails without
  the fix.

**F6 · Low — The gallery's "Add an image" box made broken rows.** Typing `not a url` and
pressing Add created **three** rows ("not", "a", "url") — the box split on spaces; an
address already in the gallery did nothing at all, with no word; a pasted list's
malformed lines became broken rows. Now the box accepts addresses only and says why
not ("Enter the address of a photograph…", "That photograph is already in the gallery."),
and the list adds its addresses and keeps the lines that are not one, to fix.

**F7 · Low — "The bedrooms is at most 20."** The numeric messages read "The number of
bedrooms can be at most 20." / "…cannot be negative." (rooms, units, floor plans).

**F8 · Low — A sales user's SEO tab made a refused request every time it opened.**
`GET /admin/seo/overview?perPage=all → 403` and a console error on each visit (a refusal
is never cached). The panel no longer asks when the role may not read it.

**F9 · Low _(code)_ — A reload lost whatever the last autosave had not caught.** The draft
was written every ten seconds; the tab's own unload never wrote it. `pagehide` now does:
an edit made a second and a half before a reload is offered back after it (browser).

---

## 3. Notes on the fixes

**The publish rules on the API.** They are asked of a write that leaves the listing live;
a `PATCH` that touches none of `isActive`, `listingType`, `images`, `description`,
`shortDescription`, `pricing` is not asked, so a featured star or a priority on an
already-live listing never meets them. All forty seed listings pass them.

**The version check** is optional on the wire: a `PUT` without `updatedAt` replaces as
before, which keeps any other client working and is what "Save mine anyway" sends. The
slug's 409 is told apart by `errors.slug`, this one by `data.conflict`. `PATCH` (the
list's toggles, the bulk bar) is not checked: it writes only the keys it sends.

**Rows stay put after a toggle.** A list narrowed by the flag being toggled still
refreshes, because the row genuinely leaves it; any other change of view (filter, sort,
page) reads the server's order again.

**Contract.** `docs/API_CONTRACT.md` (Property writes, below the admin table) and
`docs/backend-notes/05_business_rules.md` ("Property writes", with the Laravel sketch);
`backend_developer_guidelines/` regenerated from a freshly seeded mock.

---

## 4. Verified

| Pass                                                                                                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser (Playwright, dev server)                                                                                                       | every fix above re-run as a scenario: the Featured row (11 cards, the new listing on it), the carousel at 390/700/1 000/1 440 px, rows in place after a toggle, the activation dialog (single and bulk), the error state, export at zero, the conflict dialog (Load theirs → restore → both edits saved; Save mine anyway; the next save clean), the gone panel and Save as new, the session's end (sign-in, one toast, the draft back after signing in), sign-out asking first, Discard forgetting the draft, the gallery box, the sales SEO tab (no request) — console clean |
| Browser (production build, `build:ci`)                                                                                                 | the editor counter on load: listing 1 reads 171 words / 1 022 characters, article 9 reads 870 words (a build without the fix read 0 on both)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Full CRUD pass (browser)                                                                                                               | create through the form (Basics, Location, Pricing, Area & configuration, Media, Highlights, FAQs; published and featured from the rail) → public page 200 and on the home page's Featured row → refresh → edit the price → Ctrl+S → refresh → the new price → delete → admin and public 404 — console clean                                                                                                                                                                                                                                                                   |
| Jest                                                                                                                                   | 204 suites, 4 082 tests ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `test:mock`                                                                                                                            | 324 / 324 ✓ (new: featured filters and order, the publish rules on every write, bulk activate all-or-nothing, the stale replace)                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Playwright e2e (`e2e/`)                                                                                                                | 65 / 65 ✓ — new: `property-featured.spec.js` (a listing starred in the list reaches the Featured row, and fails with the old row of eight; the list refuses to publish a bare draft and names what it lacks; a form left open asks before undoing a star)                                                                                                                                                                                                                                                                                                                      |
| `npm run smoke` (every registered endpoint against the mock)                                                                           | 301 / 301 ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `build:ci`, `lint`, `format:check`, `check:traces`, `validate:seed`, `check:contrast`, `check:env`, `check:guidelines`, `test:scripts` | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

## 5. Not changed, and why

- **"Views / Enquiries" sorts by views.** The header names both numbers; sorting by a
  pair has no single answer. Left as is.
- **Filter placeholders mix "All …" (listing, segment, type, locality, developer) and
  "Any …" (status, availability, flags, score).** Cosmetic; left for a copy pass.
- **A title's `<`, `>` and `&` become "less", "greater" and "and" in the generated URL**
  (the `slugify` character map). The URL is editable and the rule is the library's.
- **At 1 024–1 280 px the table scrolls sideways** under its sticky actions column — the
  QA-51 design (A2).
- **"₹88.5 L – ₹1.42 Cr onwards"** — a range with "onwards" is the shared rule of
  `utils/priceDisplay` (QA-51 C16), not a defect of this screen.

## 6. Could not be fully tested

- **Uploads to Cloudinary** and the **Maps pin with a key**: this environment has neither
  a Cloudinary configuration nor a Maps key, so the upload queue and the draggable pin
  were not exercised (the keyless map embed did not load here either — external).
- **The Laravel API.** Everything ran against the mock; the new rules (the publish rules
  on the API, the stale-replace 409, the featured filters) are specified for it in the
  business rules, with a sketch.
- **Other browsers and touch.** Chromium only; drag-reordering by touch was not tried.
- **Scale.** Forty listings. The list is server-paged, so scale is the API's concern;
  the Featured row now carries up to 24 full records (about 320 KB of JSON at 24, about
  42 KB gzipped, measured on the seed), fetched only when the row nears the viewport.

## 7. Risks to watch

- **The Laravel backend must implement the publish rules and the version check** before
  the switch-over, or the list can again publish half-written listings and two editors
  can again overwrite each other. The frontend degrades safely without them (no 409 ever
  arrives; the list's pre-check still stops the common case).
- **Existing live listings that break the rules** (none in the seed): a replace or a
  `PATCH` of what the rules read is refused until they are completed; a star, a priority
  or an unpublish still goes through.
- **The featured row grows with the editors' choices.** Up to 24 cards; past that, the
  lowest priorities are only under "View all". The rail's hint says the order.
- **The `RichTextEditor` fix is shared** by articles, pages and FAQs; their tests pass,
  and the counter was checked on the article form too, in development and in the
  production build.
