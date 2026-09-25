# 65 — My profile admin QA

**Date:** 2026-09-25 · **Toolchain:** Node 22, Chromium (Playwright 1.63), the CRA
development server · **Backend:** the mock on `:4000`, seeded from the committed
`db.json` (reseeded before the guidelines were regenerated).

**Admin → Profile** — `/admin/profile`, reached from the sidebar's **Profile**, the
account menu's **My profile** and the Settings header — was exercised as admin,
manager, sales and a throwaway account with a 72-character name and a 71-character
address, at 320, 360, 375, 414, 768, 1 024, 1 280, 1 440 and 1 920 px; with the API
answering slowly, failing, answering things the form did not expect, and driven
directly; in two tabs at once; and with the keyboard alone.

QA-64 had already been through this screen, and its fixes held. What remained showed
under timing and repetition. **A reload's session check, slow to answer, put the name
saved in the meantime back to the old one** — in the header, in storage and in the
form — and the next save wrote the old name to the server. **A save that answered
after signing out and back in as the sales user put the admin's name, role and
navigation on the sales session.** **Two tabs undid each other**: a phone number saved
in one put back the name saved in the other, because My profile never read the
account again and the tab never heard of the other's save. Whatever was typed while a
save was on its way was wiped when it answered. A refusal about a field the form does
not have, or about none, showed nothing at all. Leaving during a save asked "Discard
unsaved changes?" and discarded nothing — a password included. `PUT /auth/password`
let an open session guess the current password without limit. The keyboard's ring
around the sidebar's red **Profile** item was blue on red on charcoal (1.4:1) — the
ring in the screenshot this pass started from.

**26 defects were found — 2 High, 9 Medium, 15 Low — and all 26 are fixed.** Every
one but N3 (below) was reproduced on the unfixed code, in the browser or against the
API. Each is held by a unit, API or end-to-end test (§4), except two that are styling
alone — N3's scrollbar and N6's icon — checked in the browser. The new tests were run
against the code before the fixes as well: 36 unit, 2 API and 8 end-to-end cases fail
there; the rest guard against over-correcting.

---

## 1. Scope

**Screens.** `/admin/profile`: the page header (e-mail, role chip), the **Profile**
card (Full name, Phone with its `+91` prefix, Avatar URL with its preview, Save
profile, and — new — Discard changes) and the **Change password** card (three
boxes, Change password); the sidebar's **Profile** item (expanded, the icon rail, the
phone's drawer); the topbar's account button and menu (identity, **My profile**,
**Logout**). The API behind them: `GET /auth/profile`, `PUT /auth/profile`,
`PUT /auth/password`, `POST /auth/login`, `POST /auth/logout`.

**Workflows.**

- Edit → save → reload → verify, for each box, as each role; the header, the account
  menu and the Leads list (the hint promises the name there) after a rename.
- Every box with empty, whitespace-only, one-character, 81-, 5 000- and 501-character,
  HTML (`<img src=x onerror=…>`), apostrophe, accented and emoji values; phone numbers
  as people write them (`+91 98450 12345`, `098450 12345`, `919845012345`, `12345`,
  `abcdefghij`, `5845012345`, `+44 7911 123456`, spaces only); addresses `not a url`,
  `javascript:alert(1)`, `https://`, `https://x`, `ftp://…`, padded with spaces, one
  that does not load, one that loads.
- Passwords: all empty, wrong current, mismatch, `short1`, `aaaaaaaa`, `12345678`,
  eight spaces, Cyrillic, emoji, 101 characters, the current one again, a real change
  (the other session answering 401, this one 200, the login form taking the new one).
- State and sequence: the menu's My profile from the page itself; the sidebar's
  Profile from the page itself; Back and Forward; a dirty form left by the sidebar,
  Back, the account menu, Logout and a reload; Discard, then Back; odd addresses
  (`/admin/profile/`, `?tab=password`, `#password`, `/admin/profile/extra`,
  `/admin/Profile`, `/admin/profiles`).
- Timing and failure: a slow save with the boxes and the page used during it; a slow
  session check (`GET /auth/profile`) with a save made before it answered; 500, a
  reset connection, 429, a 422 about a field the form lacks and one about none, a 200
  carrying a proxy's HTML page and one carrying no record; leaving during a slow save
  and a slow password change, each then succeeding and failing.
- Concurrency: two tabs of one browser; a change made through the API (another device,
  or an administrator on the Users screen) while My profile was open or before it was
  opened in-app.
- Repetition: five clicks on Save; five submits dispatched in one task; Enter held;
  the account menu opened and closed five times; thirty wrong current passwords
  straight at the API.
- Session: the token revoked while the page was open (save and password change), the
  token expiring with a form half typed; signing back in lands on My profile.
- Security: a profile `PUT` carrying `role`, `email`, `isActive`, `password` and `id`
  as a sales user; markup in the name, rendered everywhere the name is.
- Layout and keyboard: every width above, the tab order, the ring on each stop and its
  contrast, the rail's tooltip, the drawer closing on a tap of Profile.

**What held up.** QA-64's fixes (the boxes following the account while untouched,
the guard on an edit and a half-typed password, the avatar field's name in messages,
the same password refused); the phone number's forms and its ten stored digits; the
password change itself — this session kept, every other revoked, the login taking the
new password; the guard on the sidebar, Back, Logout and reload (`beforeunload`);
the session ending mid-page with one toast and a return to My profile after signing
in; every role saving its own profile; no privilege escalation through the profile
`PUT` (`role`, `email`, `isActive`, `password` and `id` are ignored); markup in a name
rendered as text everywhere; a rename reaching the Leads list; the drawer; the rail's
tooltip; the page at 360 px and up.

---

## 2. Defects found and fixed

Severity: **High** — wrong data kept or silent data loss; **Medium** — a real error
with a work-around, a security rule not kept, or a misleading answer; **Low** —
polish, wording, edge cases. "Console / network" says what the browser showed;
"Cause" is the root cause found; "Fix" is what was changed.

### A. The profile form, and the session behind it

**P1 · High — A slow session check put the old name back over a save.**

- **Where:** My profile after a reload (any admin screen after a reload); the header;
  `sna_auth_user`.
- **Steps:** reload `/admin/profile` on a slow connection (`GET /auth/profile`
  answering in 5 s) → change the name → Save profile ("Profile saved") → wait.
- **Expected:** the saved name stays.
- **Actual:** when the check answers, the header, the stored session and the form go
  back to the old name; the server has the new one. The next Save (a phone number,
  say) writes the old name back.
- **Console / network:** clean; the `GET` was asked before the `PUT` and answered
  after it.
- **Cause:** `AdminAuthContext` took every profile answer as it came, with no notion
  of order against the writes made since it was asked.
- **Fix:** the context counts the writes of the signed-in user (a sign-in, a profile
  save, your own row on Users, another tab's save, the session ending); a profile read
  carries the count it was asked at and is dropped when a write landed meanwhile. A
  copy older than the one held — by the server's `updatedAt` — is dropped too.

**P2 · High — A save that answered after signing out and in as someone else put
its account on the new session.**

- **Where:** the header, the sidebar, `sna_auth_user`; any screen after the sign-in.
- **Steps:** as the admin, change your name → Save profile on a slow connection →
  Logout ("Discard changes") → sign in as the sales user → the admin's save answers.
- **Expected:** the sales session stays the sales session.
- **Actual:** the header reads "Admin Late Save", the stored session says the role
  is `admin`, and the sales user's sidebar grows the whole admin navigation
  (Articles, Pages, FAQs, Master data, Content, Media, SEO, Settings). The API still
  refuses them, but the screen says the sales user is the admin.
- **Console / network:** clean — the save succeeded, for the admin.
- **Cause:** the form's save called the `updateUser` of the render it was made in,
  which merged the answer into whatever session was signed in by then.
- **Fix:** `updateUser` reads the session as it is now, and refuses a record of another
  account and any write once the session has ended. (P6 also words the question:
  leaving during the save now says it carries on.)

**P3 · Medium — What was typed while a save was on its way was wiped.**

- **Steps:** change the name → Save on a slow connection → while it spins, change the
  phone number.
- **Actual:** the answer puts the stored values in every box; the new number is gone,
  with nothing said.
- **Cause:** the boxes stayed editable during the save, and the success handler
  replaced all three with the stored record.
- **Fix:** the boxes are read-only while a save is on its way (`aria-busy` on the
  form), as Site settings' are.

**P4 · Medium — My profile showed a stale account, and saving it undid changes made
elsewhere.**

- **Steps:** open My profile in two tabs → in B rename yourself → in A (which still
  shows the old name, in the form and the header) change the phone → Save. Or: an
  administrator renames you on the Users screen from another browser; you open My
  profile in-app.
- **Actual:** A's save puts the old name back over B's; the in-app visit shows the old
  name, and saving writes it back.
- **Cause:** the screen never read the account on opening — it showed the session
  cached at sign-in or reload — and a tab never heard of another's save. QA-64's
  follow rule was all or nothing: one box typed in froze the other two.
- **Fix:** My profile reads the account when it opens (`refreshProfile`); a profile
  saved in one tab reaches the others through `sna_auth_user`'s `storage` event (same
  account only, never an older copy); and each box follows on its own — a box nobody
  typed in takes the new value, a box with an edit keeps it.

**P5 · Medium — A refusal about a field the form lacks, or about none, showed
nothing.**

- **Steps:** Save, with the API answering `422 { errors: { email: [...] } }`, or `422`
  with no `errors`.
- **Actual:** the button stops spinning; nothing on the screen. Same on the password
  card.
- **Cause:** the handler painted the form's own fields and nothing else.
- **Fix:** each message about one of the form's fields goes under it; anything else —
  another field's message, the `message` of a bare 422 — goes above the form.

**P6 · Medium — Leaving during a save asked "Discard unsaved changes?" and discarded
nothing — a password among them.**

- **Steps:** Save profile (or Change password) on a slow connection → click Dashboard →
  "Discard changes".
- **Actual:** the save lands after leaving ("Profile saved" on the Dashboard) — the
  change the dialog said it would discard is kept; a password is changed after
  "Discard". A failure after leaving is never reported: the message goes to a screen
  that is gone.
- **Fix:** while a save is on its way the question is "Leave while your profile is
  saving?" / "Leave while your password is being changed?" — "The save carries on
  after you leave, and a message says if it fails." — Leave / Stay until it is saved
  (the wording QA-64 gave Site settings). A failure after leaving is a toast: "Your
  profile could not be saved. …", "Your password was not changed. Current password
  is incorrect.".

**P7 · Medium — An answer that was not the record emptied the form and said "Profile
saved".**

- **Steps:** Save, with the API (or a proxy, a captive portal) answering 200 with an
  HTML page or with `{ "message": "ok" }`.
- **Actual:** all three boxes empty, "Profile saved"; the next Save is refused for an
  empty name.
- **Fix:** a 200 without a user record is not a save anybody can confirm: "The
  server's answer could not be read. Reload the page to see whether your profile was
  saved."; the boxes keep what was typed, the session is untouched.

**P8 · Medium — The header's avatar stayed on the initials after the address was
corrected.**

- **Steps:** Avatar URL → an address that does not load → Save → an address that
  does → Save.
- **Expected:** the header shows the picture.
- **Actual:** the initials, until a reload (the account menu, mounted afresh, shows the
  picture).
- **Cause:** `Avatar` remembered that _a_ picture had failed, not which; the header's
  avatar stays mounted from screen to screen.
- **Fix:** the failure is remembered for its address; a new address is tried.

**P9 · Low — The avatar preview showed the company's monogram for a picture that
did not load.** It was square while every avatar is round, and said nothing — the
monogram read as a working picture. **Fix:** the preview is the `Avatar` the header
draws (round, the initials when the picture fails) with "This picture could not be
loaded, so your initials show instead. Check the address." in a polite live region.

**P10 · Low — Initials cut an emoji in half.** A name ending "… 🙂" drew "<�" in the
header: `word[0]` is half of a character outside the Basic Multilingual Plane.
**Fix:** initials are taken by code point.

**P11 · Low — A Save with nothing changed sent the form and said "Profile saved".**
It moved `updatedAt`; so did a change that was only spaces, or the same number
written another way. **Fix:** "No changes to save." (`FORMS.noChanges`, as every other
editor of the admin), no request, and the boxes show the stored values.

**P12 · Low — What the API refuses was only found out by asking it.** An invalid
phone number or address, a one-letter or 81-character name each cost a request and a
red `422` in the console; the name box took 5 000 characters without a word. **Fix:**
the form checks the body against the API's own descriptors (`schemas['auth.profile']`)
before sending it, in the API's words with the form's labels ("The phone number must
be a valid Indian mobile number.", "The name may not be greater than 80 characters.").

**P13 · Low — A refused save put nothing in view.** The cursor stayed on the button,
and nothing brought the field in error, or the message above the form, into view — on
a short screen, or with a phone's keyboard open, they sit above the fold of Save, and
pressing it seemed to do nothing. **Fix:** after a refusal the first field in error
takes the cursor and is scrolled into view (`focusFirstError`); a message about no
field is scrolled into view. Both cards.

**P14 · Low — Runs of spaces inside a name were stored** (`"Admin     User"`). **Fix:**
the name is sent with one space between its words.

**P15 · Low — Submits dispatched before a render were sent once each.** Five
`requestSubmit()` in one task were five `PUT`s; on the password card the first changed
the password and the other four answered "Current password is incorrect." under the
success toast. **Fix:** an in-flight guard read and set in the same event.

**P16 · Low — An edit could only be undone by leaving the page.** **Fix:** "Discard
changes" beside Save profile while the form holds an edit.

### B. The password form

**W1 · Medium — `PUT /auth/password` let a session guess the current password
without limit.**

- **Steps:** with any session's token, send `PUT /auth/password` with thirty wrong
  current passwords.
- **Expected:** a throttle, as the login form's ten a minute.
- **Actual:** thirty `422`s; nothing ever stops it.
- **Cause:** no rate limit on the route; §5.11 covered the login only.
- **Fix:** five attempts a minute **per account** (every session of it counted
  together); the sixth is `429` with `Retry-After` and "Too many attempts to change the
  password. Try again in a minute."; the card says "Too many attempts. Try again in a
  minute.", as the login does. Contract, auth notes, business rules and the parity
  checklist say so; the guidelines are regenerated.

**W2 · Low — The password form had no username field.** Chrome logged "[DOM] Password
forms should have (optionally hidden) username fields for accessibility", and a
password manager could not file the new password under the account. **Fix:** a hidden
`autocomplete="username"` box holding the account's e-mail.

A new password over the API's 100 characters is also refused before the request
("Use at most 100 characters.") — part of P12's rule for this card.

### C. The contract

**C1 · Medium — `avatarUrl` had no length limit, and its column holds 500
characters.** A 3 000-character address was taken by the mock with a 200; Laravel
(`admin_users.avatar_url VARCHAR(500)`, rule `nullable|url`) would fail the write with
a 500, or cut the address short. **Fix:** every `url` of the contract is at most 500
characters unless its descriptor names its own `maxLength` — the 56 `type: 'url'`
descriptors of `src/services/schemas/` that name none, `avatarUrl` and a partner's
`logoUrl` among them (`src/services/schemas/limits.js`, read by the mock's validator,
the forms' `validate()`, the seed's validator and the guidelines' rules, columns and
OpenAPI schemas). The mock answers 422, the form says "The avatar URL may not be
greater than 500 characters.", the generated rules read `url|max:500`. The two admin
checks that do not read the descriptors say so in their own words before sending: the
property form's addresses ("The video URL can be at most 500 characters.") and the SEO
panel's canonical URL and share images, in every form that has the panel and in the
SEO dashboard's dialog. The lead forms keep the page address they send within the
limit (an advertisement's tracking tags can make it longer), and the job application
says so of a pasted résumé or LinkedIn link before sending it.

### D. The account menu, the sidebar and the layout

**N1 · Medium — The keyboard's ring on the sidebar could not be seen.** The ring is
the blue of the light surfaces: 2.1:1 on the charcoal rail, and around the red current
item — **Profile** on its own page — 1.4:1 against the red and nearly invisible (the
screenshot this pass began from). WCAG 1.4.11 asks 3:1. **Fix:** white on the rail,
the design system's own rule for dark bands (`onDark`); 14:1.

**N2 · Low — "My profile" from the account menu, on My profile, added a history
entry.** Back then stayed on the page — and with an edit in hand left it without
asking, since the guard only stops a move to another page. **Fix:** on its own page
the item replaces the entry, as the sidebar's links already do.

**N3 · Low — The sidebar's scrollbar was the page's pale one** — a light stripe down
the charcoal rail once a few groups are open, as in the screenshot: the rail had no
`scrollbar-color` of its own, so it took the page's (`--color-border-strong` on
`--color-surface`) from `global.css`. Headless Chromium draws no scrollbar, so this one
was read from the stylesheet and the screenshot, and its fix from the rail's computed
`scrollbar-color`. **Fix:** a thin light thumb on a transparent track.

**N4 · Low — A long name or address broke the account menu into four lines**, with an
ellipsis on each ("Wolfeschlegelst…", "bartholomew.longna…"). **Fix:** one line each,
the whole of it in the tooltip.

**N5 · Low — At 320 px the two cards ran 32 px past the edge of the screen**, with a
sideways scroll: `minmax(320px, 1fr)` in a 288 px column. **Fix:**
`minmax(min(320px, 100%), 1fr)`.

**N6 · Low — A long e-mail squeezed the shield icon of the page header to a speck.**
**Fix:** the icon and the role chip keep their size; the address wraps.

**N7 · Low — `/admin/profile/extra` showed the admin 404 with "Profile" marked as the
current page.** **Fix:** on an address the panel has no screen for, no item of the
sidebar is current (a group's children included).

---

## 3. Notes on the fixes

**The signed-in user now has an order.** `AdminAuthContext` keeps `userWritesRef`, a
count of the writes of the session's user; `refreshProfile()` and the reload's check
drop an answer asked before the latest write, and `updateUser()` refuses a patch once
the session has ended or for another account (a save sent before signing out that
answered after the next sign-in used to put the previous account's name and role on
the new session). `updateUser` is stable and builds on the latest state, so two writes
in one tick compose. `isOlderCopy()` compares the server's `updatedAt` where both
copies have one; the login answer's six fields have none and are never refused for it.

**Tabs share the account.** The `storage` listener that already signed every tab out
together now also takes `sna_auth_user` — the same account only, never an older copy.

**My profile reads the account on opening**, and `followUntouched()` lets each box
follow on its own. What a save sends is `profileBody(values)` — trimmed, one space
between the name's words, the number's ten digits, `null` for an empty box — compared
with the same body of the stored values to decide "No changes to save.", and checked
with `validate(body, schemas['auth.profile'])` before it is sent.

**Failures** go through `failureOf(error, fields)`: a form's own fields under them,
anything else above the form; `429` in the login's words. After the screen has gone,
the same sentence is a toast.

**`Avatar`** remembers the address that failed, not that one did, reports it through
`onImageError`, keys its `<img>` on the address and takes initials by code point
(`initialsOf` is exported for the test).

**The sidebar** asks `findAdminRoute(pathname)` whether the address is a screen before
marking anything current.

**The rate limiter** takes a `message` for the routes that word their own 429.

---

## 4. Verified

| Pass                                                                                                                                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser (Playwright, dev server)                                                                                                                                                     | every scenario of §1 re-run after the fixes: the edge values (no request for any refusal, no 422 in the console), the phone forms, the slow save, 500 / reset / 429 / both 422s / HTML 200 / empty 200, leaving during both saves (the right question, the save landing, a failure toasted), the slow session check, two tabs, the API change seen on an in-app visit, the avatar broken then corrected, history and guards, odd addresses, every width, the ring's contrast, the rail's computed scrollbar colour, the header icon at 18 px beside a 71-character address at 320 and 375 px, the account menu, the session ending, the late save after signing in as someone else — console clean apart from the failures asked for                       |
| Jest                                                                                                                                                                                 | the five changed suites 60 / 60 — new: `Avatar.test.jsx` (3), `AdminTopbar.test.jsx` (3), 8 cases in `AdminAuthContext.test.js`, 23 in `ProfilePage.test.jsx` (and 3 changed for the new behaviour), 3 in `AdminSidebar.test.jsx`; run against the code before the fixes, 36 fail — all 23 new profile cases and 1 changed one, 6 of the 8 context cases, 2 of the 3 avatar, 2 of the 3 topbar and 2 of the 3 sidebar cases (the others guard against over-correcting). The new cases add no `act()` warnings (the older `user-event` cases of `ProfilePage.test.jsx` print theirs, as they did before; the topbar's menu prints MUI's jsdom `anchorEl` notice, as the Site settings and Media suites' menus do). The whole run: 211 suites, 4 241 tests ✓ |
| `test:mock`                                                                                                                                                                          | 2 new cases in `auth.test.js` (the 500-character avatar, the per-account throttle); both fail on the route before the fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Playwright e2e                                                                                                                                                                       | new `profile.spec.js`, 8 / 8 ✓: two tabs, the slow session check, the avatar broken then corrected, leaving during a slow save, a late save after signing in as someone else, 320 px, the white ring, the throttle; all 8 fail against the code before the fixes. The whole suite: 82 / 82 ✓, and again after the URL follow-up                                                                                                                                                                                                                                                                                                                                                                                                                            |
| URL limit (C1 widened)                                                                                                                                                               | new `urls.test.js`, 7 / 7: a partner's logo, a lead's page, a résumé link, a listing's video, an article's image, a settings address and gallery item, the SEO share image — 501 is 422 under its dotted key, 500 is taken. Jest: `validation.test.js` +2 (every `url` of the registry), `JobApplyForm` +1, the property `validators` +4, new `seoSideEffects` (4) and `leadPageUrl` (5); `guidelines.test.js` 3. On the code before, the 7 mock, 3 guidelines and 7 of the 11 Jest cases on existing code fail. Browser: the property form refuses a 501-character video address under the field and in the summary, focuses it and sends nothing, then saves 500; the SEO dialog refuses a 501-character share image in its own words                    |
| `npm run check:all` (`lint`, `test:ci`, `test:mock`, `test:scripts`, `build:ci`, `check:traces`, `validate:seed`, `check:contrast`, `check:guidelines`, `check:env`), `format:check` | ✓ — Jest 213 suites / 4 257 tests, `test:mock` 346 / 346, `test:scripts` 54 / 54 (one skipped, as before), the CI build, `check:guidelines` 12 / 12, `check:env` 8 / 8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 5. Not changed, and why

- **Two tabs saving the same field: the later save wins.** P4 keeps untouched boxes
  current and a typed one as typed; there is no version check anywhere in the admin
  (QA-63, QA-64 say the same).
- **The password boxes have no show/hide toggle** (the login has one). The confirm box
  catches a typo; a toggle for three boxes is a design change, not a fix.
- **`https://x` is a valid avatar address** — a host without a dot passes the
  contract's `url` rule. No preview is drawn for it, and the header shows the initials
  when it does not load. `http://` addresses are accepted too (the contract's type).
- **A current password over 100 characters** answers "The current password may not be
  greater than 100 characters." rather than "incorrect" — the API validates the shape
  before it checks the password.
- **The sidebar says "Profile", the page "My profile".** The sidebar's labels are short
  nouns by convention (Media → Media library, Newsletter → Newsletter subscribers).
- **The session ends with "Your session has expired."** also when an administrator
  deactivated the account; that wording belongs to every screen, not this one.

## 6. Could not be fully tested

- **The Laravel API.** Everything ran against the mock; the throttle, the 500-character
  limit and the rest are specified for it in the contract, the auth notes, the business
  rules and the regenerated guidelines.
- **Real password managers.** The username box is what Chrome's own guidance asks for;
  the filing of a changed password was not watched in a manager.
- **External images.** Avatars were answered by the test browser (a 1×1 picture, or a
  404 for the broken host); appearance at real sizes was not judged.
- **Other browsers, touch devices and screen readers.** Chromium only; the live region
  and the focus moves were checked as markup and focus, not listened to.

## 7. Risks to watch

- **Laravel must throttle `PUT /auth/password` per account** and cap every URL at 500
  characters (`url|max:500`, as the regenerated rules read), or the forms' promises are
  the only guard.
- **A password of emoji counts differently on the two backends.** The mock (and the
  form) count UTF-16 units — `ab😀😀😀1` is 9 — while Laravel's `min:8` counts
  characters (6). Such a password passes here and would be refused there.
- **A Google Maps embed address is held to 500 characters** with every other URL.
  The addresses Google's "Embed a map" dialog produces for a place run to about
  300–450; one that carries a long place name or a route can pass 500, and is then
  refused by name rather than stored — "The map embed URL may not be greater than 500
  characters." in Site settings, "The map URL can be at most 500 characters." on a
  listing.
- **The login's side effect "Revokes the account's previous token"** in the generated
  endpoint notes is not what the mock does (a second sign-in leaves the first session
  working until a password change); worth settling before the Laravel build.
- **The cross-tab user is trusted as written.** A tab writes `sna_auth_user` only for
  the account signed in, and an older copy is refused when both carry `updatedAt`; a
  copy without it (the login answer's six fields) is taken.
