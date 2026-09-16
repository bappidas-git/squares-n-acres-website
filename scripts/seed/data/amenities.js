/**
 * `amenities` — 45 records across the eight categories of §6.4.
 *
 * Icons are Iconify `mdi:` ids (§3.1). The `commercial` category is what an
 * office, a warehouse or a retail unit draws from; a residential listing never
 * mixes the two, which is the rule `scripts/validate-seed.js` checks.
 */

/** name, category, icon. */
const AMENITIES = [
  ['Power Backup', 'basic', 'mdi:power-plug-outline'],
  ['Lift', 'basic', 'mdi:elevator-passenger'],
  ['Water Supply', 'basic', 'mdi:water-outline'],
  ['Piped Gas', 'basic', 'mdi:gas-cylinder'],
  ['Intercom', 'basic', 'mdi:deskphone'],

  ['Swimming Pool', 'lifestyle', 'mdi:pool'],
  ['Clubhouse', 'lifestyle', 'mdi:home-heart'],
  ['Gymnasium', 'lifestyle', 'mdi:dumbbell'],
  ['Spa', 'lifestyle', 'mdi:spa-outline'],
  ['Mini Theatre', 'lifestyle', 'mdi:filmstrip'],
  ['Library', 'lifestyle', 'mdi:bookshelf'],
  ['Party Hall', 'lifestyle', 'mdi:party-popper'],
  ['Landscaped Gardens', 'lifestyle', 'mdi:flower-outline'],

  ['24x7 Security', 'safety', 'mdi:shield-account-outline'],
  ['CCTV Surveillance', 'safety', 'mdi:cctv'],
  ['Fire Safety', 'safety', 'mdi:fire-extinguisher'],
  ['Gated Community', 'safety', 'mdi:gate'],
  ['Video Door Phone', 'safety', 'mdi:doorbell-video'],

  ['Tennis Court', 'sports', 'mdi:tennis'],
  ['Badminton Court', 'sports', 'mdi:badminton'],
  ['Basketball Court', 'sports', 'mdi:basketball'],
  ['Cricket Pitch', 'sports', 'mdi:cricket'],
  ['Jogging Track', 'sports', 'mdi:run'],
  ['Yoga Deck', 'sports', 'mdi:yoga'],
  ['Table Tennis', 'sports', 'mdi:table-tennis'],

  ["Kids' Play Area", 'kids', 'mdi:slide'],
  ['Creche', 'kids', 'mdi:baby-carriage'],
  ["Kids' Pool", 'kids', 'mdi:pool-thermometer'],

  ['Rainwater Harvesting', 'eco', 'mdi:weather-pouring'],
  ['Solar Lighting', 'eco', 'mdi:solar-power-variant-outline'],
  ['Sewage Treatment Plant', 'eco', 'mdi:water-sync'],
  ['Organic Waste Converter', 'eco', 'mdi:recycle-variant'],
  ['EV Charging', 'eco', 'mdi:ev-station'],

  ['Covered Parking', 'convenience', 'mdi:car-outline'],
  ['Visitor Parking', 'convenience', 'mdi:car-multiple'],
  ['Wi-Fi Connectivity', 'convenience', 'mdi:wifi'],
  ['Convenience Store', 'convenience', 'mdi:cart-outline'],
  ['ATM', 'convenience', 'mdi:credit-card-outline'],
  ['Cafeteria', 'convenience', 'mdi:coffee-outline'],

  ['Conference Room', 'commercial', 'mdi:presentation'],
  ['Reception', 'commercial', 'mdi:desk-lamp'],
  ['Pantry', 'commercial', 'mdi:fridge-outline'],
  ['Server Room', 'commercial', 'mdi:server'],
  ['Loading Dock', 'commercial', 'mdi:truck-outline'],
  ['Cold Storage', 'commercial', 'mdi:snowflake'],
  ['Fire Sprinklers', 'commercial', 'mdi:sprinkler-variant'],
];

module.exports = function amenities({ stamps, slugify }) {
  return AMENITIES.map(([name, category, icon], index) => ({
    id: index + 1,
    name,
    slug: slugify(name),
    category,
    icon,
    isActive: true,
    order: index + 1,
    ...stamps({ createdDaysAgo: 180 }),
  }));
};
