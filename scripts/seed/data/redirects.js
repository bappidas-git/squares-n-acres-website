/**
 * `redirects` — the three paths the previous site used that this one does not
 * (§6.14, D30).
 *
 * `hits` starts at zero and only `GET /redirects/resolve` moves it, so the
 * seeded figure stays honest: nobody has followed these yet.
 */

const REDIRECTS = [
  ['/old-properties', '/properties', 'Legacy listing path from the previous site.'],
  ['/blog', '/insights/articles', 'The blog moved under Insights.'],
  [
    '/flats-in-whitefield',
    '/localities/whitefield',
    'Old locality landing page, now the Whitefield locality page.',
  ],
];

module.exports = function redirects({ stamps }) {
  return REDIRECTS.map(([fromPath, toPath, note], index) => ({
    id: index + 1,
    fromPath,
    toPath,
    statusCode: 301,
    isActive: true,
    hits: 0,
    note,
    ...stamps({ createdDaysAgo: 150 }),
  }));
};
