/**
 * The rows the data-driven CMS blocks are given in `allBlocks.render.test.jsx`.
 *
 * It is a module of its own because `jest.mock` factories are hoisted above
 * every import: a factory may `require` a module, but it may not close over a
 * variable the test file declared. Putting the fixtures here is what lets the
 * mocks answer with the **seed's** records rather than with invented ones — a
 * block that draws a real listing card is a block that has been tested.
 *
 * It lives in `__fixtures__/` rather than beside the suites, because
 * `create-react-app` collects **every** file under a `__tests__` directory as
 * a test — a helper module in there is a suite with no tests in it, which
 * fails the run.
 */

const fs = require('fs');
const path = require('path');

const { embedProperty } = require('../../../../mock-server/lib/embed');
const { publicProperty } = require('../../../../mock-server/lib/scope');

/** The committed seed, read the way `scripts/validate-seed.js` reads it. */
const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'db.json'), { encoding: 'utf-8' })
);

/** A `{ data, meta }` envelope (§5.2) around a list of rows. */
const ok = (rows) =>
  Promise.resolve({
    data: rows,
    meta: { page: 1, perPage: rows.length || 1, total: rows.length, totalPages: 1 },
  });

const active = (rows = []) => rows.filter((row) => row?.isActive !== false);

/** Three listings, exactly as `GET /properties` presents them (§5.5, §5.10). */
const properties = active(seed.properties)
  .slice(0, 3)
  .map((record) => publicProperty(embedProperty(record, seed)));

const articles = seed.articles.filter((row) => row.status === 'published').slice(0, 3);
const faqs = active(seed.faqs).slice(0, 3);
const team = active(seed.teamMembers).slice(0, 3);
const testimonials = active(seed.testimonials).slice(0, 3);
const partners = active(seed.partners).slice(0, 4);
const banks = active(seed.banks).slice(0, 3);
const jobs = active(seed.jobOpenings).slice(0, 3);

/** What `useMasterData()` answers, from the same seed. */
const masterData = {
  localities: seed.localities,
  cities: seed.cities,
  propertyTypes: seed.propertyTypes,
  amenities: seed.amenities,
  badges: seed.badges,
  developers: seed.developers,
  banks,
  loading: false,
  error: null,
  refresh: () => Promise.resolve(),
};

module.exports = {
  ok,
  seed,
  properties,
  articles,
  faqs,
  team,
  testimonials,
  partners,
  banks,
  jobs,
  masterData,
};
