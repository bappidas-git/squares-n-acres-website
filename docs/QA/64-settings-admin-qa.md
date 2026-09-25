# 64 — Settings admin QA (Site settings, Users, My profile)

**Date:** 2026-09-25 · **Toolchain:** Node 22, Chromium (Playwright 1.63), the CRA
development server · **Backend:** the mock on `:4000`, seeded from the committed
`db.json` (restored before each group of scenarios and before the final passes).

**Admin → Settings** — Site settings at `/admin/settings` with its seven panels
(General, Contact, Hero, Navigation & footer, Newsletter, Integrations, Lead
notifications), Users at `/admin/settings/users` with its dialogs, and My profile at
`/admin/profile` (linked from the Settings header and the sidebar) — was exercised
as admin, manager and sales at 375, 768, 1 440 and 1 920 px, with the API driven
directly as well as through the screens, and two browsers open on the same screen at
once.

The screens loaded and looked right; what was wrong showed under use. **A save sent
the whole settings record, so a tab opened before a colleague's save put their
change back** — the hero title saved in one tab was silently reverted by a tagline
saved in another. **An address typed into Lead notifications and followed by a click
on Save was dropped without a word**, and the settings were "saved" without it.
**Tabbing through the Contact tab raised "You have unsaved changes."** over a form
nobody had changed. Messages read "The general.siteName may not be greater than 120
characters." and "The hero.stats.0.label field is required.". A refused save with
the problem below the fold did nothing that could be seen. On the Users screen, an
account could be created or reset with `aaaaaaaa` — a password the "Change
password" form refuses — and "Reset password" promised to sign the user out of
their other sessions and signed out none. Renaming yourself there left the header
and My profile on the old name, and saving My profile put it back.

**30 defects were found — 2 High, 11 Medium, 17 Low — and all 30 are fixed.** Two
regressions of this work's own fixes were caught before the merge by its own browser
pass and end-to-end tests, and are fixed too (§2 G). Every defect was reproduced
before it was fixed — in the browser or against the API, and U7's toggle sentence in
the unit test run against the code before the fix — and each is held by a unit, API
or end-to-end test and by the final browser pass (§4).

---

## 1. Scope

**Screens.** `/admin/settings`: the header (Users, My profile, Save settings), the
manager's read-only banner, the tab strip with its error badges, the seven panels —
every field, the Logo/Icon/Hero/Gallery image fields with Clear, Media library and
"Reset to brand assets", the preview cards, the WhatsApp link preview, the map
preview, the four repeaters (opening hours, counters, footer columns and their
links, the gallery), the search-tab picker, the two chip fields (badges, notification
e-mails), the switches and selects — and the sticky save bar with Discard. The
loading, error and retry states. `/admin/settings/users`: the list (search, Role,
Status, sort, pages, the phone's cards), Add / Edit (the dialog), the Active switch,
Reset password, Delete, the bulk bar. `/admin/profile`: the profile and password
cards. The API behind them: `GET/PUT /admin/settings`, `GET /settings`,
`GET/POST /admin/users`, `GET/PUT/PATCH/DELETE /admin/users/:id`,
`POST /admin/users/bulk`, `GET/PUT /auth/profile`, `PUT /auth/password`.

**Workflows.**

- Edit → save → reload → verify, on every panel; Discard; the public footer and
  header reading the saved record; create → view → edit → save → reload → deactivate
  → reset → delete a user, through the screens and the API.
- Every field with empty, whitespace-only, over-long (`maxLength + 1`), malformed,
  special-character and pasted values; phone numbers in every way people write them
  (`98765 43210`, `+91-98765-43210`, `919876543210`, `09876543210`, `+44…`, `12345`);
  coordinates out of range and one without the other; PIN codes with spaces, letters
  and seven digits; link targets `contact`, `javascript:`, `//host`, `#two words`,
  `mailto:`, `tel:`; integration ids in lower case, too short, too long.
- Repeaters: add to the limit, remove, reorder by the arrows and by `Alt+↑/↓`,
  twice in a row, inside a nested list; an empty row saved.
- State and sequence: refresh on every tab; first tab to last and straight back;
  Back and Forward (in-app and across full loads); a direct `?tab=` address, a wrong
  one; leaving with unsaved edits (sidebar, header links, Back, reload); leaving
  during a slow save; Discard repeatedly; the media picker opened and closed three
  times; Ctrl/Cmd+S clean and dirty.
- Failure: the settings load answering 500 then Try again; a slow load (skeleton);
  a save answering 422 on fields of two tabs, 503, and a dropped connection; a slow
  save with fields, tabs and navigation used during it.
- Concurrency: two tabs editing different panels and saving in turn; two admins on
  the Users screen; a profile refresh arriving after My profile has opened.
- Rapid input: double-click on Save; Enter held in dialogs; Save pressed straight
  after typing.
- Roles: admin (full), manager (read-only settings, no Users, API 403 on `PUT`),
  sales (403 on both settings screens, no sidebar entry, its own profile).
- Users specifics: your own row (role, Active, Delete, reset), the last active
  admin, bulk actions with and without yourself, duplicate e-mails in any case,
  sessions after a reset and after a deactivation, `?page=9`, `?role=superuser`,
  `?sort=password&order=sideways`, `?perPage=100000`.
- Layout: 375, 768, 1 440 and 1 920 px — no sideways scroll, the tab strip scrolling
  on a phone with the active tab in view, the fixed save bar, the full-screen user
  dialog.

**What held up.** The validation of the integration ids (upper-casing GA4 and GTM as
they are typed), the e-mail, URL, year and CTA rules, the tab error badges and the
switch to the tab of a server's 422, Discard, the manager's read-only screen (not one
live control on any panel; the API's 403), sales' 403s, the in-app unsaved-changes
guard (sidebar, header links, in-app Back), `beforeunload` on reload, the load error
and Try again, the skeleton, a double-click on Save (one request), the fields locked
during a save, the media picker, "Reset to brand assets", the public site picking up
a save (header, footer, tagline), the Users list's search, filters, sort, paging and
their addresses (Back, Forward and reload restore them; every odd address degrades to
a sane view), duplicate e-mails in any case (409), the last-admin and self rules of
the API, the "(You)" marker, the layout at every width.

---

## 2. Defects found and fixed

Severity: **High** — wrong data kept or silent data loss; **Medium** — a real error
with a work-around, a security rule not kept, or a misleading answer; **Low** —
polish, wording, edge cases. "Console / network" says what the browser showed;
"Cause" is the root cause found; "Fix" is what was changed.

### A. Site settings — the screen

**S1 · High — A save put back what a colleague had saved since the form was opened.**

- **Where:** Save settings, every panel; `PUT /admin/settings`.
- **Steps:** open `/admin/settings` in two tabs (or as two admins) → in tab B change
  the hero title and save → in tab A change the tagline and save → reload.
- **Expected:** both changes kept.
- **Actual:** the hero title is back to what it was when tab A opened; tab A's form
  goes on showing the old title. No message anywhere.
- **Console / network:** clean; tab A's `PUT` carried all eight panels.
- **Cause:** the form sent the whole record on every save ("the API's deep merge is a
  safety net rather than something this screen leans on"), so every panel went back
  as the form had loaded it; and after a save the form kept its own values rather
  than the server's.
- **Fix:** a save sends only what changed since the form loaded or last saved
  (`changedSettings`, diffed against the form's baseline; arrays whole, as the API
  replaces them), and afterwards the form takes the record the API answers — so tab
  A now shows B's title too. A change that is only spaces sends nothing and says
  "No changes to save.".

**S2 · Medium — A refused save did nothing that could be seen.**

- **Where:** the header's Save settings; any panel.
- **Steps:** on Contact, type `12` as the PIN code (below the fold), scroll to the
  top, press Save settings. Or break a field on Contact and press Save on Hero.
- **Expected:** the field in error in view, with the cursor in it.
- **Actual:** nothing visible — no toast, no scroll, no focus; from another tab only
  the tab switched and a red "1" appeared, with the field off-screen.
- **Cause:** the screen switched to the owning tab but never looked for the field
  (QA-60 fixed the same thing in `MasterDataPage` with `focusFirstError`).
- **Fix:** once the refused save's messages are drawn on the owning tab, the first
  field in error is focused and scrolled to the centre — for a client refusal and for
  an API 422 alike.

**S3 · Medium — Messages named the record's keys.**

- **Where:** every panel, and every 422 from the API.
- **Steps:** a 121-character site name; an empty counter or opening-hours row; a
  latitude of 100; an empty gallery slot; a 151-character hero title.
- **Actual:** "The general.siteName may not be greater than 120 characters.", "The
  hero.stats.0.label field is required.", "The general.latitude may not be greater
  than 90.", "The footer.galleryImageUrls.0 must be a valid URL.".
- **Cause:** the schema's and the API's sentences name the key, and the screen passed
  no labels to `useForm` (QA-55 added them elsewhere); keys of repeater rows cannot be
  listed in a map.
- **Fix:** `settingsLabel(key)` names every field of the record and every repeater row
  ("The site name may not be greater than 120 characters.", "The latitude may not be
  greater than 90.", "label of counter 1"), and `useForm`'s `labels` now also takes a
  function. The rows' empty fields have their own sentences ("Say which days this row
  is for.", "Name what this counter counts.", "Choose a picture for this slot, or
  remove the slot.").

**S4 · Medium — The open panel was lost on reload, and could not be linked to.**

- **Where:** the tab strip.
- **Steps:** open Integrations → reload (or Back into the screen, or share the
  address).
- **Expected:** Integrations again.
- **Actual:** General. The address never changed, so the SEO settings' "Open Site
  settings" landed on General while telling the reader to go to Integrations, and
  QA-63 had to leave "Configure Cloudinary in Settings → Integrations" unlinked.
- **Fix:** the panel is `?tab=` in the address (replaced, not pushed, so Back leaves
  the screen rather than walking back through panels); an unknown value opens General;
  `PATHS.adminSettingsTab(key)` builds a link, and the SEO Analytics tab now opens
  Site settings → Integrations directly.

**S5 · Low — Ctrl/Cmd+S opened the browser's "Save page as".**

- **Fix:** it saves, as every other editor of the admin does; on a clean form it says
  "No changes to save."; not from a dialog, not twice for a held key.

**S6 · Low — Leaving during a save asked "Discard unsaved changes?", and discarded
nothing.**

- **Steps:** Save on a slow connection → click Dashboard → "Discard changes".
- **Actual:** the save landed after the editor had left ("Site settings saved" on the
  dashboard) — the changes the dialog said would be discarded were kept.
- **Fix:** while a save is on its way the question is "Leave while the settings are
  saving?" — "The save carries on after you leave, and a message says if it fails…",
  Leave / Stay until it is saved.

### B. Contact

**C1 · Medium — Visiting a phone box raised "You have unsaved changes.".**

- **Steps:** Contact → click into Phone (or WhatsApp, or the empty Alternate phone) →
  click out.
- **Actual:** the save bar appears; Discard/Save offered over a form nobody changed;
  leaving asks "Discard unsaved changes?".
- **Cause:** the box rewrites a number to the readable `+91 98000 00001` when it is
  left, and the seed stores `+919800000001`; an empty box rewrote `null` as `''`.
- **Fix:** the record is loaded with its numbers in the readable form, and leaving a
  box compares like with like (an empty box stays `null`). A save sends a number only
  when it was edited.

**C2 · Medium — The WhatsApp box refused the numbers its hint asked for.**

- **Steps:** WhatsApp number `919876543210` ("Digits with the country code — 10 to 15
  of them") → Save. Also `09876543210` in Phone.
- **Actual:** "Enter a 10-digit Indian mobile number, with or without +91." — and
  `+44 7911 123456` passed the "10 to 15 digits" check only to be refused by the same
  Indian-mobile message.
- **Cause:** the check stripped only `+91`; the hint described international numbers
  the API's `phone` type cannot store.
- **Fix:** `91…` (12 digits) and `0…` (11 digits) are read as the mobile they are and
  formatted `+91 98765 43210` — on the way out too, so the API accepts them even if
  the box was never left; the hint and the message say what is actually asked for (an
  Indian mobile).

**C3 · Low — One coordinate without the other was accepted.** The map drew nothing and
the knowledge graph was handed half a position. **Fix:** "Add the longitude too — the
map needs both, or neither." (and the other way round).

**C4 · Low — Latitude and longitude opened the numeric keypad**, which has no decimal
point on a phone. **Fix:** `inputMode="decimal"`.

**C5 · Low — A pasted PIN code " 560001" was cut to " 56000" and refused.** **Fix:**
the box keeps digits only, six at most, however they were typed or pasted.

### C. Hero, Navigation & footer, and the repeaters

**H1 · Medium — Moving a row with the keyboard sent the focus to its neighbour.**

- **Where:** opening hours, counters, footer columns, footer links (every list keyed
  by position; `SortableList`).
- **Steps:** focus "Move Gamma up" → Enter → Enter.
- **Expected:** Gamma moves up twice.
- **Actual:** the focus lands on "Move Beta up" after the first press, so the second
  press puts the row straight back. In footer columns the focus jumped into the moved
  column's link list ("Move Legal assistance up").
- **Cause:** the list found the moved row by the id it had _before_ the move — for a
  list keyed by position, the neighbour's — and searched nested lists too.
- **Fix:** the row is found by its id at its new place, among the list's own rows,
  and its own arrows. Lists with real ids behave as before.

**H2 · Low — A badge too long for the hero was taken, then refused at Save, and
counted twice.** A 61-character badge became a chip; Save answered with a message
under the field and "2 errors" on the tab; a server's message about one badge or one
notification address (`hero.badges.2`) would never have been shown. **Fix:** it is
refused as it is typed ("Too long — keep a badge to 60 characters"), and a message
about one entry of a list is shown, and counted once, on the list.

**H3 · Low — "No tab chosen — the hero offers all five, in the order above."** The
list is below it. **Fix:** "in the order listed below".

**N1 · Low — `//evil.com` passed as a path** for the header button and footer links;
a browser reads it as another site. **Fix:** a path is `/` not followed by `/`.

**N2 · Low — An empty gallery slot blocked the save with "The
footer.galleryImageUrls.0 must be a valid URL.".** **Fix:** "Choose a picture for this
slot, or remove the slot." (S3's labels cover a malformed one).

### D. Lead notifications and the chip fields

**L1 · High — A notification address typed and followed by a click on Save was
dropped, and the settings "saved".**

- **Steps:** Lead notifications → type `ops@squaresnacres.com` (without Enter) →
  click Save settings (or click anywhere else).
- **Expected:** the address saved.
- **Actual:** the box empties, nothing is added, "Site settings saved" — and new leads
  are never e-mailed there. With nothing else changed, Save was disabled, so the click
  did nothing at all.
- **Cause:** MUI's Autocomplete clears unconfirmed text on blur.
- **Fix:** the chip fields of the settings (`commitOnBlur`) add what was typed when
  the box is left, as Enter would, inside the same event — so the click on Save saves
  it; what cannot be added stays in the box instead of being cleared. Save settings is
  always pressable (a clean form answers "No changes to save.", as the other editors
  do). The badges field works the same way.

**L2 · Low — An invalid address vanished with no word of why; a duplicate did nothing
silently.** `not-an-email` + Enter emptied the box; `INFO@squaresnacres.com` + Enter
(already listed) did nothing. **Fix:** the list says why instead of offering "Add":
"“not-an-email” is not an e-mail address", "“INFO@…” is already added", and the text
stays to be corrected (`MultiSelect`'s `checkNew`).

### E. Users

**U1 · Medium — Accounts were created and reset with passwords the password rule
refuses.**

- **Steps:** Add user → password `aaaaaaaa` (or `12345678`) → Create; or Reset
  password → `12345678`.
- **Expected:** refused, as "Change password" and `PUT /auth/password` refuse them
  (§5.4: "not eight letters or eight digits").
- **Actual:** created — and the account signs in with `aaaaaaaa`.
- **Console / network:** `POST /api/admin/users` → 201.
- **Cause:** the rule lived only in the password route; `user.create`/`update` asked
  for eight characters.
- **Fix:** one rule, `PASSWORD_PATTERN` in `src/services/schemas/auth.js`, kept by the
  API on create, `PUT` and `PATCH` ("The password must contain at least one letter and
  one digit.") and by the screen before the request ("Use at least 8 characters, with
  a letter and a digit."), in the form and in the reset dialog.

**U2 · Medium — "Reset password" promised a sign-out and signed nobody out.**

- **Steps:** sign in as a user in another browser → as admin, Reset password ("The
  user is signed out of their other sessions.") → use the other browser.
- **Actual:** it goes on working — `GET /auth/profile` 200 with the old token.
- **Cause:** the users routes revoked tokens on deactivation only.
- **Fix:** setting a password (`PATCH`/`PUT` with `password`) revokes every token of
  the account — the caller's own excepted when an admin resets their own. The hint
  says which ("Sales User is signed out everywhere." / "Your other sessions are signed
  out; this one stays.").

**U3 · Medium — Renaming yourself left the header and My profile on the old name —
and saving My profile put it back.**

- **Steps:** Users → Edit Admin User → name "Admin Renamed" → Save → the header still
  reads "Admin User" → Profile (in-app) → the form reads "Admin User" → Save profile.
- **Actual:** the server's name goes back to "Admin User".
- **Cause:** the Users screen never handed the saved record to the signed-in session.
- **Fix:** saving your own row updates the session (name, e-mail, role, phone,
  avatar): the header changes at once and My profile opens on the new values (P1 makes
  the profile form follow the session too).

**U4 · Low — Your own row offered Delete — "This cannot be undone." — and then refused
it, and an Active switch that could only fail.** **Fix:** no Delete on your own row, and
its Active switch is locked (the role select already was). The API still owns the
rules.

**U5 · Low — Enter in the Reset password box did nothing.** **Fix:** the box is a form;
Enter resets, once.

**U6 · Low — Bulk Deactivate on an account already inactive said "1 user updated.".**
The list's "Nothing to change: the selected users were already inactive." could never
show.
**Cause:** the API counted the ids, not the changes (§5.8 says `affected` counts what
changed). **Fix:** only the accounts whose state changes are written and counted.

**U7 · Low — Two sentences said the wrong thing.** The single delete confirmation did
not say that the user's leads are unassigned (the bulk one did); switching a user off
said "“Sales User” is no longer live". **Fix:** "“X” will be removed and their leads
left unassigned. This cannot be undone."; "“X” can no longer sign in" / "can sign in
again" (`MasterDataPage` gained `deleteMessage`, `flagMessage` and `canToggleActive`).

**U8 · Low — The contract described Users as a slugged resource with a delete guard.**
`docs/API_CONTRACT.md` said a user's create "generates and de-duplicates the slug", a
replace "regenerates the slug", and a delete answers "409 when it is still in use"; none
of the rules users do have was there. **Fix:** the rows, the registry's descriptions,
the side effects of `03_ENDPOINTS.md`, a new "Admin users" section in the business
rules, the auth notes and the parity checklist.

### F. My profile

**P1 · Medium — The profile form kept what it had mounted with, and Save wrote it
back.** A profile refresh that arrived after the screen opened (a slow connection), or
a name saved on the Users screen, changed the header but not the form; Save put the
older name back. **Fix:** while nothing has been typed, the boxes follow the signed-in
user; once something has, they are left alone.

**P2 · Medium — Nothing asked before leaving an edited profile or a half-typed
password.** Every other form of the admin asks. **Fix:** both cards register with the
navigation guard (and `beforeunload`).

**P3 · Low — "The avatarUrl must be a valid URL."** **Fix:** "The avatar URL must be a
valid URL." (and the password fields' API messages alike).

**P4 · Low — A "new" password equal to the current one was accepted**, signing every
other session out and changing nothing else. **Fix:** "Choose a password different from
the current one." before the request.

### G. Regressions of this work's own fixes, found before the merge

**R1 · (L1) An address that was the only change still could not be saved by clicking
Save.** The first fix committed the typed address a microtask after the blur, and the
header's Save was still disabled on a clean form, so the click that left the box landed
on a disabled button. Found by the browser pass. **Fix:** a create that answers at once
is added inside the blur event, and Save is always pressable.

**R2 · (C1) Visiting the empty Alternate phone still raised "unsaved changes".** The
first fix formatted the stored numbers; an empty box still wrote `''` over `null`.
Found by the new end-to-end test. **Fix:** the blur compares like with like.

---

## 3. Notes on the fixes

**What a settings save sends.** `changedSettings(next, base)` compares the body the
form would send with the same body for the values it started from: objects key by key,
anything else — text, numbers, `null`, switches, whole arrays — as a value. The API's
deep merge (§5.14) is now what the screen relies on, which the business rules say in so
many words. The form still holds and validates the whole record.

**The form after a save** is the record the API answered (with its phone numbers in the
readable form): `useApi`'s `setData` hands it to the same sync that loads the first
record. That sync is now keyed on the record, not on its `updatedAt` — an API that sent
none would have looped.

**`useForm`** returns its `baseline` (what `dirty` compares against), and its `labels`
may be a function.

**`SortableList`** looks for the moved row by `getId(row, newIndex)` among its own
children, and for the arrow among the row's own arrows. Every list with real ids answers
as before; every list keyed by position is fixed at once.

**`MultiSelect`** gains `checkNew(label)` (a disabled line saying why instead of
"Add …", and a line for an entry already chosen) and `commitOnBlur` (MUI's `autoSelect`,
with `clearOnBlur` off). `commitOnBlur` takes the highlighted option, so it belongs to a
field whose options are its own values — the settings' badges and e-mails — not to a
search over other records.

**`MasterDataPage`** gains `canToggleActive(row)`, `deleteMessage(row)` and
`flagMessage(label, field, value)`; nothing changes for a screen that does not pass them.

**The password rule** is `PASSWORD_PATTERN` / `passwordMessage()` in
`src/services/schemas/auth.js`, read by `routes/auth.js`, `routes/users.js`, the Users
screen and its reset dialog. The schema registry now lists the auth group's three
schemas explicitly, so the module's constants do not become registry keys.

**Contract.** `docs/API_CONTRACT.md` (the users rows),
`docs/backend-notes/02_auth.md`, `05_business_rules.md` (Settings: "the admin sends only
what changed"; a new "Admin users" section, with its slot in the guidelines template),
`08_testing.md` (Settings and Users lines of the checklist), the registry's descriptions
and the generator's side effects; `backend_developer_guidelines/` regenerated from a
freshly seeded mock.

---

## 4. Verified

| Pass                                                                                                                                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser (Playwright, dev server)                                                                                                                                                     | every defect above re-run as a scenario after the fix — 30 settings checks (the phone boxes, `919800000000` sent as `+91 98000 00000`, the coordinate pair, the decimal keypad, the pasted PIN, the named messages, the focused field below the fold and on another tab, opening hours / counters / footer columns / footer links moved twice, the long badge refused and a badge kept on blur, the search-tab copy, `//evil.com`, the gallery slot, the e-mail refusals, an address typed and saved by the click on Save with a body of `{"leads":…}` only, Ctrl+S clean and dirty, the tab kept by a reload), the two tabs (both changes kept, tab A showing B's title), the leave-while-saving question, the SEO link landing on Integrations; 18 users and profile checks (your own row, the password rule, the reset hint, Enter, the old session answering 401, "Nothing to change", the delete and toggle sentences, the header and My profile after renaming yourself, Save profile keeping it, the profile guard, the avatar message, the same password); the slow profile refresh; the manager (no live control on any panel) and sales (403s) — console clean apart from the refusals asked for |
| Regression (browser)                                                                                                                                                                 | the earlier scenarios re-run: load error and Try again, the skeleton, a 422 on two tabs, a dropped connection, the fields locked during a slow save, the image fields and the media picker, the Users list's search, filters, sort, odd addresses and bulk bar, 375 and 768 px — unchanged or better                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Jest                                                                                                                                                                                 | 209 suites, 4 201 tests ✓ — new: `UsersPage.test.jsx`, `settingsSchema.test.js`, 15 cases in `SettingsPage.test.jsx` (and 2 changed), and cases in the `ProfilePage`, `SortableList` and `MultiSelect` suites; run against the code before the fixes, 16 of the settings screen's new and changed cases, 7 of the users cases, 4 of the profile cases, 4 of the 5 new `MultiSelect` cases and the 3 new `SortableList` cases fail (the others guard against over-correcting)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `test:mock`                                                                                                                                                                          | 337 / 337 ✓ — 4 new cases (the password rule on create, `PUT` and `PATCH`; a reset ending the account's sessions; an admin's own reset keeping its session; a bulk action counting only changes) and one corrected (the bulk test expected an already-active account to be counted); all five fail on the route before the fixes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Playwright e2e (`e2e/`)                                                                                                                                                              | 74 / 74 ✓ — new in `settings.spec.js`: two tabs saving different fields, the tab in the address surviving a reload, visiting the phone boxes, and the Users password rule with a reset ending the old session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm run check:all` (`lint`, `test:ci`, `test:mock`, `test:scripts`, `build:ci`, `check:traces`, `validate:seed`, `check:contrast`, `check:guidelines`, `check:env`), `format:check` | ✓ (`check:guidelines` 12 / 12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 5. Not changed, and why

- **Two admins changing the same field: the later save wins.** S1 stopped saves of
  _different_ fields from colliding. There is no version check anywhere in the admin
  (no `If-Match`, no `updatedAt` precondition); adding one is a change to every form
  and to the contract, not a Settings fix (QA-63 said the same of the media drawer).
- **Back pressed in the same frame as the first keystroke leaves without asking.** The
  navigation guard is armed by an effect after the render the keystroke causes; Back
  50 ms later is caught. No person can do it; a test driver can. Every form shares it.
- **A bulk action that includes your own account is refused whole**, with the API's
  sentence (all or nothing). The table cannot make one row unselectable, and the
  refusal changes nothing.
- **A manager sees "Clear", "Reset to brand assets" and the Add buttons disabled** —
  the read-only form's convention; nothing on it is live.
- **`http://` social addresses are accepted.** The panel asks for `https://`, but the
  contract's type is `url`; tightening it is a contract change.
- **The Background video box takes any address**, an image's included. The media
  picker opened from it offers videos only; a typed address is not probed.
- **The Users form's e-mail box carries `autocomplete="email"`**, so a browser may
  offer the admin's own address. It is the shared form kit's; changing it there
  reaches every e-mail box of the admin.
- **`?perPage=100000` shows 100 in the select** while the request asks for 100000 and
  the API clamps it — the shared list behaviour QA-63 already covered.
- **A new password equal to the current one** is refused by the screen only; the API
  keeps its contract.
- **An administrator resets their own password without the current one** — the
  administrator's power over accounts; "My profile" still asks for it.
- **Jest's "A worker process has failed to exit gracefully"** ended one full run and
  not the final `check:all` run; it fails nothing, and the suites added here leave no
  open handles when run on their own.

## 6. Could not be fully tested

- **Uploads to a real Cloudinary.** There is no cloud name here; the image fields were
  filled through the Media library and by address.
- **External assets.** Fonts, icons, Cloudinary and picsum images and the Google Maps
  embed cannot be reached from the test browser; they were answered with placeholders,
  so icons and pictures were checked for presence and size, not appearance.
- **E-mail delivery** of lead notifications and **round-robin assignment** — the mock
  sends no mail; the stored list and policy were verified, the assignment itself is
  covered by the leads suites.
- **The Laravel API.** Everything ran against the mock; the new rules are specified for
  it in the business rules, the auth notes and the regenerated guidelines.
- **Other browsers, real touch devices and screen readers.** Chromium only, touch
  emulated by width, accessible names and roles checked rather than listened to.

## 7. Risks to watch

- **The Laravel backend must deep-merge `PUT /admin/settings`.** The screen now sends
  only what changed; a `PUT` that replaced whole groups would wipe the rest of a group
  the editor touched one field of.
- **The Laravel backend must keep the password rule** on user create, replace and patch,
  and revoke an account's tokens when its password is set — or the Users screen's
  promises are the only thing keeping them.
- **The session is updated from the Users screen in this browser only.** An admin
  renamed from another browser sees the new name at the next load (the session is
  confirmed with the API then), not before.
- **`commitOnBlur`** takes whatever option is highlighted when the box is left; it is
  safe for fields whose options are their own values and must not be turned on for a
  search over other records.
- **Save settings is always pressable.** A clean form answers "No changes to save."; a
  script or test that waited for it to become enabled should wait for the save bar
  instead.
