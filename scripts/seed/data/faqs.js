/**
 * `faqs` — twenty questions across the eight categories of §6.9.
 *
 * These are the site-wide FAQs: the `/insights/faqs` page, the "still have
 * questions" blocks and the `faq` CMS block draw from them by category or by
 * id. A property's own FAQs live on the property record instead, because they
 * answer things only that listing can answer.
 *
 * Anything with a number in it (stamp duty, tax limits, escrow shares) is
 * written as "check the current position", per D84.
 */

const FAQS = [
  {
    category: 'buying',
    showOnHome: true,
    question: 'How do I start a property search with Squares N Acres?',
    answer:
      '<p>Tell us the locality, the budget and the configuration you have in mind through any enquiry form on the site. An advisor comes back with a shortlist drawn from our own inventory, explains where each option is weak as well as strong, and arranges the site visits.</p>',
  },
  {
    category: 'buying',
    showOnHome: true,
    question: 'Do you charge the buyer a fee?',
    answer:
      '<p>Our commercial terms depend on the transaction and are agreed in writing before you commit to anything. Ask the advisor for the terms at the first conversation rather than at the offer stage — a brokerage that will not put its fee in writing is telling you something.</p>',
  },
  {
    category: 'buying',
    showOnHome: false,
    question: 'What documents should I check before paying a booking amount?',
    answer:
      '<p>At a minimum: the title deeds for the last thirty years, the approved plan, the commencement certificate, the khata and the latest tax paid receipt, the encumbrance certificate, and the RERA registration where the project needs one. For a resale flat, add the society or association no-dues certificate and the share of undivided land recorded in the sale deed.</p>',
  },
  {
    category: 'selling',
    showOnHome: false,
    question: 'How do you price a property for sale?',
    answer:
      '<p>From three things: what comparable units in the same building or layout have actually transacted at, what is currently listed and not selling, and the condition and floor of your specific unit. We will tell you when a price you have in mind is unlikely to transact, which is the useful part of the exercise.</p>',
  },
  {
    category: 'selling',
    showOnHome: false,
    question: 'What does listing with you involve?',
    answer:
      '<p>A visit to photograph and measure the property, a documentation check so that questions are answered before a buyer asks them, a listing on this site, and screened viewings. You keep the decision on every offer; we handle the negotiation and the paperwork that follows it.</p>',
  },
  {
    category: 'renting',
    showOnHome: true,
    question: 'How much deposit is normal for a rental in Bengaluru?',
    answer:
      '<p>Deposits in the city have historically been high by Indian standards — several months of rent is common, and the exact figure is negotiable rather than fixed. Agree the deposit, the notice period and the lock-in together, because owners often trade one against another.</p>',
  },
  {
    category: 'renting',
    showOnHome: false,
    question: 'Who pays for maintenance in a rented flat?',
    answer:
      '<p>Say so in the agreement rather than assuming. The usual split is that the owner pays the association maintenance and the structural repairs, and the tenant pays the utilities and anything they break. Fixtures that fail through age are the owner’s; fixtures that fail through use are argued about, so write them down.</p>',
  },
  {
    category: 'renting',
    showOnHome: false,
    question: 'Is a rental agreement required to be registered?',
    answer:
      '<p>Short agreements are commonly executed on stamp paper and notarised, while longer tenures attract registration. The threshold and the stamp duty payable are set by state rules that change, so confirm the current position with the sub-registrar office or your lawyer before signing.</p>',
  },
  {
    category: 'home-loan',
    showOnHome: true,
    question: 'How much home loan am I eligible for?',
    answer:
      '<p>Most lenders work backwards from your income: they cap the total of all your monthly obligations at a share of your net income, then convert what is left into a loan at the current rate and tenure. Your credit history, the co-applicant’s income and the property’s valuation all move the number. Our home-loan page has a calculator that shows the arithmetic.</p>',
  },
  {
    category: 'home-loan',
    showOnHome: false,
    question: 'Should I take a fixed or a floating rate?',
    answer:
      '<p>Floating rates in India are usually linked to an external benchmark, which means they move with it in both directions; fixed rates buy certainty at a premium and often convert to floating after a few years. Read which benchmark the loan is tied to and how often it resets — that detail matters more than the headline rate.</p>',
  },
  {
    category: 'home-loan',
    showOnHome: false,
    question: 'What does the bank need from the builder before it releases money?',
    answer:
      '<p>For an under-construction purchase the lender needs the project’s legal and technical clearance, and then releases money in stages against the builder’s demand letters and the construction progress. Ask whether your project is already on the lender’s approved list — it shortens the process considerably.</p>',
  },
  {
    category: 'legal',
    showOnHome: false,
    question: 'What is the difference between A khata and B khata?',
    answer:
      '<p>A khata records a property as fully compliant with the municipal body’s requirements; a B khata records one that is on the tax rolls but does not meet them. The practical difference shows up when you need a building plan approval, a trade licence or a home loan. Our guide on the subject sets out what can and cannot be converted.</p>',
  },
  {
    category: 'legal',
    showOnHome: false,
    question: 'How long should a title search go back?',
    answer:
      '<p>Thirty years is the convention in Karnataka, together with an encumbrance certificate covering the same period. If the chain passes through an inheritance, a partition or a power of attorney, ask your lawyer to look further rather than treating the thirty years as a rule.</p>',
  },
  {
    category: 'rera',
    showOnHome: true,
    question: 'Does every project have to be registered under RERA?',
    answer:
      '<p>Registration applies to projects above the thresholds the Act sets for land area and number of units. Smaller developments, and projects already complete when the Act came into force, can fall outside it. Check the project on the Karnataka RERA portal rather than taking a brochure’s word for it.</p>',
  },
  {
    category: 'rera',
    showOnHome: false,
    question: 'What does a RERA registration number actually tell me?',
    answer:
      '<p>That the promoter has declared the project’s land title, approvals, plans, unit inventory and completion date on a public record, and that changes to those declarations leave a trail. It is not a quality certificate and it is not a guarantee of delivery — it is a record you can hold the promoter to.</p>',
  },
  {
    category: 'rera',
    showOnHome: false,
    question: 'Where do I complain if a project is delayed?',
    answer:
      '<p>Complaints against a registered project go to the state authority, with the appellate tribunal above it. Keep every payment receipt, the allotment letter and the agreement to sale: a complaint stands or falls on the paper trail, not on the correspondence.</p>',
  },
  {
    category: 'nri',
    showOnHome: false,
    question: 'Can an NRI buy property in Bengaluru?',
    answer:
      '<p>Non-resident Indians and persons of Indian origin may generally buy residential and commercial property in India, with agricultural land, plantations and farmhouses treated differently. Payment must come through banking channels from an appropriate account. Confirm the current exchange-control position with your bank before you remit anything.</p>',
  },
  {
    category: 'nri',
    showOnHome: false,
    question: 'Do I need to be in India to complete a purchase?',
    answer:
      '<p>Not necessarily. A properly executed power of attorney lets somebody register on your behalf, but it has to be drafted for the specific transaction and attested correctly in the country you are in. Arrange it early: getting the attestation right takes longer than the registration itself.</p>',
  },
  {
    category: 'general',
    showOnHome: true,
    question: 'Are the listings on this site verified?',
    answer:
      '<p>We visit what we list and check the areas, the approvals and the charges before publishing, and we correct a listing when something changes. That is a different claim from "guaranteed": your own legal due diligence still belongs in the process, and we will tell you what to look at.</p>',
  },
  {
    category: 'general',
    showOnHome: false,
    question: 'Which parts of Bengaluru do you cover?',
    answer:
      '<p>Twenty localities across the north, south, east, west and centre of the city, listed on the localities page. We work one city properly rather than several superficially, which is what makes the locality advice worth reading.</p>',
  },
];

module.exports = function faqs({ stamps }) {
  return FAQS.map((entry, index) => ({
    id: index + 1,
    question: entry.question,
    answer: entry.answer,
    category: entry.category,
    order: index + 1,
    isActive: true,
    showOnHome: entry.showOnHome,
    propertyTypeId: null,
    ...stamps({ createdDaysAgo: 160 }),
  }));
};
