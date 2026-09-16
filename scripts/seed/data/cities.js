/**
 * `cities` — one record (§6.2). Squares N Acres works one city properly; the
 * collection exists because the data model is city-scoped and a second city is
 * a row, not a migration.
 */

module.exports = function cities({ stamps }) {
  return [
    {
      id: 1,
      name: 'Bengaluru',
      slug: 'bengaluru',
      state: 'Karnataka',
      isActive: true,
      ...stamps({ createdDaysAgo: 180 }),
    },
  ];
};
