/**
 * `badges` — the eight of §6.4. `color` is a **tone name** the theme resolves,
 * never a hex literal: the palette lives in `global.css` and `theme.js` alone
 * (§2.4), and a colour stored in the database is a colour no redesign can
 * change.
 *
 * A badge is only as good as its consistency, so the seed applies two rules
 * the validator re-checks: "Ready to Move" appears on ready-to-move listings
 * only, and "RERA Approved" only where `reraRegistered` is true.
 */

const BADGES = [
  ['New Launch', 'info', 'mdi:new-box'],
  ['Hot Deal', 'error', 'mdi:fire'],
  ['Ready to Move', 'success', 'mdi:home-check-outline'],
  ['RERA Approved', 'primary', 'mdi:certificate-outline'],
  ['Verified', 'success', 'mdi:shield-check-outline'],
  ['Premium', 'neutral', 'mdi:diamond-stone'],
  ['Price Drop', 'warning', 'mdi:trending-down'],
  ['Limited Units', 'warning', 'mdi:counter'],
];

module.exports = function badges({ stamps, slugify }) {
  return BADGES.map(([name, color, icon], index) => ({
    id: index + 1,
    name,
    slug: slugify(name),
    color,
    icon,
    isActive: true,
    order: index + 1,
    ...stamps({ createdDaysAgo: 180 }),
  }));
};
