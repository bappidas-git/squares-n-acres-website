# 56 — Pages admin audit (the list, the form, the header menus and the pages API)

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json`, reset with
`MOCK_FRESH=1` before every verification pass.

Everything under **Pages** in the admin sidebar, and the pages API behind it, exercised
as admin, manager and sales at 1 920, 1 600, 1 536, 1 440, 1 366, 1 280, 1 100, 1 024,
920, 768 and 390 px. Every control was driven: filters, search, sort, paging, the bulk
bar, every row action, the status chip, every form field, every block action, the SEO
panel's tabs, preview, the leave guard. Each was tried in the expected order and out of
it: refresh at each step, Back and Forward, direct URLs (including ones that name nothing),
dialogs opened and closed repeatedly, keys held down, double clicks, requests aborted,
failed (500), refused (409/422) or cut off, and the same write sent twice. Console errors,
page errors and failed requests were recorded throughout.

The audit started from four problems the owner reported, and all four were confirmed:

1. **Pages were missing from the list.** Buy, Rent, Commercial, Localities, Articles and
   the other pages the site generates were not in it, so they could not be named or put
   in a menu (A5).
2. **Some pages had the wrong name and address.** The Home row pointed at `/home`, a
   bare copy of two of the home page's bands, not the home page (A4).
3. **A page could join only three header menus** (Buyer assistance, Company, Insights),
   and no menu or submenu could be added (B9, C2).
4. **The Buy mega-menu was cut off** at the left of the window (C1).

**31 defects were found in the existing code: 12 on the list, 10 on the form, 5 on the
site's header, footer and routes, and 4 in the API. All 31 are fixed, the four reported
problems included.** The header is now data: menus and submenus are records that an
editor adds, renames, hides, reorders and deletes, and pages and links are placed in them
from Admin → Pages → Header menu or from each page's form. What that took, beyond fixing
defects, is listed on its own (§2 F).

Re-verification also caught **seven problems in the new work**, none of which left this
branch (§2 R). It also exposed one of the 31: C5, a blank admin window, which only showed
up when a fix was measured. All are fixed, and the final browser pass is **107 / 107**.

---

## 1. Scope

**Sections.** `/admin/pages`: the table, filters, search, sort, paging, bulk bar, row
menu, status chip and phone cards. `/admin/pages/add` and `/admin/pages/edit/:id`: Basics,
Placement, the block editor, the SEO panel's four tabs, the action bars, preview, the leave
guard and Ctrl/Cmd+S. `/admin/pages/menus`, which is new: the list, reorder, show/hide, the
menu dialog and delete. The public header (mega menus, "More", the phone drawer), the
footer, `/home`, `/:slug` with `?preview`, and unknown `/admin/*` addresses. On the API,
`/pages*`, `/admin/pages*`, `/header-menus` and `/admin/header-menus*`.

**Workflows.**

- Create → view → edit → save → refresh → verify → delete → verify, by the form and by the
  API.
- Every save path: Save, Save & preview, Publish, the status chip, Ctrl/Cmd+S.
- Bulk publish, unpublish and delete; duplicate; preview from the list and from the form.
- Moving a live page's URL.
- Placing a page in the header and the footer.
- Adding a menu with submenus, links and pages; renaming, reordering, hiding and deleting
  it.
- Each role's reach.

---

## 2. Defects found and fixed

Severity: **Critical** (data loss or a screen that stops working), **High** (wrong data
published or kept, or a core action that misleads), **Medium** (a real error with a
work-around), **Low** (polish, wording, edge cases). Every item was reproduced in the
browser or against the API before it was fixed. Every fix is held by a unit or API test,
or by a measured browser check (§4) for layout and anything else only a browser shows (A2,
C1, C5).

### A. The list (`/admin/pages`)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                                         | Cause → fix                                                                                                                                                                                                                                                               |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | High | Click a row's status chip ("Published") → the page was unpublished **and** the list navigated to its form (`/admin/pages/edit/15`). A failed toggle (500) navigated too.                                                         | The chip sat inside a clickable row and let its click through → the chip stops its click and its keys. It is busy while its write is in flight, and the list is re-read afterwards.                                                                                       |
| A2  | High | Open a row's "⋮" menu, click outside it to close it → the row's form opened. This happened in **every** admin table.                                                                                                             | The MUI menu is portalled in the DOM but not in React, so a click on its backdrop bubbled to the table row → `RowActions` stops clicks at the menu.                                                                                                                       |
| A3  | Med  | Row menu → "View on the site" → the admin's own tab went to `/about`.                                                                                                                                                            | `RowActions` only opened `https://` links in a new tab → every `href` opens in a new tab except `tel:`, `mailto:` and `sms:`.                                                                                                                                             |
| A4  | High | _Reported._ The Home row read `/home`, and "View on the site", preview and every link to it opened `/home`, a bare page holding two of the home page's bands. The form showed its URL as "home".                                 | `PATHS.page('home')` built `/home` while the sitemap already treated `home` as the root → `/` everywhere. `/home` redirects to `/`, the preview token opens `/?preview=…` (the home page reads it and marks the preview), and the URL and SEO permalink show a fixed `/`. |
| A5  | High | _Reported._ The list held the 15 written pages only. Buy, Rent, Commercial, Lease, Plots, All properties, Localities, Builders, Articles, FAQs and Shortlist were missing, so none of them could be renamed or placed in a menu. | They were routes with no record → 11 **built-in** page records, template `system` (`src/config/pages.js`). The list shows them with a "Built-in" template, a fixed status and "Site templates" for SEO, and without Duplicate or Delete.                                  |
| A6  | High | Tick every row of page 2 → Delete → all 9 went, the three legal texts among them. The footer's legal line and every link the site's templates make to them broke. The API accepted the same for `home` (D1).                     | Nothing was protected → the list checks the selection first. One dialog names each page it will leave ("The home page cannot be deleted: …") and offers to delete the rest. The API refuses such a batch whole (D1).                                                      |
| A7  | Med  | Search for an address as the list prints it (`/about`, `/buyer-assistance/home-loan`) or as copied from the browser → 0 results.                                                                                                 | `q` matches the slug, which has no leading slash or origin → `normaliseSearch` strips the origin, the slashes and the query; the root reads as `home`.                                                                                                                    |
| A8  | Med  | Delete every row on the last page → an empty page 2 saying "No pages yet", with "New page".                                                                                                                                      | → the list steps back a page (single and bulk delete).                                                                                                                                                                                                                    |
| A9  | Low  | `/admin/pages?page=5` of a one-page list → "No pages yet" over "Page 5 of 1".                                                                                                                                                    | → "Nothing on this page" with "Go to first page".                                                                                                                                                                                                                         |
| A10 | Low  | `?status=bogus` → a "Status: bogus" chip over an empty list, with the select reading "Any status".                                                                                                                               | → a value no option names is no filter (`status`, `template`).                                                                                                                                                                                                            |
| A11 | Med  | Unpublish a page with the chip, then bulk-publish it → the row still said "Draft" over a live page.                                                                                                                              | Optimistic statuses outlived the rows they were made on → they are dropped when the list is re-read.                                                                                                                                                                      |
| A12 | Low  | Under `?status=published`, unpublish a page → it stayed in the "published" list.                                                                                                                                                 | No re-read after the patch → re-read.                                                                                                                                                                                                                                     |

### B. The form (`/admin/pages/add`, `/admin/pages/edit/:id`)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                          | Cause → fix                                                                                                                                                                                                                           |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | High | Publish a page the form refuses → the status radio stayed on "Published", "Publish" disappeared, and the next plain Save published the page.      | The status was switched before the save and never put back → a refused Publish restores the status it came from.                                                                                                                      |
| B2  | Med  | Save → the whole form went behind its loading skeleton: the scroll jumped from 1 400 to 0 and every open block closed.                            | The save re-read the record → the form keeps the record the API answered with. Measured afterwards: a save at 1 200 px down stays at 1 200.                                                                                           |
| B3  | Med  | Save with nothing changed → `PUT`, `updatedAt` moved, "Page saved." The page jumped to the top of "Updated" and its sitemap `lastmod` moved.      | → "No changes to save." and nothing sent.                                                                                                                                                                                             |
| B4  | Med  | "Save & preview" on an unchanged page → the record was rewritten on every preview.                                                                | → an unchanged saved page previews without a save (the button reads "Preview"); a new or changed one is saved first. A blocked tab is reported, not silent.                                                                           |
| B5  | Med  | Change the URL of a published page → the old address answered 404 the moment it was saved, and nothing said so.                                   | → a warning names the live address and offers, on by default, a 301 from it. The redirect is written after the save, and an active rule from the new address that would now loop is retired.                                          |
| B6  | Low  | Ctrl+S → the browser's "Save page as".                                                                                                            | → Ctrl/Cmd+S saves, once per press (not on auto-repeat), and not while a dialog has the focus or a save is running.                                                                                                                   |
| B7  | Low  | A 125-character title (the API takes 150) → "may not be longer than 120 characters"; "Ab" → "at least 3 characters". The box itself took 150.     | The form had its own bounds → 2–150, from the schema's constants, as the API has them.                                                                                                                                                |
| B8  | Low  | Order 99 999 999 999 → accepted by the form and the API.                                                                                          | → 0–100 000 in the schema (`PAGE_ORDER_MAX`); 2.5 and −1 are refused with the schema's messages.                                                                                                                                      |
| B9  | High | _Reported._ "Header menu" offered Buyer assistance, Company and Insights only, with no way to add a menu or a submenu.                            | An enum of three → the select lists every menu of the header, hidden ones marked "(hidden)", then that menu's submenus. "Add or change menus" opens the menu screen in a new tab, and new menus are offered on returning to the form. |
| B10 | Med  | The home record's URL could be changed (a PATCH moved it away from `home`, and the home page lost its two bands) and the record could be deleted. | → a protected page: the URL is shown fixed and read-only, and there is no delete (D1, D2).                                                                                                                                            |

### C. The site: header, footer and routes

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                              | Cause → fix                                                                                                                                                                                                                                                                                                           |
| --- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Med  | _Reported._ Hover Buy → the panel started off the left of the window: 29 px at 1 920 and up to 198 px at 1 280. Its first column was cut.                                                                             | The panel was centred on its trigger with no check against the window → it is measured before paint and moved inside the window with a 16 px gutter (`panelShift`). **Inside the window at every width from 920 to 1 920.**                                                                                           |
| C2  | High | _Reported._ The header's menus were a constant in `config/navigation.js`. No menu or submenu could be added, and no page could go anywhere but the three menus of B9.                                                 | → a `headerMenus` collection, an API and Admin → Pages → Header menu. The ten seeded menus reproduce the old header exactly. A menu has a name, an optional address, submenus, links and pages; it can be shown or hidden and reordered; Buy, Rent and Commercial keep their generated columns and cannot be deleted. |
| C3  | Med  | Put a page in the footer under "Services" or "Insights" → it appeared nowhere (Flexible Workspace, Direct Lease & Retail). Under "Company" → it fell off the end of a full row.                                       | The footer drew the settings columns and one page column at most → every page placed in a column is drawn. A settings column of the same title takes the pages in, the legal texts stay on the line under the copyright, and generated columns only fill the room left.                                               |
| C4  | Low  | `/admin/pages/whatever`, `/admin/nonexistent` → the public site's 404, with the public header and footer.                                                                                                             | → an admin 404 inside the admin layout ("There is no such screen in the admin panel.").                                                                                                                                                                                                                               |
| C5  | Med  | On any long admin form with the SEO panel, keep scrolling past the end → the whole admin slid up out of the window and left it **blank white** (`window.scrollY` 2 574). _Pre-existing, found while re-verifying B2._ | The SEO panel's screen-reader-only labels were positioned against the page itself, far down the form, so the window became scrollable behind the 100vh shell → the admin canvas is `position: relative`. The document is now exactly the window's height and overscrolling moves nothing.                             |

### D. The API (`mock-server/`, and the contract it stands for)

| Id  | Sev  | Steps → what happened (what should have)                                                                                               | Cause → fix                                                                                                                                                                     |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | High | `DELETE /admin/pages/1` (home), or a bulk delete naming `privacy-policy` → 200, deleted.                                               | → **409** for a protected page, with the reason as `message`. A bulk delete or unpublish naming one is refused **whole** (409/422) with `data.refused[] { id, title, reason }`. |
| D2  | Med  | `PATCH /admin/pages/1 { slug: 'start' }` → 200; the home page lost its bands. An empty slug on `PUT` derived a new one from the title. | → **422** on `slug` for a protected page; an empty slug on `PUT` keeps the stored one.                                                                                          |
| D3  | Low  | `GET /admin/pages/1/preview-token` → `…/home?preview=…`.                                                                               | → `…/?preview=…`.                                                                                                                                                               |
| D4  | Low  | `order: 99999999999` → 200.                                                                                                            | → 0–100 000 (B8).                                                                                                                                                               |

### F. What the new work added (not defects)

Fixing B9 and C2 meant building the header menus, and A5 meant building the built-in
pages. This is what that took, so that the change is fully accounted for:

- **The `headerMenus` collection and its API**: `GET /header-menus`, and the admin CRUD,
  bulk and check-slug. A menu keeps its slug and its source. Buy, Rent and Commercial are
  generated and never deleted. Submenu and link checks. Deleting a menu releases its pages
  and removing a submenu moves them into the menu's own list (`05_business_rules.md` →
  Header menus).
- **Admin → Pages → Header menu**: the ordered list with show/hide, one-write reorder and
  delete naming the pages it releases. The dialog edits name, address, submenus
  (reordered, renamed without losing their pages), links and the pages placed in each
  group.
- **Placement from the page form**: every menu and the chosen menu's submenus, and a link
  to the menu screen whose changes are offered on returning.
- **The public header built from the records**, in the bar, the panels, "More" and the
  phone drawer. A menu's address may be another site (`MenuLink`).
- **The built-in pages' rules and form**: template `system`, always published, no blocks,
  never deleted. A banner says what the site builds each one from, with links to where
  that is edited. They stay out of the CMS sitemap loop, the SEO desk and the dashboard's
  counts.
- **Contract and tooling**: the endpoint registry and catalogue; the schemas (`headerMenu`,
  `headerMenuRef` at the menu slug's 60 characters); the seed (ten menus reproducing the
  old header, eleven built-in pages); a runtime database that predates them gaining them
  by slug; the SQL mapping (`header_menus` before `pages`, JSON `submenus`/`links`, a
  `SET NULL` foreign key); and the regenerated handover.

### R. Found in re-verification: problems the fixes themselves caused or exposed

| Id  | Sev                  | What happened                                                                                                                                                                          | Fix                                                                                                                                            |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | High (never shipped) | With `home` at `/`, the home record's SEO panel "Redirect this page" would have written a redirect **from `/`** on save, sending every visitor who arrived at the site somewhere else. | The switch is locked for the home page (it can still be switched off), the form refuses it, and the API answers 422 on `seo.redirect.enabled`. |
| R2  | Med (never shipped)  | The header-menu "Edit" dialog painted its first frame empty (no name, no submenus, no pages, no links) before the working copy arrived. The unit test caught it through `act` timing.  | The copy is built in a layout effect, before paint.                                                                                            |
| R3  | Med (never shipped)  | A bulk delete asked twice: the bar's own "Delete the selected pages? 3 pages will be deleted", then the refusal naming two it would not. The first sentence was wrong.                 | One dialog: the plain confirmation, or the refusal with "Delete the other N".                                                                  |
| R4  | Low (never shipped)  | A second menu called "company" was accepted, which put two identical labels in the header and two "Company" in every picker. Two submenus of one menu could share a name too.          | Names are unique, ignoring case and spaces: a menu's in the header, a submenu's in its menu (422, and said in the dialog before the request).  |
| R5  | Low (never shipped)  | With the menus request failing, the page form called the page's own menu "company (not found)".                                                                                        | "The header's menus could not be loaded. Try again", and the page's menu keeps its key.                                                        |
| R6  | Low (never shipped)  | The menu dialog's Cancel threw away the work silently, while Escape and the backdrop did nothing at all on a changed menu.                                                             | All three ask once: "Discard your changes?" ("Keep editing" / "Discard"). An unchanged menu closes at once.                                    |
| R7  | Low (never shipped)  | "The other page can be deleted, with the blocks of each."                                                                                                                              | "…with its blocks" for one page.                                                                                                               |

---

## 3. Notes on four of the fixes

**One list of pages the site depends on.** `src/config/pages.js` is CommonJS (D36b), so
the list, the form, the API, the seed and the seed validator all read the same list. It
holds the eleven built-in pages and the eight written pages the site reaches by address,
and the sentences that refuse a delete, a slug change or an unpublish. The admin and the
API speak with one voice: "“Contact Us” cannot be deleted: the site links to it by its
address. Unpublish it instead." The list asks those rules of the rows it holds before a
bulk action, so an editor hears which pages are protected and can go on with the rest. The
API's refusal is the backstop.

**The header as data.** The ten seeded menus draw the header exactly as the constant did:
the same labels, order, generated Buy/Rent/Commercial panels and page groups. So the
change is invisible until an editor makes one. Within a menu, its own list comes first,
then one group per submenu under the submenu's name; in each, the published pages come
first, by their order, then the links. The generated menus draw their master-data columns
first and take pages and links after them. A page names its menu by slug, and a menu never
changes its slug, so renaming a menu or a submenu keeps its pages. Deleting a menu takes
its pages out of the header without taking them off the site.

**A save that is the save.** The form used to read the record back after every save,
which put the whole screen behind its skeleton. The API's answer is the record, so the
form now keeps it: nothing moves, nothing closes. The same stored record lets the form tell
a real change from none (B3, B4). It also lets a refused Publish go back to the status it
came from (B1), because the status and the save are one action with a known starting
point.

**What only a browser shows.** C5 passed every unit test and every earlier screenshot,
because it needs a real layout and a real wheel. It showed up only because B2's fix was
measured as a number (the canvas's `scrollTop` before and after a save) instead of eyeballed.
The measurement pointed at the window rather than the canvas, and that led to the phantom
scroll.

---

## 4. Verified in the browser after the fixes

Six Playwright passes against a freshly seeded mock, measured rather than eyeballed:
**107 / 107 checks**.

- **The list (19).** 26 pages; Home at `/`, locked; Buy built-in with no status switch;
  the chip unpublishing and republishing without leaving the list; a linked page asking
  first; the menu dismissed by its backdrop leaving the list alone; "View on the site" in a
  new tab with the admin tab unmoved; the printed address found; one refusal dialog naming
  two pages; "Nothing on this page"; a bogus filter ignored.
- **The form (26).**
  - Saving: "No changes to save." with `updatedAt` unmoved; a save keeping the canvas at
    1 200 px with no skeleton; Ctrl+S.
  - Placement: every menu offered.
  - Moving the URL: the 301 offered and stored, `/about` sending visitors to `/about-us`,
    and moving back retiring the loop.
  - Built-in page: locked URL, template and status; no blocks, SEO or Publish; renamed and
    placed in Company, and listed there on the site.
  - Home page: `/`, a fixed permalink, a locked redirect.
  - A refused Publish back on Draft.
  - A new page moving to its edit URL with its preview in a new tab; an unchanged page
    previewing without a save.
- **The header menus (22).**
  - Ten menus; Buy not deletable.
  - A menu added with two submenus, a link and two pages, and drawn on the site with its
    groups.
  - Moved first in ten single steps, in the admin and on the site.
  - Hidden and shown again.
  - A renamed submenu keeping its page.
  - A page's form offering the new menu and its submenus.
  - The list naming "Projects › Ready to move".
  - Delete naming its pages and leaving them live.
  - The phone drawer.
- **The public side (17).** The header with an extra menu at six widths with no sideways
  scroll, folding into "More" at 1 100 px and below; the Buy panel inside the window at all
  six (16 px from the edge); `/home` → `/`; the home preview banner and its root URL; the
  admin 404; a missing page's error with a way back.
- **Roles, failures and double submits (14).** Sales refused on all three screens and by
  the API (403); a manager allowed; the menus offline with a retry that recovers; the form
  with its menus offline; a save offline keeping its values and saying so; one `PUT` for a
  burst of saves; one `POST` for a double click; a taken menu name refused on the box.
- **Leftovers (8).** A toggle under a filter; a double press on one chip (one `PATCH`);
  order −1, 100 001 and 2.5 refused and 40 saved; `/edit/abc`.
- **Layout (1).** C5's measurement: the document is exactly the window's height, and
  overscrolling leaves `window.scrollY` at 0.

The only console entries in the final passes are the deliberate ones: the 409 of the
rollback check, the 404s of the missing-page checks, and the refused connections of the
offline checks.

---

## 5. Contract changes

| Change                                                                                                                       | Where it is written                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| New collection `headerMenus`; `GET /header-menus`; admin CRUD, bulk and check-slug                                           | `docs/API_CONTRACT.md` (catalogue, `HeaderMenu`), `docs/DATA_MODEL.md` §6.10a, `05_business_rules.md` → Header menus |
| `pages.headerMenu` references a menu's slug (was an enum of three); new `headerSubmenu`; `PageNavList` gains `headerSubmenu` | `API_CONTRACT.md` (`Page`, `PageNavList`), `DATA_MODEL.md` §6.10, `04_relational_mapping.md`                         |
| Built-in pages (`template: 'system'`) and their rules                                                                        | `API_CONTRACT.md` (`Page`), `DATA_MODEL.md` §6.10, `05_business_rules.md` → Pages                                    |
| Protected pages: 409 on delete (single and bulk, refused whole with `data.refused[]`), 422 on a slug change                  | same, and §5.9                                                                                                       |
| The home record lives at `/`; its preview URL is `/?preview=…`; it cannot be redirected (422)                                | same                                                                                                                 |
| `order` 0–100 000; title 2–150 (unchanged in the API, now the form's too)                                                    | `DATA_MODEL.md` §6.10                                                                                                |

`backend_developer_guidelines/` was regenerated from a freshly seeded mock (12 / 12 in
`check:guidelines`). It now carries the `header_menus` table with its foreign key, the nine
endpoints with captured examples, and the two new sections of the business rules. The
acceptance checklist in `08_testing.md` gained both. The decisions are `docs/DECISIONS.md`
→ QA-56.

---

## 6. Tests added

**Jest: 8 new files and 4 extended** (186 suites and 3 838 tests, from 178 and 3 734). The Phase 1 tests (`RowActions`, `MegaMenu`, the
admin 404) were run against the tree as it was before this audit, and they fail there. The
list, form and menu tests exercise modules this audit introduced (`config/pages.js`,
`headerMenuService`), so they cannot run against the old tree. Each one pins a behaviour
that §2 describes.

| File                                                     | Tests        | What they hold                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PagesListPage` (new)                                    | 15           | Home at `/` and locked; the built-in row; menu names; the chip without navigation and its rollback; the linked-page question; the one-dialog bulk refusal and its partial delete; the plain bulk delete asking once; search normalisation; a bogus filter; the empty page; the step back; the menu link |
| `PageFormPage` (new)                                     | 19           | No-op save; a save without a re-read; title bounds; Ctrl+S once; a new page's redirect; publish and its rollback; preview with and without a save; the 301 on and off; the built-in and home pages; menus, submenus, a lost menu, menus that did not load; the menus link                               |
| `HeaderMenusPage` (new)                                  | 12           | Listing and contents; hide; reorder by one write; add with submenus, links and pages; client and API refusals; duplicate names; taking a page out and regrouping; a renamed submenu keeping its key; the discard question; delete naming pages; read-only roles                                         |
| `pagesAdmin` (new) · `RedirectFields` (new)              | 8 · 3        | Placement labels and search normalisation; the home redirect locked, and switchable off                                                                                                                                                                                                                 |
| `MegaMenu` (new) · `adminRoutes` (new) · `CmsPage` (new) | 7 · 1 · 3    | `panelShift` and the panel moved inside the window; the admin 404; `/home` → `/` with its preview token                                                                                                                                                                                                 |
| `navigation`                                             | +11, −3      | Menus from the collection (order, hidden, groups, generated columns, links, external addresses, fallback) and the footer columns (C3)                                                                                                                                                                   |
| `RowActions` · `SnippetEditor` · `endpoints`             | +2 · +1 · +9 | The backdrop and the new tab; the fixed permalink; the nine routes in the catalogue                                                                                                                                                                                                                     |

**`test:mock`: 199 → 218.** The rules: protected pages (delete, bulk, slug, `PUT` with an
empty slug), built-in pages (template, status, blocks), the home redirect, the home
preview's root URL, placement (`exists`, `requiredIf`, submenus), header menus (public
list, create, keys, duplicate names, links, `javascript:`, generated menus, delete
releasing pages, a removed submenu releasing its pages), the sitemap and the SEO desk
leaving built-in pages out, and the seed's counts.

**e2e: 55 → 57.** `header-menus.spec.js` adds a menu with a submenu, a page and a link in
the admin, finds it drawn on the site, and deletes it with the page left live. It also
opens the home record at `/`.

---

## 7. Not fully tested, and risks

- **Browsers.** Chromium only; Safari and Firefox were not run. Phones and tablets were
  emulated viewports, not devices. No screen reader was used beyond checking accessible
  names and roles. External fonts and icons cannot be fetched from the test sandbox, so
  every screenshot shows blank icons; the app is built to render without them.
- **Two editors at once.** `PUT` replaces the record and nothing checks `updatedAt`, so
  two editors saving one page, or one menu, is last-writer-wins. That is the contract as
  designed (§5.8). The menu dialog's page placements are written page by page after the
  menu itself, so a page edited elsewhere in the same second could be overwritten.
  Optimistic locking would close both.
- **Menu placements are not one transaction.** Saving the menu dialog writes the menu,
  then each page whose placement changed. If one page write fails, the menu is saved and
  the dialog names the pages it could not place. Nothing is lost, but the result is
  partial. A `PUT /admin/header-menus/:id` that accepted placements would make it atomic;
  it was left out to keep pages owning their own placement.
- **Redirects on a URL change** are written by the browser after the page save (like the
  SEO panel's own redirect, §9.6), not by the API. A save from another client moves the
  page without a redirect. The API could own this if the Laravel side prefers.
- **The header's first frame.** On a full page load the bar draws the menus the site
  ships with (`config/headerMenus.js`) until `GET /header-menus` answers: one small
  request, cached for the page load. With the seeded menus nothing changes on screen. A
  header an editor has reshaped switches once, as the page groups always did before their
  own request answered. Keeping the last answer in `sessionStorage` would remove the
  switch from the second page load on, if it is ever noticed.
- **The generated menus' columns** (Buy's statuses, types, budgets and localities) still
  come from master data, as before. Only their name, address, visibility, order, pages and
  links are editable.
- **Very many menus.** Menus that do not fit fold into "More", and a panel is kept inside
  the window. Beyond about fifteen top-level menus, the "More" panel gets long; nothing
  limits the count.
- **Behaviour changes worth knowing.**
  - `RowActions` changes affect every admin table: backdrop clicks are stopped, and
    relative links open in a new tab.
  - The admin canvas's `position: relative` affects every admin screen; all suites pass,
    and no screen showed a difference in the passes.
  - `PATHS.page('home')` is `/` for every caller.
- **Observations, unchanged.**
  - A page's SEO score is computed when its SEO tab is opened, so most rows read "Not
    analysed" (by design; the SEO desk's "Re-analyse all" covers the rest).
  - Leaving the site with Back from an edited form, to a page outside the app, is guarded
    only by the browser's own `beforeunload`, which Chromium shows only after a real user
    gesture.

---

## 8. Gate

Run on the final tree, with the mock reset to the seed before the browser suites.

| Command                  | Result                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:all`      | **exit 0**: `lint` 0 problems and the registry check (0 findings in 817 files); Jest 186 suites, 3 838 tests (178 / 3 734 before); `test:mock` 218 / 218; `test:scripts` 53 pass, 1 skipped, 0 fail; `build:ci` compiled with no CSS order conflicts; `check:traces` 0 findings in 1 195 files; `validate:seed` valid; `check:contrast` 29 gated pairs; `check:guidelines` 12 / 12; `check:env` 8 / 8 |
| `npm run format:check`   | clean                                                                                                                                                                                                                                                                                                                                                                                                 |
| `npm run smoke`          | **301 / 301** checks against a freshly seeded mock (292 before: the nine header-menu endpoints are covered from the registry)                                                                                                                                                                                                                                                                         |
| `npm run e2e` (Chromium) | **57 / 57**, `header-menus.spec.js` among them. A first full run had one lead spec refused with 429: `POST /leads` is throttled to ten a minute, and a smoke run had just posted leads to the same mock, as `e2e/README.md` warns. The spec passed on its own a minute later, and the whole suite passed on a fresh mock.                                                                             |
| Browser passes           | **107 / 107** (§4), on the final tree                                                                                                                                                                                                                                                                                                                                                                 |
