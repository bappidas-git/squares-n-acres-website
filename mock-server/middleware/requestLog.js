/**
 * Request logging (00_MASTER_CONTEXT.md §10).
 *
 * One line per request — `GET /api/properties → 200 (4ms)` — written when the
 * response finishes, so the status and the duration are real. `morgan` would
 * do the same thing and is not on the allow-list of dependencies (§3.3), so
 * this is the whole logger.
 */

/** Widths chosen so the arrows line up for the verbs the API actually uses. */
const METHOD_WIDTH = 6;

/**
 * @type {import('express').RequestHandler}
 */
function requestLog(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const method = req.method.padEnd(METHOD_WIDTH);
    console.info(`${method} ${req.originalUrl} → ${res.statusCode} (${ms.toFixed(0)}ms)`);
  });

  next();
}

module.exports = { requestLog };
