/**
 * `pages` — the fifteen CMS pages of §6.10.
 *
 * Every page the boilerplate had survives here as blocks rather than as JSX
 * (BUG-11): the copy, the cards, the steps, the quiz and the forms are data an
 * editor can change, and the React templates of prompts 27–31 render whatever
 * the blocks say.
 *
 * The copy itself follows §14. Anything the client has to supply — the
 * company story, the mission, the legal text, any statistic — is either a
 * paragraph marked `[Placeholder — client to provide]` or an empty block
 * that renders nothing until it is filled. `stats` blocks in particular are
 * seeded with no items on purpose: an invented "500+ happy families" is the
 * one kind of placeholder that turns into a false claim the moment nobody
 * remembers it was a placeholder.
 *
 * Four pages carry a slug with a slash (`buyer-assistance/home-loan`), which
 * is the URL they live at; `mock-server/routes/pages.js` matches the whole
 * remainder of the path for that reason.
 */

const { fitDescription, makeSeo } = require('../lib/seo');

/**
 * A lead-form field descriptor.
 *
 * §6.10 types the block's `fields[]` as "LeadForm field config" without
 * pinning the shape, so the seed fixes one: enough to render an input, label
 * it, validate it and, for a select, fill it.
 */
const field = (name, label, type, options = {}) => ({
  name,
  label,
  type,
  required: Boolean(options.required),
  placeholder: options.placeholder ?? null,
  options: options.options ?? [],
  fullWidth: Boolean(options.fullWidth),
});

const option = (value, label) => ({ value, label });

/** The three fields every lead form starts with. */
const CONTACT_FIELDS = [
  field('name', 'Your name', 'text', { required: true, placeholder: 'Full name' }),
  field('phone', 'Phone', 'tel', { required: true, placeholder: '10-digit mobile number' }),
  field('email', 'E-mail', 'email', { placeholder: 'you@example.com' }),
];

const MESSAGE_FIELD = field('message', 'Message', 'textarea', {
  placeholder: 'Tell us what you are looking for',
  fullWidth: true,
});

/** The income and loan bands the finance forms offer (from the old page). */
const INCOME_OPTIONS = [
  option('below-50k', 'Below ₹50,000'),
  option('50k-1l', '₹50,000 – ₹1 lakh'),
  option('1l-2l', '₹1 lakh – ₹2 lakh'),
  option('2l-5l', '₹2 lakh – ₹5 lakh'),
  option('above-5l', 'Above ₹5 lakh'),
];

const LOAN_OPTIONS = [
  option('below-30l', 'Below ₹30 lakh'),
  option('30l-50l', '₹30 lakh – ₹50 lakh'),
  option('50l-1cr', '₹50 lakh – ₹1 crore'),
  option('1cr-2cr', '₹1 crore – ₹2 crore'),
  option('above-2cr', 'Above ₹2 crore'),
];

/** Residential property types, for the forms that ask what you own or want. */
const RESIDENTIAL_TYPE_OPTIONS = [
  option('apartment', 'Apartment'),
  option('villa', 'Villa'),
  option('independent-house', 'Independent house'),
  option('builder-floor', 'Builder floor'),
  option('plot', 'Plot'),
  option('other', 'Other'),
];

const PLACEHOLDER = '[Placeholder — client to provide]';

module.exports = function pages({ stamps, media, lookup }) {
  const hero = (slug, title, subtitle, { cta } = {}) => ({
    type: 'hero',
    data: {
      title,
      subtitle,
      imageUrl: media.photo({
        seed: `sna-page-${slug.replace(/\//g, '-')}`,
        width: 1600,
        height: 700,
        alt: `${title} — Squares N Acres`,
        folder: 'pages',
        tags: ['page'],
      }),
      ctaLabel: cta ? cta[0] : null,
      ctaHref: cta ? cta[1] : null,
    },
  });

  const faqIdsFor = (categories) =>
    lookup.faqs.filter((faq) => categories.includes(faq.category)).map((faq) => faq.id);

  const DEFINITIONS = [
    /* ------------------------------------------------------------ *
     * Home
     * ------------------------------------------------------------ */
    {
      slug: 'home',
      title: 'Home',
      template: 'landing',
      leadSource: 'post-requirement',
      header: null,
      footer: null,
      seoTitle: 'Buy, Sell and Rent Property in Bengaluru',
      seoDescription:
        'Verified apartments, villas, plots and commercial space across twenty Bengaluru localities, with an advisor from the first call to registration.',
      focusKeyword: 'property in bengaluru',
      blocks: () => [
        {
          type: 'features',
          data: {
            title: 'Why choose Squares N Acres',
            subtitle:
              'Curated inventory, verified information and one advisor from the first call to registration.',
            items: [
              {
                icon: 'mdi:home-search-outline',
                title: 'Expert local guidance',
                text: 'We work one city properly rather than many superficially, which is what makes the locality advice worth acting on.',
              },
              {
                icon: 'mdi:shield-check-outline',
                title: 'Verified listings',
                text: 'Areas, approvals and charges are checked before a listing is published, and corrected when they change.',
              },
              {
                icon: 'mdi:scale-balance',
                title: 'Transparent process',
                text: 'Prices, charges and our own terms are set out in writing before you commit to anything.',
              },
              {
                icon: 'mdi:account-tie-outline',
                title: 'End-to-end support',
                text: 'Shortlisting, visits, negotiation, loan coordination and registration, with one point of contact throughout.',
              },
            ],
          },
        },
        {
          type: 'steps',
          data: {
            title: 'How it works',
            subtitle: 'Four steps from the first conversation to the keys.',
            items: [
              {
                title: 'Search',
                text: 'Tell us the locality, the budget and the configuration. The more specific the brief, the shorter the shortlist.',
              },
              {
                title: 'Shortlist & visit',
                text: 'We come back with options that fit, arrange the visits and go with you, so every comparison is made on the same basis.',
              },
              {
                title: 'Negotiate & verify',
                text: 'We negotiate on the whole package and put the documents in front of your lawyer before any money moves.',
              },
              {
                title: 'Close & move in',
                text: 'Loan coordination, registration and the handover, with the paperwork finished rather than postponed.',
              },
            ],
          },
        },
      ],
    },

    /* ------------------------------------------------------------ *
     * Company
     * ------------------------------------------------------------ */
    {
      slug: 'about',
      title: 'About Us',
      template: 'about',
      leadSource: 'contact-page',
      header: 'company',
      footer: 'company',
      seoTitle: 'About Squares N Acres',
      seoDescription:
        'Who we are, how we work and what we will and will not say about a property. The Squares N Acres approach to buying, selling and renting in Bengaluru.',
      focusKeyword: 'about squares n acres',
      blocks: (page) => [
        hero(
          page.slug,
          'About Squares N Acres',
          'A Bengaluru property advisory built around one idea: tell the client what we would want to be told.'
        ),
        {
          type: 'richText',
          data: {
            html: `<h2>Our story</h2><p>${PLACEHOLDER} This paragraph is where the founding story belongs — when the company started, what it set out to do differently, and what it has learned since. Replace it with the client’s own account before the site goes live.</p><p>${PLACEHOLDER} A second paragraph can cover how the practice has grown and what it focuses on today.</p>`,
          },
        },
        {
          type: 'steps',
          data: {
            title: 'How we got here',
            subtitle: 'A timeline the client supplies; the structure is ready for it.',
            items: [
              { title: 'Founded', text: `${PLACEHOLDER} The year the practice started and why.` },
              {
                title: 'First offices',
                text: `${PLACEHOLDER} Where the practice began working and in which segments.`,
              },
              {
                title: 'Widening the coverage',
                text: `${PLACEHOLDER} How the coverage grew across Bengaluru’s localities.`,
              },
              {
                title: 'Today',
                text: `${PLACEHOLDER} What the practice looks like now and where it is going.`,
              },
            ],
          },
        },
        {
          type: 'features',
          data: {
            title: 'What we value',
            subtitle: 'Four commitments that decide how we work on every file.',
            items: [
              {
                icon: 'mdi:eye-check-outline',
                title: 'Say what is wrong with it',
                text: 'Every property has a weakness. An advisor who never mentions one is not advising.',
              },
              {
                icon: 'mdi:file-document-check-outline',
                title: 'Documents before deposits',
                text: 'Nothing is paid until somebody qualified has read the papers.',
              },
              {
                icon: 'mdi:map-marker-radius-outline',
                title: 'One city, properly',
                text: 'Bengaluru only, twenty localities, visited rather than listed.',
              },
              {
                icon: 'mdi:handshake-outline',
                title: 'One point of contact',
                text: 'The advisor who takes the first call stays on the file to the end.',
              },
            ],
          },
        },
        {
          type: 'richText',
          data: {
            html: `<h2>Mission</h2><p>${PLACEHOLDER} The client’s mission statement goes here.</p><h2>Vision</h2><p>${PLACEHOLDER} The client’s vision statement goes here.</p>`,
          },
        },
        { type: 'stats', data: { items: [] } },
        { type: 'team', data: { title: 'The people you will work with', memberIds: [] } },
        { type: 'testimonials', data: { title: 'What clients say', ids: [] } },
        {
          type: 'cta',
          data: {
            title: 'Looking for something specific?',
            text: 'Tell us the locality, the budget and the configuration, and an advisor will come back with a shortlist.',
            buttonLabel: 'Post your requirement',
            buttonHref: '#post-requirement',
            leadSource: 'post-requirement',
          },
        },
      ],
    },
    {
      slug: 'contact',
      title: 'Contact Us',
      template: 'contact',
      leadSource: 'contact-page',
      header: null,
      footer: 'company',
      seoTitle: 'Contact Squares N Acres',
      seoDescription:
        'Call, message or write to Squares N Acres about buying, selling, renting or letting property in Bengaluru. We reply as soon as we can.',
      focusKeyword: 'contact squares n acres',
      blocks: (page) => [
        hero(
          page.slug,
          'Contact us',
          'One form, one phone number and one inbox. Whichever you use, the same advisor picks it up.'
        ),
        { type: 'contactInfo', data: {} },
        {
          type: 'leadForm',
          data: {
            title: 'Send us a message',
            subtitle: 'Tell us what you need and we will come back as soon as we can.',
            fields: [
              ...CONTACT_FIELDS,
              field('subject', 'What is this about?', 'select', {
                required: true,
                options: [
                  option('general', 'General enquiry'),
                  option('property', 'A specific property'),
                  option('buyer-assistance', 'Buyer assistance'),
                  option('partnership', 'Partnership'),
                  option('careers', 'Careers'),
                  option('other', 'Something else'),
                ],
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'contact-page',
            successMessage: 'Thank you — your message has reached us. An advisor will be in touch.',
          },
        },
        { type: 'map', data: { embedUrl: null, latitude: 12.9716, longitude: 77.5946 } },
      ],
    },
    {
      slug: 'sell-let',
      title: 'Sell or Let Your Property',
      template: 'service',
      leadSource: 'sell-let',
      header: 'company',
      footer: 'company',
      seoTitle: 'Sell or Let Your Property in Bengaluru',
      seoDescription:
        'List your Bengaluru property with Squares N Acres: an honest valuation, a documentation check, screened viewings and negotiation handled for you.',
      focusKeyword: 'sell property in bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Sell or let your property',
          'An honest price, a documentation check before the first viewing, and buyers who have already been screened.'
        ),
        { type: 'stats', data: { items: [] } },
        {
          type: 'features',
          data: {
            title: 'What you get',
            subtitle: 'Four things that decide whether a listing sells or sits.',
            items: [
              {
                icon: 'mdi:chart-line',
                title: 'A price based on transactions',
                text: 'We price from what comparable units actually registered at, not from what is currently being asked.',
              },
              {
                icon: 'mdi:file-search-outline',
                title: 'Documents checked first',
                text: 'The khata, the tax receipts and the title are checked before a buyer asks, not after.',
              },
              {
                icon: 'mdi:camera-outline',
                title: 'A listing worth reading',
                text: 'Measured areas, proper photographs and the charges stated plainly.',
              },
              {
                icon: 'mdi:account-check-outline',
                title: 'Screened viewings',
                text: 'We qualify buyers before they walk through your home, and we attend every visit.',
              },
            ],
          },
        },
        {
          type: 'steps',
          data: {
            title: 'How it works',
            subtitle: 'Four steps from the first visit to the registration.',
            items: [
              {
                title: 'Visit and valuation',
                text: 'We see the property, measure it and give you a price range with the reasoning behind it.',
              },
              {
                title: 'Paperwork check',
                text: 'We list what is missing and what to fix before the property goes live.',
              },
              {
                title: 'Listing and viewings',
                text: 'The property is published, and we bring screened buyers or tenants to it.',
              },
              {
                title: 'Negotiation and closing',
                text: 'We negotiate the whole package and coordinate through to registration or handover.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Tell us about your property',
            subtitle: 'A few details are enough for an advisor to come back with a price range.',
            fields: [
              ...CONTACT_FIELDS,
              field('propertyType', 'Property type', 'select', {
                required: true,
                options: RESIDENTIAL_TYPE_OPTIONS,
              }),
              field('location', 'Locality', 'text', {
                required: true,
                placeholder: 'Whitefield, HSR Layout, Jayanagar…',
              }),
              field('askingPrice', 'Asking price or rent', 'text', {
                placeholder: 'An approximate figure is fine',
              }),
              field('description', 'About the property', 'textarea', {
                placeholder: 'Configuration, area, floor, age and anything else worth knowing',
                fullWidth: true,
              }),
            ],
            leadSource: 'sell-let',
            successMessage: 'Thank you — an advisor will call to arrange a visit.',
          },
        },
      ],
    },
    {
      slug: 'careers',
      title: 'Careers',
      template: 'careers',
      leadSource: 'careers',
      header: 'company',
      footer: 'company',
      seoTitle: 'Careers at Squares N Acres',
      seoDescription:
        'Open roles at Squares N Acres in Bengaluru, what it is like to work here, and how to send us your profile when nothing on the list fits.',
      focusKeyword: 'real estate jobs in bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Work with us',
          'Small team, one city, and a standard of advice we are not willing to lower.'
        ),
        {
          type: 'features',
          data: {
            title: 'How we work',
            subtitle:
              'Three things that describe the place more accurately than a values page would.',
            items: [
              {
                icon: 'mdi:account-voice',
                title: 'You own the client',
                text: 'Advisors carry their files end to end. Nobody hands a client to a different department halfway through.',
              },
              {
                icon: 'mdi:book-open-outline',
                title: 'Learning is part of the job',
                text: 'Approvals, khata, RERA and lending change. Keeping up with them is working time, not homework.',
              },
              {
                icon: 'mdi:message-alert-outline',
                title: 'Say the difficult thing',
                text: 'Telling a client that a property is wrong for them is the job, not a failure of the job.',
              },
            ],
          },
        },
        { type: 'jobs', data: { title: 'Open roles' } },
        {
          type: 'features',
          data: {
            title: 'What we offer',
            subtitle: 'Six things we can commit to today; the client will add to this list.',
            items: [
              {
                icon: 'mdi:cash-multiple',
                title: 'Transparent incentives',
                text: 'The incentive structure is written down and does not change mid-quarter.',
              },
              {
                icon: 'mdi:school-outline',
                title: 'Training that is paid for',
                text: 'Certifications and courses relevant to the work are supported.',
              },
              {
                icon: 'mdi:calendar-clock',
                title: 'Predictable weekends',
                text: 'Site visits happen at weekends; a compensating day off is not optional.',
              },
              {
                icon: 'mdi:medical-bag',
                title: 'Health cover',
                text: `${PLACEHOLDER} The cover the client provides.`,
              },
              {
                icon: 'mdi:laptop',
                title: 'Tools that work',
                text: 'A laptop, a phone plan and a CRM that does not fight you.',
              },
              {
                icon: 'mdi:stairs-up',
                title: 'A visible path',
                text: 'What the next role requires is written down rather than implied.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Did not find a role?',
            subtitle: 'Send us your profile anyway. We keep them and we do come back to them.',
            fields: [
              ...CONTACT_FIELDS,
              field('message', 'About you', 'textarea', {
                required: true,
                placeholder:
                  'What you do now, what you are looking for, and a link to your profile',
                fullWidth: true,
              }),
            ],
            leadSource: 'careers',
            successMessage: 'Thank you — your profile has reached us.',
          },
        },
      ],
    },
    {
      slug: 'partnership',
      title: 'Partner With Us',
      template: 'service',
      leadSource: 'partnership',
      header: 'company',
      footer: 'company',
      seoTitle: 'Partner With Squares N Acres',
      seoDescription:
        'Channel partnerships, developer mandates, lending and professional services — how Squares N Acres works with partners in Bengaluru.',
      focusKeyword: 'real estate partnership bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Partner with us',
          'Developers, lenders, lawyers and design practices — the people a transaction needs beyond the two parties to it.'
        ),
        {
          type: 'features',
          data: {
            title: 'Why partner with us',
            subtitle: 'What a partner gets out of the arrangement.',
            items: [
              {
                icon: 'mdi:target-account',
                title: 'Qualified demand',
                text: 'Our enquiries arrive with a budget, a locality and a timeline attached.',
              },
              {
                icon: 'mdi:handshake-outline',
                title: 'One relationship',
                text: 'A single point of contact rather than a rotating desk.',
              },
              {
                icon: 'mdi:file-sign',
                title: 'Terms in writing',
                text: 'Commercials and responsibilities are agreed before the first referral.',
              },
              {
                icon: 'mdi:chart-timeline-variant',
                title: 'Honest feedback',
                text: 'If your product is not selling, we will tell you why rather than quietly stop referring.',
              },
            ],
          },
        },
        {
          type: 'features',
          data: {
            title: 'Who we work with',
            subtitle: 'Four kinds of partnership, each with its own arrangement.',
            items: [
              {
                icon: 'mdi:office-building-outline',
                title: 'Developers',
                text: 'Project mandates, channel arrangements and inventory listings.',
              },
              {
                icon: 'mdi:bank-outline',
                title: 'Lenders',
                text: 'Home loan referrals, project approvals and doorstep processing for our clients.',
              },
              {
                icon: 'mdi:gavel',
                title: 'Legal practices',
                text: 'Title diligence, drafting and registration support on client transactions.',
              },
              {
                icon: 'mdi:sofa-outline',
                title: 'Interior and services',
                text: 'Fit-out, furnishing and facility services for clients after handover.',
              },
            ],
          },
        },
        { type: 'partners', data: { title: 'Some of the people we work with', category: null } },
        {
          type: 'leadForm',
          data: {
            title: 'Talk to us about a partnership',
            subtitle: 'Tell us what you do and what you are looking for.',
            fields: [
              ...CONTACT_FIELDS,
              field('companyName', 'Company', 'text', {
                required: true,
                placeholder: 'Your organisation',
              }),
              field('partnershipType', 'Type of partnership', 'select', {
                required: true,
                options: [
                  option('developer', 'Developer'),
                  option('bank', 'Lender'),
                  option('legal', 'Legal'),
                  option('interior', 'Interior and services'),
                  option('other', 'Something else'),
                ],
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'partnership',
            successMessage: 'Thank you — we will be in touch to arrange a conversation.',
          },
        },
      ],
    },

    /* ------------------------------------------------------------ *
     * Buyer assistance
     * ------------------------------------------------------------ */
    {
      slug: 'buyer-assistance/home-loan',
      title: 'Home Loan Assistance',
      template: 'service',
      leadSource: 'home-loan',
      header: 'buyer-assistance',
      footer: 'services',
      seoTitle: 'Home Loan Assistance in Bengaluru',
      seoDescription:
        'Compare indicative lender terms, work out what you qualify for, and get the documentation right the first time, with help from a Squares N Acres advisor.',
      focusKeyword: 'home loan assistance bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Home loan assistance',
          'Work out what you can actually borrow before you fall in love with something you cannot.'
        ),
        { type: 'banks', data: { title: 'Indicative lender terms', showEmiCalculator: true } },
        {
          type: 'steps',
          data: {
            title: 'How we help',
            subtitle: 'Four steps, in the order they should happen.',
            items: [
              {
                title: 'Eligibility',
                text: 'We work through income, obligations and credit history to establish a realistic number.',
              },
              {
                title: 'Comparison',
                text: 'Indicative terms from several lenders, compared on reset and spread rather than on the headline rate.',
              },
              {
                title: 'Documentation',
                text: 'A single checklist, collected once, so the file is not returned twice.',
              },
              {
                title: 'Sanction to disbursal',
                text: 'We follow the legal and technical appraisal through to the money arriving.',
              },
            ],
          },
        },
        {
          type: 'checklist',
          data: {
            title: 'Documents most lenders ask for',
            intro: 'Collect these once and the rest of the process gets considerably shorter.',
            items: [
              {
                text: 'Identity and address proof for every applicant',
                detail: 'Originals seen, copies retained by the lender.',
              },
              {
                text: 'Salary slips for the last three months',
                detail: 'Or the last two years of returns if you are self-employed.',
              },
              {
                text: 'Bank statements for the last six months',
                detail: 'For the account the salary or business income lands in.',
              },
              { text: 'Form 16 or income tax returns for two years', detail: null },
              {
                text: 'Employment or business proof',
                detail: 'An appointment letter, or registration and GST documents.',
              },
              {
                text: 'Existing loan statements',
                detail: 'They go into the obligations calculation whether you declare them or not.',
              },
              {
                text: 'Property documents',
                detail: 'Agreement, approved plan, khata and tax receipts.',
              },
              {
                text: 'Own-contribution proof',
                detail: 'Evidence of the funds for the portion the lender will not finance.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Check what you qualify for',
            subtitle: 'Four answers are enough for an advisor to come back with a realistic range.',
            fields: [
              ...CONTACT_FIELDS,
              field('monthlyIncome', 'Monthly income', 'select', {
                required: true,
                options: INCOME_OPTIONS,
              }),
              field('desiredLoanAmount', 'Loan amount you are looking for', 'select', {
                required: true,
                options: LOAN_OPTIONS,
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'home-loan',
            successMessage: 'Thank you — an advisor will call to go through the numbers.',
          },
        },
        {
          type: 'faq',
          data: { title: 'Home loan questions', faqIds: faqIdsFor(['home-loan']), items: [] },
        },
      ],
    },
    {
      slug: 'buyer-assistance/legal-assistance',
      title: 'Legal Assistance',
      template: 'service',
      leadSource: 'legal-assistance',
      header: 'buyer-assistance',
      footer: 'services',
      seoTitle: 'Property Legal Assistance in Bengaluru',
      seoDescription:
        'Title verification, agreement drafting, RERA compliance, registration and due diligence for Bengaluru property transactions.',
      focusKeyword: 'property legal assistance bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Legal assistance',
          'The part of a transaction where a small fee prevents a large problem.'
        ),
        { type: 'stats', data: { items: [] } },
        {
          type: 'expandableCards',
          data: {
            title: 'What we help with',
            items: [
              {
                id: 1,
                icon: 'mdi:file-certificate-outline',
                title: 'Title verification',
                summary: 'Thirty years of title, read properly.',
                html: '<p>We trace the chain of ownership for the conventional thirty-year period, read the encumbrance certificate for the same window, and flag anything that needs a further look — an inheritance, a partition, a power of attorney in the chain.</p><p>The output is a written opinion you can act on, not a verbal assurance.</p>',
              },
              {
                id: 2,
                icon: 'mdi:file-document-edit-outline',
                title: 'Agreement drafting',
                summary: 'Agreements that say what was actually agreed.',
                html: '<p>Sale agreements, agreements to sale, rental and lease agreements, and joint development agreements, drafted or reviewed so that the commercial terms you negotiated are the terms in the document.</p><p>We pay particular attention to the schedule of the property, the payment milestones and the consequences of a delay on either side.</p>',
              },
              {
                id: 3,
                icon: 'mdi:shield-check-outline',
                title: 'RERA compliance',
                summary: 'Reading the project record, and acting on it.',
                html: '<p>We check the project’s registration and its declarations, compare them with what you have been offered, and raise the discrepancies before you pay.</p><p>Where a complaint is warranted, we help assemble the paper trail the authority will actually decide on.</p>',
              },
              {
                id: 4,
                icon: 'mdi:stamper',
                title: 'Property registration',
                summary: 'Duty, appointment, execution and the khata that follows.',
                html: '<p>Computation of duty and fees, the appointment, the execution at the sub-registrar’s office, and the khata transfer afterwards — which is the step most buyers postpone and then need urgently.</p>',
              },
              {
                id: 5,
                icon: 'mdi:magnify-scan',
                title: 'Due diligence',
                summary: 'Approvals, khata, encumbrances and litigation.',
                html: '<p>A single report covering the approvals, the conversion where land is involved, the khata and tax position, encumbrances, and any litigation touching the property or the promoter.</p><p>For a plot, this is most of the transaction.</p>',
              },
              {
                id: 6,
                icon: 'mdi:gavel',
                title: 'Dispute resolution',
                summary: 'When something has already gone wrong.',
                html: '<p>Delayed possession, a builder who will not hand over the documents, a boundary dispute, a society that will not issue a no-dues certificate. We advise on the forum, the evidence and the realistic outcome before you spend on litigation.</p>',
              },
            ],
          },
        },
        {
          type: 'steps',
          data: {
            title: 'How an engagement runs',
            subtitle: 'Three steps, with the scope agreed before any work starts.',
            items: [
              {
                title: 'Scope and fee',
                text: 'We agree exactly what is being checked and what it costs, in writing.',
              },
              {
                title: 'Review',
                text: 'Documents are collected, read and queried, with a written report at the end.',
              },
              {
                title: 'Action',
                text: 'Drafting, registration or the next step, depending on what the review found.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Ask about a transaction',
            subtitle: 'Tell us what stage you are at and what you need checked.',
            fields: [
              ...CONTACT_FIELDS,
              field('serviceType', 'What do you need?', 'select', {
                required: true,
                options: [
                  option('title-verification', 'Title verification'),
                  option('agreement-drafting', 'Agreement drafting'),
                  option('rera-compliance', 'RERA compliance'),
                  option('registration', 'Property registration'),
                  option('due-diligence', 'Due diligence'),
                  option('dispute', 'Dispute resolution'),
                ],
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'legal-assistance',
            successMessage: 'Thank you — we will come back with the scope and the fee.',
          },
        },
        {
          type: 'faq',
          data: {
            title: 'Legal and RERA questions',
            faqIds: faqIdsFor(['legal', 'rera']),
            items: [],
          },
        },
      ],
    },
    {
      slug: 'buyer-assistance/interior-designing',
      title: 'Interior Designing',
      template: 'service',
      leadSource: 'interior-design',
      header: 'buyer-assistance',
      footer: 'services',
      seoTitle: 'Interior Design for Bengaluru Homes',
      seoDescription:
        'Fit-out and furnishing for a new Bengaluru home, from a single room to a full handover, with indicative packages and a fixed scope before work starts.',
      focusKeyword: 'interior design bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Interior designing',
          'From an empty handover to a home you can move into, with the scope and the price fixed before anybody starts.'
        ),
        {
          type: 'features',
          data: {
            title: 'Rooms we work on',
            subtitle: 'Each room is quoted separately, so you can start with one.',
            items: [
              {
                icon: 'mdi:sofa-outline',
                title: 'Living Room',
                text: 'Seating, storage, lighting and the television wall, planned around how the room is actually used.',
              },
              {
                icon: 'mdi:bed-outline',
                title: 'Bedroom',
                text: 'Wardrobes, a bed with storage, side lighting and blackout treatment for the windows.',
              },
              {
                icon: 'mdi:countertop-outline',
                title: 'Kitchen',
                text: 'Modular units, counter, chimney and the appliance plan, with the plumbing checked first.',
              },
              {
                icon: 'mdi:shower',
                title: 'Bathroom',
                text: 'Fittings, storage, mirror lighting and waterproofing where it is being redone.',
              },
              {
                icon: 'mdi:balcony',
                title: 'Balcony',
                text: 'Weatherproof flooring, planting, seating and a clothes line that is not an eyesore.',
              },
              {
                icon: 'mdi:desk',
                title: 'Study Room',
                text: 'A desk that suits long hours, cable management, storage and light that does not glare.',
              },
            ],
          },
        },
        {
          type: 'steps',
          data: {
            title: 'How a project runs',
            subtitle: 'Five stages, each signed off before the next begins.',
            items: [
              {
                title: 'Brief and budget',
                text: 'What you need, what you like, and what you are willing to spend.',
              },
              {
                title: 'Design',
                text: 'Layouts, elevations and material samples, revised until they are right.',
              },
              {
                title: 'Quote and scope',
                text: 'A line-by-line quote against a fixed scope, so a change is a decision rather than a surprise.',
              },
              {
                title: 'Execution',
                text: 'Site work with a published schedule and a single supervisor.',
              },
              {
                title: 'Handover',
                text: 'Snag list, rectification, cleaning and the warranty documents.',
              },
            ],
          },
        },
        {
          type: 'gallery',
          data: {
            title: 'Recent work',
            items: Array.from({ length: 8 }, (_, index) => ({
              url: media.photo({
                seed: `sna-interior-gallery-${index + 1}`,
                width: 800,
                height: 600,
                alt: `Interior design reference image ${index + 1} (placeholder)`,
                folder: 'pages',
                tags: ['interior', 'gallery'],
              }),
              alt: `Interior design reference image ${index + 1} (placeholder)`,
              caption: null,
            })),
          },
        },
        {
          type: 'packages',
          data: {
            title: 'Indicative packages',
            items: [
              {
                name: 'Essential',
                price: '[indicative] from ₹3.5 lakh',
                unit: 'for a 2 BHK',
                features: [
                  'Modular kitchen with counter and chimney',
                  'Wardrobes in both bedrooms',
                  'Basic lighting plan and fixtures',
                  'Painting throughout',
                ],
                highlighted: false,
                ctaLabel: 'Ask about Essential',
              },
              {
                name: 'Premium',
                price: '[indicative] from ₹6.5 lakh',
                unit: 'for a 2 or 3 BHK',
                features: [
                  'Everything in Essential',
                  'Television unit and living room storage',
                  'False ceiling and a designed lighting plan',
                  'Study or work corner',
                  'Balcony treatment',
                ],
                highlighted: true,
                ctaLabel: 'Ask about Premium',
              },
              {
                name: 'Luxury',
                price: '[indicative] from ₹12 lakh',
                unit: 'for a 3 or 4 BHK',
                features: [
                  'Everything in Premium',
                  'Bespoke joinery and veneer finishes',
                  'Bathroom upgrades and fittings',
                  'Furniture, soft furnishing and art',
                  'Project management to handover',
                ],
                highlighted: false,
                ctaLabel: 'Ask about Luxury',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Tell us about the home',
            subtitle: 'A rough budget is enough to start the conversation.',
            fields: [
              ...CONTACT_FIELDS,
              field('propertyType', 'Property type', 'select', {
                required: true,
                options: RESIDENTIAL_TYPE_OPTIONS,
              }),
              field('budget', 'Indicative budget', 'select', {
                required: true,
                options: [
                  option('below-3l', 'Below ₹3 lakh'),
                  option('3l-6l', '₹3 lakh – ₹6 lakh'),
                  option('6l-12l', '₹6 lakh – ₹12 lakh'),
                  option('above-12l', 'Above ₹12 lakh'),
                ],
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'interior-design',
            successMessage: 'Thank you — a designer will call to take the brief.',
          },
        },
      ],
    },

    /* ------------------------------------------------------------ *
     * Commercial services
     * ------------------------------------------------------------ */
    {
      slug: 'flexible-workspace',
      title: 'Flexible Workspace',
      template: 'service',
      leadSource: 'flexible-workspace',
      header: 'company',
      footer: 'services',
      seoTitle: 'Flexible Workspace in Bengaluru',
      seoDescription:
        'Hot desks, dedicated desks, private offices, meeting rooms, virtual offices and day passes across Bengaluru, matched to your team and your term.',
      focusKeyword: 'flexible workspace bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Flexible workspace',
          'A desk for a day or a floor for three years, without signing a lease you will regret.'
        ),
        {
          type: 'features',
          data: {
            title: 'What we can find you',
            subtitle: 'Six formats, priced and contracted differently.',
            items: [
              {
                icon: 'mdi:desk',
                title: 'Hot Desks',
                text: 'Any free desk, any day, on a monthly membership.',
              },
              {
                icon: 'mdi:seat-outline',
                title: 'Dedicated Desks',
                text: 'The same desk every day, with storage you can leave things in.',
              },
              {
                icon: 'mdi:door-closed',
                title: 'Private Offices',
                text: 'A lockable room or suite for a team, inside a managed floor.',
              },
              {
                icon: 'mdi:presentation',
                title: 'Meeting Rooms',
                text: 'Booked by the hour, with the equipment already in the room.',
              },
              {
                icon: 'mdi:mailbox-outline',
                title: 'Virtual Offices',
                text: 'A business address and mail handling without the desk.',
              },
              {
                icon: 'mdi:ticket-outline',
                title: 'Day Passes',
                text: 'A single day, for when the alternative is a coffee shop.',
              },
            ],
          },
        },
        {
          type: 'features',
          data: {
            title: 'Why go through us',
            subtitle: 'Four things an operator will not tell you.',
            items: [
              {
                icon: 'mdi:currency-inr',
                title: 'The real monthly cost',
                text: 'Including the charges that are quoted separately from the desk rate.',
              },
              {
                icon: 'mdi:file-document-outline',
                title: 'The exit terms',
                text: 'Notice, lock-in and what happens to the deposit — read before you sign.',
              },
              {
                icon: 'mdi:map-search-outline',
                title: 'Options across the city',
                text: 'Several operators compared on the same basis rather than one pitched hard.',
              },
              {
                icon: 'mdi:account-clock-outline',
                title: 'Room to grow',
                text: 'What happens when the team doubles, agreed at the start rather than at the time.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Find a workspace',
            subtitle: 'Tell us the format, the size and the locality.',
            fields: [
              ...CONTACT_FIELDS,
              field('workspaceType', 'What do you need?', 'select', {
                required: true,
                options: [
                  option('hot-desk', 'Hot desks'),
                  option('dedicated-desk', 'Dedicated desks'),
                  option('private-office', 'Private office'),
                  option('meeting-room', 'Meeting room'),
                  option('virtual-office', 'Virtual office'),
                  option('day-pass', 'Day pass'),
                ],
              }),
              field('teamSize', 'Team size', 'select', {
                required: true,
                options: [
                  option('1', 'Just me'),
                  option('2-5', '2 – 5'),
                  option('6-15', '6 – 15'),
                  option('16-50', '16 – 50'),
                  option('50-plus', 'More than 50'),
                ],
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'flexible-workspace',
            successMessage: 'Thank you — we will come back with options that fit.',
          },
        },
      ],
    },
    {
      slug: 'direct-lease-retails',
      title: 'Direct Lease & Retail',
      template: 'service',
      leadSource: 'direct-lease-retail',
      header: 'company',
      footer: 'services',
      seoTitle: 'Direct Lease and Retail Space in Bengaluru',
      seoDescription:
        'Retail shops, office space, showrooms and food and beverage units for direct lease in Bengaluru, with the landlord’s terms set out before you commit.',
      focusKeyword: 'retail space for lease bengaluru',
      blocks: (page) => [
        hero(
          page.slug,
          'Direct lease and retail',
          'Space leased directly from the landlord, with the terms and the total occupancy cost on the table from the start.'
        ),
        {
          type: 'features',
          data: {
            title: 'What we lease',
            subtitle: 'Four formats, each with its own economics.',
            items: [
              {
                icon: 'mdi:storefront-outline',
                title: 'Retail Shops',
                text: 'High-street and mall units, priced on frontage and footfall.',
              },
              {
                icon: 'mdi:office-building-outline',
                title: 'Office Spaces',
                text: 'Bare shell to fully fitted, by the floor or by the seat.',
              },
              {
                icon: 'mdi:door-sliding-open',
                title: 'Showrooms',
                text: 'Large-format ground floors with display frontage and parking.',
              },
              {
                icon: 'mdi:silverware-fork-knife',
                title: 'F&B Outlets',
                text: 'Units with the services, ventilation and licences a kitchen needs.',
              },
            ],
          },
        },
        {
          type: 'features',
          data: {
            title: 'What we check before you sign',
            subtitle: 'Four things that decide whether a lease works.',
            items: [
              {
                icon: 'mdi:calculator',
                title: 'Total occupancy cost',
                text: 'Rent, common area maintenance, parking, taxes and the fit-out period.',
              },
              {
                icon: 'mdi:lock-clock',
                title: 'Lock-in and exit',
                text: 'What leaving early actually costs, in writing.',
              },
              {
                icon: 'mdi:certificate-outline',
                title: 'Use and licences',
                text: 'Whether the space is permitted for your use, before you fit it out.',
              },
              {
                icon: 'mdi:flash-outline',
                title: 'Services and load',
                text: 'Power, water, ventilation and backup, matched to what you need.',
              },
            ],
          },
        },
        {
          type: 'steps',
          data: {
            title: 'How it works',
            subtitle: 'Four steps from brief to keys.',
            items: [
              {
                title: 'Brief',
                text: 'Format, area, locality, budget and the date you need to open.',
              },
              {
                title: 'Options',
                text: 'A shortlist with the total occupancy cost compared on the same basis.',
              },
              {
                title: 'Negotiation',
                text: 'Rent, escalation, lock-in, fit-out period and deposit, negotiated together.',
              },
              {
                title: 'Documentation',
                text: 'Lease drafted, reviewed, registered where required, and handed over.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Tell us what you need',
            subtitle: 'Format and area are enough to start.',
            fields: [
              ...CONTACT_FIELDS,
              field('spaceType', 'Type of space', 'select', {
                required: true,
                options: [
                  option('retail-shop', 'Retail shop'),
                  option('office', 'Office space'),
                  option('showroom', 'Showroom'),
                  option('fnb', 'Food and beverage'),
                  option('warehouse', 'Warehouse or industrial'),
                ],
              }),
              field('areaRequired', 'Area required', 'text', {
                required: true,
                placeholder: 'In square feet — an approximate figure is fine',
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'direct-lease-retail',
            successMessage: 'Thank you — we will come back with a shortlist.',
          },
        },
      ],
    },

    /* ------------------------------------------------------------ *
     * Insights
     * ------------------------------------------------------------ */
    {
      slug: 'insights/real-estate-awareness',
      title: 'Real Estate Awareness',
      template: 'awareness',
      leadSource: 'real-estate-awareness',
      header: 'insights',
      footer: 'insights',
      seoTitle: 'Real Estate Awareness for Bengaluru Buyers',
      seoDescription:
        'The things a first-time buyer in Bengaluru is expected to know already: RERA, registration, loans, tax, stamp duty and the document checklist.',
      focusKeyword: 'real estate awareness india',
      blocks: (page) => [
        hero(
          page.slug,
          'Real estate awareness',
          'The things everybody assumes you already know, set out plainly — and a short quiz to find out whether you do.'
        ),
        {
          type: 'facts',
          data: {
            title: 'Did you know?',
            items: [
              {
                stat: 'Escrow',
                label:
                  'A large share of what a promoter collects for a registered project must sit in a separate project account — verify the current share with the authority.',
                icon: 'mdi:bank-outline',
              },
              {
                stat: 'Carpet area',
                label:
                  'Units in registered projects are sold on carpet area, which is smaller than the super built-up area in the brochure — verify both before you compare prices.',
                icon: 'mdi:ruler-square',
              },
              {
                stat: '30 years',
                label:
                  'The conventional period a title search covers in Karnataka, with an encumbrance certificate for the same window — verify with your lawyer.',
                icon: 'mdi:history',
              },
              {
                stat: 'Guidance value',
                label:
                  'Stamp duty is assessed on the guidance value or the consideration, whichever is higher — verify the current value for the locality.',
                icon: 'mdi:stamper',
              },
              {
                stat: 'Section 80C',
                label:
                  'Principal repayment on a home loan falls within an overall annual deduction limit shared with other investments — verify the current limit with your accountant.',
                icon: 'mdi:receipt-text-outline',
              },
              {
                stat: 'B khata',
                label:
                  'A property on the B register can be taxed but generally cannot get a building plan approval — verify the current position with the municipal body.',
                icon: 'mdi:file-alert-outline',
              },
            ],
          },
        },
        {
          type: 'expandableCards',
          data: {
            title: 'Essential knowledge',
            items: [
              {
                id: 1,
                icon: 'mdi:shield-check-outline',
                title: 'RERA',
                summary: 'What registration puts on the public record.',
                html: '<p>A registered project declares its land title, approvals, plans, unit inventory and completion date publicly, and files progress updates. That record is what you can hold a promoter to. It is not a quality certificate.</p><p>Read the full guide: <a href="/insights/articles/karnataka-rera-guide-for-homebuyers">Karnataka RERA for homebuyers</a>.</p>',
              },
              {
                id: 2,
                icon: 'mdi:stamper',
                title: 'Registration',
                summary: 'What happens at the sub-registrar’s office.',
                html: '<p>Duty and fees are computed and paid, an appointment is booked, both parties attend with witnesses, and the deed is executed and recorded. The khata transfer is a separate application afterwards.</p><p>Read the full guide: <a href="/insights/articles/stamp-duty-and-registration-charges-in-karnataka">stamp duty and registration charges</a>.</p>',
              },
              {
                id: 3,
                icon: 'mdi:bank-outline',
                title: 'Home loans',
                summary: 'How a lender decides what you can borrow.',
                html: '<p>Income minus existing obligations, capped as a ratio, converted into a loan at the current rate and tenure, and limited by a loan-to-value cap on the property’s assessed value.</p><p>Read the full guide: <a href="/insights/articles/home-loan-eligibility-and-foir-explained">home loan eligibility and FOIR</a>.</p>',
              },
              {
                id: 4,
                icon: 'mdi:calculator-variant-outline',
                title: 'Tax benefits',
                summary: 'Deductions exist; the limits change.',
                html: '<p>Interest and principal on a home loan attract deductions under different sections, with separate limits and conditions, and the treatment differs for a self-occupied and a let property.</p><p>The limits are revised periodically — confirm the current position with your accountant rather than with an article.</p>',
              },
              {
                id: 5,
                icon: 'mdi:cash-multiple',
                title: 'Stamp duty',
                summary: 'A tax on the instrument, not on the deal.',
                html: '<p>Assessed on the higher of the guidance value and the consideration, with registration fees and cess on top. Rates and concessions are set by the state and revised from time to time.</p><p>Verify the current rates on the state’s registration portal before you budget.</p>',
              },
              {
                id: 6,
                icon: 'mdi:clipboard-check-outline',
                title: 'Documents checklist',
                summary: 'What to collect, in order.',
                html: '<p>Title chain and encumbrance certificate, khata and tax receipts, approved plan and commencement certificate, occupancy certificate for a completed building, and the association no-dues for a resale flat.</p><p>Read the full guide: <a href="/insights/articles/first-time-homebuyer-checklist-bengaluru">the first-time buyer checklist</a>.</p>',
              },
            ],
          },
        },
        {
          type: 'quiz',
          data: {
            title: 'How much do you actually know?',
            intro: 'Five questions. The explanations matter more than the score.',
            questions: [
              {
                question: 'What does a khata prove?',
                options: [
                  'That you own the property',
                  'That the municipality holds you liable for the property tax',
                  'That the building plan was approved',
                  'That the property has no encumbrance',
                ],
                answerIndex: 1,
                explanation:
                  'A khata is a municipal record of tax liability. Ownership comes from the registered deed and the title chain.',
              },
              {
                question: 'Stamp duty is calculated on…',
                options: [
                  'The price stated in the deed, always',
                  'The guidance value, always',
                  'Whichever of the two is higher',
                  'The loan amount sanctioned',
                ],
                answerIndex: 2,
                explanation:
                  'Duty is assessed on the higher of the consideration and the published guidance value, which is why buying below guidance value does not reduce it.',
              },
              {
                question: 'A RERA registration number tells you that…',
                options: [
                  'The construction quality has been inspected',
                  'The project will be delivered on time',
                  'The project’s declarations are on a public record',
                  'The builder is financially sound',
                ],
                answerIndex: 2,
                explanation:
                  'Registration puts declarations on the record and makes changes traceable. It certifies nothing about quality, delivery or finances.',
              },
              {
                question: 'Which area figure must a registered project state in the agreement?',
                options: ['Super built-up area', 'Built-up area', 'Carpet area', 'Plot area'],
                answerIndex: 2,
                explanation:
                  'The Act defines carpet area and requires units to be sold on it, which is what makes two projects comparable.',
              },
              {
                question: 'What most often decides your home loan amount?',
                options: [
                  'The property’s price',
                  'Your income minus existing obligations',
                  'The builder’s reputation',
                  'The tenure you ask for',
                ],
                answerIndex: 1,
                explanation:
                  'Lenders cap the share of net income that goes to committed payments. That ratio, not the property price, usually sets the ceiling.',
              },
            ],
          },
        },
        {
          type: 'checklist',
          data: {
            title: 'Before you pay anything',
            intro: 'Ten things to have done, or to have somebody do for you.',
            items: [
              {
                text: 'Read the project or property record on the state portal',
                detail: 'For a registered project, end to end, including the updates.',
              },
              {
                text: 'Get the title chain checked for thirty years',
                detail: 'By your own lawyer, not the seller’s.',
              },
              {
                text: 'Pull the encumbrance certificate yourself',
                detail: 'For the same period as the title search.',
              },
              {
                text: 'Check the khata and which register it sits in',
                detail: 'And that the name matches the deed exactly.',
              },
              {
                text: 'Collect the property tax paid receipts',
                detail: 'For the last several years, with no gaps.',
              },
              {
                text: 'See the approved plan and the commencement certificate',
                detail: 'And check the block you were shown is on it.',
              },
              { text: 'Ask for the occupancy certificate', detail: 'For any completed building.' },
              {
                text: 'Get the carpet area in writing',
                detail: 'Alongside the super built-up area you were quoted.',
              },
              {
                text: 'Confirm where your payments go',
                detail: 'The account named in the agreement, never cash.',
              },
              {
                text: 'Budget the closing costs separately',
                detail: 'Stamp duty, registration and charges are payable on the day.',
              },
            ],
          },
        },
        {
          type: 'leadForm',
          data: {
            title: 'Still have a question?',
            subtitle:
              'Ask it. There is no such thing as a question too basic to ask about a purchase this size.',
            fields: [
              ...CONTACT_FIELDS,
              field('interest', 'What is this about?', 'select', {
                required: true,
                options: [
                  option('buying', 'Buying'),
                  option('selling', 'Selling'),
                  option('renting', 'Renting'),
                  option('home-loan', 'Home loan'),
                  option('legal', 'Legal'),
                  option('general', 'Something else'),
                ],
              }),
              MESSAGE_FIELD,
            ],
            leadSource: 'real-estate-awareness',
            successMessage: 'Thank you — an advisor will come back to you.',
          },
        },
      ],
    },

    /* ------------------------------------------------------------ *
     * Legal
     * ------------------------------------------------------------ */
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      template: 'legal',
      leadSource: null,
      header: null,
      footer: 'company',
      seoTitle: 'Privacy Policy',
      seoDescription:
        'How Squares N Acres collects, uses and stores the information you share through this website. Placeholder text pending the client’s own policy.',
      focusKeyword: 'squares n acres privacy policy',
      noHeroImage: true,
      blocks: () => [
        {
          type: 'hero',
          data: {
            title: 'Privacy policy',
            subtitle: 'How we handle the information you share with us.',
            imageUrl: null,
            ctaLabel: null,
            ctaHref: null,
          },
        },
        {
          type: 'richText',
          data: {
            html: `<p><strong>[Client legal text required]</strong> This page is a placeholder. The privacy policy published here must be drafted or approved by the client’s legal adviser before the site goes live.</p><h2>What we collect</h2><p>${PLACEHOLDER} The categories of personal information collected through enquiry forms, the newsletter and job applications.</p><h2>How we use it</h2><p>${PLACEHOLDER} The purposes the information is used for, and the lawful basis for each.</p><h2>Who we share it with</h2><p>${PLACEHOLDER} Any processors, partners or lenders information is shared with, and on what terms.</p><h2>How long we keep it</h2><p>${PLACEHOLDER} Retention periods for enquiries, applications and subscriptions.</p><h2>Your choices</h2><p>${PLACEHOLDER} How to ask for a copy, a correction or a deletion, and how to unsubscribe.</p><h2>Contact</h2><p>${PLACEHOLDER} The address and e-mail for privacy questions.</p>`,
          },
        },
      ],
    },
    {
      slug: 'terms-of-use',
      title: 'Terms of Use',
      template: 'legal',
      leadSource: null,
      header: null,
      footer: 'company',
      seoTitle: 'Terms of Use',
      seoDescription:
        'The terms on which this website may be used, including listings, accuracy and intellectual property. Placeholder text pending the client’s own terms.',
      focusKeyword: 'squares n acres terms of use',
      noHeroImage: true,
      blocks: () => [
        {
          type: 'hero',
          data: {
            title: 'Terms of use',
            subtitle: 'The terms on which this website is made available.',
            imageUrl: null,
            ctaLabel: null,
            ctaHref: null,
          },
        },
        {
          type: 'richText',
          data: {
            html: `<p><strong>[Client legal text required]</strong> This page is a placeholder. The terms published here must be drafted or approved by the client’s legal adviser before the site goes live.</p><h2>Using this site</h2><p>${PLACEHOLDER} What visitors may and may not do with the site and its content.</p><h2>Listings and information</h2><p>${PLACEHOLDER} The basis on which listing information is published, and the limits of any assurance given.</p><h2>Intellectual property</h2><p>${PLACEHOLDER} Ownership of the content, the brand and the photography.</p><h2>Liability</h2><p>${PLACEHOLDER} The limits of liability, to the extent the law allows them.</p><h2>Governing law</h2><p>${PLACEHOLDER} The governing law and the courts with jurisdiction.</p>`,
          },
        },
      ],
    },
    {
      slug: 'disclaimer',
      title: 'Disclaimer',
      template: 'legal',
      leadSource: null,
      header: null,
      footer: 'company',
      seoTitle: 'Disclaimer',
      seoDescription:
        'The basis on which listings, prices, areas and guidance on this site are published. Placeholder text pending the client’s own disclaimer.',
      focusKeyword: 'squares n acres disclaimer',
      noHeroImage: true,
      blocks: () => [
        {
          type: 'hero',
          data: {
            title: 'Disclaimer',
            subtitle: 'What the information on this site is, and what it is not.',
            imageUrl: null,
            ctaLabel: null,
            ctaHref: null,
          },
        },
        {
          type: 'richText',
          data: {
            html: `<p><strong>[Client legal text required]</strong> This page is a placeholder. The disclaimer published here must be drafted or approved by the client’s legal adviser before the site goes live.</p><h2>Listings</h2><p>${PLACEHOLDER} That listings are subject to availability, that prices, areas and charges are indicative, and that they change.</p><h2>Guidance and articles</h2><p>${PLACEHOLDER} That the articles are general information and not legal, tax or financial advice on a specific transaction.</p><h2>Third parties</h2><p>${PLACEHOLDER} The position on lenders, developers and other third parties mentioned on the site.</p><h2>Images</h2><p>${PLACEHOLDER} That photographs and renders are indicative and may not represent the specific unit.</p>`,
          },
        },
      ],
    },
  ];

  return DEFINITIONS.map((definition, index) => {
    const page = { slug: definition.slug };
    const blocks = definition.blocks(page).map((block, position) => ({
      id: position + 1,
      type: block.type,
      order: position + 1,
      data: block.data,
    }));

    const heroBlock = blocks.find((block) => block.type === 'hero');

    return {
      id: index + 1,
      slug: definition.slug,
      title: definition.title,
      template: definition.template,
      status: 'published',
      heroImageUrl: heroBlock ? (heroBlock.data.imageUrl ?? null) : null,
      blocks,
      leadSource: definition.leadSource,
      seo: makeSeo({
        title: definition.seoTitle,
        description: fitDescription(definition.seoDescription),
        focusKeyword: definition.focusKeyword,
        secondaryKeywords: ['squares n acres', 'bengaluru property'],
        slug: definition.slug,
      }),
      order: index + 1,
      showInFooter: Boolean(definition.footer),
      footerColumn: definition.footer,
      showInHeader: Boolean(definition.header),
      headerMenu: definition.header,
      ...stamps({ createdDaysAgo: 158 - index }),
    };
  });
};
