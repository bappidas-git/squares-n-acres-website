/**
 * `teamMembers` — six placeholders (§14).
 *
 * Named, photographed people are the clearest example of content that must not
 * be invented: an advisor's name on a listing is a promise about who will pick
 * up the phone. The records are numbered, the designations say
 * "(placeholder)", the photographs are stock seeds and the phone numbers are
 * obviously synthetic but structurally valid, so every screen that renders an
 * advisor card works before the client supplies the real six.
 */

const { paragraphs } = require('../lib/text');

const DESIGNATIONS = [
  'Founder (placeholder)',
  'Director, Sales (placeholder)',
  'Senior Property Advisor (placeholder)',
  'Property Advisor (placeholder)',
  'Legal & Documentation (placeholder)',
  'Client Relations (placeholder)',
];

module.exports = function team({ stamps, media }) {
  return DESIGNATIONS.map((designation, index) => {
    const number = index + 1;
    const name = `Team Member ${number}`;
    const slug = `team-member-${number}`;

    return {
      id: number,
      name,
      slug,
      designation,
      phone: `988000002${number}`,
      whatsapp: `988000002${number}`,
      email: `team${number}@squaresnacres.com`,
      photoUrl: media.photo({
        seed: `sna-team-member-${number}`,
        width: 480,
        height: 480,
        alt: `${name} (placeholder portrait)`,
        folder: 'teamMembers',
        tags: ['team'],
      }),
      bio: paragraphs(
        `Placeholder record for ${designation.replace(' (placeholder)', '').toLowerCase()}. Replace the name, the designation, the photograph, the contact details and this biography with the client’s own before the site goes live.`
      ),
      reraId: null,
      socialLinks: {
        linkedin: null,
        twitter: null,
        facebook: null,
        instagram: null,
        website: null,
      },
      order: number,
      isActive: true,
      showOnAbout: true,
      ...stamps({ createdDaysAgo: 164 }),
    };
  });
};
