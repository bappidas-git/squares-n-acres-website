# 66 — "localhost is not working" after prompt 51: the web dev server left on port 3000

**Date:** 2026-09-28 · **Toolchain:** Node 18, 20, 22, 24, 26; Chromium (Playwright) · **Backend:**
the mock on `:4000`

The owner reported that after prompt 51 the site on localhost stopped working when `npm run dev`
was run. The code on `main` (`435f873`) starts and serves in every configuration below. What does
reproduce is the situation QA-54, QA-57 and QA-58 met on port 4000, on the other port: a process
from an earlier session still holding port 3000, which `npm run dev` could not replace.

| #   | Reported                                  | Cause                                                                            |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | localhost not working after `npm run dev` | a web dev server from an earlier session held port 3000, and nothing replaced it |

---

## What was checked, and works

Each run is `npm run dev` exactly as `package.json` has it. "Renders" means Chromium found no
uncaught error, no development error overlay, no error boundary and no API answer of 4xx/5xx.

- **A fresh clone.** `npm ci`, no runtime database, Node 22.22: compiles, and all 26 public
  routes, an unknown address (its 404 page) and all 41 admin routes, signed in as the admin,
  render.
- **Node versions.** `npm run dev` compiles and both halves answer under 18.20, 22.22, 24.21 and
  26.10; a sample of public and admin routes renders under 24.21. Under 20.20 the mock starts and
  its 410 tests pass, also with `require(esm)` and module detection turned off, as on a Node 20
  older than 20.19.
- **An old runtime database.** `mock-server/.runtime/db.json` from the seed before prompt 51
  (`17790a2`): the mock adds `notFoundLog`; the dashboard, properties, leads, media, SEO,
  settings, pages and articles screens and three public pages render.
- **Old browser state.** Chromium used against the pre-51 app first — signed in, a shortlist,
  recent properties, a local property draft — then pointed at `main`: the 14 public and admin
  routes it revisited render, the property form with its old draft among them.
- **A pull under a running `npm run dev`.** The pre-51 checkout running, then updated in place to
  `main`: webpack first compiles a half-updated tree (`Can't resolve './ConflictDialog'`,
  `'folderOption' is not exported`), then `Compiled successfully!`; `node --watch` and the mock's
  own reload (QA-58) put the mock on the new code, and the routes sampled render.
- **Memory.** A cold compile peaks at about 1.56 GB before and after prompt 51.
- **The checkout.** No file names that differ only in case, none that Windows refuses, no long
  paths; no dependency changed (the lockfile only carries the version).
- **The checks.** `lint`, `test:scripts`, `test:mock`, `check:traces`, `validate:seed`,
  `check:contrast`, `check:guidelines`, `check:env`: green. `1e3fbc8` and `768de0a` build.

## What reproduces

A web dev server left on port 3000 — an `npm run dev` kept running across the pull (QA-58 found
that is how this machine is used), a closed terminal, or a Ctrl+C that never reached the children
(common on Windows). Then `npm run dev`:

```
[mock] Mock API: http://localhost:4000/api (runtime db: mock-server/.runtime/db.json)
[web] Something is already running on port 3000.
[web] npm start exited with code 0
```

`concurrently` gives `react-scripts start` no terminal, so it cannot ask to use another port: it
exits with code 0, and the browser goes on showing whatever the old process serves. Prompt 51 was
the largest pull yet — it moved `ConflictDialog` and `DraftBanner` into `components/admin/` and
renamed exports — and an old server that missed part of it (a watcher that drops events during a
big checkout) stays on "Failed to compile" until it is restarted, which `npm run dev` could not
do. The mock half has recovered from the same situation on its own since QA-57.

README's advice was wrong twice over: "CRA offers another port for the web app on its own" is not
true under `npm run dev`, and a web app on another port cannot reach the mock, whose CORS allows
the development server on port 3000 only.

## Fix

`npm run dev` claims the port before it starts the web dev server:
`concurrently … "npm run mock:watch" "node scripts/claim-web-port.js && npm start"`.

- **This project's dev server, from this change on,** answers `GET /__web/identity`
  (`src/setupProxy.js`; CRA loads that file into `react-scripts start` only, so no build carries
  it) and is asked to stop with `POST /__web/shutdown`. The shutdown is accepted from this machine,
  without `Origin` and with `x-web-takeover: 1` — the mock's own `controlRoutes`, which now take a
  base path, a header and a refusal. The old server runs CRA's own Ctrl+C handler and exits 0.
- **One from before those routes** cannot be asked. The process listening on the port is found
  with the mock's helpers (`lsof`/`fuser`/`ss`; `netstat` on Windows) and stopped only when its
  command line runs `react-scripts start` and either names this checkout or serves this site's
  development page (the template's `application-name` and `/static/js/bundle.js`), or — with a
  command line that cannot be read — when it is Node and serves that page.
- **Anything else is never stopped.** The web half exits 1:
  `Port 3000 is in use by a program that is not this project's web dev server (pid …: …), and the web dev server needs it. Stop that program (…), then run npm run dev again.`
- A port held by no process that can be found is left to `react-scripts start`, with a hint; an
  unexpected failure of the claim never keeps the dev server from starting.

Whichever `npm run dev` starts last serves the port, so running it again is how to get a fresh
web dev server. The step is in `dev` only: Playwright's `webServer` runs `npm start` with
`reuseExistingServer` and must never stop the server it reuses.

## Verification

- **The reported situation.** A web dev server from `main` (no control routes) left running on
  3000, then `npm run dev` with this change:
  `[web] Stopped an older web dev server (pid 9230) that was still answering on port 3000. The new one starts now.`,
  then `Compiled successfully!`; the old process is gone, and the new one answers
  `/__web/identity`. Every public and admin route rendered afterwards.
- **Twice in a row.** A second `npm run dev` beside the first: the first's web half prints
  ``A newer `npm run dev` (pid …) is taking this port over; this web dev server is stopping.`` and
  exits 0, the second serves the port, and the second mock leaves the first (same code) alone.
- **Another program.** `python3 -m http.server 3000`, then `npm run dev`: the message above, the
  web half exits 1, and the program keeps running.
- **A free port:** the claim is silent and takes about 80 ms.
- `scripts/__tests__/webTakeover.test.js` (28 tests): every decision with scripted holders —
  including Windows command lines, an unreadable command line, a build of the site served
  statically, another project's dev server, a server that refuses or never lets go — the control
  routes over HTTP, and, where `lsof`, `fuser` or `ss` exists, a real stand-in for a pre-change
  dev server stopped and another project's left running. `mock-server/__tests__/takeover.test.js`
  (30) unchanged and green.

## On this machine now

Pull, then run `npm run dev` once: it stops the web dev server left on port 3000 and starts a
fresh one. If it names another program instead, stop that program with the command it prints.
If localhost still does not work after that, the terminal output of `npm run dev` and the
browser's console are what to send: nothing in the code on `main` reproduces a failure without a
leftover process.

## Not covered

- **Windows.** `netstat`, PowerShell, `wmic` and `tasklist` are the mock's helpers, covered by unit
  tests on captured output (QA-57, QA-58), and not run on Windows here. If a lookup fails there, a
  pre-change dev server is not stopped: the claim names the process and exits 1, or, when no
  process can be found, leaves the port to `react-scripts start` as before. Dev servers started
  after this change are stopped over HTTP, which needs no lookup at all.
