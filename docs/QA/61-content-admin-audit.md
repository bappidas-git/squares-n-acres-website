# 61 — Content admin audit (testimonials, team, partners, jobs, job applications, newsletter)

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) ·
**Backend:** the mock on `:4000`, seeded from the committed `db.json`, reset with
`MOCK_FRESH=1` before every verification pass.

Everything under **Admin → Content** was exercised as admin at 1 600, 1 440, 768 and
390 px, and as manager and sales for what each may reach: the six screens (Testimonials,
Team, Partners, Jobs, Job applications, Newsletter), their drag lists and tables, search,
filters, sort, paging and page size, the bulk bar, every row action and menu, the Active,
Featured and "About page" switches, the three dialogs field by field (the rating stars, the
listing picker, the image fields, the identifier and the phone boxes included), the job
form section by section, the application panel (status, notes, close), the CSV export,
delete and the in-use guard. Each was tried in the expected order and out of it: refresh
at each step, Back and Forward, direct URLs (unknown ids, values no control can show, a page
past the end), dialogs and the panel opened and closed repeatedly, Escape, double clicks,
quick keyboard moves, rapid navigation through all six screens and back, requests failed
(500), refused (404/409/422) or slowed, the screen left while a write was on its way, and
records changed or deleted in another tab while the screen was open. Console errors, page
errors and failed requests were recorded throughout. The API was called directly as well,
and the public site was checked against what the admin did: `/careers`, a job page and its
application form, the testimonials the home page reads, and the advisor a property page
reads.

The owner's screenshot shows the Content group of the sidebar. Every screen in it loaded
cleanly, and most defects sat one step in: **in the job form, which had no address of its
own; in the application panel, which lost what was being typed; in what switching a team
member off did to the public site; and in what each screen did with a record somebody else
had just deleted.**

**51 defects were found: 13 in testimonials, team and partners, 13 in jobs, 10 in job
applications, 5 in the newsletter, 4 in components every admin screen shares, and 6 in
the API. All 51 are fixed.** Two are High: the job form lived on the list's own address,
so Back left the section and a reload threw away the form and everything typed in it
(J1); and a team member switched off — somebody who has left — stayed on the advisor card
of every listing that named them, name, photograph, phone and e-mail (A2). Fifteen are
Medium, 34 Low.

Re-verification caught **seven problems in the new work**, none of which left this branch
(§3). The final browser pass is **73 / 73** (§4); `npm run check:all` passes, and the
end-to-end suite is 62 / 62.

---

## 1. Scope

**Sections.** `/admin/testimonials`, `/admin/team`, `/admin/partners` (drag list, table,
dialog), `/admin/jobs` (table; the form, which this audit moved to `/admin/jobs/add` and
`/admin/jobs/edit/:id`), `/admin/jobs/applications` (table, filters, the panel) and
`/admin/newsletter` (table, export). The API behind them — `/admin/testimonials`, `/team`,
`/partners`, `/jobs`, `/job-applications`, `/newsletter-subscribers` (list, create, read,
replace, patch, delete, bulk, export) — and the public reads: `/testimonials`, `/team`,
`/partners`, `/jobs`, `/jobs/slug/:slug`, `POST /jobs/:id/apply`, `POST
/newsletter/subscribe` and the property reads that embed a team member.

**Workflows.**

- Create → view → edit → save → refresh → verify → delete → verify, on each of the six
  screens, in the dialog, the job form or the panel and through the API; the delete guard
  on a record in use (a team member a listing names; an opening that has applications).
- Reordering testimonials, team members and partners by drag, by the arrows and by
  Alt + ↑/↓, and following the order to the public lists; "Table view" and "Reorder".
- Switching records off and on, singly and in bulk, and following each change to the
  public site; renaming an opening's URL and opening the old one.
- An application from the public form to the desk: status changes from the chip and from
  the panel, notes, the role and status filters, the status sort, delete.
- Each role's reach: admin and manager use all six screens; sales has no Content menu,
  gets the 403 screen at every Content URL, and the API answers it 403 (list, export).
- Failure paths: a list that answers 500 (the error state; "Try again" recovers it), a
  dialog save that answers 500 (the dialog stays open with its values; a retry saves), a
  slow save (Cancel is disabled and Escape does nothing until it lands; a double-clicked
  Create sends one `POST`), a status `PATCH` that fails (the chip goes back, the error is
  toasted), an export that fails, and records deleted elsewhere (§2 S4).

**What held up.** Everything in the last three bullets except the export's message (N4)
and the deleted-elsewhere answers (S4); the drag lists (QA-59) — keyboard moves, the
arrows, the order the public lists read; sort, filters, page and page size surviving a
reload and Back/Forward; rapid navigation through all six screens with slowed lists (each
screen showed its own data; stale requests were cancelled); the discard guard on a dirty
dialog; search matching what each box's placeholder says it searches; no sideways scroll at
390 or 768 px with ordinary data; the careers page and the job page; no page errors and no
console errors of the app's own anywhere in the pass.

---

## 2. Defects found and fixed

Severity: **Critical** (data loss or a screen that stops working), **High** (wrong data
published or kept, or a core action that misleads), **Medium** (a real error with a
work-around), **Low** (polish, wording, edge cases). Every item was reproduced in the
browser or against the API before it was fixed — the three marked _code_ were found reading
the code and confirmed against it — and is held by a unit, API or end-to-end test, or by a
check of the final browser pass (§4). None of them logged an error of the app's own in the
console; where the network tells part of the story — a 404 page, a 409 or 422 answer, a
write that should not have been sent — the row says so. The "Cause → fix" column is both
the likely root cause found and the fix made.

### A. Testimonials, Team and Partners (`/admin/testimonials`, `/team`, `/partners`)

| Id  | Sev | Steps → what happened (what should have)                                                                                                                                                                                                                                                                                          | Cause → fix                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Med | Testimonials → Add → type in any box → press "3 stars" → nothing: the rating stayed at 5 and a second press was needed. Saved as it looked, a quote chosen as 4 stars was stored as 5. (The first press counts.)                                                                                                                  | Iconify writes an icon's paths afresh on every render (under Chrome's Trusted Types each is a new object to React); the press's `mousedown` landed on a path that the box's blur re-rendered away, so no `click` followed → icons are out of hit-testing (`svg.iconify { pointer-events: none }`), and a press lands on the label or button that owns the icon, which a re-render keeps. |
| T2  | Low | Testimonials → Create with nothing → "The message field is required." under a box called "Quote"; Team → WhatsApp "98450 1234x" → "The whatsapp must be a valid Indian mobile number."; the job form → "The description field is required." under "About the role". (Name the box.)                                               | Only keys that are not words (dotted or camelCase) were named by their label → every key whose label reads differently is ("The quote field…", "The WhatsApp…", "The role description…"); `relabel` names the field the sentence is about and leaves the key further on alone (R1).                                                                                                      |
| T3  | Low | Testimonials, Team or Partners → empty the Order box → Create → "The order must be an integer." QA-59 replaced the sentence for FAQs only.                                                                                                                                                                                        | The schema's sentence → "Give it a place in the list: 1 is first.", in the hint's own words.                                                                                                                                                                                                                                                                                             |
| T4  | Med | Edit a testimonial tied to a listing → the Property box read "#1", not the listing. (Name it.)                                                                                                                                                                                                                                    | The picker could name only the listings its own searches had returned → `EntityPicker` asks once, by id, for a chosen record it was never shown (`resolveSelected`: `GET /admin/properties?ids=`); an id the answer leaves out keeps standing in.                                                                                                                                        |
| T5  | Low | The home page shows the featured testimonials in drag-list order, and nothing in the drag list said which were featured: reordering the home carousel was blind.                                                                                                                                                                  | → "5/5 · featured · sample" in the row's line of detail (QA-60's L2 for localities).                                                                                                                                                                                                                                                                                                     |
| T6  | Low | The testimonial's Featured switch had no hint: nothing said it puts the quote on the home page.                                                                                                                                                                                                                                   | → "The home page shows the featured quotes, in the order of this list."                                                                                                                                                                                                                                                                                                                  |
| T7  | Low | Add a testimonial, team member or partner → the Order box read 0 under "Its place in the list: 1 is first".                                                                                                                                                                                                                       | → the three forms open at 1: still first (the API places 0 and 1 alike), now in the hint's terms. FAQs keep 0 and the master-data forms the end (§8).                                                                                                                                                                                                                                    |
| T8  | Med | A name typed without spaces (a pasted address, 71 characters) → the Testimonials and Partners tables grew past their frame and pushed the other columns out of view; at 390 px the card pushed the page sideways. The jobs' Department and Location the same; Team's RERA and the applications' Role cells had the same exposure. | Unbroken words in cells → the cells break a long word where they must (`overflow-wrap: anywhere`).                                                                                                                                                                                                                                                                                       |
| T9  | Low | The drag list's hint broke after "Alt + ↑" and put "/ ↓." on a line of its own.                                                                                                                                                                                                                                                   | → the key combination is kept on one line (`keysTogether`, non-breaking spaces).                                                                                                                                                                                                                                                                                                         |
| TM1 | Med | Team → Phone "98450 12345", as a mobile number is often written → the box stopped at "98450 1234", and Save said "…must be a valid Indian mobile number."; "+91 98450-12345" could not be typed at all. The public job application form the same. (Take it; store the ten digits the other records hold.)                         | The phone box capped input at ten characters → the dialogs' phone boxes and the application form take 18; a dialog stores the ten digits (`tidyPhones`, on `normalizePhone`'s QA-53 rule for which prefixes come off), and the application form's `normalizePhone` already did.                                                                                                          |
| TM2 | Low | Team → the Identifier box said "This URL is available." — a team member has no page, so no URL — and its unlock button "Generate the slug from the title" beside a Name.                                                                                                                                                          | `SlugField`'s sentences were fixed text → a slug under a path is a URL; one with no page is what its label calls it ("This identifier is available."); the button names the field it follows.                                                                                                                                                                                            |
| TM3 | Low | Team → the "About page" switch → "“Priya Raman” is on." / "…is off."                                                                                                                                                                                                                                                              | → "…is now on the About page" / "…is off the About page".                                                                                                                                                                                                                                                                                                                                |
| TM4 | Low | Team → select two → Delete → "If a page still shows any of them, none is deleted…" — a listing that names a member as its advisor refuses the delete as well (D88).                                                                                                                                                               | → "If a page or a listing still names any of them, none is deleted and you are told which."                                                                                                                                                                                                                                                                                              |

### B. Jobs (`/admin/jobs`, and the form now at `/admin/jobs/add`, `/admin/jobs/edit/:id`)

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                                                                                   | Cause → fix                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | High | Jobs → Add opening (or Edit) → the form was drawn in place of the list, on `/admin/jobs`: Back left the Jobs screen altogether; a reload dropped the form and everything typed in it; the sidebar's "Jobs" did nothing while it was open; an opening could not be linked to. (A page of its own.)          | The shared list's `formMode: 'page'` had no route → `/admin/jobs/add` and `/admin/jobs/edit/:id` (`JobFormPage`, on `useRecordPage` like the locality and developer forms): a create replaces the add route with the edit route, an unchanged Save says "No changes to save.", Ctrl/Cmd+S saves, a sticky Save sits at the foot, unsaved changes are guarded, and an unknown id answers "We could not load this opening" with a way back. |
| J2  | Low  | A switched-off opening → its row actions → "View … on the site" → the site's 404 page (`GET /jobs/slug/…` → 404).                                                                                                                                                                                          | Offered on every row → a live opening only (QA-60's L1).                                                                                                                                                                                                                                                                                                                                                                                  |
| J3  | Low  | Select two → Delete → "One that has already received applications is refused." — the API refuses the whole batch.                                                                                                                                                                                          | → "If any of them has received applications, none is deleted and you are told which." (QA-59's rule).                                                                                                                                                                                                                                                                                                                                     |
| J4  | Low  | Add opening before 05:30 in Bengaluru → "Posted on" read yesterday.                                                                                                                                                                                                                                        | The default was the UTC day (`toISOString`) → today in IST (`istToday`, D22).                                                                                                                                                                                                                                                                                                                                                             |
| J5  | Med  | Jobs at 1 440 px → four icon actions per row left the Role column a word wide, and a title ran to four lines; on a phone the card had no application count.                                                                                                                                                | → the row's actions in a menu (`rowActionsMenu`); Location and Closes from 1 600 px up; the phone card shows Department, Applications and Active. The Role column is 373 px at 1 440.                                                                                                                                                                                                                                                     |
| J6  | Med  | Edit a live opening → change its URL → Save → `/careers/<old>` answered 404, while job boards and shared links point at it.                                                                                                                                                                                | → the moved-URL notice with its redirect switch (on by default for a role that may write redirects), as the locality and developer forms have since QA-60 (PT1).                                                                                                                                                                                                                                                                          |
| J7  | Low  | An active opening whose closing day had passed looked live in the admin — Active on, a date under Closes — while it was off `/careers` and refusing applications.                                                                                                                                          | → "Closed 01 Sep 2026" in its Role cell, on every width.                                                                                                                                                                                                                                                                                                                                                                                  |
| J8  | Low  | A long department name stretched the Department filter across the filter row and pushed the other filters onto a second line.                                                                                                                                                                              | A select is as wide as its longest option → at most 260 px in the row, cut with an ellipsis; the phone's filter panel keeps the full width.                                                                                                                                                                                                                                                                                               |
| J9  | Low  | Add responsibility → the row is labelled "Responsibilities 1".                                                                                                                                                                                                                                             | → "Responsibility 1" (a dialog's string lists the same).                                                                                                                                                                                                                                                                                                                                                                                  |
| J10 | Low  | Bulk delete → "Delete the selected openings?" over "2 jobs will be deleted."                                                                                                                                                                                                                               | → "2 openings…" (`plural`).                                                                                                                                                                                                                                                                                                                                                                                                               |
| J11 | Low  | Delete an opening that has applications → "Still in use" listed a bare "jobApplication" with no link, and said "remove each reference first" — an application cannot be unlinked.                                                                                                                          | → "Application", linked to the desk searched for the applicant; the line under it says to switch the opening off instead, which keeps its applications on the desk (`guardHint`).                                                                                                                                                                                                                                                         |
| J12 | Low  | "About the role" holding only an emptied bullet or heading → Save → stored (`<ul><li><p></p></li></ul>`), and the careers page printed "About the role" over nothing. _Code_, then confirmed against the API.                                                                                              | → refused on the form ("Say what the role is…") and by the API (A6).                                                                                                                                                                                                                                                                                                                                                                      |
| J13 | Med  | Jobs → Department: Sales → reload (or open a link to `/admin/jobs?department=Sales`) → every opening was listed, Operations and Research among them, under a "Department: Sales" chip and a select reading Sales (`GET /admin/jobs` went without `department`). Found in the final review of the new work. | The URL was judged against the filter's options before they had loaded — none — so the department was dropped from the request, and nothing asked again once they arrived → options still loading are not judged (`options: null`), and `MasterDataPage` asks again when the URL, judged anew, means something else (every screen whose options load).                                                                                    |

### C. Job applications (`/admin/jobs/applications` and its panel)

| Id   | Sev | Steps → what happened (what should have)                                                                                                                                                                                                                            | Cause → fix                                                                                                                                                                                                                                                                |
| ---- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JA1  | Med | Jobs → "Applications for …" (`?jobId=4`) → the list was filtered, but no chip said so and there was no Reset; on a phone the filter panel is closed, so nothing on screen did; a role with no applications was not named at all. (Name the filter, with a way out.) | The role filter had no chip label and named only roles on the page → a "Role: …" chip and Reset like every filter, the choice shown in the box rather than as a second chip under it, and the opening read once when no row on the page names it (QA-53's rule for leads). |
| JA2  | Med | Open an application → type a note → change the status → the note was replaced by the stored one: the commonest next step threw away what was typed.                                                                                                                 | The panel reset its note whenever its record object changed, which every write and every read of the desk does → it resets only when another application is opened.                                                                                                        |
| JA3  | Med | Type a note → Escape, the backdrop, × or Close → the panel closed and the note was gone, without a word.                                                                                                                                                            | → "Discard your note?" ("Discard note" / "Keep editing"); leaving the screen or reloading with a note unsaved asks first too.                                                                                                                                              |
| JA4  | Med | Under "Status: Interview" → move an application to Hired → it stayed in the list, and the count did not move.                                                                                                                                                       | The desk was not read again after a change → it is; the panel stays open on the record even when the change takes its row out of the page.                                                                                                                                 |
| JA5  | Low | `?status=bogus` → a "Status: bogus" chip over an empty desk; `?sort=nope` and `?jobId=abc` were sent to the API as they were.                                                                                                                                       | → a value no control can show is no filter (`sanitiseParams`, QA-59's rule, now a module of its own).                                                                                                                                                                      |
| JA6  | Low | Page 2 holding one application → delete it → "Page 2 of 1 — no rows on this page", with no way back; a URL past the end the same.                                                                                                                                   | → the page before when a delete empties the one on screen; "Go to first page" past the end (QA-56's rule).                                                                                                                                                                 |
| JA7  | Med | The panel announced itself as a dialog with no name: a screen reader heard "dialog" and nothing else.                                                                                                                                                               | The panel's own `PaperProps` replaced the kit Drawer's, which carry its role and name → the kit's Drawer merges a caller's paper props into its own.                                                                                                                       |
| JA8  | Low | An application missing a phone or a résumé drew the "Phone" or "Résumé" line with an empty link under it. _Code._                                                                                                                                                   | A line was drawn whenever it had children, and a link around nothing is still an element → drawn when there is a value.                                                                                                                                                    |
| JA9  | Low | The Role picker searched the API again after every re-render of the desk. _Code._                                                                                                                                                                                   | Its fetcher was a new arrow on every render → one identity for the life of the screen.                                                                                                                                                                                     |
| JA10 | Low | Status change → "“Vivek Nair” is now Interview."                                                                                                                                                                                                                    | → "“Vivek Nair” moved to Interview."                                                                                                                                                                                                                                       |

### D. Newsletter (`/admin/newsletter`)

| Id  | Sev | Steps → what happened (what should have)                                                                                                              | Cause → fix                                                                                                                                                                                 |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Low | `?status=bogus` → a "Status: bogus" chip over an empty list and "Export CSV (0)"; the export would have asked for the same.                           | → `sanitiseParams`, as JA5; the export asks for what is on screen.                                                                                                                          |
| N2  | Low | The last page holding one subscriber → Remove → "Page 2 of 1 — no rows on this page", with no way back.                                               | → the page before, as JA6.                                                                                                                                                                  |
| N3  | Low | Remove → "“…” deleted" — the button, the dialog and the action all say "Remove".                                                                      | → "“…” removed".                                                                                                                                                                            |
| N4  | Low | Export CSV answering 500 → the toast read "Request failed with status code 500" instead of the API's message. Every CSV export of the admin the same. | Asked for a blob, the HTTP client handed the API's JSON error over as a blob too, and nothing read it → `downloadAuthenticated` reads the body and throws the API's own message and errors. |
| N5  | Low | Remove a subscriber that another tab had just removed → "Not found", and the row stayed, to be removed again with the same answer.                    | → "“…” had already been removed.", the row goes, and the list is read again.                                                                                                                |

### E. Across the admin (components every screen shares)

| Id  | Sev | Steps → what happened (what should have)                                                                                                                                                                                                                                                                     | Cause → fix                                                                                                                                                                                                                                                                                                          |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Low | Every dialog, drawer and bottom sheet closed with a bare "×" at the button's type size — a few pixels wide beside the icons of every other control.                                                                                                                                                          | → the `mdi:close` icon every other close control draws.                                                                                                                                                                                                                                                              |
| S2  | Low | A partner's Logo (every image field) said `aria-describedby="…-hint"`, an id nothing carried: its note was never read out.                                                                                                                                                                                   | `ImageHint` drew no id → it carries the one its input names.                                                                                                                                                                                                                                                         |
| S3  | Low | A field showing an error still pointed `aria-describedby` at its hint, which the error had replaced. Found in re-verification of S2.                                                                                                                                                                         | → the hint's id only while the hint is on the page.                                                                                                                                                                                                                                                                  |
| S4  | Med | Another tab deletes a record → here: its switch → "Not found" and the row stayed; its dialog → Save → "Not found" in a dialog that stayed open with no way forward; Delete → "Not found", row stayed; a drag → "The new order could not be saved." Every `MasterDataPage` screen, the desk and the job form. | A 404 was treated as any failure → "“…” is no longer here — it was deleted elsewhere. The list has been refreshed." and the list is read again; the dialog closes; a delete that finds nothing says "…had already been deleted." and is done; the job form shows "This opening no longer exists" and stops guarding. |

### F. The API (`mock-server/`, and the contract it stands for) and the public site

| Id  | Sev  | Steps → what happened (what should have)                                                                                                                                                                                                                                                                                    | Cause → fix                                                                                                                                                                                                                                    |
| --- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Med  | Delete the first testimonial → the new first read 2 in the Order column and in its form, the next 3… (`order` 2..9) until a drag or a placing save settled the collection. Team members and partners the same, and a bulk delete. The QA-60 report listed it as a follow-up.                                                | The API renumbered on a placing write (QA-59) but not on a delete → a delete, single or bulk, renumbers what is left `1..n` in the order it read (`closeGap`); nothing else about those records changes.                                       |
| A2  | High | Team → switch off Team Member 2 (somebody who has left) → Lakeview Heights' page still showed their name, photograph, phone, WhatsApp and e-mail on the advisor card; `GET /properties/slug/…` answered them. Deleting them is refused while listings name them, so switching off was the only way out, and it did nothing. | `embedAgent` filled the card from the member whatever `isActive` said → on a public read a switched-off member fills nothing; what the listing typed itself still shows; with nothing typed the site draws no card. Admin reads are unchanged. |
| A3  | Med  | An opening closing on the 30th → `GET /jobs` listed it and `POST /jobs/:id/apply` took applications until 05:30 IST on the 1st.                                                                                                                                                                                             | `isOpen` compared with the end of the day in UTC → the closing day is Bengaluru's (D22).                                                                                                                                                       |
| A4  | Low  | `POST /admin/jobs { department: "Sales " }` → stored with the space; the department filter and the careers page offered "Sales" twice.                                                                                                                                                                                      | Job writes were not trimmed → `trimStrings` on the jobs router (QA-60's rule); the form's Department box also suggests the departments in use.                                                                                                 |
| A5  | Low  | Applications → sort by Status → hired, interview, new, rejected, shortlisted: the alphabet.                                                                                                                                                                                                                                 | → the desk's order — new, shortlisted, interview, rejected, hired — newest first within a status (a ranked sort).                                                                                                                              |
| A6  | Low  | `POST /admin/jobs` with `description: "<ul><li><p></p></li></ul>"` → 201 (J12); with an `onclick` in it → 201 as well (both confirmed against the API before the fix). The careers page renders through `SafeHtml`, so the handler never ran there.                                                                         | → 422 on `description`: "The description field is required." for no words, the articles' sentence for markup that would run (QA-59's rule for a FAQ's answer). A `PATCH` is asked only about the fields it sends.                              |

---

## 3. What re-verification caught in the new work

None of these left the branch; each is fixed and held by a test or the gate.

| Id  | What happened                                                                                                                                                                                                                                                        | Fix                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | T2 names more fields by their labels, and `relabel` replaced every occurrence of the key: under a label "email address" (the users screen), "…must be a valid email address." would have read "…a valid email address address."                                      | The first occurrence only — the field the sentence is about.                                                                                                                                     |
| R2  | The row menu (J5) was not enough at 1 440 px: the Role column stayed narrow while eight columns kept their fixed widths; and adding the application count to the phone card pushed the Active switch off it (a card has room for three).                             | Location and Closes from 1 600 px up, the Closed chip in the Role cell; the type left off the card.                                                                                              |
| R3  | TM1 first raised the kit `PhoneField`'s own cap. The profile page and the property form's Agent tab send what is typed, and the pattern allows a `+91`: they would have stored "+91 98450 12345", and the Agent tab's preview would have read "+91 +91 98450 12345". | The kit keeps ten; the dialogs and the application form ask for 18, and a dialog tidies the number before it is sent.                                                                            |
| R4  | The first `tidyPhone` had rules of its own for which prefixes come off, beside `normalizePhone`'s (QA-53 had fixed a `91…` mobile being cut to eight digits there).                                                                                                  | `tidyPhone` is `normalizePhone` less the `+91` it writes for a lead; a test holds the 91-series number.                                                                                          |
| R5  | The new end-to-end test for T1 passed with the fix removed: the stars are drawn from the Iconify API, and a run that cannot reach it draws no icon to lose the press to (this sandbox's browser cannot).                                                             | The test also checks the rule itself, and fails without it wherever it runs; the unit tests for TM1 read the boxes' cap directly, since the user-event this suite runs types past a `maxlength`. |
| R6  | The job form refused an emptied description (J12), but the API still stored one.                                                                                                                                                                                     | A6.                                                                                                                                                                                              |
| R7  | Two checks of the scripted pass read the wrong thing: the Jobs heading reads "Jobs" and the count beside it, and an empty table draws its empty state as a row.                                                                                                      | Both re-checked precisely (§4).                                                                                                                                                                  |

---

## 4. Final browser pass

Chromium, a freshly seeded mock, every check by the id of the defect it holds. **73 / 73.**

- **Testimonials, team and partners, with the API behind them (26):** the first star press
  after typing counts, and the testimonial is stored at 3 (T1); "The quote field is
  required." and "The WhatsApp must be…" (T2); "Give it a place in the list: 1 is first."
  (T3); the listing named when the form reopens (T4); "5/5 · featured · sample" (T5); the
  Featured hint (T6); Order opens at 1 in the testimonial and partner dialogs (T7); a
  71-character word in the testimonial and partner tables at 1 440 and 390 px, no overflow
  (T8, ×4); the reorder hint's key combination on one line (T9); "+91 98450 12345" typed
  whole and "098450-67890" accepted, stored as 9845012345 and 9845067890 (TM1, ×2); "This
  identifier is available." (TM2); "…is off the About page" (TM3); the bulk sentence
  (TM4); the close control is an icon (S1); no dangling `aria-describedby` in the partner
  dialog (S2) or in a testimonial dialog showing errors (S3); orders `1..8` after a delete
  (A1); a switched-off advisor fills nothing on the public read, and the admin read keeps
  them (A2, ×2).
- **Jobs (26):** `/admin/jobs/add`, posted today in IST (J1, J4); an emptied description is
  refused (J12); "Responsibility 1" (J9); the create lands on `/admin/jobs/edit/7`, a
  reload keeps the form, Back returns to the list and so does the sidebar's "Jobs" from the
  form (J1, ×4); the new URL offers the redirect and Ctrl+S writes
  `/careers/final-pass-engineer → /careers/final-pass-engineer-bengaluru` (J6, ×2);
  "Closed 01 Sep 2026" (J7); no "View on the site" for a switched-off opening and one for a
  live one (J2, ×2); the Role column 373 px at 1 440 with no overflow, and the phone card
  with the applications and the switches (J5, ×2); "2 openings will be deleted" and the
  batch sentence (J10, J3); the guard's "Application" linked to
  `/admin/jobs/applications?q=Guard%20Probe` and its "switch it off instead" (J11, ×2); the
  Department filter 260 px wide (J8); `"  Trim Probe "`, `"  Sales  "`, `" Remote "` stored
  trimmed and "Sales" offered once (A4, ×2); an opening closing today (IST) still listed,
  one closed on the 1st refusing an application with 404 (A3, ×2); `?department=Sales` asks
  for Sales and lists the one Sales opening, and `?department=Bogus` is asked again
  without it and lists all four, with no chip (J13, ×2).
- **Job applications, newsletter and records deleted elsewhere (21):** "Role: Customer
  Relations Manager (Part-time)" with Reset for a role with no applications (JA1, ×2);
  `?status=bogus&sort=nope&jobId=abc` asks for the default list (JA5); "Go to first page"
  past the end (JA6); the panel is a dialog named after the applicant (JA7); the note
  survives a status change, and the toast says "moved to Interview." (JA2, JA10); closing
  asks, "Keep editing" keeps the note, and a saved note closes without asking (JA3, ×3);
  moved to Hired under "Status: Interview", the application leaves the list, the count
  goes 2 → 1, the other stays and the panel stays open (JA4); the status sort follows the
  pipeline (A5); `?status=bogus` on the newsletter shows the list and "Export CSV (12)"
  (N1); emptying the last page steps back, and the toast says "removed" (N2, N3); a failed
  export says "The export service is down." (N4); a subscriber removed elsewhere is
  treated as removed (N5); a partner deleted elsewhere — deleted again, saved, switched
  and moved — answers each time as S4 says (S4, ×4).

JA8 (an empty line) cannot be produced from the public form, which requires both values,
and is held by a unit test; JA9 by the code. No page errors, and no console errors beyond
the browser's own line for each deliberate 404, 409 and 500.

---

## 5. Contract changes

All are in `docs/API_CONTRACT.md` §5.8, §5.10 and "`Job`, `JobApplication`",
`docs/backend-notes/05_business_rules.md` ("Ordering", and the new "Content writes and
reads" with its slot in the guidelines template), `docs/backend-notes/08_testing.md` and
`docs/DATA_MODEL.md` §6; `backend_developer_guidelines/` is regenerated from a freshly
seeded mock (`check:guidelines` 12 / 12).

- **A delete closes the gap it leaves** in the drag-ordered collections: single or bulk,
  the rest is renumbered `1..n` in the order it read, inside the deleting transaction.
- **A switched-off team member answers for no listing** on a public property read; what
  the listing typed itself still shows. Admin reads are unchanged.
- **An opening is open to the end of its closing day in IST:** `closesAt` is the last day
  it takes applications, in `Asia/Kolkata`.
- **Job openings are trimmed** like master data (`TrimStrings`).
- **An opening's description has words and runs nothing:** 422 on `description` otherwise;
  a `PATCH` is asked only about what it sends.
- **`GET /admin/job-applications?sort=status`** reads new, shortlisted, interview,
  rejected, hired (`ORDER BY FIELD(status, …), created_at DESC`); `order=desc` reverses the
  statuses.

The admin's new addresses — `/admin/jobs/add`, `/admin/jobs/edit/:id` — are routes of the
site, not of the API; no endpoint was added or removed.

---

## 6. Tests

| Where                                                                  | Before → after | What they hold                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock-server/__tests__/content.test.js`                                | 137 → 142      | a delete closes the gap, singly and in bulk; the status sort both ways; an opening's text trimmed; the closing day in IST at 23:30 and 01:30; an empty or unsafe description refused, and a `PATCH` that leaves it alone not asked about it                   |
| `mock-server/__tests__/properties.test.js`                             | 40 → 41        | a switched-off team member fills nothing on the public read, what a listing typed still shows, and the admin read keeps the member                                                                                                                            |
| `src/pages/admin/content/__tests__/JobFormPage.test.jsx`               | new, 10        | J1, J4, J6, J12, T2 and S4 on the form: its own address, today in IST, labels, the replaced add route, departments offered, the no-op save, the redirect, an opening deleted elsewhere, an unknown id, the rules and the body                                 |
| `src/pages/admin/content/__tests__/JobsPage.test.jsx`                  | new, 9         | the add and edit pages, "View on the site" for a live opening only, "Closed …", the bulk sentence, the guard's link and hint; a department in the URL asked for before the departments are known, and one no opening has dropped and asked again; `hasClosed` |
| `src/pages/admin/content/__tests__/JobApplicationsPage.test.jsx`       | 6 → 14         | the role filter's chip and Reset, the URL sanitised, the note through a status change and a close, the desk read again, the panel kept open on a row that left the page, no empty lines, an application deleted elsewhere, the first page from past the end   |
| `src/pages/admin/content/__tests__/NewsletterSubscribersPage.test.jsx` | new, 4         | the URL sanitised and the export's parameters, the step back and "removed", a subscriber removed elsewhere, the first page from past the end                                                                                                                  |
| `src/pages/admin/content/__tests__/contentConfigs.test.jsx`            | new, 10        | order 1 and its message in the three configs, "featured" in the drag list, the Featured hint, the listing asked for by id, the bulk sentences                                                                                                                 |
| `src/components/admin/__tests__/MasterDataPage.test.jsx`               | 46 → 58        | labels for words that are not their label; the four deleted-elsewhere answers (delete, save, switch, move); the row menu and the guard's hint; the phone box's room, `tidyPhone(s)` and the ten digits sent; `keysTogether`                                   |
| `src/components/admin/__tests__/EntityPicker.test.jsx`                 | 10 → 12        | a chosen id it was never shown is named, asked for once; a missing one keeps standing in                                                                                                                                                                      |
| `src/components/admin/__tests__/SlugField.test.jsx`                    | 18 → 20        | an identifier is not a URL; the field it follows named on the button                                                                                                                                                                                          |
| `src/components/admin/__tests__/a11y.test.jsx`                         | 4 → 6          | the image hint carries its id; a field in error describes itself by the error only                                                                                                                                                                            |
| `src/components/ui/__tests__/a11y.test.jsx`                            | 7 → 8          | a Drawer with a caller's paper props keeps its role and name                                                                                                                                                                                                  |
| `src/components/sections/careers/__tests__/JobApplyForm.test.jsx`      | 15 → 16        | "98451 00121" fits the box and is sent as `+919845100121`                                                                                                                                                                                                     |
| `src/hooks/__tests__/useForm.test.js`                                  | 25 → 26        | `relabel` names the first occurrence only                                                                                                                                                                                                                     |
| `src/utils/__tests__/download.test.js`                                 | new, 4         | the API's message read out of a blob body; a 422's field messages kept; a body that is not JSON leaves the caller's sentence; a failure with no body handed back as it came                                                                                   |
| `src/utils/format.test.js`                                             | 21 → 22        | `istToday` is Bengaluru's day, not Greenwich's                                                                                                                                                                                                                |
| `e2e/tests/content.spec.js`                                            | new, 3         | an opening added at its own address, reloaded, moved with a redirect, and Back to the list; a note through a status change and the close question; the first star press after typing, and the rule that keeps icons out of the way                            |

**Gate:** `npm run check:all` passes — lint, `test:ci` 199 suites / 4 024 tests (194 /
3 951 before), `test:mock` 315 (309), `test:scripts`, `build:ci`, traces, seed, contrast,
guidelines 12 / 12, env. `npm run e2e` 62 / 62 (59).

---

## 7. What could not be fully tested

- **Real phones and touch.** 390 and 768 px were Chromium's emulation; the drag lists'
  arrows were driven by taps and keys, and HTML5 drag does not fire on touch.
- **Screen readers.** Names, roles, descriptions and focus were checked in the DOM and the
  accessibility tree, not with NVDA, JAWS or VoiceOver.
- **Firefox and Safari.** Chromium only. T1 depends on how a browser dispatches a click
  whose press and release land on different elements; the fix removes the icon from
  hit-testing everywhere, but the original loss was only observed in Chromium.
- **The Laravel API.** It does not exist yet; §5 is what it must implement.
- **Two editors at once, beyond deletes.** S4 covers a record deleted elsewhere; a `PUT` of
  a stale form still overwrites an edit made elsewhere, on every admin screen.
- **Uploads.** Photos, logos and résumés were given as URLs; uploading to Cloudinary was
  not exercised.
- **Icons and fonts** load from third-party hosts the sandbox reaches only through a proxy;
  the verification harness fetched them, the end-to-end runner cannot (R5).
- **E-mail.** Nothing in the Content section sends one in the mock.

## 8. Risks and follow-ups

- **Switching off a team member asks nothing.** Since A2 it takes their card off every
  listing that names them at once; a confirm naming those listings — the segment change's
  question (D88) — would make it deliberate.
- **The mock reuses a deleted record's id** (`max(id) + 1`): a bookmarked
  `/admin/jobs/edit/7` opens whichever opening took 7 next. Laravel's auto-increment does
  not; the mock is not changed.
- **A dialog has no address.** Back with a clean dialog open leaves the screen under it
  (with unsaved changes, the guard asks first). The job form now has one; the dialogs of
  the other screens are as QA-59 left them.
- **CSV exports carry raw values** — ISO timestamps and enum keys (`subscribed`,
  `newsletter`) — which a spreadsheet user must read as they are. What the columns should
  say is a product decision.
- **The public finance assessment form keeps the ten-character phone box**, the last
  `PhoneField` on the kit's default: "98450 12345" is cut there and refused. Its lead is
  normalised by `POST /leads`, so the box's room is all it lacks; outside this audit. (The
  profile page and the Agent tab, listed here first, are fixed — §9.)
- **FAQs open a new question at 0** under "1 is first", as T7 was; outside this audit (QA-59
  kept 0 on purpose, and it places the question first either way).
- **The kit's Alert, Chip and Toast still close with a text "×"** (S1 changed the dialog,
  drawer and bottom sheet); worth the same icon.
- **Every admin heading reads its count as part of the title** — "Jobs4" — because the
  count pill sits inside the `h1` with no separator.
- **`SeoPanel.test.jsx`'s performance test** (analysis under 100 ms) failed once at 101 ms
  on a loaded machine (the baseline run, with the end-to-end suite running beside it). Fixed
  as a follow-up — §10.

## 9. Follow-up: the profile page and the Agent tab

R3 left two admin forms on the kit's ten-character phone box; both now take a number as
people write it and store its ten digits.

- **My profile** (`/admin/profile`): the Phone box takes 18 characters; the save sends
  `tidyPhone` of what was typed (`+91 98450 12345` → `9845012345`; what is not a mobile
  number goes as typed, for the API's 422), and the box then shows the stored number.
- **The property form's Agent tab**: Phone and WhatsApp take 18 characters; `toPayload`
  sends their ten digits, `validateAgent` reads the number as it will be stored — so
  "098450 12345" and "(98450) 12345" are accepted where they were refused — and the card
  preview reads "+91 9845012345" where it would have read "+91 +91 98450 12345".
- **`tidyPhone` moved beside `normalizePhone`** in `src/utils/validators.js` and is
  re-exported by `MasterDataPage`: the property form's payload and validators are plain
  modules, and importing the list screen into them would have brought its component and
  stylesheet into the property form's chunk.

Browser pass, a freshly seeded mock: **9 / 9** — the profile box's cap, the whole number
typed, stored as `9845012345`, shown after the save and after a reload; the Agent tab's two
caps, the preview in ten digits, `agent.phone` and `agent.whatsapp` stored as `9845012345`
and `9845067890`, and the public card reading the same. No console errors.

| Where                                                                   | Before → after | What they hold                                                                                               |
| ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/pages/admin/settings/__tests__/ProfilePage.test.jsx`               | new, 4         | the box's room; `+91 98450 12345` saved and shown as `9845012345`; a non-mobile sent as typed; empty as null |
| `src/pages/admin/properties/property-form/__tests__/AgentTab.test.jsx`  | 3 → 5          | both boxes' room; the preview in ten digits                                                                  |
| `src/pages/admin/properties/property-form/__tests__/toPayload.test.js`  | +1             | the agent's numbers sent as ten digits, a non-mobile as typed                                                |
| `src/pages/admin/properties/property-form/__tests__/validators.test.js` | +1             | a number read as it will be stored                                                                           |
| `src/utils/__tests__/validators.test.js`                                | +2             | `tidyPhone`: the spellings of one number, the 91-series, what is not a mobile number                         |

## 10. Follow-up: the SEO panel's timing test

"Analyses a heavy listing fast enough to run on every keystroke" read one wall-clock sample
after one warm-up and asked for under 100 ms. Wall time is whatever the machine gives the
test: the analysis costs about 30 ms, but a single sample read up to 95 ms with four busy
processes on this four-core machine, and 101 ms once while the e2e suite shared it.

- **The clock.** The main thread's own CPU time (`process.threadCpuUsage`) where Node has
  it, the wall clock otherwise (the repository's `.nvmrc` is Node 20, which has not): time
  spent waiting for a core is not the analysis's.
- **The statistic.** The fastest of five runs after a warm-up: a slower run measured the
  machine, and only a real regression makes every run slower. The budget stays 100 ms.
- **The shape.** A second test times a listing four times the size and asks for less than
  eight times the cost. The analysis is linear (about 4×); a pass over every pair grows
  sixteen-fold, and fails this while the heaviest listing is still inside the budget.

Measured on the heaviest listing (1×) and four times it (4×):

| Machine                           | Clock           | 1× (budget 100 ms) | 4× ÷ 1× (limit 8) |
| --------------------------------- | --------------- | ------------------ | ----------------- |
| idle                              | thread CPU      | 26 ms              | 4.3               |
| beside a full `npm run test:ci`   | thread CPU      | 26–28 ms           | 3.7–4.2           |
| four busy loops on the four cores | thread CPU      | 32–33 ms           | 4.0–4.4           |
| four busy loops on the four cores | wall (fallback) | 49–63 ms           | 4.9–6.3           |

Both tests passed in four runs of the file during a concurrent `npm run test:ci` (which also
passed). With the analysis made four times slower throughout, the budget test fails (117 ms);
with a quadratic pass worth about 25 ms added (55 ms in all, inside the budget), the shape
test fails (8.85). The two tests take about 1.2 s together.
