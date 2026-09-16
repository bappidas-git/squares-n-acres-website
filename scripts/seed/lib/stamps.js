/**
 * `createdAt` / `updatedAt` for a seeded record.
 *
 * §10 asks for timestamps spread over the last 180 days rather than one
 * instant repeated 700 times: the admin tables sort by them, the dashboard
 * charts them, and a database where everything was created at the same second
 * hides every bug those screens can have. The spread comes from the caller's
 * seeded generator, so it is the same on every run.
 */

const { daysAgo } = require('./dates');

/**
 * @param {import('./rng').Rng} rng
 * @returns {(options?: {minAge?: number, maxAge?: number, createdDaysAgo?: number}) => {createdAt: string, updatedAt: string}}
 */
function makeStamps(rng) {
  return function stamps({ minAge = 30, maxAge = 180, createdDaysAgo = null } = {}) {
    const created = createdDaysAgo ?? rng.int(minAge, maxAge);
    const updated = rng.int(0, Math.max(0, created - 1));
    return {
      createdAt: daysAgo(created, rng.int(5, 16), rng.pick([0, 10, 15, 20, 30, 40, 45, 50])),
      updatedAt: daysAgo(updated, rng.int(5, 16), rng.pick([0, 5, 15, 25, 35, 45, 55])),
    };
  };
}

module.exports = { makeStamps };
