/**
 * One opening, as a `JobPosting` (§9.3, prompt 38).
 *
 * Google's job experience wants four things before it will show a posting at
 * all — a title, a description, a date and a hiring organisation — and it drops
 * a posting whose `validThrough` has passed. So a role with no closing date
 * publishes none rather than an invented one, and a role that has closed is
 * left to the page's `noindex` rather than given a date in the past it never
 * had.
 *
 * `employmentType` is schema.org's spelling (`FULL_TIME`), not ours
 * (`full-time`), which is the whole reason the map below exists.
 */

const { absolute, compact, isoDate, ref } = require('./graph');
const { organizationId } = require('./organization');
const { stripHtml } = require('../text');

/** `EMPLOYMENT_TYPES` (§6.17) in schema.org's vocabulary. */
const EMPLOYMENT_TYPE = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
};

/** "Bengaluru, Karnataka" → the two parts a `PostalAddress` wants. */
function addressOf(location) {
  const parts = String(location ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return compact({
    '@type': 'PostalAddress',
    addressLocality: parts[0] || 'Bengaluru',
    addressRegion: parts[1] || 'Karnataka',
    addressCountry: 'IN',
  });
}

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of a job,
 *   or `{ entity, canonical }` built by the page
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
function jobPostingNode(input = {}, context = {}) {
  const job = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical || !job.title) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const knowledge = context.seoSettings?.knowledgeGraph ?? {};

  return compact({
    '@type': 'JobPosting',
    '@id': `${canonical}#job`,
    title: job.title,
    description: stripHtml(job.description ?? '') || input.description || input.summary,
    url: canonical,
    datePosted: isoDate(job.postedAt ?? job.createdAt),
    validThrough: isoDate(job.closesAt),
    employmentType: EMPLOYMENT_TYPE[job.employmentType],
    hiringOrganization: compact({
      '@type': 'Organization',
      '@id': organizationId(siteUrl),
      name: knowledge.name,
      sameAs: siteUrl || undefined,
      logo: absolute(siteUrl, knowledge.logoUrl),
    }),
    jobLocation: compact({ '@type': 'Place', address: addressOf(job.location) }),
    employerOverview: knowledge.description,
    industry: 'Real Estate',
    // The department is what an editor typed, so it is published as the
    // category rather than mapped onto a taxonomy we would have to invent.
    occupationalCategory: job.department,
    experienceRequirements: job.experience,
    publisher: ref(organizationId(siteUrl)),
  });
}

module.exports = jobPostingNode;
module.exports.jobPostingNode = jobPostingNode;
module.exports.EMPLOYMENT_TYPE = EMPLOYMENT_TYPE;
