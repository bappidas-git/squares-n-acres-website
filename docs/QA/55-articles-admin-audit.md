# 55 — Articles admin audit (the list, the form, the taxonomy screens and the articles API)

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json` (12
articles, 4 categories, 15 tags, 3 authors), reset with `MOCK_FRESH=1` before
every verification pass.

Everything under **Articles** in the admin sidebar — All articles, Add article,
Categories, Tags and Authors — and the articles API behind them, exercised as
admin, manager and sales at 1 920, 1 536 (a 1 920 screen at 125 %, where the
report that started this audit was taken), 1 440, 1 366, 1 280, 1 024, 768 and
390 px. Every control was driven — filters, sort, paging, the bulk bar, every
row action, every form field, every dialog, the draft, the leave guard, preview,
the SEO tab — in the expected order and out of it: refresh at each step, Back
and Forward, a direct URL, a modal opened and closed repeatedly, keys held down,
a request delayed, aborted or refused, and the same write sent twice. Console
errors, page errors and failed requests were recorded throughout.

**49 defects were found in the existing code — 15 on the list, 23 on the
form, 5 on the taxonomy screens and 6 in the API — 48 in the audit itself and
one more (B23) while re-verifying; all 49 are fixed.** Re-verification also
caught three problems in or around the fixes themselves (§2 R): two that the
fixes introduced and that never left this branch, and one pre-existing,
timing-dependent warning that a fix made constant. All three are fixed, and the
final browser pass is 59 / 59.

Four API fixes change the contract the Laravel backend is built to, so the notes,
the contract and the handover package change with them (§5): the publish rules
are enforced by the API, a bulk publish is all-or-nothing, an article's
references must exist and its body may not carry script, and a write that
changes nothing writes nothing.

---

## 1. Scope

**Sections.** `/admin/articles` (list, filters, sort, paging, bulk bar, row
menu, phone cards), `/admin/articles/add` and `/admin/articles/edit/:id`
(Content and SEO tabs, the rail's Status, Classification, Image, Related and
Content-checks cards, the FAQ repeater, the draft banner, the leave guard,
preview, the quick-create category dialog), `/admin/articles/categories`,
`/tags`, `/authors` (table, drag list, dialogs, delete guard), and
`/admin/articles*` + `/articles*` on the API.

**Workflows.** Create → view → edit → save → refresh → verify → delete →
verify, by the form and by the API; every save mode (Save, Save as draft,
Publish now, Schedule); bulk publish / unpublish / archive / feature /
unfeature / delete; duplicate; preview from the list and the form; the
ten-second draft and its restore and discard; leaving with and without
changes; the category quick-create; tag create-as-you-type; the related
pickers; taxonomy CRUD with its delete guard and reorder; each role's reach.

---

## 2. Defects found and fixed

Severity: **Critical** (data loss or a screen that stops working), **High**
(wrong data published or kept, or a core action that misleads), **Medium**
(a real error with a work-around), **Low** (polish, wording, edge cases).
Every item was reproduced in the browser or against the API before it was
fixed. Every fix is held by a unit or API test, or — for layout and for what
only a browser shows (A1, A2, A7, A14, B12, B15, B20, B22) — by a measured
browser check (§4, §6).

### A. The list (`/admin/articles`)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                           | Cause → fix                                                                                                                                                                                                                                                 |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | High | Open the list at 1 536 px → 113 px of the table hidden behind the pinned actions (209 at 1 440, 283 at 1 366, 369 at 1 280); Updated — the default sort — sat under them, so no sort arrow showed. | Ten columns on the narrow canvas → the wide canvas (`AdminLayout` `WIDE_PATHS`) and compact density; the author folds under the category, and below 1 536 / 1 200 px the SEO score and the date fold under the status. **0 px hidden from 1 024 to 1 920.** |
| A2  | Low  | At 1 440–1 536 px the Featured filter wrapped onto a row of its own.                                                                                                                               | Natural select widths → each filter given a width; one row at 1 440+.                                                                                                                                                                                       |
| A3  | Med  | A screen reader read every row checkbox as "Select row 12".                                                                                                                                        | No `rowLabel` → "Select Karnataka RERA: A Complete Guide…".                                                                                                                                                                                                 |
| A4  | Med  | Feature or Unfeature from the row menu or the bulk bar left no trace in the table on a laptop.                                                                                                     | Nothing showed `isFeatured` → a star (`role="img"`, "Featured") beside the headline.                                                                                                                                                                        |
| A5  | Med  | Sort by Published, newest first → the drafts (no date) came first.                                                                                                                                 | The mock turned the whole comparison round for `desc`, nulls included → nulls last in both directions, for every list (D5 below).                                                                                                                           |
| A6  | Low  | `?isFeatured=maybe` → a "Featured: Not featured" chip over an unfiltered list.                                                                                                                     | The param was read as a string → read as a boolean; an unreadable value is no filter.                                                                                                                                                                       |
| A7  | Low  | Changing a filter, the sort or the page gave no sign that rows were loading.                                                                                                                       | `refreshing` not passed → the table dims (`aria-busy`).                                                                                                                                                                                                     |
| A8  | High | Tick a scheduled article → Publish → the list said "Published" and the public page was a 404 until the scheduled date.                                                                             | The bulk action kept the future `publishedAt` → a scheduled article bulk-published goes live now (and D3 refuses "published" with a future date).                                                                                                           |
| A9  | High | Tick a four-word draft with no image and no excerpt → Publish → it went live.                                                                                                                      | The publish rules lived in the form only → the list checks first and names what each article lacks ("no excerpt · no featured image · 4 of 300 words"), offering to publish the ready ones; the API refuses the batch (D4).                                 |
| A10 | Low  | A scheduled row's Published column showed its future date as if it had gone live.                                                                                                                  | → "Due 31 Oct 2026".                                                                                                                                                                                                                                        |
| A11 | High | Row menu → Preview → the preview opened in a new tab **and** the list's own tab went to the public page.                                                                                           | `window.open(…, 'noopener')` answers `null` by specification, read as "blocked" → `utils/openInNewTab` opens without the feature and cuts the opener; only a real block navigates.                                                                          |
| A12 | Low  | Under `?isFeatured=true`, Unfeature → the row stayed in the Featured list.                                                                                                                         | No re-read after the patch → re-read.                                                                                                                                                                                                                       |
| A13 | Low  | Delete the only row of the last page → "Nothing on this page".                                                                                                                                     | → steps back a page (single and bulk delete).                                                                                                                                                                                                               |
| A14 | Med  | Tick a row far down the list → the bulk bar was off-screen above.                                                                                                                                  | → the bar sticks to the top of the table.                                                                                                                                                                                                                   |
| A15 | Low  | `?categoryId=999` → chip "Category: 999"; `?tagId=2,4` → "Tag: 2,4".                                                                                                                               | Unknown ids printed raw → "Unknown category", "Tag: Khata, Home Loan".                                                                                                                                                                                      |

### B. The form (`/admin/articles/add`, `/admin/articles/edit/:id`)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                   | Cause → fix                                                                                                                                                                                                                       |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | High | Open any article, touch nothing, click All articles → "Discard unsaved changes?"; ten seconds later a draft was autosaved, and the next visit offered to restore it.                       | `setEditable()` emitted an `update`, and the editor's HTML of a stored body differs from the stored string (newlines) → `setEditable(…, false)`; the editor hands back the stored string until something is actually edited.      |
| B2  | High | Preview on the form → the editor's own tab went to the public page (and a new article lost its move to its edit URL).                                                                      | As A11 → `openInNewTab`; a new article keeps its redirect and is told where the preview is when the tab is blocked.                                                                                                               |
| B3  | High | Publish now on an article that is not ready → refused, but the status radio stayed on Published, "Publish now" disappeared and the rail said "Live now"; the next plain Save published it. | The status was switched before validation and never put back → a refused status-changing save restores the status.                                                                                                                |
| B4  | Med  | Save an empty new article → "The title field is required.", "The categoryId field is required.", "The authorId field is required."                                                         | The schema's key-named sentences → `useForm` `labels`: "The headline…", "The category…", "The author field is required."; the API's 422s read the same way.                                                                       |
| B5  | Med  | A 422 on `seo.slug` stayed under a URL that had since been fixed, hiding "This URL is available".                                                                                          | Only `slug` was cleared on typing → typing in the URL clears both.                                                                                                                                                                |
| B6  | Med  | Tags: type "khata" + Enter → nothing; Enter on a highlighted, already chosen tag removed it; a tag chosen while a new one was being created vanished when it arrived.                      | No auto-highlight, chosen options still listed, the create wrote the value it started with → Enter takes the exact match (or "Add …"), chosen tags are not offered, a create joins the value as it then is, one create at a time. |
| B7  | Med  | Two FAQ rows, the first empty → Save → remove the first → its "Write the question…" moved onto the filled row.                                                                             | Errors keyed by index → moved with their rows on remove and reorder, cleared as a row is corrected.                                                                                                                               |
| B8  | Med  | Save with nothing changed → the record was rewritten (it jumped to the top of the list, its sitemap `lastmod` moved); a Save on a live article said "Article published."                   | → "No changes to save." and nothing sent (the API writes nothing either, D6); the toast says what happened: "Changes saved. The article is live."                                                                                 |
| B9  | Med  | Edit, wait for the autosave, leave → Discard changes → the discarded edits were offered back next visit.                                                                                   | The guard knew nothing of the draft → `onDiscard` in the navigation guard; the form forgets its local copy.                                                                                                                       |
| B10 | Med  | With the category list failing (`GET /admin/article-categories` aborted) → the category select read "Select a category", silently.                                                         | → a warning with "Try again", and the article's own category shown from the record.                                                                                                                                               |
| B11 | Med  | A category switched off was offered to every new article like the live ones (authors were already filtered).                                                                               | → only active ones are offered; an article that has an inactive one keeps it, marked "(inactive)".                                                                                                                                |
| B12 | Low  | An empty headline's counter said "…is empty — the site template is used instead." (the SEO title's sentence).                                                                              | → "A headline is required before anything can be saved."                                                                                                                                                                          |
| B13 | Low  | Add a category → type "legal & rera" → "The slug has already been taken."                                                                                                                  | → "“Legal & RERA” is already a category." with "Select “Legal & RERA”" — from the loaded list, or after the API's 409.                                                                                                            |
| B14 | Low  | Schedule for a past date → toast "This article is not ready to go live. What is missing is listed under Content checks." (it is not listed there).                                         | → "Please fix the highlighted fields."; the "not ready" toast only for the publish rules.                                                                                                                                         |
| B15 | Low  | Straight after an autosave the rail said "Draft saved … — with changes since".                                                                                                             | It compared with the server, not the draft → compares with what the autosave wrote.                                                                                                                                               |
| B16 | Low  | Type "Ümlaut" into the URL → the "Ü" vanished (the title's slug spells it "umlaut").                                                                                                       | → typing transliterates as the title's slug does: `umlaut-creme`.                                                                                                                                                                 |
| B17 | Low  | Preview a draft → the public page logged `404 GET /articles/:id/adjacent`.                                                                                                                 | Neighbours asked for a piece that is not live → only for a published one.                                                                                                                                                         |
| B18 | Low  | The related-articles picker offered drafts and archived pieces; the public page then dropped them silently.                                                                                | → asks for `status=published,scheduled`.                                                                                                                                                                                          |
| B19 | Low  | Ctrl+S inside the Add-a-category dialog saved the article behind it.                                                                                                                       | → ignored while a dialog has the focus.                                                                                                                                                                                           |
| B20 | Low  | Below 1 200 px the rail's cards stretched to the tallest in their row ("Search engines" two-thirds empty).                                                                                 | → `align-items: start`.                                                                                                                                                                                                           |
| B21 | Low  | "Generate from content" silently replaced an excerpt somebody had written.                                                                                                                 | → asks first ("Replace the excerpt?").                                                                                                                                                                                            |
| B22 | Low  | On a phone the breadcrumb centred a long title and cut it at both ends ("ving in Whitefield … Rente"), in the admin and on the public article.                                             | A centred flex line cannot take an ellipsis → the current crumb is a block that ends in "…".                                                                                                                                      |
| B23 | Med  | Type in the headline as an existing article appears → the URL could follow the headline, changing a live article's address.                                                                | `SlugField` mounted "following the title" over an empty form and unlocked a render late; a keystroke in between was drawn with the stale lock → the lock is read through a ref that changes the moment it does.                   |

### C. Categories, tags and authors

| Id  | Sev | Steps → what happened (what should have)                                                                                     | Cause → fix                                                                                              |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| C1  | Med | A category showing "0" articles refused to be deleted — "used by 1 article".                                                 | The column counts published articles; the guard counts every one → the column says "Published articles". |
| C2  | Med | Under the real SEO panel of the category and author dialogs: "The SEO panel for article categories arrives in a later step." | A placeholder never removed → removed.                                                                   |
| C3  | Low | The category drag list showed bare names, unlike every other orderable screen.                                               | → "3 published · inactive" under each name.                                                              |
| C4  | Low | The category description took more than 500 characters and failed only on save.                                              | → `maxLength` on the box, and on every name field, at the API's limits.                                  |
| C5  | Low | An author's LinkedIn "not a link" → "The socialLinks.linkedin must be a valid URL."                                          | → "The LinkedIn address must be a valid URL." (`MasterDataPage` labels messages from its form fields).   |

### D. The API (`mock-server/`, and the contract it stands for)

| Id  | Sev  | Steps → what happened (what should have)                                                                  | Cause → fix                                                                                                                                         |
| --- | ---- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | High | `POST /admin/articles` with `categoryId: 999`, `tagIds: [999]`, or an article related to itself → 201.    | No reference checks (the handover already said `exists:…`) → 422 "The selected categoryId is invalid.", per index for lists; self-relation refused. |
| D2  | Med  | A body with `<script>`, `onerror=` or a `javascript:` link (entity-encoded too) was stored as sent.       | → 422 on `content` / `faqs.n.answer` (`lib/html.unsafeMarkup`, attribute-aware, decodes entities first).                                            |
| D3  | High | `PATCH { status: 'published', publishedAt: <next month> }` → 200, and the public page 404'd until then.   | → 422 on `publishedAt`: "…schedule it instead."                                                                                                     |
| D4  | High | `PATCH { status: 'published' }` or bulk `publish` on an article with no excerpt, no image, 4 words → 200. | → the publish rules on every write that can put an article live; the bulk action is all-or-nothing with `data.notReady[]`.                          |
| D5  | Low  | Bulk `feature` on three articles, two already featured → `affected: 3`, and all three moved `updatedAt`.  | → `affected: 1`; untouched records keep `updatedAt` (as the business rules already said). Nulls sort last both ways (A5).                           |
| D6  | Med  | `PUT` the same body twice → `updatedAt` moved again.                                                      | → a write that changes nothing writes nothing and answers the stored record (every resource, `crud.js`).                                            |

### R. Found in re-verification — problems the fixes themselves caused or exposed

| Id  | Sev                      | What happened                                                                                                                                                                                                                                                                                                                           | Fix                                                                                                                                                         |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Critical (never shipped) | After the B1 fix, every existing article's edit page crashed to "Something went wrong" in the dev build: `TypeError: Cannot read properties of null (reading 'cached')`. Tiptap destroys an editor its component has not committed within 1 ms; the new sync effect serialised that destroyed instance.                                 | `isLive(editor)` guards every read; a lifecycle test destroys the first instance on purpose.                                                                |
| R2  | High (never shipped)     | After the B6 fix, typing in the Tags box emptied it on every keystroke in a real browser (Jest's `userEvent` v13 hid it). MUI's Autocomplete clears its input whenever `value` changes identity, and the selection was rebuilt every render. Latent before too: any render of the form mid-typing (the ten-second draft) wiped the box. | The selected array keeps its identity while it is the same selection; tests type through `fireEvent` (act-wrapped).                                         |
| R3  | Low (dev-only)           | Reaching an article by Back/Forward logged "flushSync was called from inside a lifecycle method": the editor mounts empty (its chunk is cached), the record arrives, and `setContent` in an effect makes Tiptap draw React node views with `flushSync`. Timing-dependent before; the B1 fix made it happen every time.                  | An incoming value the editor already holds (compared as ProseMirror documents) is not reloaded; a changed one loads in a microtask, outside React's commit. |

---

## 3. Notes on four of the fixes

**One set of publish rules.** `src/config/articleRules.js` is CommonJS (D36b), so
the form, the list's bulk check and the mock all read the same three rules and
the same sentences — "An article needs at least 300 words to go live — this one
has 212." reads the same from any side. The list checks the rows it already
holds before it calls, so an editor sees which article lacks what, and can
publish the ready ones; the API's 422 is the backstop for any other client.

**A form that is clean when it is clean.** B1 was the editor, not the form: the
stored body keeps newlines between its blocks that the editor never writes, so
reading an untouched document back was "a change". The editor now remembers
the string it was given and what that string became, and hands the original
back until the document is actually different — so an edit typed and undone is
clean again too. That fix is also where R1 and R3 came from: it made the editor
read itself at moments the old code never did, which is why every editor
lifecycle (a destroyed first instance, a cached chunk, Back/Forward, a restored
draft) was then re-tested in the browser.

**Writes that change nothing.** `crud.js` compares the record a `PUT`/`PATCH`
would store with the stored one, audit fields aside, and writes nothing when
they are equal — the article form's Save, a Ctrl+S out of habit, a bulk
"feature" of a featured article. It is generic on purpose: every resource now
behaves as Eloquent does for a model with no dirty attributes.

**What the tests could not see.** R2 passed Jest because `userEvent` v13 does
not route keystrokes through React's `act`, so the effect that emptied the box
ran after the assertions. The Autocomplete tests now type with `fireEvent`,
which does; the other `userEvent`-typed tests of MUI inputs in the repo would
be worth the same treatment (§7).

---

## 4. Verified in the browser after the fixes

Four Playwright suites against a freshly seeded mock, measured rather than
eyeballed — **59 / 59 checks**: the list (17: 0 px hidden at six widths, one
filter row, named checkboxes, the stars, nulls last both ways, the refusing
bulk publish naming "no excerpt · no featured image · 4 of 300 words" and
publishing the two ready ones, a scheduled piece live at once, one new tab and
the list unmoved, the step back after deleting a last page, the sticky bar);
the form (21: five untouched articles leave with no question, preview in a new
tab with no 404 behind it, a refused Publish now back on Draft, labelled
messages, `umlaut-creme`, the existing category offered, tags by Enter, the
autosave note, Discard forgetting the draft, "No changes to save." with
`updatedAt` unmoved, "Changes saved. The article is live.", inactive categories,
the taxonomy warning and its retry, the rail at 1 024, the phone breadcrumb, a
live URL kept); the taxonomy screens, the API rules, state and roles (21: the
six API rules, "Published articles" on all three screens, no placeholder, the
500 limit, "The LinkedIn address must be a valid URL.", filters surviving a
refresh, Back and Forward, a missing article, a draft restored after a refresh,
no sideways scroll at 390 and 768, cards on a phone, a manager's save, sales
refused with a 403 page, signed-out sent to sign in). The only console entry in
the final passes is the 404 of the deliberate missing-article check.

---

## 5. Contract changes

| Change                                                                                                                            | Where it is written                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Publish rules on the API (`POST`, `PUT`, a `PATCH` that touches them, bulk `publish`); bulk all-or-nothing with `data.notReady[]` | `docs/backend-notes/05_business_rules.md` → Article writes, Bulk actions; `docs/API_CONTRACT.md` (`Article`) |
| `published` with a future `publishedAt` is 422; a bulk-published scheduled article goes live now                                  | same                                                                                                         |
| `categoryId`, `authorId`, `tagIds[]`, `relatedArticleIds[]`, `relatedPropertyIds[]` must exist; no self-relation                  | same                                                                                                         |
| Script, inline handlers and `javascript:` links refused in `content` and `faqs[].answer`                                          | same                                                                                                         |
| A `PUT`/`PATCH` that changes nothing writes nothing; bulk skips records already in the target state                               | `05_business_rules.md` → Writes that change nothing; `API_CONTRACT.md` §5.8                                  |
| A missing value sorts last in both directions                                                                                     | `API_CONTRACT.md` §5.6                                                                                       |

`backend_developer_guidelines/` was regenerated from a freshly seeded mock, and
`docs/backend-notes/08_testing.md`'s acceptance checklist gained the article
rules. The decisions are `docs/DECISIONS.md` → QA-55.

---

## 6. Tests added

**Jest: 81 new tests in 15 files, 8 of them new.** The tests of a fixed
behaviour were run against the tree as it was before this audit and fail there
(checked file by file); the rest pin the behaviour around them.

| File                                                                                                   | Tests                    | What they hold                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ArticleFormPage`                                                                                      | 14 → 41                  | no-op save, the live toast, the status put back, labelled messages, `savedMessage`, FAQ errors that move, preview tab and block, Ctrl+S in a dialog, the excerpt question, drafts kept and forgotten, the URL error, the related filter, inactive and missing categories, the quick-create's existing category before and after a 409 |
| `ArticlesListPage`                                                                                     | 12 → 20                  | the star and the checkbox names, the refusing bulk publish and its partial publish, preview tab and block, the featured re-read, the step back, a confirmation that keeps its sentence while it fades                                                                                                                                 |
| `MultiSelect` (new)                                                                                    | 8                        | typing kept (act-wrapped) through its own and its parent's renders, Enter on the exact match and on "Add …", nothing on an empty Enter, chosen options not offered, the create race                                                                                                                                                   |
| `RichTextEditor` · its lifecycle test (new)                                                            | 8 → 13 · 1               | a stored body stays clean through a save, a focus and an undo; a record that arrives late; the newest of two values; a destroyed first instance                                                                                                                                                                                       |
| `slug` (new) · `articleRules` (new)                                                                    | 7 · 5                    | the typed slug's spelling and trailing hyphen; the rules, their keys, their phrases                                                                                                                                                                                                                                                   |
| `useForm` · `MasterDataPage`                                                                           | 21 → 25 · 17 → 19        | labels in schema and server messages, whole-word replacement; "the LinkedIn address"                                                                                                                                                                                                                                                  |
| `taxonomyConfigs` (new) · `useLingering` (new) · `openInNewTab` (new) · `NavigationGuardContext` (new) | 4 · 3 · 3 · 2            | the column label, no placeholder, the limits, the drag list; the kept dialog value; the tab and the block; discard runs the form's clean-up only on "Discard changes"                                                                                                                                                                 |
| `SlugField` · `FilterBar` · `ArticleDetail`                                                            | +1 · +1 · (+1 assertion) | the race; the search width; no neighbours asked for a preview                                                                                                                                                                                                                                                                         |

**`test:mock`: 191 → 199** — the publish rules by `POST`, `PUT`, `PATCH` and
bulk, the bulk refusal's `notReady`, future dates, references and self-relation,
script, handlers and `javascript:` links (entity-encoded too), no-op writes,
`affected`, and nulls last in both directions.

---

## 7. Not fully tested, and risks

- **Browsers.** Chromium only; Safari and Firefox were not run. Phones and
  tablets were emulated viewports, not devices; no screen reader was used
  beyond checking accessible names.
- **Failures.** Aborted, delayed and refused (409/422) requests were exercised;
  a 500 on save and a fully offline editor were not.
- **Two editors, one article.** `PUT` replaces the record and nothing checks
  `updatedAt`, so the second of two concurrent saves silently wins. That is the
  contract as designed (§5.8), not a regression — worth an optimistic-lock
  (`If-Unmodified-Since` or an `updatedAt` match) before several editors share
  the panel.
- **The media library** was used through the featured-image URL field; the
  upload path itself belongs to the media module and was not re-audited here.
- **Scale.** The seed holds 12 articles; paging and the bulk bar were exercised
  with throwaway drafts, not with thousands of rows.
- **Behaviour changes worth knowing.** The no-op write rule and nulls-last are
  generic (every resource and list); an external value now reaches the editor a
  microtask later. All suites pass, and no other screen showed a difference in
  the browser passes, but they are the changes with the widest reach.
- **Test tooling.** `userEvent` v13 hid R2; MUI inputs typed through it can pass
  in Jest and fail in a browser. Moving to v14 (or `fireEvent` for such inputs)
  is a worthwhile follow-up. The existing suites also print many "not wrapped
  in act(...)" warnings — pre-existing noise, unchanged in kind.
- **Observations, unchanged.** Tags typed in the article form are lower-cased
  (D522) while the seeded tags are Title Case and the Tags screen keeps what is
  typed; an article's SEO score is computed when its SEO tab is opened (by
  design — the SEO dashboard's "Re-analyse all" covers the rest).

---

## 8. Gate

Run on the final tree, the mock reset to the seed before the browser suites.

| Command                  | Result                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:all`      | **exit 0** — `lint` 0 problems and the registry check (0 findings in 801 files); Jest 178 suites, 3 734 tests; `test:mock` 199 / 199; `test:scripts` 53 pass, 1 skipped, 0 fail; `build:ci` compiled; `check:traces` 0 findings in 1 176 files; `validate:seed` valid; `check:contrast` 29 gated pairs; `check:guidelines` 12 / 12; `check:env` 8 / 8 |
| `npm run format:check`   | clean                                                                                                                                                                                                                                                                                                                                                 |
| `npm run smoke`          | **292 / 292** checks against a freshly seeded mock                                                                                                                                                                                                                                                                                                    |
| `npm run e2e` (Chromium) | **55 / 55** — the two article specs among them                                                                                                                                                                                                                                                                                                        |
