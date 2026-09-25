# End-to-end suite (Playwright)

Fifteen specs that drive the real application in a real browser, against the
real mock API: **login**, **create a property**, **view a property**, **submit
a lead**, **filter the listing** and **shortlist** (prompt 44), plus **publish
an article**, **the SEO panel**, **publish a CMS page** and **site settings**
(prompt 45), **the header menus** (QA-56), **the FAQ screen** (QA-59), **the
Content screens** (QA-61), **featuring and publishing a property** (QA-62) and
**the media library** (QA-63).
They are the only tests in the repository that exercise the browser; everything
else is Jest in jsdom.

```
npm run e2e                       # the whole suite, headless
npx playwright test login         # one spec
npx playwright test --headed      # watch it happen
npx playwright test --ui          # the interactive runner
npx playwright show-report        # the HTML report of the last CI run
```

## What it needs

| Requirement                  | Why                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node ≥ 20**                | `@playwright/test@1.63.0` does not support Node 18 (D6).                                                                                            |
| **A browser**                | `npx playwright install chromium` — about 150 MB, downloaded once. A machine that already has Chrome can point `CHROME_PATH` at it instead (below). |
| **Ports 3000 and 4000 free** | The suite starts `npm run mock` and `npm start` itself.                                                                                             |

### `CHROME_PATH`

`CHROME_PATH` is already how `check:links`, `check:jsonld` and the prerender
find a browser (D16, `scripts/lib/chrome.js`), and the suite honours it too:

```
CHROME_PATH=/path/to/chrome npm run e2e
```

Set, it is passed to Chromium as `launchOptions.executablePath`, so a machine
that has a Chromium build but not the exact one `npx playwright install` would
fetch runs the suite by naming it. Unset, Playwright uses its own download, as
before.

If Node is older than 20, or the browser download is blocked, the specs still
belong in the repository and `npm run e2e` still exists — it will simply say
that Playwright is not installed. Install Node 20 (`.nvmrc` pins it) and run
`npx playwright install chromium`, then run it again. Nothing else in
`npm run check:all` depends on this suite.

## How it is wired

- **`playwright.config.js`** — Chromium, one worker, `baseURL`
  `http://localhost:3000`. Two `webServer` entries start the mock and the
  development server and **reuse** whatever is already listening, so the suite
  runs happily beside a development session. The repository root carries a
  three-line `playwright.config.js` that re-exports this one, which is what lets
  `npm run e2e` be plain `playwright test`.
- **`fixtures/auth.js`** — `signIn('admin' | 'manager' | 'sales')` writes the
  three session keys of §4.2 into `localStorage` before the first navigation,
  exactly as the application does after a successful login. `login.spec.js` is
  the one spec that drives the form itself. `api` and `adminApi` are request
  contexts for fixtures and clean-up. A session is issued **once per role per
  run** because `POST /auth/login` is throttled to ten attempts a minute
  (§5.11). A whole run therefore spends three of those ten: running the suite
  three or four times inside the same minute trips the limit and every spec
  fails with `429` at `signIn`. `POST /leads` is throttled the same way and
  `lead-submit.spec.js` spends seven of its ten. Both are the rate limiter
  working — wait a minute, or restart the mock, which clears the in-memory
  counters.
- **One worker, no parallelism.** Every spec writes to the same mock database;
  two workers publishing and counting at the same time would be flaky for
  reasons that have nothing to do with the application.

## State

Each spec deletes what it created, through the API, so the suite can run twice
in a row. If a run is interrupted part-way, `npm run mock:reset` puts the seed
back (the mock must be restarted afterwards, because it holds the database in
memory).

## Writing a spec

- Select by **role and accessible name** (`getByRole`, `getByLabel`), never by
  a CSS module class — those hash at build time. The section chips on a property
  page are the one exception: they carry `data-section`, which is the key
  `sectionVisibility` uses.
- Assert what a visitor can see, not what the store holds — except for the
  shortlist, which _is_ browser storage and is checked both ways.
- A first navigation to a route is slow: the development server compiles its
  lazy chunk on demand. The timeouts in the configuration allow for it.
