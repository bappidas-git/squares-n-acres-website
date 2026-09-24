/**
 * `leads` — forty-five enquiries across the last ninety days (§6.7, §10).
 *
 * The collection exists to exercise the CRM, so it is built to be awkward in
 * the ways a real pipeline is: every one of the twenty-nine sources appears at
 * least once, the statuses are spread across the funnel, some leads are
 * assigned and most are not, a few follow-ups are overdue, and the four
 * finance leads carry the assessment payload in `meta` (D56).
 *
 * The people are fictional: Indian names, obviously synthetic but structurally
 * valid mobile numbers, and `@example.com` addresses that cannot receive mail
 * (§14). `activities[]` is derived from the status rather than typed, so the
 * history always agrees with where the lead has got to.
 */

const { LEAD_SOURCES, LEAD_STATUS } = require('../../../src/config/enums');

/** Where the funnel runs; `lost` sits outside it (§6.17). */
const PIPELINE = ['new', 'contacted', 'qualified', 'site-visit', 'negotiation', 'converted'];

const SITE = 'https://www.squaresnacres.com';

/**
 * name, phone suffix, source, status, priority, assignedTo, daysAgo, extras.
 *
 * `extras` carries only what the source implies: a `property` for the seven
 * listing sources, an `article` for an article enquiry, a `page` for a page
 * form, a `requirement` where the form collected one, `meta` for the finance
 * assessments, `notes` where somebody wrote one, and `followUp` in days
 * (positive = future, negative = overdue).
 */
const LEADS = [
  // --- Property-led enquiries -------------------------------------------
  {
    name: 'Ananya Rao',
    source: 'property-enquiry',
    status: 'new',
    priority: 'high',
    assigned: null,
    daysAgo: 2,
    property: 1,
    message: 'Interested in a three-bedroom at Lakeview Heights. Please call in the evening.',
    requirement: {
      listingType: 'sale',
      propertyType: 'apartments',
      locality: 'whitefield',
      bedrooms: 3,
      budgetMin: 11000000,
      budgetMax: 14000000,
      timeline: '1-3-months',
    },
  },
  {
    name: 'Vikram Shetty',
    source: 'site-visit-request',
    status: 'site-visit',
    priority: 'high',
    assigned: 3,
    daysAgo: 16,
    property: 1,
    followUp: 4,
    message: 'Would like to see the three-bedroom this weekend, preferably Saturday morning.',
    notes: [
      'Visit booked for Saturday 11 am. Client is comparing with two other projects in Whitefield.',
    ],
  },
  {
    name: 'Meera Krishnan',
    source: 'brochure-download',
    status: 'contacted',
    priority: 'medium',
    assigned: null,
    daysAgo: 9,
    property: 3,
    message: null,
  },
  {
    name: 'Rohit Malhotra',
    source: 'price-request',
    status: 'qualified',
    priority: 'high',
    assigned: 3,
    daysAgo: 23,
    property: 6,
    followUp: 6,
    message: 'Please share the full price list for the four-bedroom units, including charges.',
    notes: [
      'Price list sent. Budget confirmed at around two and a half crore, loan pre-approved.',
      'Wants a corner unit above the fifteenth floor if one is available.',
    ],
  },
  {
    name: 'Priya Venkatesh',
    source: 'floor-plan-request',
    status: 'new',
    priority: 'medium',
    assigned: null,
    daysAgo: 5,
    property: 5,
    message: 'Can I get the three-bedroom floor plan with dimensions?',
  },
  {
    name: 'Siddharth Jain',
    source: 'property-enquiry',
    status: 'negotiation',
    priority: 'high',
    assigned: 3,
    daysAgo: 38,
    property: 19,
    followUp: 2,
    message: 'Interested in the penthouse. What is the flexibility on price?',
    notes: [
      'Two visits done. Offer made at four percent below asking.',
      'Owner has come back at two percent. Client considering.',
    ],
  },
  {
    name: 'Deepa Iyer',
    source: 'property-enquiry',
    status: 'converted',
    priority: 'high',
    assigned: 3,
    daysAgo: 62,
    property: 4,
    message: 'Two-bedroom in Electronic City, ready to move, within seventy-five lakh.',
    notes: ['Registered on schedule. Handover done; ask for a testimonial in a month.'],
  },
  {
    name: 'Manish Gupta',
    source: 'brochure-download',
    status: 'lost',
    priority: 'low',
    assigned: 2,
    daysAgo: 55,
    property: 10,
    lostReason: 'Bought a resale flat closer to the airport through another advisor.',
    message: null,
  },
  {
    name: 'Shalini Prabhu',
    source: 'site-visit-request',
    status: 'contacted',
    priority: 'medium',
    assigned: null,
    daysAgo: 7,
    property: 23,
    message: 'Would like to walk the layout before deciding on a corner site.',
  },
  {
    name: 'Nikhil Bhandari',
    source: 'property-enquiry',
    status: 'qualified',
    priority: 'medium',
    assigned: 3,
    daysAgo: 29,
    property: 34,
    followUp: 9,
    message: 'Looking at the fifth floor for a forty-person team. What is the fit-out period?',
    notes: ['Fit-out period of ninety days agreed in principle. Legal reviewing the draft lease.'],
  },

  // --- Page forms --------------------------------------------------------
  {
    name: 'Sanjay Pillai',
    source: 'contact-page',
    status: 'new',
    priority: 'medium',
    assigned: null,
    daysAgo: 6,
    page: 'contact',
    message: 'General enquiry about buying in south Bengaluru within one and a half crore.',
    requirement: {
      listingType: 'sale',
      propertyType: 'apartments',
      locality: 'jp-nagar',
      bedrooms: 3,
      budgetMin: 10000000,
      budgetMax: 15000000,
      timeline: '3-6-months',
    },
  },
  {
    name: 'Rekha Sharma',
    source: 'home-loan',
    status: 'qualified',
    priority: 'high',
    assigned: 3,
    daysAgo: 20,
    page: 'buyer-assistance/home-loan',
    followUp: 3,
    message: 'Need help comparing home loan options before I shortlist.',
    requirement: {
      listingType: 'sale',
      bedrooms: 2,
      budgetMin: 6000000,
      budgetMax: 9000000,
      timeline: '6-12-months',
    },
    notes: ['Pre-approved amount discussed. Waiting on income documents from the co-applicant.'],
  },
  {
    name: 'Gopal Krishnamurthy',
    source: 'legal-assistance',
    status: 'contacted',
    priority: 'high',
    assigned: 2,
    daysAgo: 14,
    page: 'buyer-assistance/legal-assistance',
    message: 'Need a title check on a resale flat in Jayanagar before I pay the advance.',
  },
  {
    name: 'Fatima Sheikh',
    source: 'interior-design',
    status: 'new',
    priority: 'low',
    assigned: null,
    daysAgo: 8,
    page: 'buyer-assistance/interior-designing',
    message: 'Taking possession next month, looking at the Premium package for a 3 BHK.',
  },
  {
    name: 'Harish Chandra',
    source: 'sell-let',
    status: 'contacted',
    priority: 'medium',
    assigned: 3,
    daysAgo: 18,
    page: 'sell-let',
    message: 'Want to let out a three-bedroom in HSR Layout. What rent should I expect?',
  },
  {
    name: 'Sunita Bhat',
    source: 'careers',
    status: 'new',
    priority: 'low',
    assigned: null,
    daysAgo: 11,
    page: 'careers',
    message:
      'Sending my profile for an advisor role even though the listing is for east Bengaluru.',
  },
  {
    name: 'Ashok Menon',
    source: 'partnership',
    status: 'qualified',
    priority: 'medium',
    assigned: 2,
    daysAgo: 33,
    page: 'partnership',
    message: 'We are a legal practice looking to work on buyer-side diligence. Can we talk?',
    notes: ['Good fit for the legal panel. Terms sheet to be drafted.'],
  },
  {
    name: 'Neha Agarwal',
    source: 'flexible-workspace',
    status: 'contacted',
    priority: 'medium',
    assigned: null,
    daysAgo: 13,
    page: 'flexible-workspace',
    message: 'Twelve-person team, looking for a private office in Koramangala or Indiranagar.',
  },
  {
    name: 'Imran Ahmed',
    source: 'direct-lease-retail',
    status: 'new',
    priority: 'medium',
    assigned: null,
    daysAgo: 9,
    page: 'direct-lease-retails',
    message: 'Looking for a 1,500 sq ft retail unit with frontage in Indiranagar or Jayanagar.',
  },
  {
    name: 'Lalitha Subramanian',
    source: 'real-estate-awareness',
    status: 'new',
    priority: 'low',
    assigned: null,
    daysAgo: 15,
    page: 'insights/real-estate-awareness',
    message: 'Took the quiz and got three out of five. Where do I start as a first-time buyer?',
  },
  {
    name: 'Dinesh Kamath',
    source: 'faq',
    status: 'contacted',
    priority: 'low',
    assigned: null,
    daysAgo: 21,
    page: 'insights/real-estate-awareness',
    message: 'The FAQ on B khata did not cover conversion. Can somebody explain my case?',
  },

  // --- Finance assessments (meta payload, D56) ---------------------------
  // The payload `finance/assessmentLead.js` sends: every answer as the form's
  // option value, the score and the band the visitor was shown. The first
  // version of these three invented its own values ("1l-2l", "750-800",
  // "20-percent") that no form produces, and the CRM printed them raw (QA-53).
  {
    name: 'Prakash Varma',
    source: 'financial-assessment',
    status: 'qualified',
    priority: 'high',
    assigned: 3,
    daysAgo: 26,
    page: 'buyer-assistance/home-loan',
    followUp: 7,
    message: 'Completed the assessment; would like to understand the eligibility breakdown.',
    meta: {
      score: 78,
      band: 'Excellent',
      occupation: 'salaried',
      employmentYears: '5-10',
      monthlyIncome: '150000-250000',
      exactMonthlyIncome: '',
      existingEmi: '10000-25000',
      emiTenure: '24+',
      creditScore: 'excellent',
      downPayment: '20',
      hasCoApplicant: 'yes',
      coApplicantIncome: '60000',
      propertyPrice: null,
      bank: 'Garden City Bank',
    },
    notes: ['Assessment score 78. Co-applicant income improves the position considerably.'],
  },
  {
    name: 'Swathi Hegde',
    source: 'financial-assessment',
    status: 'new',
    priority: 'medium',
    assigned: null,
    daysAgo: 10,
    page: 'buyer-assistance/home-loan',
    message: null,
    meta: {
      score: 64,
      band: 'Good',
      occupation: 'self-employed',
      employmentYears: '3-5',
      monthlyIncome: '50000-100000',
      exactMonthlyIncome: '',
      existingEmi: '10000-25000',
      emiTenure: '12-24',
      creditScore: 'good',
      downPayment: '10',
      hasCoApplicant: 'no',
      coApplicantIncome: '',
      propertyPrice: null,
      bank: 'Southern Housing Finance',
    },
  },
  {
    name: 'Jagadish Rao',
    source: 'bank-eligibility',
    status: 'contacted',
    priority: 'medium',
    assigned: 3,
    daysAgo: 17,
    page: 'buyer-assistance/home-loan',
    message: 'Checked eligibility with two lenders; which would you recommend?',
    meta: {
      score: 71,
      band: 'Good',
      occupation: 'salaried',
      employmentYears: '10+',
      monthlyIncome: '250000+',
      exactMonthlyIncome: '',
      existingEmi: '25000-50000',
      emiTenure: '12-24',
      creditScore: 'excellent',
      downPayment: '25',
      hasCoApplicant: 'no',
      coApplicantIncome: '',
      propertyPrice: null,
      bank: 'Metro Capital Bank',
    },
  },

  // --- Content and navigation sources ------------------------------------
  {
    name: 'Tara Menon',
    source: 'article',
    status: 'new',
    priority: 'low',
    assigned: null,
    daysAgo: 19,
    article: 'karnataka-rera-guide-for-homebuyers',
    message: 'Read the RERA guide. How do I check a project that is not on the portal?',
  },
  {
    name: 'Yogesh Patil',
    source: 'article',
    status: 'contacted',
    priority: 'medium',
    assigned: null,
    daysAgo: 31,
    article: 'plot-buying-checklist-bda-bmrda-biaapa',
    message: 'The plot checklist was useful. Can you help me check a layout near Devanahalli?',
  },
  {
    name: 'Bhavana Rai',
    source: 'locality-page',
    status: 'new',
    priority: 'medium',
    assigned: null,
    daysAgo: 7,
    locality: 'hebbal',
    message: 'What is actually available in Hebbal under two crore right now?',
    requirement: {
      listingType: 'sale',
      propertyType: 'apartments',
      locality: 'hebbal',
      bedrooms: 3,
      budgetMin: 15000000,
      budgetMax: 20000000,
      timeline: '3-6-months',
    },
  },
  {
    name: 'Mahesh Naik',
    source: 'developer-page',
    status: 'new',
    priority: 'low',
    assigned: null,
    daysAgo: 24,
    developer: 'aurelia-estates',
    message: 'Which of this builder’s projects are ready to move?',
  },
  {
    name: 'Shruti Kulkarni',
    source: 'newsletter',
    status: 'new',
    priority: 'low',
    assigned: null,
    daysAgo: 35,
    message: null,
  },
  {
    name: 'Abhishek Verma',
    source: 'whatsapp-click',
    status: 'contacted',
    priority: 'medium',
    assigned: null,
    daysAgo: 5,
    property: 2,
    message: 'Messaged on WhatsApp about the two-bedroom on Sarjapur Road.',
  },
  {
    name: 'Geetha Srinivasan',
    source: 'call-click',
    status: 'new',
    priority: 'high',
    assigned: null,
    daysAgo: 2,
    property: 15,
    message: 'Called from the villa listing page.',
  },
  {
    name: 'Ritika Chawla',
    source: 'hero-search',
    status: 'site-visit',
    priority: 'high',
    assigned: 3,
    daysAgo: 41,
    followUp: -3,
    message: 'Searched for villas in Devanahalli and asked to see two of them.',
    requirement: {
      listingType: 'sale',
      propertyType: 'villas',
      locality: 'devanahalli',
      bedrooms: 4,
      budgetMin: 28000000,
      budgetMax: 36000000,
      timeline: '1-3-months',
    },
    notes: ['Two villas seen. Follow-up call is overdue — client asked for a week to decide.'],
  },
  {
    name: 'Suresh Babu',
    source: 'post-requirement',
    status: 'qualified',
    priority: 'high',
    assigned: 3,
    daysAgo: 45,
    followUp: 5,
    message: 'Posted a requirement for a ready-to-move three-bedroom in east Bengaluru.',
    requirement: {
      listingType: 'sale',
      propertyType: 'apartments',
      locality: 'whitefield',
      bedrooms: 3,
      budgetMin: 12000000,
      budgetMax: 16000000,
      timeline: '1-3-months',
    },
    notes: ['Shortlist of four sent. Two visits booked for next weekend.'],
  },
  {
    name: 'Poonam Jaiswal',
    source: 'post-requirement',
    status: 'new',
    priority: 'medium',
    assigned: null,
    daysAgo: 13,
    message: 'Looking for a two-bedroom on rent near the Outer Ring Road.',
    requirement: {
      listingType: 'rent',
      propertyType: 'apartments',
      locality: 'bellandur',
      bedrooms: 2,
      budgetMin: 40000,
      budgetMax: 60000,
      timeline: 'immediate',
    },
  },
  {
    name: 'Chandran Pillai',
    source: 'other',
    status: 'lost',
    priority: 'low',
    assigned: null,
    daysAgo: 70,
    lostReason: 'Requirement was outside Bengaluru; referred elsewhere.',
    message: 'Enquiry about property in another city.',
  },

  // --- Older pipeline, for the dashboard trends --------------------------
  {
    name: 'Aditya Ranganathan',
    source: 'property-enquiry',
    status: 'converted',
    priority: 'high',
    assigned: 3,
    daysAgo: 78,
    property: 1,
    message: 'Three-bedroom at Lakeview Heights, ready to move.',
    notes: ['Registered. Client has asked us to handle the letting when they relocate.'],
  },
  {
    name: 'Namrata Joshi',
    source: 'site-visit-request',
    status: 'converted',
    priority: 'medium',
    assigned: null,
    daysAgo: 71,
    property: 22,
    message: 'Builder floor in Malleshwaram — can we see it on Sunday?',
    notes: ['Visited and closed within three weeks. Straightforward title.'],
  },
  {
    name: 'Faisal Rahman',
    source: 'home-loan',
    status: 'converted',
    priority: 'medium',
    assigned: 3,
    daysAgo: 66,
    page: 'buyer-assistance/home-loan',
    message: 'Loan sanctioned; need help with the disbursal against the builder demands.',
  },
  {
    name: 'Kiran Shetty',
    source: 'contact-page',
    status: 'converted',
    priority: 'medium',
    assigned: 2,
    daysAgo: 84,
    page: 'contact',
    message: 'Looking for a plot near Kanakapura Road within seventy lakh.',
    notes: ['Site registered. Khata transfer in progress.'],
  },
  {
    name: 'Vandana Shetty',
    source: 'property-enquiry',
    status: 'lost',
    priority: 'medium',
    assigned: 3,
    daysAgo: 88,
    property: 29,
    lostReason: 'Landlord withdrew the listing before the agreement was signed.',
    message: 'Three-bedroom rental at Bellandur, fully furnished.',
  },
  {
    name: 'Rajeev Menon',
    source: 'negotiation-placeholder',
    status: 'negotiation',
    priority: 'high',
    assigned: 3,
    daysAgo: 49,
    property: 16,
    followUp: -8,
    sourceOverride: 'property-enquiry',
    message: 'Villa on Kanakapura Road. Offer made, waiting on the owner.',
    notes: ['Offer is three percent below asking. Owner has not come back — follow-up overdue.'],
  },
  {
    name: 'Smita Kulkarni',
    source: 'property-enquiry',
    status: 'negotiation',
    priority: 'high',
    assigned: 2,
    daysAgo: 52,
    property: 20,
    followUp: 1,
    message: 'Duplex in Koramangala. Discussing price and the parking allocation.',
    notes: ['Seller wants a shorter completion. Client can do forty-five days.'],
  },
  {
    name: 'Hemant Joshi',
    source: 'brochure-download',
    status: 'site-visit',
    priority: 'medium',
    assigned: null,
    daysAgo: 44,
    property: 5,
    followUp: -6,
    message: 'Downloaded the brochure; would like to see the model flat.',
  },
  {
    name: 'Anjali Pandit',
    source: 'callback-request',
    status: 'site-visit',
    priority: 'medium',
    assigned: null,
    daysAgo: 36,
    property: 11,
    message: 'Please call to arrange a visit to the two-bedroom.',
  },
  {
    name: 'Sameer Fernandes',
    source: 'document-request',
    status: 'site-visit',
    priority: 'low',
    assigned: null,
    daysAgo: 58,
    property: 25,
    message: 'Need the approval papers before travelling down to see the site.',
  },
];

module.exports = function leads({ media: _media, lookup, dates }) {
  void _media;

  return LEADS.map((entry, index) => {
    const id = index + 1;
    const source = entry.sourceOverride ?? entry.source;
    const handle = entry.name.toLowerCase().replace(/[^a-z]+/g, '.');
    const createdAt = dates.daysAgo(entry.daysAgo, 9 + (index % 9), (index % 4) * 15);
    const createdMs = Date.parse(createdAt);

    /** A timestamp `minutes` after the lead was created, as ISO-8601. */
    const after = (minutes) => new Date(createdMs + minutes * 60000).toISOString();

    const property = entry.property ? lookup.properties[entry.property] : null;
    const page = entry.page ? lookup.pages[entry.page] : null;

    const pageSlug = entry.page
      ? entry.page.replace(/\//g, '-')
      : property
        ? property.slug
        : entry.article
          ? entry.article
          : null;

    const pageUrl = page
      ? `${SITE}/${page.slug}`
      : property
        ? `${SITE}/properties/${property.slug}`
        : entry.article
          ? `${SITE}/insights/articles/${entry.article}`
          : entry.locality
            ? `${SITE}/localities/${entry.locality}`
            : entry.developer
              ? `${SITE}/builders/${entry.developer}`
              : null;

    /* ---- activities: created → assigned → the funnel → notes ---------- */

    const activities = [];
    const pushActivity = (type, description, minutes, createdBy = null) => {
      activities.push({
        id: activities.length + 1,
        type,
        description,
        createdBy,
        createdAt: after(minutes),
      });
    };

    pushActivity('created', `Lead created via ${LEAD_SOURCES.labelOf(source)}`, 0);

    if (entry.assigned) {
      pushActivity(
        'assigned',
        `Assigned to ${lookup.users[entry.assigned].name}`,
        30,
        entry.assigned === 3 ? 2 : 1
      );
    }

    const stage = PIPELINE.indexOf(entry.status);
    let minutes = 90;

    if (entry.status === 'lost') {
      pushActivity('contacted', 'Contacted by phone', minutes, entry.assigned);
      minutes += 2880;
      pushActivity('status-changed', 'Status changed to Lost', minutes, entry.assigned);
    } else {
      for (let step = 1; step <= stage; step += 1) {
        const status = PIPELINE[step];
        if (status === 'contacted') {
          pushActivity('contacted', 'Contacted by phone', minutes, entry.assigned);
        } else {
          pushActivity(
            'status-changed',
            `Status changed to ${LEAD_STATUS.labelOf(status)}`,
            minutes,
            entry.assigned
          );
        }
        minutes += 1440;
      }
    }

    const notes = (entry.notes ?? []).map((text, position) => {
      const at = minutes + (position + 1) * 120;
      pushActivity('note-added', 'Note added', at, entry.assigned ?? 1);
      return {
        id: position + 1,
        text,
        createdBy: entry.assigned ?? 1,
        createdByName: lookup.users[entry.assigned ?? 1].name,
        createdAt: after(at),
      };
    });

    const followUpAt =
      entry.followUp === undefined
        ? null
        : entry.followUp >= 0
          ? dates.daysAhead(entry.followUp, 10, 30)
          : dates.daysAgo(-entry.followUp, 10, 30);

    if (followUpAt) {
      pushActivity('follow-up-set', 'Follow-up scheduled', minutes + 240, entry.assigned ?? 1);
    }

    const requirement = entry.requirement
      ? {
          listingType: entry.requirement.listingType ?? null,
          propertyTypeId: entry.requirement.propertyType
            ? lookup.propertyTypes[entry.requirement.propertyType].id
            : null,
          localityId: entry.requirement.locality
            ? lookup.localities[entry.requirement.locality].id
            : null,
          bedrooms: entry.requirement.bedrooms ?? null,
          budgetMin: entry.requirement.budgetMin ?? null,
          budgetMax: entry.requirement.budgetMax ?? null,
          areaUnit: null,
          timeline: entry.requirement.timeline ?? null,
        }
      : null;

    // Ten leads arrived through a campaign; the rest came directly.
    const campaign = index % 4 === 1 && index < 40;
    const utm = campaign
      ? {
          source: index % 8 === 1 ? 'google' : 'facebook',
          medium: index % 8 === 1 ? 'cpc' : 'social',
          campaign: index % 8 === 1 ? 'bengaluru-ready-to-move' : 'locality-guides',
          term: index % 8 === 1 ? '3 bhk in whitefield' : null,
          content: null,
        }
      : { source: null, medium: null, campaign: null, term: null, content: null };

    const lastActivity = activities[activities.length - 1];

    return {
      id,
      name: entry.name,
      phone: `98765${String(100 + index).padStart(5, '0')}`.slice(0, 10),
      email: `${handle}@example.com`,
      message: entry.message ?? null,
      source,
      propertyId: property ? property.id : null,
      articleId: entry.article ? lookup.articleSlugs[entry.article] : null,
      pageSlug,
      pageUrl,
      requirement,
      status: entry.status,
      priority: entry.priority,
      assignedTo: entry.assigned ?? null,
      followUpAt,
      lostReason: entry.lostReason ?? null,
      notes,
      activities,
      utm,
      consent: true,
      meta: entry.meta ?? null,
      ipAddress: '127.0.0.1',
      userAgent: 'Seed data — no real visitor',
      createdAt,
      updatedAt: lastActivity.createdAt,
    };
  });
};

module.exports.LEADS = LEADS;
