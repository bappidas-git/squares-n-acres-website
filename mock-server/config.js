/**
 * Mock-server configuration (00_MASTER_CONTEXT.md §3.5, §5.12; decision D19).
 *
 * Everything is read from the environment once, at startup, with the documented
 * defaults: port 4000, no artificial latency, 24-hour tokens. The variables are
 * listed in `.env.example`; `MOCK_*` is deliberately not `REACT_APP_*` — they
 * are read by Node at runtime, never compiled into the bundle.
 */

const path = require('path');

/** A positive integer from an environment variable, or `fallback`. */
function intFromEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const config = {
  /** `MOCK_PORT` — the port `npm run mock` listens on. */
  port: intFromEnv(process.env.MOCK_PORT, 4000),

  /** `MOCK_DELAY_MS` — artificial latency on every response, for skeleton QA. */
  delayMs: intFromEnv(process.env.MOCK_DELAY_MS, 0),

  /** `MOCK_TOKEN_TTL_HOURS` — how long a token issued by prompt 07 stays valid. */
  tokenTtlHours: intFromEnv(process.env.MOCK_TOKEN_TTL_HOURS, 24),

  /** `MOCK_FRESH=1` — re-seed the runtime database on start. */
  fresh: process.env.MOCK_FRESH === '1',

  /** The committed seed. The server reads it and never writes to it. */
  seedPath: path.join(__dirname, '..', 'db.json'),

  /** The git-ignored working copy JSON Server mutates. */
  runtimePath: path.join(__dirname, '.runtime', 'db.json'),

  /** Origins allowed to call the API (§5.12): dev server, and the served build. */
  corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
};

module.exports = config;
