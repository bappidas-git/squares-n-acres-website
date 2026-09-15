/**
 * Centralized image field configuration.
 *
 * Every image-input in the admin panel references a key from this map.
 * Values are derived from actual frontend CSS layout constraints:
 *
 *   Gallery   – PropertyGallery.module.css  → aspect-ratio 16/9 (desktop), 4/3 (<600px)
 *   Floor Plan – FloorPlans.module.css      → width 100%, height auto (natural ratio)
 *   Dev Logo  – BuilderOverview.module.css  → 64×64 container, img max 120×48, object-fit contain
 *   OG Image  – Open Graph social standard  → 1.91:1 (1200×630)
 */

const IMAGE_FIELD_CONFIG = {
  gallery: {
    ratio: '16:9',
    recommended: '1920 × 1080px',
    helpText:
      'Recommended: 1920 × 1080px | Aspect Ratio: 16:9 (auto-cropped to 4:3 on mobile)',
  },
  floorPlan: {
    ratio: 'any',
    recommended: '1200 × 900px',
    helpText:
      'Recommended: min 1200 × 900px | Any aspect ratio — ensure text & dimensions are legible',
  },
  developerLogo: {
    ratio: '≤ 5:2',
    recommended: '240 × 120px',
    helpText:
      'Recommended: 240 × 120px | Square or landscape logo, PNG with transparency',
  },
  ogImage: {
    ratio: '1.91:1',
    recommended: '1200 × 630px',
    helpText:
      'Recommended: 1200 × 630px | Aspect Ratio: 1.91:1 (social media standard)',
  },
};

export default IMAGE_FIELD_CONFIG;
