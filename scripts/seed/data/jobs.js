/**
 * `jobOpenings` — four roles (§6.11), and the three `jobApplications` against
 * them.
 *
 * The roles are plausible for a Bengaluru advisory of this size and are
 * marked as placeholders in their descriptions; salary ranges are left `null`
 * rather than invented, because a number here is a promise (§14). The
 * applicants are fictional, with `@example.com` addresses and synthetic
 * phone numbers.
 */

const { paragraphs } = require('../lib/text');

const JOBS = [
  {
    slug: 'real-estate-advisor-bengaluru',
    title: 'Real Estate Advisor — Bengaluru',
    department: 'Sales',
    location: 'Bengaluru, Karnataka',
    employmentType: 'full-time',
    experience: '2–5 years',
    postedDaysAgo: 34,
    intro:
      'We are looking for an advisor to work with buyers across Bengaluru: understanding a requirement properly, shortlisting from our own inventory, running site visits, and staying with the client through negotiation and registration.',
    detail:
      'You will own your files end to end. Nobody will hand your client to a different desk halfway through, and nobody will ask you to sell something you would not buy.',
    responsibilities: [
      'Qualify incoming enquiries and understand each buyer’s requirement in detail',
      'Shortlist properties from the curated inventory and arrange site visits',
      'Attend visits, and set out honestly what is weak about each option as well as what is strong',
      'Maintain accurate records of every interaction in the admin panel',
      'Coordinate with developers, lenders and legal advisers through the transaction',
    ],
    requirements: [
      'Two to five years in residential real estate or a comparable consultative sales role',
      'Working knowledge of Bengaluru’s residential micro-markets',
      'Fluency in English and Kannada; a third language is an advantage',
      'A two-wheeler or car and a valid driving licence for site visits',
      'Comfort with a CRM and with writing things down',
    ],
  },
  {
    slug: 'digital-marketing-specialist',
    title: 'Digital Marketing Specialist',
    department: 'Marketing',
    location: 'Bengaluru, Karnataka',
    employmentType: 'full-time',
    experience: '3–6 years',
    postedDaysAgo: 26,
    intro:
      'We are looking for somebody to own how this site is found: search, content distribution, paid campaigns and the measurement behind all three.',
    detail:
      'The SEO side of the role is substantial. The site is built around a structured content model and an SEO manager, and the person in this role decides what gets written and how it is targeted.',
    responsibilities: [
      'Own organic search performance: keyword research, on-page work and content briefs',
      'Plan and run paid campaigns across search and social, against a defined cost per lead',
      'Work with the editorial desks on the article pipeline and the locality pages',
      'Report on traffic, lead quality and cost per qualified lead every month',
      'Keep the analytics and tracking setup honest and documented',
    ],
    requirements: [
      'Three to six years in digital marketing, with real ownership of an organic search programme',
      'Hands-on with analytics, search console and a campaign platform',
      'Able to write a content brief that a subject-matter writer can work from',
      'Comfortable being measured on qualified leads rather than on impressions',
    ],
  },
  {
    slug: 'property-analyst',
    title: 'Property Analyst',
    department: 'Research',
    location: 'Bengaluru, Karnataka',
    employmentType: 'full-time',
    experience: '1–4 years',
    postedDaysAgo: 18,
    intro:
      'We are looking for an analyst to keep our locality data, price bands and yield estimates current, and to write the market pieces that come out of them.',
    detail:
      'This is a research role with a publishing output. Half the week is data — transactions, supply, absorption, rents — and half is turning it into something a buyer can act on.',
    responsibilities: [
      'Track supply, pricing and absorption across the localities we cover',
      'Maintain the locality price bands and the indicative yield estimates',
      'Write market pieces and comparisons for the insights section',
      'Support advisors with valuation comparables on live transactions',
      'Flag when a published figure has gone stale',
    ],
    requirements: [
      'One to four years in real estate research, valuation, or a data-led analyst role',
      'Strong spreadsheet skills and a healthy scepticism about sources',
      'Able to write clearly for a non-specialist reader',
      'Knowledge of Bengaluru’s geography, or the willingness to learn it properly',
    ],
  },
  {
    slug: 'customer-relations-manager',
    title: 'Customer Relations Manager (Part-time)',
    department: 'Operations',
    location: 'Bengaluru, Karnataka',
    employmentType: 'part-time',
    experience: '2–4 years',
    postedDaysAgo: 10,
    intro:
      'We are looking for somebody part-time to look after clients between the milestones: after a site visit, during a loan application, and in the weeks around registration.',
    detail:
      'The role exists because the gaps are where clients feel abandoned. Twenty to twenty-five hours a week, with the timing arranged around school hours if that suits.',
    responsibilities: [
      'Follow up with clients between milestones and keep them informed',
      'Track documentation status across live transactions and chase what is missing',
      'Collect feedback after every completed transaction and log it honestly',
      'Keep the CRM accurate, which is most of what makes the rest possible',
    ],
    requirements: [
      'Two to four years in client servicing, operations or customer success',
      'Unusually good written communication in English; Kannada or Hindi an advantage',
      'Organised enough to run twenty live files without a dropped thread',
      'Available twenty to twenty-five hours a week, with some weekend contact',
    ],
  },
];

const APPLICATIONS = [
  {
    jobSlug: 'real-estate-advisor-bengaluru',
    name: 'Rohan Deshpande',
    email: 'rohan.deshpande@example.com',
    phone: '9845100121',
    status: 'shortlisted',
    daysAgo: 21,
    coverLetter:
      'Four years advising residential buyers in east Bengaluru, mostly in the Whitefield and Marathahalli corridors. I am looking for a practice where I keep the client relationship rather than handing it on. Happy to walk through my last three transactions in detail.',
    notes: 'Strong east Bengaluru coverage. First conversation went well; schedule a second round.',
  },
  {
    jobSlug: 'digital-marketing-specialist',
    name: 'Anjali Sundaram',
    email: 'anjali.sundaram@example.com',
    phone: '9900100122',
    status: 'interview',
    daysAgo: 14,
    coverLetter:
      'I have run organic search for two property portals and know the structured-content approach this site is built on. My last programme took a category from nowhere to the first page on the locality terms that actually convert.',
    notes: 'Technical round scheduled. Ask about the measurement setup and about content briefs.',
  },
  {
    jobSlug: 'property-analyst',
    name: 'Vivek Nair',
    email: 'vivek.nair@example.com',
    phone: '9740100123',
    status: 'new',
    daysAgo: 6,
    coverLetter:
      'Two years in valuation at a consultancy, working on residential comparables across south Bengaluru. I write as well as model, and I would like a role where the research reaches a reader rather than a file.',
    notes: null,
  },
];

module.exports = function jobs({ stamps, dates }) {
  const jobOpenings = JOBS.map((entry, index) => ({
    id: index + 1,
    slug: entry.slug,
    title: entry.title,
    department: entry.department,
    location: entry.location,
    employmentType: entry.employmentType,
    experience: entry.experience,
    description: paragraphs(
      entry.intro,
      entry.detail,
      'This is a placeholder job record created for the seed. Replace the description, the responsibilities, the requirements and the compensation with the client’s own before the careers page goes live.'
    ),
    responsibilities: entry.responsibilities,
    requirements: entry.requirements,
    salaryRange: null,
    isActive: true,
    postedAt: dates.dateDaysAgo(entry.postedDaysAgo),
    closesAt: null,
    ...stamps({ createdDaysAgo: entry.postedDaysAgo }),
  }));

  const bySlug = Object.fromEntries(jobOpenings.map((job) => [job.slug, job.id]));

  const jobApplications = APPLICATIONS.map((entry, index) => ({
    id: index + 1,
    jobId: bySlug[entry.jobSlug],
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    resumeUrl: `https://www.squaresnacres.com/uploads/resumes/placeholder-${index + 1}.pdf`,
    coverLetter: entry.coverLetter,
    linkedinUrl: null,
    status: entry.status,
    notes: entry.notes,
    createdAt: dates.daysAgo(entry.daysAgo, 11, 15),
    updatedAt: dates.daysAgo(Math.max(1, entry.daysAgo - 4), 11, 40),
  }));

  return { jobOpenings, jobApplications };
};
