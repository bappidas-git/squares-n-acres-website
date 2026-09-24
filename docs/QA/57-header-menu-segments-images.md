# 57 — Header menu and Segments 403s, missing images, and the Insights menu

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) · **Backend:** the mock
on `:4000`, and for the 403s an older copy of it (`4233d24`) started from a worktree.

The owner reported six problems. All six were confirmed and all six are fixed. They come
down to three causes:

| #   | Reported                                                                          | Cause                                                   |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Admin → Pages → Header menu: "You do not have permission to perform this action." | an older mock still answering on port 4000 (A)          |
| 2   | Admin → Master data → Segments: the same 403                                      | the same (A)                                            |
| 3   | Admin → Articles: some thumbnails blank, and after a refresh all of them          | `LazyImage` hides an image that loaded early (B)        |
| 4   | Insights: article cards and the article hero blank                                | the same (B)                                            |
| 5   | Property cards without their photo on every page                                  | the same (B)                                            |
| 6   | The Insights label is a link, and its dropdown should list Insights too           | the desktop panel never offered the menu's own page (C) |

---

## A — An older mock kept the port (1, 2)

**What happened.** Both screens call routes that the current mock serves:
`GET /api/admin/header-menus` and `GET /api/admin/segments` answer 200 to the admin on this
checkout. The 403 came from an older mock process. Its route map predates both screens
(`segments` joined it in QA-52, `header-menus` in QA-56), and the API denies an admin
route it has no rule for (§7). Reproduced exactly: with the mock at `4233d24` on port
4000, both routes answer `403 {"message":"You do not have permission to perform this
action."}`, and Localities still answers 200, which is what the screenshots show.

**Why QA-54 did not prevent it.** QA-54 made `npm run dev` restart the mock when its code
changes. That covers a pull made while `npm run dev` runs, but not an older mock that
outlives its session: a Ctrl+C that never reached the child (common on Windows), a
second terminal, or an `npm run mock` started before a pull. The new mock then printed
`Port 4000 is already in use…` and waited ("Failed running … Waiting for file changes")
while the web app kept talking to the old one. Reproduced exactly.

**Fix.** A new mock now claims the port before it reads the runtime database, and when
the port is taken it checks what holds it (`mock-server/lib/takeover.js`):

- **This checkout's mock, running this very code:** left serving; the new process says so
  and exits 0. "This very code" means `sourceRevision()`, a digest of every module the
  process loaded from the repository, the `src/` modules it shares included.
- **A mock running other code, or another checkout's mock:** asked to stop with
  `POST /__mock/shutdown`, then the port is taken.
- **A mock from before this change** (it answers `/api/health` like the mock but has no
  `/__mock/identity`): the process listening on the port is found (`lsof`, then `fuser`;
  `netstat -ano` on Windows) and stopped, but only once its command line shows it runs
  `mock-server/server.js`.
- **Any other program:** left alone. The mock exits 1 and says the port belongs to
  something else.

The port is claimed first because the old process rewrites the whole runtime file from
memory on its next write, and would undo what `ensureRuntimeDb` adds. Requests that
arrive while the database loads are held and then answered. `/__mock/*` sits outside
`/api`, so the contract, the endpoint registry and the Laravel API know nothing of it. A
shutdown is refused unless it comes from this machine, carries `X-Mock-Takeover: 1`, and
has no `Origin`, so a web page cannot stop the developer's mock.

**Verified:**

- The `4233d24` mock on :4000, then `npm run dev`: `[mock] Stopped an older mock API (pid
5257) that was still answering on port 4000…`. Both screens then render: 10 menus and
  3 segments, the numbers the seed has.
- A second start with the same code prints `…already running this code… Nothing to
start.` and exits 0.
- Under `node --watch`, changing a route restarts the watched child, which asks the other
  mock to stop and takes the port; that mock logs `A newer mock API (pid …) is taking over`.
- A shutdown without the header, with an `Origin`, or as a GET is refused (403, 403, 404).
- SIGINT and SIGTERM with a keep-alive client connected exit in 7–8 ms.

## B — `LazyImage` hid pictures that had already arrived (3, 4, 5)

**What happened.** Every photograph (property cards, article cards, the article hero,
the admin thumbnails) goes through `ui/LazyImage`. It draws the `<img>` at `opacity: 0`
and fades it in on `load`. It also reset its state in an effect whenever `src` changed:
`useEffect(() => setStatus('loading'), [src])`, which runs on mount as well. A picture
the browser already holds answers `load` before React runs that effect: the HTTP cache
on a refresh (picsum sends `max-age=2592000, immutable` for the image and 86 400 s for
the redirect), or the preload of an LCP image. The reset then landed after the `load`
and left the picture invisible for good. That is a plain grey box with no monogram,
exactly as in the screenshots, because the fallback only shows on `error`. So the first
visit showed the pictures that came over the network, and a refresh blanked the ones
that had shown.

**Fix.** The load state is keyed to its `src` (`{ src, status }`) instead of being reset
by an effect. Any other `src` reads as loading, so nothing can overwrite a `load` that
came early.

**Measured** (Chromium, CPU throttled 10×, cold load then reloads; the figure is pictures
loaded but invisible out of the pictures on the page):

| Page                 | Before: cold → reload 1 → 2 → 3 → 4 | After: every load |
| -------------------- | ----------------------------------- | ----------------- |
| `/admin/articles`    | 0 → 12 → 12 → 12 → 12 of 12         | 0 of 12           |
| `/buy`               | 0 → 12 → 12 → 0 → 0 of 12           | 0 of 12           |
| `/insights/articles` | 1 of 10 on reloads (6× throttle)    | 0 of 10           |

The article hero of _Rental Yields Across Bengaluru_ renders after three throttled
reloads. The seed gives every property and every article an image, so nothing else was
drawing a blank box.

## C — The Insights dropdown (6)

**What happened.** The Insights label opens `/insights/articles`, but its desktop panel
listed only Articles, FAQs and Real Estate Awareness. The phone drawer already opened the
group with "All insights".

**Fix.** A menu of pages and links that has an address of its own now lists that page
first in its panel, under the menu's name (`withOverview` in `config/navigation.js`). It
is drawn like the drawer's "All …" line (semibold, `--color-primary-dark`). The drawer
skips it, because its own line already links there. It also survives the fold into
"More" (1 024 px), where a column heading is not a link. The Articles page stays in the
list: it has the same address, but it is a separate entry. Generated menus (Buy, Rent,
Commercial) and menus without an address (Buyer assistance, Company) are unchanged.

## Tests

- `mock-server/__tests__/takeover.test.js`, 19 tests. The four outcomes of `takeOver`,
  the control routes and their refusals, `netstat` output in English and German, `lsof`
  and `fuser` output, command lines on Linux, macOS and Windows, `sourceRevision`, and,
  where `lsof` or `fuser` exists, a real legacy mock process found by its port and
  stopped.
- `LazyImage.test.jsx`, 4 new tests. The one for a `load` that lands before the effects
  run fails on the old component and passes on the new one.
- `navigation.test.js`, `MegaMenu.test.jsx` and the new `MobileDrawer.test.jsx`: the
  overview entry, where it is not added, the More fold, and the drawer drawing
  "All insights" once.

`npm run check:all` passes: 3 848 Jest tests, 237 mock tests, 53 of 54 scripts tests (the
one skip needs Chrome in a standard location), and a clean build.

## Not tested, and the risk

- **Windows.** The `netstat` and PowerShell paths are covered by unit tests on captured
  output, not run on Windows. If either fails, the new mock does not stop the old one: it
  names the old process id and the command that stops it, and exits 1.
- **A holder that answers nothing** (hung, or not HTTP) counts as another program and is
  never touched.
