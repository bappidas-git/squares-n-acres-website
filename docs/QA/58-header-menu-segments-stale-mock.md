# 58 — Header menu and Segments 403s, a third time: the mock nobody restarted

**Date:** 2026-09-24 · **Toolchain:** Node 22, Chromium (Playwright) · **Backend:** the mock
on `:4000`. For the 403s, the mock at `e85e09d` (the last merge before Segments) served the same
port.

The owner reported a third time that Admin → Pages → Header menu and Admin → Master data →
Segments show "Something went wrong — You do not have permission to perform this action." to
the admin. QA-54 and QA-57 had both traced it to an older mock on port 4000, and both fixes were
real. Neither could reach the process that was answering.

| #   | Reported                                           | Cause                                                               |
| --- | -------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Pages → Header menu: "You do not have permission…" | a mock started before QA-52 kept answering, and was never restarted |
| 2   | Master data → Segments: the same                   | the same                                                            |

---

## What answered

**The current code serves both screens.** `GET /api/admin/header-menus` and
`GET /api/admin/segments` answer 200 to the admin. In Chromium the screens list 10 menus and
3 segments, and every request the two screens make answers 200.

**An older mock gives the screenshots exactly.** With the mock at `e85e09d` on port 4000 and the
current web app, Header menu reads "Header menu 0 … Something went wrong / You do not have
permission to perform this action." and Segments shows the same sentence inside its table.
`GET /api/admin/header-menus` and `GET /api/admin/segments` answer 403, while Localities
still answers 200. The web app never writes that sentence. It is the mock's default deny for an
admin route that has no rule (§7): `segments` joined the route map in QA-52, `header-menus` in
QA-56.

## Why QA-54 and QA-57 did not reach it

Both act when a mock **starts**:

- QA-54 made `npm run dev` run the mock under `node --watch`. A session started before QA-54 keeps
  the command it started with (`concurrently "npm run mock" "npm start"`), because a pull does
  not change a command that is already running.
- QA-57 made a starting mock take the port from an older one. That does nothing until a new mock
  is started.

Meanwhile CRA hot-reloads every pull into the browser, so the web app showed the new screens
while the mock answering them kept the route map it started with. After a pull, the only new
code that ran on the machine was the web app, and the web app said "permission".

When a new mock was started, QA-57 could still give up:

- **A mock started as `node server.js` inside `mock-server/`.** Its command line does not name
  `mock-server/server.js`, so QA-57 answered `{"outcome":"stuck","pid":2013}` (reproduced).
- **Windows.** The command line is read through PowerShell (5 s) or `wmic`, which Windows 11
  24H2 removed. When both fail the outcome is `stuck`. The new mock then exits 1, and under
  `node --watch` the watcher prints "Failed running…" and waits, while the web app goes on
  talking to the old mock.

## Fix, in three layers

### A — A running mock keeps to the code on disk (`mock-server/lib/hotReload.js`)

When a request arrives, at most every 500 ms, the mock compares every module it loaded from the
repository (its own files and the `src/` modules it shares) with the file on disk: size and mtime
first, then the content when either moved. When one changed, it:

1. waits until the files have been left alone for 300 ms, because a pull writes many;
2. lets the requests in flight finish, and holds the new ones;
3. rebuilds the API in the same process: the repository's modules are dropped from
   `require.cache` and required afresh, then `ensureRuntimeDb({ fresh: false })` adds what the
   seed gained, and a new JSON Server router and a new Express app are built;
4. answers the held requests with it, and prints
   `The mock's code changed on disk (…); the API reloaded it in 66ms and answers with it now.`

The port never closes. It works under `npm run mock`, under `npm run dev`, and for a mock left
running in a forgotten terminal. It needs no file watcher, so a drive that reports no changes
(a network share, a WSL mount of a Windows disk) cannot hide one.

- **Code that does not load** (a file half-written, a syntax error): the previous generation
  goes on answering, and one line names the file and line
  (`Unexpected identifier 'error' (mock-server/routes/pages.js:403)`). Its cache entries are put
  back, so its lazy `require('../db')` still finds its own generation. The same files are tried
  again after 1 s, then 2, 4 … 30 s; a further change is tried at once.
- **The shell** (`server.js`, `lib/takeover.js`, `lib/hotReload.js`) is not reloaded. A change to
  it is reported once, and a restart applies it (`npm run dev` restarts under `node --watch`).
- **Memory.** Each reload prunes `module.children` of the modules that stay, or the shell would
  keep every generation it required. It also forgets Node's `Module._pathCache` entries for the
  repository, or a module moved into a folder of its own name would not be found.

Every answer carries `X-Mock-Revision`, the revision of the code that gave it, exposed through
CORS. `/__mock/identity` reports the same revision, so after a reload a second start finds the
mock current and leaves it alone.

### B — The takeover recognises every old mock it can safely stop (`lib/takeover.js`)

A mock from before `/__mock/identity` is still stopped when its command line names
`mock-server/server.js`. When it does not, the port must answer exactly as every mock has
answered (`/api/health`, and `404 {"message":"Not found"}` with nothing else for
`/__mock/identity`; `app.js` has had one version since it was written), and the process must be
Node. That means either running a `server.js`, or having a command line that cannot be read, in
which case the image name comes from `tasklist` on Windows and `ps -o comm=` elsewhere.
PowerShell now gets 15 s instead of 5, and a Linux without `lsof` and `fuser` asks `ss`.

### C — The web app says what is wrong (`src/services/staleApi.js`, `http.js`)

Some refusals cannot be right: a 403 to a GET, for an admin or a manager whom the registry's
`auth` allows on that endpoint, from an API on this machine whose answer has no
`X-Mock-Revision`. For those the screen no longer says "You do not have permission…". It says:

> The API at localhost:4000 is running older code than this web app, so it does not know this
> screen yet. Restart it: stop “npm run dev” with Ctrl+C and run “npm run dev” again.

A `console.warn` names the call as well. Sales users are left out, because their scoped 403s on
leads are correct (D15). Writes, public endpoints and any API that is not on this machine are
left out too, so a deployed API never has a refusal rewritten.

This is the only part that reaches a developer whose pre-QA-58 mock is still running when they
pull this change. That mock cannot reload itself, but the web app it serves hot-reloads and
explains.

## Verified

- **Old mock, new web app:** both screens now read "The API at localhost:4000 is running older
  code than this web app… Restart it…" instead of the permission sentence.
- **The restart, `npm run mock:watch` as `npm run dev` runs it,** with the `e85e09d` mock on port
  4000, started as `node server.js` inside `mock-server/`, over a runtime database written by
  that mock (no `segments`, no `headerMenus`):
  `Stopped an older mock API (pid 2013)… This one serves the port now.` The new mock then logged
  `Runtime db gained segments, headerMenus, 11 built-in pages from db.json`, and both screens
  render: 10 menus, 3 segments.
- **A pull while the mock runs, `npm run mock` in a temporary checkout:**
  - With a route map that has no rule for segments, `GET /admin/segments` answers 403.
  - Once the rule is restored on disk, the same process answers 200 within 600 ms, and
    `X-Mock-Revision` changes from `06bec11b039b` to `99ff6d391149`.
  - A syntax error on disk: the old code keeps answering 200, with one line naming
    `pages.js:403`. After the fix it reloads.
- **Under `node --watch`:** an edit restarts the process as before. The two mechanisms do not
  meet, there is one listener on the port, and every answer is 200.
- **A second start** beside a current mock prints `…already running this code… Nothing to start.`
  and exits 0, and it does the same after a reload.
- **The new end-to-end test fails on the old code:** with QA-57's `server.js` the route stays at
  403 after the simulated pull (expected 200).

## Tests

- `mock-server/__tests__/hotReload.test.js`, 16 tests:
  - snapshots and revisions;
  - a changed, touched or deleted file;
  - a reload, and the revision a fresh start would have;
  - requests in flight and held, and the drain timeout;
  - files that are still settling;
  - a load that fails, its retry, and putting the running generation back;
  - the shell;
  - a module moved into a folder;
  - no generations kept;
  - the check interval;
  - end to end: the real `server.js` answers 403, then 200 after the route map changes on disk,
    without a restart, and a second start finds it current.
- `mock-server/__tests__/takeover.test.js`, 19 → 30 tests:
  - an unreadable Node process, and one that is not Node;
  - a port that does not answer like the mock;
  - `node server.js` and its look-alikes;
  - `ss`, `tasklist`, the PowerShell timeout, and the recognisers;
  - a real legacy mock started as `node server.js` inside `mock-server/`.
- `src/services/__tests__/staleApi.test.js`, 9 tests, and 4 new ones in
  `src/services/__tests__/http.test.js`, through the real response interceptor.

## What the owner does once

After pulling this change, stop `npm run dev` with Ctrl+C and start it again. The mock that
answered the screenshots predates every fix and can only be replaced from outside. From then on
it follows every pull by itself. If the terminal it runs in cannot be found, start
`npm run dev` anyway: the new mock stops the old one.

## Not tested, and the risk

- **Windows.** `tasklist`, `netstat` and PowerShell are covered by unit tests on captured output,
  not run on Windows. If a lookup fails there, the takeover gives up as before, naming the process
  id and the command that stops it. The web app now says the same on the screen.
- **In-process reload.** A module that registered global state when required (a `process.on`
  handler, an interval) would register it again on every reload. None does today: only
  `server.js`, which is not reloaded, calls `process.on`, and nothing in the mock sets an
  interval. In-memory state (rate-limit counters, preview tokens, gated-file grants, the
  view-count window) starts empty after a reload, as it does after a restart.
- **A request that never finishes** delays a reload by at most 5 s. After that the reload goes
  ahead while the request runs on the old code.
