/**
 * Per-IP rate limiting (00_MASTER_CONTEXT.md §5.11).
 *
 * The public write endpoints — `POST /leads`, `POST /newsletter/subscribe`,
 * `POST /jobs/:id/apply` — accept 10 requests per minute per IP, which Laravel
 * spells `throttle:10,1`. The counters live in memory: the mock is a single
 * process and restarting it is meant to clear them.
 *
 * Prompts 08 and 09 mount the middleware on the routes that need it.
 */

const { tooManyRequests } = require('./errors');

/** Express reports IPv4 clients as `::ffff:127.0.0.1` behind the IPv6 stack. */
function clientIp(req) {
  const address = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

/**
 * Builds a rate-limiting middleware.
 *
 * `message` words the 429 for the route it guards — the password change says
 * what is being refused (QA-65); left out, it is the contract's default.
 *
 * @param {{windowMs?: number, max?: number, key?: (req: import('express').Request) => string,
 *   message?: string}} [options]
 * @returns {import('express').RequestHandler}
 */
function rateLimit({ windowMs = 60_000, max = 10, key = clientIp, message } = {}) {
  /** @type {Map<string, {count: number, resetAt: number}>} */
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const bucket = hits.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      hits.set(bucketKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      next(tooManyRequests(message));
      return;
    }

    next();
  };
}

module.exports = { rateLimit, clientIp };
