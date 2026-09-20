# Prompt 48 — Final audit and release checklist

The release gate for **1.0.0**. Every automated check re-run from a clean
`npm ci`, every public and admin route walked with the console open for all
three roles at two viewports, the seed reset flow exercised end to end, the
prerender executed, the handover package regenerated, and the dependency list
verified by hand.

**Verdict: release-ready**, with one check reported amber rather than green.
`npm run check:all` — the gate — passes from a clean `npm ci`. Six defects were
found and fixed in this prompt (§9). `npm run a11y:audit`, which is not part of
`check:all`, exits 1 on 12 errors across four admin screens: it had never run to
completion before (it hung, §9.2), and the two findings it surfaces are
pre-existing, admin-only, and fixable only by a design-token or global-CSS change
that does not belong on the commit being tagged. Both are measured in §3.5 and
deferred with the measurement, not dropped.

| Environment    | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| Date           | 2026-09-18                                                   |
| Node           | v22.22.2 (`engines` requires ≥ 18.18; `.nvmrc` pins 20)      |
| npm            | 10.9.7                                                       |
| OS             | Linux 6.18 (container, 4 CPU, 15 GB RAM)                      |
| Chrome         | Chromium 141.0.7390.37 — `CHROME_PATH` set, so **every** browser-driven check ran |
| Mock API       | `http://localhost:4000/api`                                  |
| Served build   | `http://localhost:5000` (`npm run serve:build`)              |
| Dev server     | `http://localhost:3000` (`npm start`) — used for the route walk |

---

## 1. Clean install

`node_modules/` was empty at the start of this prompt, so the install was
genuinely from scratch rather than on top of an existing tree.

```
npm ci
```

| Measure        | Result                                              |
| -------------- | --------------------------------------------------- |
| Exit code      | **0**                                               |
| Packages added | **1 875** (1 876 audited)                            |
| Wall clock     | 22 s                                                |
| Warnings       | 19 `npm warn deprecated`, all transitive            |

The deprecation warnings are dependencies of `react-scripts` 5.0.1 (`svgo@1`,
`rimraf@3`, `w3c-hr-time`, the merged `@babel/plugin-proposal-*` set, …). None
is a direct dependency, and §3.1 of the master context forbids migrating off
CRA, so they stay.

### `npm audit`

**65 vulnerabilities (4 critical, 37 high, 14 moderate, 10 low)** — and none is
fixed in this release, deliberately:

- Every one is a transitive dependency of `react-scripts` 5.0.1, which is
  unmaintained. `npm audit fix --force` replaces `react-scripts` itself and
  breaks the build.
- They are **build-time** packages (webpack loaders, `svgo`, `postcss` plugins,
  the dev server). The shipped bundle contains application code, React, MUI and
  the runtime libraries — not the toolchain.
- The pinned versions in §3.3 of the master context were chosen deliberately and
  no prompt may upgrade a major.

Recorded rather than silently passed over; `README.md` → Troubleshooting says
the same to whoever runs `npm audit` next.

---

## 2. `npm run check:all`

One command, ten checks, **exit 0**, no browser and no API needed.

```
npm run check:all
```

**Run twice, and the numbers below are the second run's.** The first was taken
straight after `npm ci`, before this prompt had changed anything; `package.json`
(version, `check:env`, the widened lint globs), `db.json` (the badge icon of
NEW-29) and four scripts all moved afterwards, so the acceptance criterion —
"`check:all` passes on a clean `npm ci`" — is only honestly met by a run made on
the final tree. Both runs exited 0.

| Step                | Measure                                                      | Result |
| ------------------- | ------------------------------------------------------------ | ------ |
| `lint`              | ESLint over `src/`, `mock-server/`, `scripts/`, **`e2e/`** and `playwright.config.js`, `--max-warnings=0` | **0 errors, 0 warnings** |
| `lint` → `check:endpoints` | 752 files scanned                                     | **0 blocking findings** |
| `test:ci`           | Jest                                                          | **147 suites, 3 344 tests, all passed** |
| `test:mock`         | `node --test` over the mock server                             | **39 suites ok, 0 fail** |
| `test:scripts`      | `node --test` over the tooling                                 | **18 suites ok, 0 fail** |
| `build:ci`          | `CI=true react-scripts build`                                  | **Compiled successfully**, 0 warnings |
| `check:traces`      | 1 122 files scanned                                            | **0 brand traces, 0 hex literals, 0 copy placeholders** |
| `validate:seed`     | 28 collections                                                 | **`db.json` is valid**, 0 errors |
| `check:contrast`    | 11 text/background pairs                                       | **11 pass** (lowest 4.24:1 against a 3.0 minimum for display text) |
| `check:guidelines`  | 12 coverage assertions                                         | **12/12 passed** — `captured examples (239 captured, 3 explained skips, of 242)` |
| `check:env`         | 8 assertions (new in this prompt)                              | **8/8 passed** — 12 variables read, 12 declared |

### Bundle sizes (gzip, from `build:ci`)

| Asset                  | Size          | Budget       |
| ---------------------- | ------------- | ------------ |
| `static/js/main.*.js`  | **285.95 kB** | ≤ 300 kB ✔︎  |
| largest lazy chunk     | 149.80 kB     | —            |
| second lazy chunk      | 108.81 kB     | —            |
| `static/css/main.*.css`| 14.82 kB      | —            |

The build with `REACT_APP_API_URL` on the command line — the one the
browser-driven checks and the prerender need — came to **286.02 kB**, the extra
80 B being the embedded URL string. Both are inside the budget, and the figure
did not move between the first and the final `check:all`.

### Seed counts (`validate:seed`)

| Collection | Count | Collection | Count | Collection | Count |
| ---------- | ----: | ---------- | ----: | ---------- | ----: |
| properties | 40 | localities | 20 | cities | 1 |
| propertyTypes | 17 | amenities | 46 | badges | 8 |
| developers | 8 | banks | 6 | leads | 45 |
| articles | 12 | articleCategories | 4 | articleTags | 15 |
| authors | 3 | faqs | 20 | testimonials | 8 |
| teamMembers | 6 | partners | 6 | pages | 15 |
| jobOpenings | 4 | jobApplications | 3 | media | 389 |
| redirects | 3 | newsletterSubscribers | 12 | adminUsers | 3 |
| apiTokens | 0 | propertyViews | 0 | siteSettings | object |
| seoSettings | object | | | | |

---

## 3. Checks that need a server

| Check              | Command                  | Result |
| ------------------ | ------------------------ | ------ |
| API smoke          | `npm run smoke`          | **282/282 checks passed, 0 failed** |
| Structured data    | `npm run check:jsonld`   | **144 pages, 0 errors**, 36 advisory warnings (§3.2) |
| Bundle report      | `npm run analyze`        | **passed** — 286.02 kB of a 300 kB budget, 13.97 kB to spare; no admin marker in the entry chunk |
| Link check         | `npm run check:links`    | **144 pages opened, 143 internal links followed, 0 broken** |
| Sitemap coverage   | `npm run check:sitemap`  | **0 missing, 0 extra** — 145 pages crawled to depth 4, 144 indexable routes, matching the 144 URLs the sitemaps list |
| Accessibility      | `npm run a11y:audit`     | **378 pages, 12 errors, 1 138 warnings — exit 1** (§3.5). It had never completed before this prompt. |
| Prerender          | `npm run build:prerender`| **144 of 144 pages saved**, 0 failures |
| End-to-end         | `npm run e2e`            | **53 passed in 1.9 min**, 0 failed |

### 3.2 Structured data — 0 errors, 36 title-length advisories

Every one of the 144 pages parses, and every JSON-LD graph is valid. The 36
warnings are all title length, in the two classes prompt 46 already
dispositioned (`docs/QA/46-cross-device-lighthouse-seo.md`):

| Class | Count | Where |
| ----- | ----: | ----- |
| Title longer than the ~60 characters a result shows | 21 | 17 listing routes (`/buy` ×14, `/rent`, `/lease`, `/commercial`) and 4 `/insights` pages |
| Title shorter than 30 characters | 15 | property detail pages — "3 BHK Apartment in Whitefield" is 29 |

Neither is a defect, and neither is new. The long ones come from §9.5's own
`listing` template, which prompt 46 recorded as a deliberate template change
rather than a QA tweak — it fixed the four that were actually wrong (NEW-40) and
left the template alone. The short ones are precise titles that happen to fall
under an advisory floor: "3 BHK Apartment in Whitefield" says exactly what the
page is, and padding it to clear 30 characters would make it worse. Recorded as
advisories, carried forward unchanged.

### 3.1 A build served locally needs the API URL on the command line

Worth stating plainly, because it cost time in this audit and will cost the next
person the same. `check:all`'s `build:ci` builds with **no** `.env.production`
(it is not committed, by design — §3.5), so `REACT_APP_API_URL` is never
embedded and every page of that build throws
`REACT_APP_API_URL is not set` at module load. That is the contract working as
designed: `src/services/http.js` refuses a silent fallback URL.

The first `check:sitemap` run of this audit was made against exactly that
bundle and reported **26 "extra" URLs** — "the page never rendered a head",
"it renders a 404". Every one was the missing variable, not a broken page. The
build was redone as `docs/QA/46-lighthouse-howto.md` §3 already documents:

```
REACT_APP_API_URL=http://localhost:4000/api npm run build:ci
```

`README.md` → "Which file is loaded" now carries this, so it is findable
without reading a QA report.

**Proved, not argued:** re-run against the correctly built bundle,
`check:sitemap` reports **0 missing, 0 extra** over the same 144 URLs. All 26
"extra" were the one absent environment variable.

### 3.5 Accessibility — the one check that is not green, and why

```
npm run a11y:audit
```

| Measure | Result |
| ------- | ------ |
| Pages audited | **378** (every route in `src/routes/paths.js` × 390 and 1280 px) |
| Errors | **12** |
| Warnings | 1 138 |
| Exit code | **1** |
| Report | `docs/QA/42-a11y-audit.md` (generated, git-ignored) |

`a11y:audit` is not in `check:all` — it needs a browser and is run explicitly —
so this does not fail the gate. But it is not green, and it is reported as not
green.

> **Superseded by prompt 49.** Both findings below are fixed and the audit exits
> 0 on 0 errors. Read `docs/QA/49-ui-ux-audit.md` §2.1–2.2 before acting on
> either: the horizontal-scroll fix named here (`overflow-x: clip`/`hidden` on
> the document) was applied to the live page and moves the number by zero, and
> the placeholder finding was not `.control::placeholder`, which measures
> 6.05:1. The measurements in this section are sound; the two remedies are not.

**It had never completed before.** The script hung indefinitely on the admin
article edit form (§9.2), so the 378-page run above is the first complete one.
Prompt 46's grid covered 63 curated routes; this covers every route the app can
navigate to, at both widths, which is why it surfaces findings no earlier prompt
saw.

#### The 12 errors

**1 — Four admin list pages really do scroll sideways at 1280 px** (4 errors):
`/admin/properties` (721 px), `/admin/articles` (270 px), `/admin/leads`
(180 px), `/admin/jobs` (61 px). No public page is affected, at either width.

This is measured, not inferred. Probed directly on `/admin/properties` at
1280 px:

| Measurement | Value |
| ----------- | ----- |
| `.scroller` (`overflow-x: auto`) | `clientWidth` 966, `scrollWidth` 1728 — **the table scroller works correctly** |
| every ancestor above it | `scrollWidth === clientWidth` (968, 968, 968); `main` is `overflow-x: hidden` |
| `document.body.scrollWidth` | **1280** — body does not overflow |
| `document.documentElement.scrollWidth` | **2001** |
| `window.scrollTo({left: 5000})` then `window.scrollX` | **721** |
| `document.body.getBoundingClientRect().left` before → during | **0 → −721** |
| the sidebar's `left` before → during | **0 → −721** |
| the `<h1>`'s `left` before → during | 288 → −433 |

The last three lines are what settle it: the body, the sidebar and the heading
all move. A person at 1280 px can drag the entire admin shell 721 px sideways
and see blank space. That is the defect §8.1 forbids.

**This corrects the record.** NEW-48 (closed in prompt 46) held that
`/admin/properties` "reported 721 px of overflow … while the page did not move a
pixel", and prompt 46's width grid concluded "63 of 63 clean; no horizontal
scroll at any width on any route". The rule change prompt 46 made was right —
attempting the scroll is the correct probe — but the premise was wrong: the page
does move, by exactly the 721 px the old rule reported. The number was never the
false positive; the conclusion drawn about it was.

**Not fixed here.** The root scrolls because Chromium counts the wide table
inside its own `overflow-x: auto` scroller toward the *root's* scrollable
overflow, even though body and every ancestor are viewport-width. The fix is
`overflow-x: clip` (or `hidden`) on the document in `src/assets/styles/global.css`
— a global change that lands underneath every `position: sticky` header, the
mobile CTA bar and the scroll-anchoring behaviour prompt 42 tuned. That is not a
change to make on the commit being tagged, on a defect that is pre-existing,
admin-only and cosmetic. Deferred with the measurement above so nobody has to
re-derive it.

**2 — Placeholder text at 4.30:1 on four master-data forms** (8 errors, the same
four pages at both widths): `/admin/master-data/localities/add` and `/edit/1`,
`/admin/master-data/developers/add` and `/edit/1`. WCAG wants 4.5:1; this is
4.30:1.

`.control::placeholder` in `src/components/ui/FormField.module.css` uses
`var(--color-text-muted)`. Fixing it means either darkening that token — which
is muted text *everywhere* on the site — or adding a placeholder-specific token,
since §2.4 forbids a hex literal outside `theme.js` and `global.css`. Either is a
design-system change. `npm run check:contrast` passes on all 11 declared pairs;
placeholders are not among them, which is the gap worth closing when the token is
revisited. Deferred, not silently dropped.

#### The 1 138 warnings

Not counted as failures, and the two classes that dominate are already recorded:
**NEW-47** (contrast over a photograph cannot be computed from CSS, so the rule
reports "background unknown") and **NEW-52** (the rule measures `aria-hidden`
decoration, e.g. the breadcrumb `/` separator at 1.47:1). Both are deferred with
rationale in `docs/PROJECT_STATE.md`.

### 3.6 End-to-end — 53 specs, all passing

`npm run e2e` against the running mock and the dev server, one Chromium worker
(the specs share a database, so a second worker would make both flaky for
reasons unrelated to the app). Node 22 here; the suite needs ≥ 20.

| Measure | Result |
| ------- | ------ |
| Specs | **53 passed**, 0 failed |
| Wall clock | 1 min 55 s |
| Files | 10 (`login`, `listing-filters`, `property-details`, `property-create`, `article-publish`, `cms-page`, `lead-submit`, `seo-panel`, `settings`, `shortlist`) |

Four of them are the RBAC matrix driven through the real UI rather than the API:
a manager reads the settings and is given nothing to save with, sales reach
neither the settings nor the users screen, only the administrator opens the users
screen, and a sales user opens the property form read-only. That is the same
conclusion §4.3 reaches from the route walk, arrived at independently.

`settings.spec.js` is the file whose guarded `expect` this prompt replaced
(NEW-50); it passes with the stricter unconditional assertion.

---

## 4. Route walk

Every public route and every admin route, for **admin**, **manager** and
**sales**, at **1280 × 800** and **390 × 844**, with the console captured —
`console.error`, `console.warning`, uncaught `pageerror` and failed requests.

Run against the **development server**, not the production build, on purpose: a
development build keeps React's warnings (invalid or missing keys, bad prop
types, `act()`, state updates on unmounted components) and MUI's, and those are
exactly what §12.1 means by "no browser console errors or warnings". A
production build strips them, so walking it would prove less.

```
node route-walk.js      # the audit harness, run outside the repository
```

| Scope | Viewport | Page loads | Console clean |
| ----- | -------- | ---------: | ------------: |
| public | 1280 | 39 | **38** |
| public | 390 | 39 | **38** |
| admin — `admin` | 1280 | 42 | **42** |
| admin — `admin` | 390 | 42 | **42** |
| admin — `manager` | 1280 | 42 | **42** |
| admin — `manager` | 390 | 42 | **42** |
| admin — `sales` | 1280 | 42 | **42** |
| admin — `sales` | 390 | 42 | **42** |
| **Total** | | **330** | **328** |

**Console clean ✓ — 328 of 330 page loads produced no console output at all, and
the two that did are the same route for the same documented reason.**

### 4.1 The two entries, and why they stay

Both are `/this-route-does-not-exist` (1280 and 390):

```
console.error: Failed to load resource: the server responded with a status of 404 (Not Found)
```

The request is `GET /api/pages/slug/this-route-does-not-exist`, and **that 404 is
the mechanism**. The CMS catch-all route asks the API whether a page exists at
the path; a 404 means "no", and the 404 page renders. The browser logs every
failed response and no application code can prevent it — `fetch`/XHR console
logging is the browser's, not the app's. Suppressing it would mean either not
asking (so no CMS page could ever live at a new path) or swallowing a real
error. A log line on a page that is itself an error page is the right trade.

Verified in the mock's own log: exactly two such requests, both 404, nothing
else 404'd during the whole walk.

### 4.2 Routes walked

**Public (39):** home; `/properties` and the property details page; the six
segment listings (`/buy`, `/rent`, `/lease`, `/commercial`, `/plots`) with a
status route (`/buy/ready-to-move`) and three type routes
(`/buy/apartments`, `/rent/villas`, `/commercial/office-spaces`);
`/localities` and a locality; `/builders` and a builder; `/insights/articles`
and an article; all three taxonomy shapes (category, tag, author); `/insights/faqs`;
every CMS page (`/about`, `/contact`, `/sell-let`, `/careers`, `/partnership`,
`/flexible-workspace`, `/direct-lease-retails`, the three buyer-assistance
pages, the awareness page, and the three legal pages); a job detail;
`/shortlist`; and an unknown path for the 404.

**Admin (42 per role):** dashboard, profile, properties (list, add, edit), leads
(list, detail), articles (list, add, edit, categories, tags, authors), pages
(list, add, edit), FAQs, all eight master-data screens plus three add/edit
forms, testimonials, team, partners, jobs, job applications, newsletter, media,
all four SEO screens, settings, users, and `/admin/403`.

### 4.3 RBAC, observed rather than assumed

The walk recorded what each role actually rendered. The guard renders a 403
**in place** rather than redirecting, so the URL never changes — 0 of 330 loads
redirected — and the evidence is the rendered text.

| Role | Admin routes | Screen rendered | 403 view |
| ---- | -----------: | --------------: | -------: |
| `admin` | 41 | **41** | 0 |
| `manager` | 41 | 40 | 1 — `/admin/settings/users` |
| `sales` | 41 | 6 | 35 |

`sales` can open exactly `/admin/dashboard`, `/admin/profile`,
`/admin/properties`, `/admin/properties/edit/1`, `/admin/leads` and
`/admin/leads/1`. That is `docs/RBAC.md`'s matrix line for line: dashboard,
properties (read-only inside), leads. The sidebar is filtered to match — a
`sales` session's navigation has no Articles entry — so a denied screen is not
something the UI invites them to click. The 403 view reads "You don't have
access to this page. Ask an administrator if you need it — your role does not
include this area." with a way back to the dashboard.

(The role matrix itself was verified endpoint by endpoint in prompt 45 —
`docs/QA/45-rbac-matrix-verified.md`. This walk confirms the client agrees with
it on every screen, at both widths.)

### 4.4 Two harness defects the walk found — in the harness, not the app

Worth recording, because both would mislead the next person who tries this.

**`networkidle2` cannot be used on this app.** The admin shell polls for lead
notifications, so the network never goes idle: the wait outlived its own 45 s
timeout and stalled the run. The walk waits for `domcontentloaded` plus a fixed
2.5 s settle window, with a hard watchdog around every page.

**An unsaved-changes guard blocks an automated navigation for good.**
`src/hooks/useUnsavedChanges.js` registers a `beforeunload` handler, so
navigating away from a dirty form raises the browser's own "Leave site?"
confirmation. Puppeteer does not dismiss a dialog by itself, so the dialog stayed
up, `page.goto` never resolved, and every *later* navigation on that page queued
behind it. The symptom was unmistakable in hindsight: 13 consecutive routes
timing out from `/admin/articles/edit/1` onwards, and nothing before it. The
harness now accepts the dialog, which is what a person clicking "Leave" does.
**The guard is correct application behaviour and was not changed** — it is the
feature that stops an editor losing a half-written article.

---

## 5. Seed reset flow

Exercised end to end, with three different kinds of change so a restore could
not pass by accident.

| Step | Action | Result |
| ---- | ------ | ------ |
| 1 | `PUT /admin/settings` → `general.tagline` = "MUTATED BY PROMPT 48 RESET TEST" | 200; the public `GET /settings` returned the mutated value |
| 2 | `PATCH /admin/properties/1` → `title` = "MUTATED TITLE 48" | 200; the admin read returned the mutated title |
| 3 | `DELETE /admin/testimonials/1` | 200; the collection went 8 → 7 |
| 4 | `npm run mock:reset` **with the mock running** | **refused** — see §9.1 |
| 5 | Mock stopped, then `npm run mock:reset` | "Runtime db restored from db.json" |
| 6 | Runtime file re-read | tagline, title and all 8 testimonials **restored** |
| 7 | Runtime file dirtied again by hand, then `MOCK_FRESH=1 npm run mock` | "Runtime db seeded from db.json"; the API served seed values |
| 8 | `npm run validate:seed` | **`db.json` is valid** — the seed itself was never touched |

Step 4 is the defect this exercise found, and it is fixed: §9.1.

The flow is documented in `README.md` → "The seed and the runtime database",
including *why* the server has to be stopped first.

---

## 6. Prerender

Chromium was available, so this ran for real rather than being documented and
skipped.

```
npm run mock                                                          # terminal 1
REACT_APP_API_URL=http://localhost:4000/api npm run build:prerender   # terminal 2
```

| Measure | Result |
| ------- | ------ |
| Pages prerendered | **144 of 144** — "Every page was saved." |
| Failures | **0** |
| Exit code | **0** |
| Concurrency | 3 browsers, one page each (the script's default) |
| `index.html` files in `build/` | 144 |
| `build/index.spa.html` | written — the SPA fallback of `docs/PERFORMANCE.md` §5.4 |
| Server | reused the `serve:build` already on port 5000 |

`REACT_APP_API_URL` has to be on the command line: `build:prerender` runs
`npm run build` first, and that build reads `.env.production`, which is not
committed (§3.1 above).

### 6.1 NEW-30 is fixed, and the prerendered HTML proves it

The reason to run this rather than take prompt 46's word for it. Before this
prompt, every counted statistic was saved as `0`: `useCountUp` animates over
animation frames and a headless crawl does not reliably grant a second one.
`scripts/prerender.js` now emulates `prefers-reduced-motion: reduce`, which
`useCountUp` answers by jumping straight to the end value.

Read off disk from `build/builders/aurelia-estates/index.html`, against the
seed's own record:

| Statistic | Seed value | In the prerendered HTML |
| --------- | ---------: | ----------------------: |
| `totalProjects` | 26 | **26** |
| `ongoingProjects` | 5 | **5** |
| `completedProjects` | 21 | **21** |
| `establishedYear` | 2004 | **2004** (a label, never counted) |

Each of the first three would have read `0` before the fix. A real visitor still
sees the count animate — the emulation exists only inside the crawl.

### 6.2 Without Chrome

The step is optional by design (D16): `puppeteer-core` downloads no browser, so
on a machine with none the script exits 1 with
`Set CHROME_PATH to run the prerender (optional step).` and **`npm run build`
keeps working**. `CHROME_PATH` wins when set; otherwise the usual install
locations of all three platforms are tried, including a per-user Chrome under
`LOCALAPPDATA` and Edge on Windows.

---

## 7. Handover package regeneration

```
npm run generate:backend-guidelines     # with the mock running
npm run check:guidelines
```

| Measure           | Result                                                    |
| ----------------- | --------------------------------------------------------- |
| Files written     | 15                                                        |
| Endpoints         | 242                                                       |
| Captured examples | **239 captured, 3 explained skips, of 242** — `jobs.apply`, `leads.create` and `auth.updatePassword` |
| `check:guidelines`| **12/12 checks passed**                                   |
| `db.json` in the package | byte-identical to the repository seed              |

The prompt expected "no diff, or only the commit line". The diff is **14 files,
188 insertions, 189 deletions**, and the extra content is a **correction** — so
it is committed rather than reverted.

| Change | Committed in 47 | Regenerated now | Which is right |
| ------ | --------------- | --------------- | -------------- |
| `generatedFrom` | `60178c9` | `3b420fb` | the new one — it names the commit the package was built from |
| `order` on localities, article categories and other ordered collections | `2`, `3`, … | `1`, `2`, … | **the new one.** `db.json` has Whitefield at `order: 1` and `buying-guides` at `order: 1` |
| The temporary redirect the generator creates to capture the write examples | `id: 7`, `id: 9`, `total: 4` | `id: 4`, `id: 6`, `total: 3` | **the new one.** The seed has exactly 3 redirects (`id` 1–3), so the next id is 4 |

### 7.1 Three endpoints carry no example payload, on purpose — and the checker now says so

`jobs.apply`, `leads.create` and `auth.updatePassword` print
`_Not captured: captured from the fixture the run created._` instead of a
request and response. That is prompt 47's capture decision working: each of the
three is a write aimed at a throwaway fixture the run then deletes, so printing
the verbatim request would document a lead, a job application or a password
change that no longer exists. The endpoint is fully specified either way —
parameters, Laravel rules, error cases and side effects are all there.

`check:guidelines` distinguishes two absences that read alike in the document:

- `No example was captured for this endpoint.` — a hole. The generator ran
  without a capture, or it failed. **This fails the check.**
- `Not captured: <reason>.` — a deliberate, explained skip. Not a defect.

It was only testing for the first, and labelling the result
`captured examples (242)` — so it reported full coverage while three endpoints
carried no payload. **Fixed in this prompt:** the line now reads
`captured examples (239 captured, 3 explained skips, of 242)` and names the
three. What passes and what fails is unchanged; only the claim is now true.
A checker that overstates its own coverage is worse than one that omits a
number, because the number is what anybody reads.

### 7.2 Why the diff was not empty

The cause is that prompt 47 generated its examples from a **runtime database
that had drifted** — QA passes before it had created and deleted records, which
moved the auto-increment counter and renumbered the ordered collections. The
package it committed therefore quoted values a fresh import of `db.json` would
never produce, which is misleading in a document whose whole purpose is to say
"this is what the API answers". Regenerating against a freshly reset seed fixes
it. That is why §5 above is run **before** this step, and why the order matters
to whoever regenerates the package next.

---

## 8. Dependency review

`npx depcheck` is not permitted as a dependency, so every entry was grepped by
hand for an import, a `require`, an npm script that names it, or a config that
resolves it.

### Runtime dependencies (32 after this prompt)

| Package | Evidence | Verdict |
| ------- | -------- | ------- |
| `react`, `react-dom` | 288 / 3 files | keep |
| `react-router-dom` | 108 files | keep |
| `react-scripts` | the build tool itself (`start`, `build`, `test`) | keep |
| `@mui/material` | 23 files | keep |
| `@emotion/react`, `@emotion/styled` | **0 direct imports** — MUI v7's styling engine, a required peer dependency. Removing them breaks every MUI component at runtime | keep |
| `@iconify/react` | 227 files — every icon in the project | keep |
| `framer-motion` | 8 files | keep |
| `react-helmet-async` | 5 files | keep |
| `axios` | 1 file (`src/services/http.js`; an ESLint rule forbids importing it anywhere else) | keep |
| `@tiptap/*` (13 packages) | `src/components/editor/` — `react` 11 files, each extension once in the extension list | keep |
| `dompurify` | 1 file (the sanitiser behind `SafeHtml`) | keep |
| `slugify` | 1 file | keep |
| `recharts` | 5 files (the admin dashboard charts) | keep |
| `yet-another-react-lightbox` | 1 file (lazy-loaded; also in Jest `transformIgnorePatterns`) | keep |
| `web-vitals` | 1 file (`src/reportWebVitals` chain, wired in prompt 41) | keep |
| `@testing-library/react`, `@testing-library/user-event` | 89 / 38 test files | keep |
| `@testing-library/jest-dom` | **0 component imports** — imported once in `src/setupTests.js`, which is what registers the DOM matchers | keep |
| ~~`date-fns`~~ | **0 imports anywhere.** `src/utils/format.js` names it only in two comments | **removed** |

**`date-fns` was removed.** `formatRelative` was originally built on its
`formatDistanceToNowStrict`, but a later prompt rewrote it on
`Intl.RelativeTimeFormat` — because `src/utils/format.js` is authored in
CommonJS so that `src/seo/variables.js` and `scripts/validate-jsonld.js` can
`require` it from Node, and CRA's catch-all asset rule emits a `require()` that
resolves to a `.cjs` entry as a *file*, leaving the import silently undefined.
The file's own header documents that. The dependency has been dead weight since;
`npm uninstall date-fns` removed it and 1 package from the lockfile.

This supersedes the `date-fns` half of decision **D22**; the `Intl`-based
implementation and its tests are unchanged, so nothing else moves.

### Dev dependencies (11)

| Package | Evidence | Verdict |
| ------- | -------- | ------- |
| `express` | 16 files in `mock-server/` | keep |
| `json-server` | 2 files (used as a library, not the CLI) | keep |
| `cors` | 1 file | keep |
| `concurrently` | the `dev` script | keep |
| `cross-env` | the `build:ci` and `test:ci` scripts | keep |
| `serve` | the `serve:build` script | keep |
| `prettier` | the `format` and `format:check` scripts | keep |
| `eslint-config-prettier` | **not imported and not in a script** — resolved by `eslintConfig.extends: ["…","prettier"]` in `package.json`. Verified: `require.resolve('eslint-config-prettier')` succeeds and `npm run lint` passes | keep |
| `puppeteer-core` | 1 file (`scripts/lib/chrome.js`, which every browser-driven check goes through) | keep |
| `@playwright/test` | 2 files plus `e2e/playwright.config.js`; provides the `playwright` binary the `e2e` script runs | keep |
| `rimraf` | **not imported and not in an npm script.** It is the project's documented cross-platform delete — master context §3.4 ("`rimraf` for deletes") and this prompt's own verification block (`npx rimraf node_modules`). Keeping it as a dev dependency is what makes `npx rimraf` resolve locally instead of fetching from the network | keep |

### `package.json`

| Field | Value |
| ----- | ----- |
| `name` | `squares-n-acres-website` |
| `version` | **`1.0.0`** (was `0.2.0`) |
| `description` | "Squares N Acres — Bengaluru real-estate portal (public website + admin panel)" |
| `private` | `true` |
| `engines` | `{ "node": ">=18.18", "npm": ">=9" }` |
| `check:all` | now ends in `&& npm run check:env` |
| scripts | 35, every one documented in `README.md` (asserted, not eyeballed) |

---

## 9. Defects found and fixed in this prompt

**Four defects found in this prompt** (§9.1–§9.4), **three previously-known
issues closed** (§9.6) and **one unused dependency removed** (§9.5). Three of the
four new ones were in the project's own tooling, which is the part nobody checks:
each would have kept misreporting or hanging indefinitely.


### 9.1 `npm run mock:reset` reported success while being silently undone

**Severity: high.** It destroyed the one recovery path the mock has, in the
documented workflow, without saying so.

`mock-server/reset.js` deleted `mock-server/.runtime/db.json`, copied the seed
over it and printed "Runtime db restored from db.json" — correctly. But JSON
Server's lowdb adapter reads the database into memory once at router creation
and writes the **whole object** back on every mutating request. So with the mock
running:

1. `mock:reset` restores the file. It prints success.
2. The running server knows nothing about it and keeps serving its in-memory
   copy — the data the developer was trying to discard.
3. Its next write flushes that stale copy over the restored file.

Measured during §5: after `mock:reset` printed success, the runtime file's mtime
was **two minutes later than the reset**, and every one of the three mutations
was back. A restart did not help, because the file had already been overwritten.
This is the default path: `npm run dev` holds the mock in one terminal, so
`mock:reset` is almost always run against a live server.

**Fix.** `reset.js` now asks `GET /api/health` on the configured port first and
refuses when our mock answers, printing the order that works:

```
The mock is running on port 4000, so a reset would not survive it.
…
Stop it, reset, start it again:
  (Ctrl+C in the terminal running `npm run mock` or `npm run dev`)
  npm run mock:reset
  npm run mock

Or skip the reset entirely — `MOCK_FRESH=1 npm run mock` re-seeds on start.
```

It probes `/api/health` rather than opening a socket, so an unrelated process on
port 4000 does not block a reset it has nothing to do with; any failure to reach
it is read as "not running", so the reset still goes ahead in the safe
direction. Verified both ways in §5, steps 4–6. No endpoint was added and the
API contract is untouched.

### 9.2 `npm run a11y:audit` hung forever on an admin form's "Leave site?" dialog

**Severity: high for the tool.** The project's accessibility check could not
complete, and nothing said so.

The audit walks every route in `src/routes/paths.js`, which includes the admin
edit forms. `src/hooks/useUnsavedChanges.js` registers a `beforeunload` handler,
so navigating away from a dirty form raises the browser's own "Leave site?"
confirmation — and Puppeteer does not dismiss a dialog by itself. The dialog
stayed up, `page.goto` never resolved, and every later navigation queued behind
it.

What made it costly: the script only prints a page when that page **has errors**,
so a wedged run and a clean run look identical from the terminal. Measured here —
42 minutes on the article edit form, CPU time frozen at 10 s, no further requests
to the mock, and not one line of output. The first diagnosis of "it is just slow"
was wrong, and the thing that disproved it was the request count to the mock
standing still for 25 s, not the CPU number.

**Fix.** Both page-creation sites in `scripts/a11y-audit.js` now accept the
dialog, which is what a person clicking "Leave" does. The guard itself is correct
behaviour and is untouched — it is what stops an editor losing a half-written
article. After the fix the audit completed 378 pages.

This is the **second** instance of this bug in this audit: the route-walk harness
of §4 hit it first (§4.4). Any Puppeteer script in this repository that navigates
across admin forms needs a dialog handler. `scripts/prerender.js`,
`check-links.js` and `validate-jsonld.js` crawl public URLs only and are
unaffected — checked, not assumed.

### 9.3 The handover package quoted values a fresh seed never produces

**Severity: medium**, and invisible without regenerating. Covered in §7: prompt
47 captured its examples from a drifted runtime database, so
`backend_developer_guidelines/` documented `order: 2` for a record the seed
ships at `order: 1`, and a redirect at `id: 7` in a collection whose ids are
1–3. A backend developer importing `db.json` and comparing against the package
would have found mismatches that were never the API's fault.

**Fix.** Regenerated from a freshly reset seed (§5 runs first, deliberately) and
committed. `check:guidelines` passes 12/12.

### 9.4 `check:guidelines` overstated its own coverage

**Severity: low, but it is a checker lying about a handover package.** It printed
`captured examples (242)` while three endpoints — `jobs.apply`, `leads.create`
and `auth.updatePassword` — carry no example payload at all. §7.1 has the detail:
it tested only for one of the two phrasings the generator can write. It now
reports `239 captured, 3 explained skips, of 242` and names them, and still fails
only on a real hole.

### 9.5 `date-fns` was installed and never used

**Severity: low** — 1 package of install weight and a misleading dependency
list. Covered in §8. Removed.

---

### 9.6 Three previously-known issues closed

| Id | What it was | Fix |
| --- | --- | --- |
| NEW-29 | The "Ready to Move" badge seeded `mdi:home-check-outline`, which is not in the MDI set, so the badge rendered blank. Owner prompt 15 never picked it up. | Seeded `mdi:home-city-outline` instead — an id from `IconPicker`'s curated list, which is the set the project itself vouches for. Iconify resolves ids over the network, so validity cannot be checked offline; seeding from the picker's list is the rule that stops this recurring. |
| NEW-30 | Every counted statistic prerendered as `0`. | `scripts/prerender.js` emulates `prefers-reduced-motion: reduce`. Proved in §6.1 against the seed's own numbers. |
| NEW-50 | `e2e/**` was outside the `lint` and `format` globs. | Added to all four globs, with a dedicated `eslintConfig` override. The one real finding the new coverage produced was fixed in the test, not silenced. |

## 10. Acceptance criteria

- [x] `docs/QA/48-final-audit.md` records green results for every check, the
      route walk for all roles, the seed reset test, prerender status,
      guidelines regeneration and the dependency review.
- [x] `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` complete — 11 sections, every
      row carrying its current value, its Admin screen and a go-live yes/no.
- [x] `README.md` final — all 35 scripts and all 12 environment variables
      documented (asserted programmatically), plus dual mode, the mock and seed
      reset, testing, build and prerender, deployment, switch-over, Windows
      notes, troubleshooting and the licence.
- [x] `docs/archive/CODEBASE_INVENTORY.md` in place, with a header saying it is
      a frozen snapshot. It was moved there by prompt 03, and
      `scripts/check-traces.js` already excludes `docs/archive` and `prompts` —
      verified, not re-done.
- [x] `.env.example` complete; `check:env` passes (8/8) and is in `check:all`.
      `MOCK_URL` was the one variable read in code and missing from it.
- [x] `package.json` version `1.0.0`.
- [x] `docs/PROJECT_STATE.md` status **COMPLETE** with the final metrics.
- [x] `git tag v1.0.0` on the final commit; `git status` clean.
- [x] `npm run check:all` passes on a clean `npm ci` — run twice, exit 0 both
      times, the second on the final tree (§2).

One criterion needs a caveat rather than a tick: the prompt asks every check to
be recorded green, and **`npm run a11y:audit` exits 1** on 12 errors (§3.5). It is
not part of `check:all`, it had never completed before this prompt, and both
findings are pre-existing, admin-only and fixable only by a global-CSS or
design-token change. They are deferred as NEW-53 and NEW-54 with their
measurements. Recorded as amber, not as green.
