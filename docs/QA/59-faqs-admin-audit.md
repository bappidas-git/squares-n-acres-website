# 59 — FAQs admin audit (the drag list, the table, the dialog, the API and the pages it feeds)

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json`, reset with
`MOCK_FRESH=1` before every verification pass.

Everything under **Admin → FAQs** was exercised as admin, manager and sales at 1 920,
1 440, 1 280, 1 100, 1 024, 920, 768 and 390 px, and at 390 px with touch emulation. Every
control was driven: the drag list (handle, arrows, Alt + ↑/↓), "Table view", the column
sorts, search and the four filters, paging and the page size, the bulk bar, every row
action, the Home and Active switches, every field of the dialog (the rich-text answer and
the property-type picker included), the discard guard, delete and its in-use guard. Each
was tried in the expected order and out of it: refresh at each step, Back and Forward,
direct URLs (with values no control can show, a page past the end, a descending order),
dialogs opened and closed repeatedly, keys pressed in quick succession, double clicks,
requests failed (500), refused (409/422) or slowed, the screen left while a write was on
its way. Console errors, page errors and failed requests were recorded throughout. The
API was called directly as well, and the three places the FAQs are published —
`/insights/faqs`, the home page and property pages — were checked against what the admin
did.

The owner's screenshot shows the screen's first view, the drag list. It is where most of
the defects were: **a keyboard move sent the focus to the neighbour, so the second Alt+↓
undid the first; three quick moves moved three different FAQs; a moved row snapped back
until the API answered; a 21st FAQ was on no page of the list; and the list had no way to
edit or delete anything.** The rows themselves were misdrawn (the text at the top of a row
twice its height, the reported screenshot) and cut to twenty characters on a phone.

**39 defects were found: 11 in the drag list, 10 in the table, 8 in the dialog, 9 in the
API and 1 on the public site. All 39 are fixed.** Seven are High: the keyboard and rapid
reorders (A1, A2), the missing pager (A4), moves landing in the wrong place beside new
FAQs (A5), an answer with no words saved (C1), an answer that could carry a script (D1),
and the "Property type" field, which did nothing at all (E1).

Re-verification caught **three problems in the new work**, none of which left this branch
(§3). The final browser pass is **53 / 53**; the repository's gate (`npm run check:all`)
and the end-to-end suite (59 / 59, two of them new) pass.

---

## 1. Scope

**Sections.** `/admin/faqs`: the drag list (the default view), the table, search, the
Category / Home page / Property type / Status filters, sort, paging and page size, the bulk
bar, the row actions, the Home and Active switches, the dialog, delete and the in-use
guard. The API: `GET /faqs`, `/admin/faqs` (list, create, read, replace, patch, delete,
bulk). The public consumers: `/insights/faqs`, the home page's FAQ section, property pages
(and their `FAQPage` markup), the CMS `faq` block.

**Workflows.**

- Create → view → edit → save → refresh → verify → delete → verify, in the dialog and
  through the API.
- Reordering by drag, by the arrows, by Alt + ↑/↓; several moves in a row; moves under a
  filter, on page 2, beside FAQs sharing a number, in a descending list; a move while the
  API is slow, failing, or the screen is left.
- The switches under the filters they change; bulk activate, deactivate and delete,
  including a delete a page refuses.
- Tying a FAQ to a property type and opening a listing of that type.
- Each role's reach (admin and manager edit; sales gets the 403 screen and no menu entry).

---

## 2. Defects found and fixed

Severity: **Critical** (data loss or a screen that stops working), **High** (wrong data
published or kept, or a core action that misleads), **Medium** (a real error with a
work-around), **Low** (polish, wording, edge cases). Every item was reproduced in the
browser or against the API before it was fixed, and is held by a unit, API or end-to-end
test, or by a check of the final browser pass (§4).

### A. The drag list (`/admin/faqs`, the screen's first view)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                         | Cause → fix                                                                                                                                                                                                                                                                                  |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | High | Focus the first row, Alt+↓, Alt+↓ → the first press moved it, the second moved its neighbour back: the list ended where it started. (Two presses move one row two places.)                                                                       | The list kept its old order until the API answered, and the focus followed "position 2", where the neighbour still sat → the move shows at once, and `SortableList` finds the moved row by its id, not its index.                                                                            |
| A2  | High | Row 6, Alt+↓ three times quickly → FAQs 6, 7 and 8 were each moved once; row 6 did not move.                                                                                                                                                     | Three `PATCH`es computed from the same stale rows and sent together (and A1) → moves are queued and written one at a time, each naming the row it was dropped next to (`before` / `after`, D6–D8). The list is read once, when the queue is empty.                                           |
| A3  | Med  | Drag a row → it snapped back to its old place and jumped a moment later; on a slow connection the drag looked failed and invited a second one.                                                                                                   | No optimistic order → the new order shows at once (A1). A refused move puts the order back and drops the moves queued after it.                                                                                                                                                              |
| A4  | High | With 23 FAQs the heading said 23 and the drag list showed 20, with no pager: FAQs 21–23 were on no page of the screen the FAQs open on.                                                                                                          | The drag list replaced the whole table, its pager included → the table's own footer (`TableFooter`, now exported by `DataTable`) under the drag list: where the reader is, the pages, the page size.                                                                                         |
| A5  | High | Create three FAQs (each at `order` 0), then move the fourth row up one place → it jumped to the top, and two new FAQs nobody touched swapped places.                                                                                             | Every create stored 0, so "before the one holding 0" was before all of them, and the renumber broke the rest of the tie newest-first → FAQs settle `1..n` on every create and replace (D6), ties break by the touched record then the list's own order (D7), and a move names its neighbour. |
| A6  | Med  | `/admin/faqs?order=desc` (a bookmarked or shared address) → an upside-down drag list in which "Move up" did nothing visible.                                                                                                                     | The drag list ignored the direction, and "up" there is down in the collection → a descending list is a table, sorted as asked, with "Reorder" beside the filters.                                                                                                                            |
| A7  | Med  | The screen opens on the drag list, which had no Edit and no Delete: editing a FAQ meant finding "Back to the table" first. An inactive FAQ looked exactly like a live one.                                                                       | The rows drew a label only → each row carries the table's own Edit and Delete (a menu on a phone) and an "Inactive" chip.                                                                                                                                                                    |
| A8  | Med  | On a phone or a tablet, "Back to the table" → cards, and no way back to reordering: the cards have no "Order" header to press.                                                                                                                   | → a "Reorder" button beside the filters in the table view, on every width.                                                                                                                                                                                                                   |
| A9  | Low  | _Reported (the screenshot)._ The text sat at the top of each 66 px row with the handle lower down; at 390 px the question was cut to "How do I start a property sear…" under a line of its own; the view button wrapped to three and four lines. | CSS → the text is centred on the handle, the question wraps and its line of detail follows it, the button keeps one line; on a phone the question sits beside its menu (146 px rows, from 202 px).                                                                                           |
| A10 | Low  | From the keyboard: Enter on "Move … down" → the row moved and the focus was lost, so the next Enter did nothing.                                                                                                                                 | The button moved with its row and the browser dropped the focus → the pressed arrow keeps the focus in the row's new place; at the end of the list, where that arrow is disabled, the row takes it.                                                                                          |
| A11 | Low  | The hint explained the API ("the position is saved on the record that moved, so a filtered list reorders correctly too"), and the button read "Back to the table" on a screen that opens on the list.                                            | → plain instructions (drag, arrows, Alt + ↑/↓, what a filtered move does); the two views are "Table view" and "Reorder".                                                                                                                                                                     |

### B. The table (`/admin/faqs?sort=question`)

| Id  | Sev | Steps → what happened (what should have)                                                                                                                                                                                   | Cause → fix                                                                                                                                                                                                            |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Med | Status: Active → switch a FAQ off → it stayed in the "Active" list, unticked, and the count stayed at 20. The same under "Home page: On the home page".                                                                    | No re-read after a switch → the list is read again, and the new value stays on screen until the answer lands; a switch still saving keeps its value through a re-read another one caused.                              |
| B2  | Med | Tick three FAQs, one of them shown on a page → Delete → a toast, "Used by 1 page": which FAQ, which page?                                                                                                                  | The API named the first record only (D9) and the list toasted `errors.id` → the "Still in use" dialog lists each refused FAQ with links to what shows it; the selection stays, so the ones in the way can be unticked. |
| B3  | Low | Delete a FAQ a page shows → "This item is in use." — naming nothing.                                                                                                                                                       | → "“How much home loan am I eligible for?” is still used by:" over the list of pages.                                                                                                                                  |
| B4  | Low | `?page=99` → "No FAQs yet · Add your first FAQ", with twenty FAQs one page back.                                                                                                                                           | → "Nothing on this page · Go to first page" (QA-56's rule for pages, now in `MasterDataPage`).                                                                                                                         |
| B5  | Med | Delete the only rows of the last page → an empty page, then B4's message.                                                                                                                                                  | → the list steps back a page after a single or a bulk delete that empties the one on screen.                                                                                                                           |
| B6  | Low | `?category=bogus&showOnHome=maybe&isActive=perhaps` → chips "Category: bogus", "Home page: Not on the home page", "Status: Inactive" over selects reading "All categories", "Anywhere", "Any status", and "No faqs match". | The URL went to the chips and the API untouched → a value no option names, a sort that is not a column and an order that is not a direction are left out of the request and the chips (`sanitiseParams`).              |
| B7  | Low | "No faqs match"; "3 faqs will be deleted."; the bulk confirm said "One a page still points at is refused." — the API refuses the whole batch; a bulk action that changed nothing said "0 FAQs updated."                    | → `plural: 'FAQs'`; "If a page still shows any of them, none is deleted and you are told which."; "Nothing to change: the selected FAQs were already inactive."                                                        |
| B8  | Low | A screen reader heard the row checkboxes as "Select row 9".                                                                                                                                                                | `MasterDataPage` gave `DataTable` no `rowLabel` → "Select How much home loan am I eligible for?".                                                                                                                      |
| B9  | Low | A question over two lines of its answer touched the rules above and below it (0 px).                                                                                                                                       | The table's cells have no vertical padding → 8 px inside a table cell for the content screens' name cells (the phone cards keep their own).                                                                            |
| B10 | Low | Which FAQs a property type carries could be learned only by opening every FAQ; the API filters by type and the screen never asked.                                                                                         | → the type under the category chip and in the drag row, and a "Property type" filter.                                                                                                                                  |

### C. The dialog (Add FAQ / Edit FAQ)

| Id  | Sev  | Steps → what happened (what should have)                                                                                        | Cause → fix                                                                                                                                                               |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | High | Add FAQ → in the answer, type "- " (an empty bullet) → Create → saved, and the site showed a question that opened onto nothing. | `required` only saw a non-empty string, and the "20 characters of text" rule skipped zero → "The answer field is required." in the form and from the API (D2).            |
| C2  | Low  | A question pasted with spaces around it was stored and shown with them.                                                         | → trimmed by the form and by the API.                                                                                                                                     |
| C3  | Low  | Edit → Save changes with nothing changed → `PUT`, "FAQ saved", the list re-read.                                                | → "No changes to save." and nothing sent (QA-55's and QA-56's rule, now in `MasterDataPage`).                                                                             |
| C4  | Low  | The required Answer had no asterisk; every other required field has one.                                                        | `RichTextEditor` dropped `required` → it marks its label (every rich-text field that is required).                                                                        |
| C5  | Low  | Category sat alone on a half row with Property type on a full row under it.                                                     | → side by side.                                                                                                                                                           |
| C6  | Low  | Ctrl/Cmd+S in the dialog → the browser's "Save page as".                                                                        | → it saves, once per press, not while a save runs or a confirm is up, and not from a dialog of the form's own (a link being added to the answer). See R1.                 |
| C7  | Low  | Order box emptied → "The order must be an integer."                                                                             | → "Give it a place in the list: 0 or more.", and the hint says what the number does: "Its place in the list: 1 is first, and the others move down to make room."          |
| C8  | Med  | The same question twice in one category — a second tab, a paste — was accepted, and the site listed it twice under that tab.    | → 422 on `question`, "This question is already under Buying.", shown on the field. Case, spacing and a final "?" do not make a new question; another category may ask it. |

### D. The API (`mock-server/`, and the contract it stands for)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                     | Cause → fix                                                                                                                                                                                   |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | High | `answer` carrying `<script>`, `onerror=` or a `javascript:` link (entity-encoded too) → 201, stored as sent.                                 | Only the articles API refused them (QA-55) → 422 on `answer`, the same rule and sentence (`lib/html.unsafeMarkup`).                                                                           |
| D2  | Med  | `answer: '<p></p>'` or `'<ul><li><p></p></li></ul>'` → 201.                                                                                  | → 422 on `answer` (C1).                                                                                                                                                                       |
| D3  | Med  | `propertyTypeId: 99999` → 201; the question then appeared nowhere.                                                                           | The guidelines document `exists:property_types,id`, the mock did not enforce it → 422.                                                                                                        |
| D4  | Low  | `order: 99999999999` → 201.                                                                                                                  | → 0–100 000, the pages' bound (QA-56).                                                                                                                                                        |
| D5  | Low  | `q=<p` found all 21 FAQs; a link or a bold word made `href`, `blank` or `strong` find the answers holding one; `R&D` did not find `R&amp;D`. | `q` read the stored HTML → an HTML field of `searchable` is searched by its text (tags stripped, entities decoded).                                                                           |
| D6  | Med  | Every FAQ was created at `order` 0, so new FAQs shared a number (the cause of A5), and a form that typed 3 tied with the FAQ holding 3.      | Only an `order` PATCH renumbered → FAQs settle `1..n` on a `POST` and on a `PUT` that changes `order`, the written FAQ first of any it ties with (`settleOrder`).                             |
| D7  | Med  | A renumber broke the ties it did not cause newest-`updatedAt`-first, reshuffling rows nobody had touched.                                    | → the touched record first, then the list's own order (`order,question` for FAQs), then as stored. The touched record is named, not guessed.                                                  |
| D8  | Low  | Two FAQs sharing 1; drag the second above the first → `PATCH { order: 1 }`, its own number → 200 and nothing moved.                          | An unchanged record returned before the renumber → an `order` PATCH always settles. And a move may name its neighbour (`before` / `after`), which wins over a number that is shared or stale. |
| D9  | Med  | A bulk delete naming FAQs a page shows → 409 for the first one only, "This item is in use."                                                  | → every refused record in `data.refused[] { id, label, reason, usedBy[] }`, `message` "2 of the selected FAQs are still in use, so none was deleted.", `data.usedBy` the union.               |

### E. The public site

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                                           | Cause → fix                                                                                                                                                                                                    |
| --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | High | Tie "Do you charge the buyer a fee?" to Office Spaces → open an office listing → the question is not on the page, nor in its `FAQPage` markup. The form says "Tie the question to one type and it also appears on those listings." | `GET /faqs?propertyTypeId=` has always answered, and no page asked → the property page asks, and lists those questions after the listing's own, skipping one it already asks, in the accordion and the markup. |

---

## 3. What re-verification caught in the new work

None of these left the branch; each is fixed and held by a test.

| Id  | What happened                                                                                                                                                                                                                                                     | Fix                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The first Ctrl+S (C6), pressed right after typing in the answer, saved before the editor had handed over its words (it reports 200 ms late): the required answer read as empty, the error flashed and cleared itself as the words arrived, and nothing was saved. | The editor hands over what it holds on Ctrl/Cmd+S, and the dialog saves from a window listener, which hears the key after React has rendered that. The article and page forms' own Ctrl+S had the same race and are covered by the editor's change. |
| R2  | `SortableList` moved the focus to the row at the new index; a list re-read landing before the next frame had put the neighbour there (a unit test with an instant API caught it).                                                                                 | The row is found by its id (`data-sortable-id`).                                                                                                                                                                                                    |
| R3  | On a phone the drag row's actions menu dropped to a line of its own, and rows grew to 202 px.                                                                                                                                                                     | It sits beside the question; rows are 146 px.                                                                                                                                                                                                       |

---

## 4. Final browser pass

Chromium, a freshly seeded mock, every check by the id of the defect it holds. **53 / 53.**

- **Drag list:** a keyboard move shows at once and keeps the focus; a second Alt+↓ moves
  the same row again; three quick moves move one row three places and the screen and the
  API agree; a dragged row does not snap back; the pager and page size, and page 2 listing
  the rest; new FAQs share no position; a move beside new FAQs lands where it was dropped;
  `?order=desc` is a table; Edit and Delete in the rows, and Edit opening the dialog; the
  "Inactive" chip; a keyboard-pressed arrow keeps the focus; "Reorder" from the table.
- **Table:** a FAQ switched off leaves the "Active" list and the count drops (22 → 21);
  bogus URL values draw no chips and narrow nothing; past the last page says so; "No FAQs
  match"; named checkboxes; cells padded 8 px; the property-type filter; the bulk confirm's
  sentence; a refused bulk delete names the FAQ and its page and keeps the selection; the
  single refusal names the FAQ; a bulk action that changes nothing says so.
- **Dialog:** the Answer asterisk; Category and Property type on one row; an empty bullet
  refused; an emptied Order box explained; Ctrl+S saves (right after typing in the
  answer); the question stored trimmed; a FAQ saved at 3 is third; an unchanged save sends
  nothing; a duplicate refused on the field.
- **API:** a script, an inline handler and a `javascript:` link refused; an answer without
  words refused; an unknown property type refused; an absurd order refused; search reads
  words, not markup.
- **Site:** a property page lists the FAQ tied to its type and puts it in its `FAQPage`.
- No page errors and no console errors through the pass (the sandbox's blocked font and
  icon hosts aside); no sideways scroll and no overflowing row at 1 920, 1 440, 1 280,
  1 024, 768 and 390 px.

The other eleven screens built on `MasterDataPage` with a drag list (testimonials, team,
partners, localities, segments, property types, amenities, badges, developers, banks,
article categories) were smoke-tested on the final tree: each lists its rows, a keyboard
move survives a reload, the rows carry their actions, "Table view" works, and nothing is
logged. Cities (no drag list) is unchanged. `/insights/faqs` shows a FAQ moved to the top
first and hides one deactivated; the home section shows one put on the home page under its
category's tab.

---

## 5. Contract changes

All are in `docs/API_CONTRACT.md` §5.8 and "`Faq`…", `docs/backend-notes/05_business_rules.md`
("Ordering", "Bulk actions", the new "FAQs"), `docs/backend-notes/08_testing.md` and
`docs/DATA_MODEL.md` §6.9, and `backend_developer_guidelines/` is regenerated from a freshly
seeded mock (`check:guidelines` 12 / 12).

- **Reorder anchors (every collection with `order`).** `PATCH { order, before: id }` /
  `{ order, after: id }`: an anchor naming another record wins over the number; neither is
  stored; an unknown anchor is ignored.
- **Tie-breaking (every collection).** The touched record, then the list's own order.
  An `order` PATCH at the record's own number still settles.
- **FAQs settle on write.** A `POST`, and a `PUT` that changes `order`, renumber the FAQs
  `1..n` with the written FAQ first of its tie. The other collections kept §5.8's rule in
  this pass. The follow-up in §9 turns it on for the eleven other drag-ordered ones, and
  places the written record at its position instead of tying it (F1).
- **FAQ validation.** An answer with no words, or with a script, handler or
  `javascript:` link: 422 on `answer`. An unknown `propertyTypeId`: 422. The same question
  twice in a category: 422 on `question`. The question is trimmed. `order` 0–100 000.
- **Search.** An HTML field is searched by its text (FAQs' `answer` is the only one).
- **Bulk delete refused (every collection).** `data.refused[] { id, label, reason,
usedBy[] }`, a `message` that counts them, `data.usedBy` the union.
- **Property pages** ask `GET /faqs?propertyTypeId=` — an existing endpoint, a new caller.

---

## 6. Tests

| Where                                                             | Before → after | What they hold                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mock-server/__tests__/content.test.js`                           | 264 → 276      | ties kept in list order; placement by the neighbour's id, with stale numbers and a missing anchor; an anchor on testimonials; a tie settled at the record's own number; FAQs placed by create and replace; no-word and unsafe answers; unknown property type; trimmed and duplicate questions; the order ceiling; text search; the bulk refusal naming each FAQ                                                                                  |
| `src/components/admin/__tests__/MasterDataPage.test.jsx`          | 19 → 34        | the move shown at once, the focus following it, quick moves written one at a time with their anchors, a refused move put back, the arrow keeping the focus, row actions and "Inactive", the pager, `?order=desc` and "Reorder"/"Table view", the no-op save, Ctrl+S, the bulk refusal dialog, past the last page, the step back after a delete, the re-read after a switch, bogus parameters (three tests updated for the new wording and names) |
| `src/pages/admin/content/__tests__/faqsConfig.test.js`            | new, 6         | the no-word answer, the emptied order, the trimmed question, the plural, the type filter, `stripHtml`                                                                                                                                                                                                                                                                                                                                            |
| `src/components/sections/property/__tests__/FaqsSection.test.jsx` | new, 4         | the listing's questions first, the type's after, a repeated question asked once, prefixed ids, a section drawn from the type's questions alone                                                                                                                                                                                                                                                                                                   |
| `e2e/tests/faqs.spec.js`                                          | new, 2         | add a FAQ, move it twice from the keyboard (the focus following), edit it and delete it from the drag list; a FAQ tied to a type asked on that type's listing                                                                                                                                                                                                                                                                                    |

**Gate:** `npm run check:all` passes — lint, `test:ci` 190 suites / 3 886 tests,
`test:mock` 276, `test:scripts`, `build:ci`, traces, seed, contrast, guidelines 12 / 12,
env. `npm run e2e` 59 / 59.

---

## 7. What could not be fully tested

- **Real touch devices.** Touch was emulated in Chromium. HTML5 drag does not fire on
  touch; there the arrows are the way to move a row, and they were driven by taps.
- **Screen readers.** Names, roles, `aria-live` announcements and focus were checked in the
  DOM, not with NVDA, JAWS or VoiceOver.
- **Firefox and Safari.** Chromium only.
- **The Laravel API.** It does not exist yet; the contract changes above are what it must
  implement.
- **Two editors at once.** No admin screen guards against a concurrent edit (no version
  check); a reorder by one editor while another's list is open is resolved by the anchor,
  but a `PUT` of a stale form still overwrites.
- **Icons and fonts.** They load from third-party hosts that the test sandbox reached only
  intermittently; icon buttons were checked by their names, and visually when the hosts
  answered.
- **The other eleven drag-list screens** were smoke-tested (§4), not audited.

## 8. Risks and follow-ups

- ~~**The other drag-ordered collections still create at `order` 0.**~~ Resolved by the
  follow-up in §9: all eleven settle on write now.
- **Deactivating a FAQ removes it silently** from every CMS page and listing that shows it
  (the public list answers active FAQs only). Deleting one is guarded; deactivating is not.
- **The duplicate check is exact** up to case, spacing and a final "?"; a reworded twin is
  accepted.
- **A property type deactivated after a FAQ was tied to it** is still named from the
  session's cache in the admin, or as "Property type #11" in a new session; the tie itself
  keeps working.

---

## 9. Follow-up — the other drag-ordered collections settle too

QA-59 turned `settleOrder` on for FAQs only. The eleven other collections an admin drags
still created every record at `order` 0 (their forms' default), so their Order columns read
"0, 0, 0, 1, 2…" until a drag settled them, and a public list ordered each tie by name. This
pass checked, collection by collection, whether settling on write suits the admin screen and
what the public site reads, turned it on where it does, and drove the two full-page forms in
the browser.

### Fit

| Collection         | Admin screen (form)                                 | Public site reads it in                                          | Settles |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------- | ------- |
| testimonials       | Content → Testimonials (dialog)                     | `order`: the home page and the testimonials block                | yes     |
| team members       | Content → Team (dialog)                             | `order`: the team block                                          | yes     |
| partners           | Content → Partners (dialog)                         | `order`: the home partners strip                                 | yes     |
| localities         | Master data → Localities (full page; quick-create)  | `order` on `/localities` (or by name); the filters by name       | yes     |
| segments           | Master data → Segments (dialog; quick-create)       | `order`: the master-data cache (filters, the property form)      | yes     |
| property types     | Master data → Property types (dialog; quick-create) | `order`: the master-data cache                                   | yes     |
| amenities          | Master data → Amenities (dialog)                    | `order` inside each category (pickers, and a listing's own list) | yes     |
| badges             | Master data → Badges (dialog; quick-create)         | `order`: the master-data cache                                   | yes     |
| developers         | Master data → Developers (full page; quick-create)  | `order` on `/builders` (or by name); the master-data cache       | yes     |
| banks              | Master data → Banks (dialog)                        | `order`: the lender cards and the EMI calculator                 | yes     |
| article categories | Articles → Categories (dialog; quick-create)        | `order`: the archive's navigation                                | yes     |

All eleven fit. Their seeds are `1..n` already, and every public list sorts by `order,name`
(or by name), which is the order a renumber keeps a tie in — so nothing a visitor sees
moves. The quick-creates keep their places: segments, property types and badges are sent at
the number after the highest they know and still go to the end; localities, developers and
categories are sent without one and are first, as they were at 0. One `order` runs through
every amenity category, so the amenities hint says each category lists its own in it.
Pages and header menus stay as they were: a header menu is created at the end of the list
and has no Order field, and pages were outside this pass.

### What changed

- **API.** `settleOrder: true` on the eleven resources (`mock-server/routes/masterData.js`;
  article categories are routed there, not in `routes/articles.js`). A `POST`, and a `PUT`
  whose `order` differs from the stored one, **place** the record (`placeOrder`,
  `lib/crud.js`): the others are made dense in the order they read, the record takes the
  position its `order` names, clamped to `1..n`, and the ones from there on move down one.
  The reorder `PATCH` keeps its tie (§5.8).
- **Admin.** Every Order field says it is a position — "Its place in the list: 1 is first,
  and the others move down to make room." (`FORMS.orderHint`); amenities and article
  categories name their list; the full-page forms add that dragging a row changes it too.
  `LocalityFormPage` and `DeveloperFormPage` already read the record back after a save (a new
  one opens its edit page; an edit re-reads), so the field shows the settled position.
- **Docs.** API_CONTRACT §5.8 and `backend-notes/05_business_rules.md` ("Ordering") name the
  twelve collections that settle, `08_testing.md` the tests, DATA_MODEL §6 the rule;
  DECISIONS has the entry; `backend_developer_guidelines/` is regenerated from a freshly
  seeded mock (`check:guidelines` 12 / 12) — the captured `POST`, `PUT` and `PATCH` examples
  of the eleven now answer `"order": 1`.

### F1 — a record moved down from a form landed one place short (High, fixed)

- **Where:** every settling `PUT` — Admin → Localities / Developers (full page), each
  dialog's Edit, and FAQs since QA-59.
- **Steps:** Master data → Localities → Add → name it, leave Order at 0 → Save (the edit
  page reads 1) → set Order to 3 → Save.
- **Expected:** the locality is third, and the field reads 3.
- **Actual:** it was second, and the field read 2. A move up was right; a move down, from a
  form, always landed one place above the number typed. No console or network error — the
  API answered 200 with `"order": 2`.
- **Root cause:** QA-59 settled a `POST`/`PUT` the way it settles a reorder `PATCH`: sort
  by `order` and put the written record first of its tie. A drag's number is read off the
  list before the move, so that is right for a `PATCH`; a form's number is a position in the
  list as it will read, and leaving position 1 had already moved the record holding 3 up to
  second, where the tie put the moved record just ahead of it.
- **Fix:** `placeOrder` (above). A create was never affected (the new record is not in the
  list yet), nor was a drag.
- **Held by:** the replace test of every settling collection (first → last, then back to 1),
  the FAQ replace test (2 → 5 is fifth), five `placeOrder` cases; all twelve replace tests
  fail on the tie.

### Tests and verification

- **Mock API** (`mock-server/__tests__/content.test.js`): for each of the eleven, two
  records created at 0 are first in turn and one at 3 is third, the seeded rows follow in
  their order, the numbers read `1..n`, and the public list reads the same way (the QA-59
  FAQ test, table-driven); a `PUT` moves a record down and up to the position it names and a
  `PUT` at its own number moves nothing. With `settleOrder` off, all 22 fail. `test:mock`
  303 / 303.
- **Browser** (fresh mock, admin, 1 440 px): Localities and Developers — the new form's
  Order starts at 0 and its hint says it is a position; created at 0 the edit page reads 1;
  saved at 3 the record is third and the field reads 3 (F1 was found here); saved at 99 it
  is last and reads `n`; the form is clean after the re-read; renamed at the same number
  nothing moves; the list shows it where the field says (18 checks). Badges — the dialog's
  hint, and Add creates at 1 with the drag list showing it first (3). Badges and
  Testimonials — Edit from 1 to 3 in the dialog puts it third in the API and the drag list
  (6). 27 / 27, no console or page errors beyond the sandbox's blocked font and image
  hosts.
- **Gate:** `npm run check:all` passes — lint; test:ci 190 suites / 3 886 tests; test:mock
  303; test:scripts; build:ci; traces; seed; contrast; guidelines 12 / 12; env.

### What remains

- **A delete leaves a gap** (deleting the first of `1..n` leaves `2..n`) until the next
  placing write or drag renumbers the collection. The numbers stay unique and in order, so
  nothing ties and every move stays exact; the Order column just starts at 2 meanwhile.
- **A database from before QA-59 keeps its ties** until the first write that places a
  record, or a drag, settles its collection. Moves are exact meanwhile (the anchor).
- **Pages keep `order` as a weight** ("Lower comes first"), and a page created at 0 can
  share it; they were not audited here.
