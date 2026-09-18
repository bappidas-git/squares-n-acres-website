# Prompt 43 — states and copy audit

_Run 2026-09-18 against the production build (`npm run build:ci`) served by
`npm run serve:build` on `http://localhost:5000`, with the mock API on
`http://localhost:4000/api`. Chromium 1194, driven by `puppeteer-core`, at
**1280 px** and **390 px**._

The four scenarios of §2, and how each one was produced:

| Scenario    | How it was produced                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| **Loading** | `MOCK_DELAY_MS=1500 npm run mock`, probed 700 ms after `domcontentloaded` — before any answer can have arrived.    |
| **Error**   | The mock stopped, and (for the signed-in half) Chrome request interception aborting every call to `localhost:4000`. |
| **Empty**   | A filter that matches nothing, a shortlist with nothing in it, and — for §7 — every featured property deactivated through `PATCH /admin/properties/:id`. |
| **Success** | The real action: a toggle flipped, a delete confirmed, a heart pressed, a link copied.                             |

---

## 1. Public routes

✓ = the state is implemented and correct. ✗ = a gap, listed in §4 with the fix.
"—" = the state cannot occur on that route, with the reason.

| Route                               | Loading                | Error                     | Empty                      | Success                  |
| ----------------------------------- | ---------------------- | ------------------------- | -------------------------- | ------------------------ |
| `/`                                 | ✓ hero + row skeletons | ✓ (fixed — F2)            | ✓ rows hide, no gap        | ✓ shortlist toast        |
| `/properties`                       | ✓ grid skeleton        | ✓ `ErrorState` + Retry    | ✓ widen + "Clear all filters" | ✓ shortlist toast     |
| `/buy`, `/buy/:status`, `/buy/:type`| ✓ grid skeleton        | ✓ `ErrorState` + Retry    | ✓ widen suggestions        | ✓                        |
| `/rent`, `/rent/:type`              | ✓ grid skeleton        | ✓ `ErrorState` + Retry    | ✓ widen suggestions        | ✓                        |
| `/commercial`, `/lease`, `/plots`   | ✓ grid skeleton        | ✓ `ErrorState` + Retry    | ✓ widen suggestions        | ✓                        |
| `/properties/:slug`                 | ✓ `PropertyDetailSkeleton` | ✓ (fixed — F3)        | — a listing always has a body | ✓ lead success panel  |
| `/localities`                       | ✓ card-grid skeleton   | ✓ `ErrorState` + Retry    | ✓ "Show all zones"         | ✓                        |
| `/localities/:slug`                 | ✓ hero + grid skeleton | ✓ `ErrorState` + Retry    | ✓ embed widen; guide intact | ✓ enquiry toast         |
| `/builders`                         | ✓ card-grid skeleton   | ✓ `ErrorState` + Retry    | ✓ "Clear the search"       | ✓                        |
| `/builders/:slug`                   | ✓ hero + grid skeleton | ✓ `ErrorState` + Retry    | ✓ embed widen              | ✓                        |
| `/insights/articles`                | ✓ card-grid skeleton   | ✓ `ErrorState` + Retry    | ✓ "Clear the filters"      | ✓                        |
| `/insights/articles/:slug`          | ✓ (fixed — F1)         | ✓ `ErrorState` + Retry    | — an article always has a body | ✓ "Link copied"      |
| `/insights/articles/category/:slug` | ✓ (fixed — F1)         | ✓ 404 for an unknown slug | ✓ index empty state        | ✓                        |
| `/insights/articles/tag/:slug`      | ✓ (fixed — F1)         | ✓ 404 for an unknown slug | ✓ index empty state        | ✓                        |
| `/insights/authors/:slug`           | ✓ (fixed — F1)         | ✓ 404 for an unknown slug | ✓ index empty state        | ✓                        |
| `/insights/faqs`                    | ✓ accordion skeleton   | ✓ `ErrorState` + Retry    | ✓ "Clear search"           | ✓ enquiry toast          |
| `/shortlist`                        | ✓ grid skeleton        | ✓ `ErrorState` + Retry    | ✓ "Browse properties"      | ✓ toast + confirm        |
| `/careers/:jobSlug`                 | ✓ hero skeleton        | ✓ `ErrorState` + Retry    | — a role always has a body | ✓ application panel      |
| CMS pages (`/about`, `/contact`, `/careers`, `/sell-let`, `/partnership`, `/flexible-workspace`, `/direct-lease-retails`, the three legal pages, the three buyer-assistance pages, `/insights/real-estate-awareness`) | ✓ (fixed — F1) | ✓ (fixed — F4) | ✓ a block with no data draws nothing | ✓ lead blocks toast |
| 404 (`*` and every detail page's 404) | ✓ CMS skeleton first | — the 404 **is** the error state | — | ✓ search navigates       |

**One `<h1>` per page and no horizontal page scroll** at 1280 px and 390 px on
every route above, re-measured after this prompt's changes.

## 2. Admin routes

The audit signed in as `admin@squaresnacres.com` and walked every route of
`src/routes/adminRouteConfig.js`.

| Route                                | Loading            | Error (outage)        | Empty                          | Success                          |
| ------------------------------------ | ------------------ | --------------------- | ------------------------------ | -------------------------------- |
| `/admin/dashboard`                   | ✓ stat + chart skeletons | ✓ `ErrorState` + Retry | ✓ per-card lines ("No leads yet.") | —                        |
| `/admin/properties`                  | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "Add your first property"    | ✓ toast, confirm, rollback       |
| `/admin/properties/add` · `/edit/:id`| ✓ form skeleton    | ✓ + Retry             | —                              | ✓ save toast, unsaved guard      |
| `/admin/leads`                       | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "No leads yet"               | ✓ toast, confirm, rollback       |
| `/admin/leads/:id`                   | ✓ skeleton         | ✓ + Retry             | ✓ empty notes / timeline lines | ✓ toast, confirm                 |
| `/admin/articles`                    | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "Write the first article"    | ✓ toast, confirm, rollback       |
| `/admin/articles/add` · `/edit/:id`  | ✓ form skeleton    | ✓ + Retry             | —                              | ✓ save toast, unsaved guard      |
| `/admin/articles/categories` · `/tags` · `/authors` | ✓ `TableSkeleton` | ✓ + Retry | ✓ "Add your first …"          | ✓ toast, confirm, rollback       |
| `/admin/pages`                       | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "New page"                   | ✓ toast, confirm                 |
| `/admin/pages/add` · `/edit/:id`     | ✓ form skeleton    | ✓ + Retry             | ✓ block editor empty state     | ✓ save toast, unsaved guard      |
| `/admin/faqs`                        | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "Add your first FAQ"         | ✓ toast, confirm, rollback       |
| `/admin/master-data/*` (7 screens)   | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "Add your first …" (fixed — F5) | ✓ toast (fixed — F7), confirm, rollback |
| `/admin/testimonials` · `team` · `partners` · `jobs` | ✓ `TableSkeleton` | ✓ + Retry | ✓ "Add your first …"          | ✓ toast, confirm, rollback       |
| `/admin/jobs/applications`           | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "Nothing on this page"       | ✓ toast, confirm                 |
| `/admin/newsletter`                  | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ empty state                  | ✓ toast, confirm, CSV toast      |
| `/admin/media`                       | ✓ grid skeleton    | ✓ + Retry             | ✓ "Add by URL"                 | ✓ toast, confirm (fixed — F8)    |
| `/admin/seo`                         | ✓ card + table skeletons | ✓ + Retry       | ✓ "Nothing analysed yet — Re-analyse all" (fixed — F6) | ✓ toast |
| `/admin/seo/settings` · `/redirects` · `/guide` | ✓ skeleton | ✓ + Retry          | ✓ empty state                  | ✓ toast, confirm                 |
| `/admin/settings`                    | ✓ skeleton         | ✓ + Retry             | —                              | ✓ "Site settings saved"          |
| `/admin/settings/users`              | ✓ `TableSkeleton`  | ✓ + Retry             | ✓ "Add your first user"        | ✓ toast, confirm, rollback       |
| `/admin/profile`                     | — reads the signed-in user from the auth context, so there is nothing to load | — nothing to retry; a failed save is an inline `Alert` | — | ✓ toast |
| `/admin/login` · `/admin/403`        | — | — the login form's own inline error (unaffected by an outage) | — | ✓ redirect |

**The session survives an outage.** Every admin route above was re-loaded with
the API unreachable: none of them redirected to `/admin/login`, and there was
no redirect loop. A network failure carries `status: 0`, not 401, so
`AdminAuthContext`'s unauthorized handler never fires (§7 of this prompt, and
BUG-14's other half). **Filters stay enabled while a list is loading** — the
`FilterBar` is not disabled by `loading`, and the results swap in underneath it.

**Horizontal scroll inside an admin table is not page scroll.** On
`/admin/properties`, `/admin/leads` and `/admin/jobs` the `<table>` is wider
than the viewport at 1280 px, but it lives inside `DataTable`'s own scroller:
`document.body.scrollWidth` equals the viewport width and `window.scrollTo(100, 0)`
does not move the page. That is the intended treatment for a twelve-column
table and not a §8.1 violation.

## 3. The four scenarios of §7

| Edge case                                                       | Result |
| --------------------------------------------------------------- | ------ |
| Mock stopped while on the property page → skeleton → error state with Retry; restart the mock, press **Try again**, the page recovers | ✓ — one navigation entry before and after, so the recovery is client-side. The `<h1>` and the gallery are there afterwards. |
| `MOCK_DELAY_MS=1500` on admin lists → skeleton rows, filters stay enabled, results update on arrival | ✓ |
| A 401 during an outage never fires                               | ✓ — no admin route redirected to the login screen with the API down |
| Zero-state site: every featured property deactivated → the home row hides cleanly, then returns | ✓ — with `featured` at 0 the page's `<h2>`s go straight from "Where would you like to start?" to "New launches"; re-activating brings "Featured properties" back |
| `ErrorBoundary` recovers on navigation without a reload           | ✓ — `src/components/common/__tests__/ErrorBoundary.test.jsx`, "recovers when its key changes, without a reload" |

## 4. Fixes made by this prompt

| #  | What was wrong                                                                                                                                                 | Fix |
| -- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| F1 | **Five routes had a spinner, not a skeleton.** `ArticleDetail`, `CmsPage`, `ArticleCategory`, `ArticleTag` and `AuthorPage` rendered `PageLoader` while their record loaded: a monogram and a ring, of a height that matched no page, so the whole layout arrived at once. | Three new presets in `SkeletonLoaders.jsx` — `ArticleDetailSkeleton`, `CmsPageSkeleton`, `ArticleIndexSkeleton` — each reserving the space its page will fill. `PageLoader` is now only what it says it is: the Suspense fallback for a route chunk. |
| F2 | **The home page said nothing during an outage.** Every band hides itself when it has nothing, which is right for a section an editor emptied and wrong for a server nobody can reach: the page became a hero and a footer, with no way to ask again. | `Home.jsx` shows one `ErrorState` band with a Retry in place of the two CMS bands when the page record fails with anything other than a 404. A 404 — an unpublished page — still stands down silently. |
| F3 | **The property page swallowed the real error.** `PropertyDetails` printed a hardcoded "Something went wrong on the way" instead of the `ApiError`'s message, so an outage and a 500 read identically. | It renders `error.message`, like every other error state. |
| F4 | **A CMS page answered 404 during an outage.** `CmsPage` tested `!loading && !page` before it tested `error`, so `/about` with the API down said "Page not found" — a page that exists reported as missing, with no Retry. | The error branch comes first; only a real 404, or an answer with no record in it, reaches `NotFound`. |
| F5 | **A filtered admin list said two contradictory things.** `MasterDataPage` headed a filtered-but-empty table "No localities yet" over "No records match the current filters". | The title is "No localities match" while a filter is active. Its CTA is now "Add your first …" and is still gated on `canEdit` (§7's `can(area, 'create')`). |
| F6 | **The SEO dashboard had no un-filtered empty state.** With nothing analysed it offered "Clear the filters", which would not have helped. | With no filter active it says "Nothing analysed yet" and offers **Re-analyse all**. |
| F7 | **An optimistic toggle confirmed itself on some screens and not others.** The property and article lists toasted; every master-data and content screen did not. | One vocabulary — `TOASTS.flagged` in `adminCopy.js` — used by all of them: `"Whitefield" is now live`. The rollback-and-error-toast path was already correct everywhere and is unchanged. |
| F8 | **The media drawer's delete confirmation did not name the file.** | It quotes the file's title, alt text or address. It stays an in-place confirmation rather than a `ConfirmDialog`: it is already inside a drawer, and a dialog over a drawer is worse than the sentence. |
| F9 | **A bulk confirmation read "1 property will be deleted, and their public pages…".** `{count}` substitutes a singular as readily as a plural, so five messages were ungrammatical for one record. | Rewritten so both numbers read: "…and the public pages will answer 404". |
| F10 | **`ConsentCheckbox` spelled the company name into a component** — "…contacted by Squares N Acres" as a literal, which §14 forbids. | It reads `siteName` from `SiteSettingsContext` and fills `LEADS.consent`. |
| F11 | **Live admin copy named a prompt number.** The property-types form footer read "The SEO panel for property types arrives in prompt 36" — and the panel had been there since prompt 36. | The footer is deleted. |
| F12 | **The search popover offered the raw term as if it were a result.** With no suggestions it showed only "Search for '…'". | A "No matches" group label sits above it. |
| F13 | **The 404 page was generic, not branded.** A "4 🏠 4" animation, Title Case copy, a search box that only forwarded a term, and quick links to About / Contact / Sell-Let / Articles. | Rebuilt: the monogram beside "404", "We couldn't find that page", the real `GlobalSearch` (so a mistyped address finds the locality, project or builder it was one character away from), and the five popular pages of §4.3 — Buy, Rent, Localities, Insights, Contact. `noindex, follow` as before. |
| F14 | **The `ErrorBoundary` never reset.** A page that threw stayed thrown until a full reload, whatever the visitor clicked. | The route boundary is keyed on `location.pathname`, so the next navigation remounts it. A third, `variant="inline"`, sits inside `AdminLayout` and offers "Reload this page" while leaving the sidebar and topbar usable. |
| F15 | **`AdminPlaceholderPage` was still in the tree** — exported from the admin kit and asserted by its barrel test, although no route had used it since prompt 39. | Deleted, with its stylesheet, its export and its test entry. |
| F16 | **Nine stale scaffolding comments** named a prompt that had already run ("the renderer arrives in prompt 30", "`useForm` arrives in prompt 13", "the temporary Helmet tag", …), and one CSS class was called `.todo`. | Rewritten to describe what the code does; the class is `.pending`. |

## 5. Copy review

### What moved

`src/config/copy.js` (public) and `src/config/adminCopy.js` (admin) now hold
**288** and **76** strings respectively, nested by the areas §4.4 names:

- **copy.js** — `NAV`, `HERO`, `HOME`, `CTA_BAND`, `LISTING`, `PROPERTY`,
  `LEADS`, `BLOG`, `FOOTER`, `FORMS`, `ERRORS`, `EMPTY`, `SEO`, plus `fill()`.
- **adminCopy.js** — `TABLES`, `FORMS`, `TOASTS`, `DIALOGS`, `SEO`, `DASHBOARD`.

**Every key has a call site.** A script walks both objects and every file under
`src/`; the unused count is 0 in both. Dead copy is copy nobody reviews.

`copy.js` is authored in CommonJS, like `routes/paths.js` and
`seo/pageTypes.js` before it (D108): `pageTypes.js` reads `SEO.indexPages` from
it as its `INDEX_PAGES`, and `scripts/` `require`s that chain with no bundler in
front of it. `src/config/__tests__/copy.test.js` asserts the join, so the SEO
engine and the copy file cannot drift into two sets of index-page titles.

### Tone, checked over every string

| Rule (§8.5, §14)                     | How it is enforced                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Sentence case for buttons and labels | `copy.test.js`, over `NAV`, `LISTING`, `TABLES`, `FORMS`, with an acronym allow-list |
| No exclamation marks                 | `copy.test.js`, over every leaf                                                      |
| No invented SLA                      | `copy.test.js` bans "within N hours", "same day", "guaranteed"; `LEADS.successMessage` is asserted to say "as soon as possible" |
| No lorem ipsum, no scaffolding marker| `copy.test.js`, using `check-traces.js`'s **own** `COPY_PATTERNS`, so the suite and the scan cannot disagree |
| No boilerplate brand                 | same, using `TRACE_PATTERNS`                                                         |
| No company facts in a component      | `LEADS.consent` carries `%siteName%`; asserted                                       |
| Toasts ≤ 60 characters               | `copy.test.js`, over the whole admin toast vocabulary and the public toasts          |
| A confirm names its record           | `copy.test.js` over `DIALOGS`; verified in the browser on `/admin/master-data/cities` ("Delete city? — 'Bengaluru' will be removed. This cannot be undone.", red confirm, `aria-modal="true"`) |
| Dates and numbers through `format.js`| unchanged from prompt 11; no new formatting was written                              |

### Renamed for consistency

| Before                   | After                    | Where                                  |
| ------------------------ | ------------------------ | -------------------------------------- |
| "Buyer Assistance"       | "Buyer assistance"       | header, drawer, footer, the More panel |
| "Post Requirement"       | "Post requirement"       | header CTA fallback, drawer, bottom bar |
| "Real Estate Awareness"  | "Real estate awareness"  | the Insights menu                      |
| "Sort"                   | "Sort by"                | the listing's sort select              |
| "The address is on your clipboard." | "Address copied" | media library                        |
| "The snippet is on your clipboard." | "Snippet copied" | redirects                             |
| "The lead was deleted." / "The redirect is deleted." / "Profile updated." / "Saved." | `TOASTS.deleted(…)` / `TOASTS.saved(…)` | seven screens |
| "The site settings are saved." | "Site settings saved" | settings                              |
| "The SEO settings are saved." | "SEO settings saved"  | SEO settings                           |
| "The SEO of this record is saved." | "Search appearance saved" | the SEO edit dialog               |
| "Are you sure?"          | "Delete 3 properties?"   | the bulk bar's fallback title          |
| "No records match the current filters." | "Nothing here answers every filter you have set." | every master-data screen |

`LEAD_SOURCES` and the other `config/enums.js` labels keep their Title Case:
they are the frozen contract vocabulary of §5/§6 (D20), shared with the mock and
with `db.json`, and renaming them is a data-contract change rather than a copy
change. Recorded here so prompt 48 does not read them as an oversight.

### Documented exceptions

Strings that stay in their component, and why:

1. **Section headings that are that section's subject** — "Listings in
   Whitefield", "About the builder", "Frequently asked questions" on a property.
   They are composed from record data, so they cannot be table entries.
2. **`config/enums.js` labels** — the contract vocabulary, above.
3. **Form field labels built from master data** (`utils/leadSources.js`,
   `masterDataConfigs.js`, `contentConfigs.js`, the property-form tabs). These
   are *schema* — a field's label travels with its name, its type and its
   validation — and splitting the label out from the descriptor would make both
   halves harder to read and easier to break.
4. **`aria-label`s that restate a visible label** (`Move "New Launch" up`,
   `Actions for "…"`, `Share on Facebook`) are built from the record they name.
   Where the fixed half of such a label is copy, it is in the copy file
   (`BLOG.shareOn`, `TABLES.rowActions`).
5. **`seoGuideContent.js`** — the SEO playbook is a document, not microcopy.

The spot-check of §8 passes: `grep -rn ">Submit<\|'Save'" src/components src/pages`
returns only `FORMS.save`-free matches that are record-driven labels
(`ShortlistButton`'s `PROPERTY.save`, and three admin buttons whose label
depends on whether the record is new).

## 6. Undo

**"Undo" is not implemented, and this prompt does not add it** (§4.2). A toast
that offers to undo has to hold the reversal for as long as it is on screen,
which means either a server-side soft delete (the API has none — `DELETE` is
final, §5.8) or a client-side queue that a page navigation would drop on the
floor. Both are a data-contract change rather than a polish pass.

What is offered instead, on every destructive action:

- a `ConfirmDialog` **before** the write, naming the record and saying whether
  the change can be taken back;
- for a reversible toggle, a toast that **links to the item**, so the visitor
  can go and flip it back — the shortlist heart is the model
  ("Saved to shortlist · View").

Recorded in `docs/DECISIONS.md` as D109.

## 7. Verification

| Command                 | Result                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm run lint`          | 0 errors, 0 warnings; `check:endpoints` 742 files, 0 findings            |
| `npm run test:ci`       | **138 suites, 2 642 tests**, all green                                  |
| `npm run test:mock`     | green                                                                   |
| `npm run test:scripts`  | 28 cases (1 skipped: no Chrome in a standard location)                  |
| `npm run build:ci`      | Compiled successfully, 0 warnings                                       |
| `npm run check:traces`  | 1 079 files, **0 findings** — brand, hex **and** the six new copy patterns |
| `npm run check:contrast`| 29 gated pairs, all pass                                                |
| `npm run validate:seed` | `db.json` is valid                                                      |
| `npm run analyze`       | 285.91 kB / 300 kB gzip — 14.09 kB to spare                              |
| `npm run smoke`         | 282/282                                                                 |

The three new suites emit no console output of their own. The `act(…)` notices
that remain in the pre-existing suites are **NEW-33** (user-event v13 around MUI
transitions, owner 44) and are unchanged in number and origin.

Two console errors appear on every page in this container and are the sandbox,
not the app: `ERR_CERT_AUTHORITY_INVALID` for the Google Fonts stylesheet and
every Cloudinary image (the TLS interception described in
`docs/PERFORMANCE.md` §4), and one 404 for a Cloudinary asset behind it.
