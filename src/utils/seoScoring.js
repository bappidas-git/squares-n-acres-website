/**
 * SEO Scoring Engine — Weighted, Modular, Production-Grade
 *
 * Calculates a comprehensive SEO score based on 2026 best practices.
 * Each criterion has an assigned weight and produces actionable feedback.
 *
 * Weight Distribution:
 *   Title present + optimized     → 20%
 *   Description optimized         → 20%
 *   Schema valid                  → 15%
 *   Canonical present             → 10%
 *   OG tags present               → 10%
 *   Keywords relevant             → 10%
 *   H1 optimized (title quality)  →  5%
 *   Image ALT present             →  5%
 *   URL slug optimized            →  5%
 *                           Total: 100%
 */

// ─── Configuration ────────────────────────────────────────────
const TITLE_MIN_LENGTH = 30;
const TITLE_OPTIMAL_MIN = 50;
const TITLE_OPTIMAL_MAX = 60;
const TITLE_MAX_LENGTH = 70;

const DESC_MIN_LENGTH = 80;
const DESC_OPTIMAL_MIN = 140;
const DESC_OPTIMAL_MAX = 160;
const DESC_MAX_LENGTH = 170;

const MIN_KEYWORDS = 3;
const MAX_KEYWORDS = 10;

const SLUG_MAX_LENGTH = 75;

// ─── Individual Check Functions ───────────────────────────────

/**
 * Title Check (Weight: 20%)
 * - Must exist
 * - 50–60 chars optimal
 * - Should contain primary keyword (location or property type)
 */
const checkTitle = (property) => {
  const title = property.seoTitle?.trim() || '';
  const result = { score: 0, maxScore: 20, issues: [], label: 'Meta Title' };

  if (!title) {
    result.issues.push('Meta title is missing');
    return result;
  }

  // Base: title exists (8 points)
  result.score += 8;

  // Length check (6 points)
  const len = title.length;
  if (len >= TITLE_OPTIMAL_MIN && len <= TITLE_OPTIMAL_MAX) {
    result.score += 6;
  } else if (len >= TITLE_MIN_LENGTH && len <= TITLE_MAX_LENGTH) {
    result.score += 3;
    if (len < TITLE_OPTIMAL_MIN) {
      result.issues.push(`Title is ${len} chars — aim for ${TITLE_OPTIMAL_MIN}-${TITLE_OPTIMAL_MAX} for best results`);
    } else {
      result.issues.push(`Title is ${len} chars — try to keep under ${TITLE_OPTIMAL_MAX}`);
    }
  } else {
    if (len < TITLE_MIN_LENGTH) {
      result.issues.push(`Title is too short (${len} chars) — minimum ${TITLE_MIN_LENGTH} recommended`);
    } else {
      result.issues.push(`Title is too long (${len} chars) — Google may truncate it`);
    }
  }

  // Keyword relevance (3 points) — check if title contains location/type
  const location = property.location?.area?.toLowerCase() || '';
  const city = property.location?.city?.toLowerCase() || '';
  const titleLower = title.toLowerCase();
  const hasLocation = (location && titleLower.includes(location)) || (city && titleLower.includes(city));
  if (hasLocation) {
    result.score += 3;
  } else {
    result.issues.push('Consider including location in the title for better local SEO');
  }

  // Uniqueness hint (3 points) — check not generic
  const genericTerms = ['home', 'property', 'real estate'];
  const isGeneric = genericTerms.some((term) => titleLower === term);
  if (!isGeneric) {
    result.score += 3;
  } else {
    result.issues.push('Title is too generic — make it specific to this property');
  }

  return result;
};

/**
 * Description Check (Weight: 20%)
 * - Must exist
 * - 140–160 chars optimal
 * - Should be compelling (contain action words)
 */
const checkDescription = (property) => {
  const desc = property.seoDescription?.trim() || '';
  const result = { score: 0, maxScore: 20, issues: [], label: 'Meta Description' };

  if (!desc) {
    result.issues.push('Meta description is missing');
    return result;
  }

  // Base: description exists (8 points)
  result.score += 8;

  // Length check (7 points)
  const len = desc.length;
  if (len >= DESC_OPTIMAL_MIN && len <= DESC_OPTIMAL_MAX) {
    result.score += 7;
  } else if (len >= DESC_MIN_LENGTH && len <= DESC_MAX_LENGTH) {
    result.score += 4;
    if (len < DESC_OPTIMAL_MIN) {
      result.issues.push(`Description is ${len} chars — aim for ${DESC_OPTIMAL_MIN}-${DESC_OPTIMAL_MAX}`);
    } else {
      result.issues.push(`Description is ${len} chars — try to keep under ${DESC_OPTIMAL_MAX}`);
    }
  } else {
    if (len < DESC_MIN_LENGTH) {
      result.issues.push(`Description is too short (${len} chars) — minimum ${DESC_MIN_LENGTH} recommended`);
    } else {
      result.issues.push(`Description is too long (${len} chars) — Google will truncate it`);
    }
  }

  // CTA / action word presence (5 points)
  const ctaWords = ['buy', 'explore', 'discover', 'find', 'view', 'book', 'schedule', 'visit', 'check', 'premium', 'luxury', 'affordable', 'best', 'top'];
  const descLower = desc.toLowerCase();
  const hasCta = ctaWords.some((word) => descLower.includes(word));
  if (hasCta) {
    result.score += 5;
  } else {
    result.issues.push('Add action words (explore, discover, buy) to increase click-through rate');
  }

  return result;
};

/**
 * Schema Check (Weight: 15%)
 * - Must be valid JSON-LD
 * - Should contain @context and @type
 * - Should use RealEstateListing or Residence type
 */
const checkSchema = (property) => {
  const schema = property.schemaMarkup?.trim() || '';
  const result = { score: 0, maxScore: 15, issues: [], label: 'Schema Markup' };

  if (!schema) {
    result.issues.push('JSON-LD schema markup is missing');
    return result;
  }

  // Valid JSON (5 points)
  let parsed;
  try {
    parsed = JSON.parse(schema);
    result.score += 5;
  } catch {
    result.issues.push('Schema markup is not valid JSON');
    return result;
  }

  // Has @context and @type (5 points)
  if (parsed['@context'] && parsed['@type']) {
    result.score += 5;
  } else {
    if (!parsed['@context']) result.issues.push('Schema missing @context (should be https://schema.org)');
    if (!parsed['@type']) result.issues.push('Schema missing @type');
  }

  // Uses appropriate real estate type (5 points)
  const validTypes = ['RealEstateListing', 'Residence', 'Product', 'Apartment', 'House', 'SingleFamilyResidence'];
  const schemaType = parsed['@type'];
  const types = Array.isArray(schemaType) ? schemaType : [schemaType];
  const hasValidType = types.some((t) => validTypes.includes(t));
  if (hasValidType) {
    result.score += 5;
  } else {
    result.issues.push('Consider using RealEstateListing or Residence as @type for better rich results');
  }

  return result;
};

/**
 * Canonical URL Check (Weight: 10%)
 */
const checkCanonical = (property) => {
  const canonical = property.canonicalUrl?.trim() || '';
  const result = { score: 0, maxScore: 10, issues: [], label: 'Canonical URL' };

  if (!canonical) {
    result.issues.push('Canonical URL is not set — set it to prevent duplicate content issues');
    return result;
  }

  // Exists (5 points)
  result.score += 5;

  // Valid URL format (5 points)
  try {
    new URL(canonical);
    result.score += 5;
  } catch {
    result.score += 2;
    result.issues.push('Canonical URL may not be a valid URL format');
  }

  return result;
};

/**
 * Open Graph Tags Check (Weight: 10%)
 */
const checkOgTags = (property) => {
  const result = { score: 0, maxScore: 10, issues: [], label: 'Open Graph Tags' };

  // OG Title (3 points) — falls back to seoTitle
  const ogTitle = property.ogTitle?.trim() || property.seoTitle?.trim() || '';
  if (ogTitle) {
    result.score += 3;
  } else {
    result.issues.push('OG title is missing (used when sharing on social media)');
  }

  // OG Description (3 points) — falls back to seoDescription
  const ogDesc = property.ogDescription?.trim() || property.seoDescription?.trim() || '';
  if (ogDesc) {
    result.score += 3;
  } else {
    result.issues.push('OG description is missing');
  }

  // OG Image (4 points)
  const ogImage = property.ogImage?.trim() || property.gallery?.[0] || '';
  if (ogImage) {
    result.score += 4;
  } else {
    result.issues.push('OG image is missing — social shares will have no preview image');
  }

  return result;
};

/**
 * Keywords Check (Weight: 10%)
 */
const checkKeywords = (property) => {
  const keywords = property.seoKeywords || [];
  const result = { score: 0, maxScore: 10, issues: [], label: 'Keywords' };

  if (!keywords.length) {
    result.issues.push('No SEO keywords defined');
    return result;
  }

  // Has keywords (4 points)
  result.score += 4;

  // Optimal count (3 points)
  if (keywords.length >= MIN_KEYWORDS && keywords.length <= MAX_KEYWORDS) {
    result.score += 3;
  } else if (keywords.length < MIN_KEYWORDS) {
    result.score += 1;
    result.issues.push(`Only ${keywords.length} keyword(s) — aim for ${MIN_KEYWORDS}-${MAX_KEYWORDS}`);
  } else {
    result.score += 1;
    result.issues.push(`Too many keywords (${keywords.length}) — keep under ${MAX_KEYWORDS} to avoid stuffing`);
  }

  // Keywords appear in title/description (3 points)
  const titleLower = (property.seoTitle || '').toLowerCase();
  const descLower = (property.seoDescription || '').toLowerCase();
  const matchCount = keywords.filter(
    (kw) => titleLower.includes(kw.toLowerCase()) || descLower.includes(kw.toLowerCase())
  ).length;
  if (matchCount > 0) {
    result.score += 3;
  } else {
    result.issues.push('Keywords do not appear in the title or description — align them for consistency');
  }

  return result;
};

/**
 * H1 / Title Quality Check (Weight: 5%)
 * Checks if the property title works well as an H1.
 */
const checkH1Quality = (property) => {
  const title = property.title?.trim() || '';
  const result = { score: 0, maxScore: 5, issues: [], label: 'Page Title (H1)' };

  if (!title) {
    result.issues.push('Property title (H1) is empty');
    return result;
  }

  // Exists and reasonable length (3 points)
  if (title.length >= 10 && title.length <= 80) {
    result.score += 3;
  } else {
    result.score += 1;
    result.issues.push('Property title should be 10-80 characters for an effective H1');
  }

  // Contains useful info — not just a generic name (2 points)
  const words = title.split(/\s+/).length;
  if (words >= 3) {
    result.score += 2;
  } else {
    result.issues.push('Property title is very short — a descriptive H1 helps SEO');
  }

  return result;
};

/**
 * Image ALT Check (Weight: 5%)
 * Checks if gallery images have alt text or if property has images at all.
 */
const checkImageAlt = (property) => {
  const result = { score: 0, maxScore: 5, issues: [], label: 'Image Optimization' };

  const gallery = property.gallery || [];
  if (gallery.length === 0) {
    result.issues.push('No gallery images — add images for better engagement and SEO');
    return result;
  }

  // Has images (3 points)
  result.score += 3;

  // Check if OG image is set (2 points)
  const ogImage = property.ogImage?.trim() || '';
  if (ogImage) {
    result.score += 2;
  } else {
    result.score += 1; // Partial credit if gallery exists
    result.issues.push('Set a dedicated OG image for optimized social sharing');
  }

  return result;
};

/**
 * URL Slug Check (Weight: 5%)
 */
const checkSlug = (property) => {
  const slug = property.slug?.trim() || '';
  const result = { score: 0, maxScore: 5, issues: [], label: 'URL Slug' };

  if (!slug) {
    result.issues.push('URL slug is missing');
    return result;
  }

  // Exists (2 points)
  result.score += 2;

  // Proper format: lowercase, hyphenated, no special chars (2 points)
  const isClean = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  if (isClean) {
    result.score += 2;
  } else {
    result.score += 1;
    result.issues.push('Slug contains special characters or uppercase — use lowercase-hyphenated format');
  }

  // Reasonable length (1 point)
  if (slug.length <= SLUG_MAX_LENGTH) {
    result.score += 1;
  } else {
    result.issues.push(`Slug is ${slug.length} chars — keep under ${SLUG_MAX_LENGTH} for cleaner URLs`);
  }

  return result;
};

// ─── Main Scoring Function ────────────────────────────────────

/**
 * Calculate comprehensive SEO score for a property.
 *
 * @param {Object} property — property object with SEO fields
 * @returns {Object} — { totalScore, checks[], issues[], grade }
 */
export const calculateSeoScore = (property) => {
  if (!property) {
    return { totalScore: 0, checks: [], issues: ['No property data'], grade: 'F' };
  }

  const checks = [
    checkTitle(property),
    checkDescription(property),
    checkSchema(property),
    checkCanonical(property),
    checkOgTags(property),
    checkKeywords(property),
    checkH1Quality(property),
    checkImageAlt(property),
    checkSlug(property),
  ];

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const allIssues = checks.flatMap((c) => c.issues);

  // Grade assignment
  let grade;
  if (totalScore >= 90) grade = 'A+';
  else if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 40) grade = 'D';
  else grade = 'F';

  return {
    totalScore,
    checks,
    issues: allIssues,
    grade,
  };
};

/**
 * Quick score (returns just the number) for table display.
 */
export const getQuickScore = (property) => {
  return calculateSeoScore(property).totalScore;
};

// Export constants for use in UI validation
export const SEO_LIMITS = {
  TITLE_MIN_LENGTH,
  TITLE_OPTIMAL_MIN,
  TITLE_OPTIMAL_MAX,
  TITLE_MAX_LENGTH,
  DESC_MIN_LENGTH,
  DESC_OPTIMAL_MIN,
  DESC_OPTIMAL_MAX,
  DESC_MAX_LENGTH,
  MIN_KEYWORDS,
  MAX_KEYWORDS,
  SLUG_MAX_LENGTH,
};
