/**
 * `articles` — the twelve seeded pieces of §10.
 *
 * Each body is clean semantic HTML: headings that describe the section,
 * paragraphs, lists where the content is a list, a table where the content is
 * a table, and one lazily-loaded figure. No `<div>` soup, because the SEO
 * engine of prompts 36–37 parses this markup for its heading and readability
 * analysers, and because the editor in prompt 32 has to round-trip it.
 *
 * Two markers are placeholders the public renderer replaces at read time
 * (prompt 33): `data-sna-block="properties"` expands into listing cards and
 * `data-sna-block="cta"` into a lead-capture call to action. They are stored
 * as empty `<div>`s so the HTML stays valid wherever it is rendered.
 *
 * Every legal, tax or regulatory figure is written as "check the current
 * position" rather than as a number (D84): these pieces are seeded content
 * about somebody's largest purchase, and a stale percentage in them would be
 * worse than no percentage at all.
 */

const { fitDescription, makeSeo } = require('../lib/seo');
const { readingTime, stripHtml, wordCount } = require('../../../mock-server/lib/html');

/** The lead-capture block every article closes with. */
const CTA =
  '<div data-sna-block="cta" data-title="Need help choosing?" data-text="Talk to a Squares N Acres advisor." data-button-label="Talk to us" data-lead-source="article"></div>';

/** An embedded listing row: `props('1,3')`. */
const props = (ids) => `<div data-sna-block="properties" data-ids="${ids}"></div>`;

const ARTICLES = [
  {
    slug: 'karnataka-rera-guide-for-homebuyers',
    title: 'Karnataka RERA: A Complete Guide for Bengaluru Homebuyers',
    category: 'legal-rera',
    author: 'legal-desk',
    tags: ['rera', 'checklist', 'first-time-buyer'],
    status: 'published',
    publishedDaysAgo: 112,
    featured: true,
    viewCount: 2840,
    related: ['bbmp-a-khata-vs-b-khata-explained', 'under-construction-vs-ready-to-move'],
    relatedProperties: [1, 3],
    focusKeyword: 'karnataka rera',
    seoTitle: 'Karnataka RERA: A Guide for Homebuyers',
    excerpt:
      'What the Real Estate (Regulation and Development) Act means in Karnataka, how to read a project page on the regulator’s portal, and the five things a registration number will and will not tell you.',
    figure: {
      seed: 'sna-article-rera-figure',
      alt: 'A buyer reading a project registration page on a laptop',
      caption:
        'Every registered project has a public page. Reading it is the cheapest hour you will spend.',
    },
    faqs: [
      {
        question: 'Is a RERA number proof that a project is safe to buy?',
        answer:
          '<p>No. It proves the promoter has put the project’s land title, approvals, plans, unit inventory and completion date on a public record. That record is what you can hold them to; it is not an assessment of construction quality or of the builder’s finances.</p>',
      },
      {
        question: 'What if my project is not registered?',
        answer:
          '<p>Ask why. Projects below the thresholds the Act sets, and projects that were already complete when it came into force, can legitimately sit outside registration. A project that should be registered and is not is a different matter, and worth walking away from.</p>',
      },
      {
        question: 'Can the promoter change the plan after I book?',
        answer:
          '<p>Material changes to the sanctioned plan require the consent of a large majority of allottees under the Act. That is exactly why the sanctioned plan is on the public record: so that a change is visible rather than discovered at handover.</p>',
      },
    ],
    body: ({ figure }) => `
<p>If you are buying an under-construction home in Bengaluru, the single most useful hour you can spend is on the state regulator’s website, reading the page for the project you are considering. Everything else — the brochure, the show flat, the sales pitch — is written to persuade you. The registration page is written because the law requires it, and that difference is the whole point of the Real Estate (Regulation and Development) Act.</p>
<p>This guide explains what the Act does in Karnataka, what a registration number actually tells you, and how to read a project page without a lawyer sitting next to you.</p>
<h2>What the Act was written to fix</h2>
<p>Before the Act, a buyer committing a large share of their savings to a building that did not yet exist had almost no leverage. Possession dates slipped by years with no consequence. Money collected for one project funded another. The area you paid for was measured one way in the brochure and another way in the agreement. Plans changed after booking, and the first you heard of it was at handover.</p>
<p>The Act attacks each of those specifically: it requires registration and public disclosure, it ring-fences the money, it defines the area you are buying, and it gives you a forum to complain to that is faster and cheaper than a civil court.</p>
${figure}
<h2>What registration actually means</h2>
<p>A promoter registering a project has to declare, on a public record: the title to the land and any encumbrance on it, the sanctioned plan and the approvals behind it, the layout of the project, the number and size of the units, the amenities promised, the professionals engaged, and the date by which the project will be complete. Changes to those declarations leave a trail.</p>
<p>What registration does not do is vouch for the building. There is no inspector certifying that the concrete is good or the promoter is solvent. What you get is a record, and the ability to compare what was promised with what is delivered.</p>
<blockquote><p>A registration number is not a seal of approval. It is a paper trail that somebody else has to keep, and that you can read.</p></blockquote>
<h2>Five things to read on a project page</h2>
<ol>
<li><strong>The promoter and the project name.</strong> They should match the agreement you are being asked to sign, exactly. A project marketed under one name and registered under another is worth a question.</li>
<li><strong>The declared completion date.</strong> Not the date the sales team quotes — the date on the record. If they differ, ask which one goes into your agreement.</li>
<li><strong>The approved plan and the unit inventory.</strong> Check that the tower, floor and unit you are being offered exists in the declared inventory, and that the sanctioned plan shows the block where you have been walked around.</li>
<li><strong>The quarterly updates.</strong> Registered projects file progress updates. A project that has not filed in a year is telling you something about how it is being run.</li>
<li><strong>The litigation disclosure.</strong> Cases involving the land or the project are declared. Read them even if you do not understand them, then ask your lawyer the questions they raise.</li>
</ol>
<p>The Karnataka portal is at <a href="https://rera.karnataka.gov.in/" target="_blank" rel="noopener">rera.karnataka.gov.in</a>. Search by the project name or the registration number printed on the brochure; if the brochure does not print one, that is your first finding.</p>
<h2>Where the money is supposed to sit</h2>
<p>The Act requires a substantial share of the amounts collected from allottees for a project to be kept in a separate account and used only for that project’s land and construction costs, with withdrawals certified by the project’s engineer, architect and chartered accountant. The exact share and the certification mechanics are set out in the Act and the state rules — verify the current position with the authority rather than relying on a number in an article, including this one.</p>
<p>The practical consequence for a buyer is simple: payments should go to the account named in the agreement, not to a different company in the same group, and never in cash.</p>
<h2>Carpet area, and why it changed the conversation</h2>
<p>The Act defines carpet area and requires units to be sold on it. That does not stop a brochure quoting super built-up area — it is still the number most listings lead with, including ours — but it does mean the agreement has to state the carpet area, so the two can be compared.</p>
<table>
<thead><tr><th>Term</th><th>Roughly what it covers</th><th>Where you will see it</th></tr></thead>
<tbody>
<tr><td>Carpet area</td><td>The usable floor area within the walls of the flat</td><td>The agreement, by law</td></tr>
<tr><td>Built-up area</td><td>Carpet area plus the walls and the balcony structure</td><td>Occasionally in specifications</td></tr>
<tr><td>Super built-up area</td><td>Built-up area plus a share of lobbies, lifts and common areas</td><td>Brochures, listings and the headline price</td></tr>
</tbody>
</table>
<p>The ratio between carpet and super built-up area is the "loading", and it varies between projects. Ask for it as a number rather than as a percentage somebody quotes from memory.</p>
<h2>If the project is delayed</h2>
<p>Delay is the commonest complaint. The Act provides for interest on the amounts you have paid, for the period of the delay, and for the option to withdraw and be refunded with interest. Complaints go to the state authority, with an appellate tribunal above it.</p>
<p>What decides those cases is paper: the allotment letter, the agreement to sale, every payment receipt, and the correspondence about the delay. Keep all of it in one place from the day you book, not from the day you decide to complain.</p>
<h2>What the Act does not do</h2>
<ul>
<li>It does not check the builder’s finances, so a registered project can still stall.</li>
<li>It does not replace your own title diligence — see our guide to <a href="/insights/articles/bbmp-a-khata-vs-b-khata-explained">A khata and B khata</a> for one part of that.</li>
<li>It does not cover completed buildings, so a resale flat is outside it entirely.</li>
<li>It does not make a bad location good. A registered project in the wrong place is still in the wrong place — which is what our <a href="/localities/whitefield">locality guides</a> are for.</li>
</ul>
<h2>A short checklist before you pay anything</h2>
<ul>
<li>Find the project on the state portal and read the page end to end.</li>
<li>Match the promoter, the project name and the unit against the declared inventory.</li>
<li>Get the carpet area in writing, alongside the super built-up area you were quoted.</li>
<li>Confirm the account your payments go to is the one named in the agreement.</li>
<li>Read the completion date on the record, and ask for it in the agreement.</li>
<li>If the project is already complete, look at <a href="/buy/ready-to-move">ready-to-move listings</a> instead and shift your diligence to the title and the khata.</li>
</ul>
${props('1,3')}
<p>None of this requires a law degree. It requires an hour, a printer, and a willingness to ask a question you think might be naive. In our experience the naive questions are the ones that turn out to matter.</p>
${CTA}
`,
  },
  {
    slug: 'bbmp-a-khata-vs-b-khata-explained',
    title: 'BBMP A Khata vs B Khata: What Every Buyer Should Know',
    category: 'legal-rera',
    author: 'legal-desk',
    tags: ['khata', 'registration', 'checklist'],
    status: 'published',
    publishedDaysAgo: 104,
    featured: false,
    viewCount: 2110,
    related: ['karnataka-rera-guide-for-homebuyers', 'plot-buying-checklist-bda-bmrda-biaapa'],
    relatedProperties: [17, 22],
    focusKeyword: 'a khata vs b khata',
    seoTitle: 'A Khata vs B Khata in Bengaluru',
    excerpt:
      'A khata is not a title document, and B khata is not a lesser version of it. What each one records, what a B khata blocks, and the questions to ask before you buy one.',
    figure: {
      seed: 'sna-article-khata-figure',
      alt: 'Property tax paid receipts and a khata extract on a desk',
      caption: 'A khata extract and the tax paid receipts belong together — read both.',
    },
    faqs: [
      {
        question: 'Does a khata prove I own the property?',
        answer:
          '<p>No. A khata is a municipal record of who is liable to pay the property tax. Ownership comes from the title deeds and the registered sale deed. The two should agree, and if they do not, that discrepancy is the thing to resolve before you buy.</p>',
      },
      {
        question: 'Can a B khata property be sold?',
        answer:
          '<p>It can be transacted, and many are. The complications show up around building plan approvals, trade licences and lending: several lenders will not fund a B khata property, or will fund it on worse terms.</p>',
      },
      {
        question: 'Is a B khata ever convertible?',
        answer:
          '<p>Conversion routes have existed at various times and the rules have changed more than once. Treat any claim that "it will convert soon" as a claim to verify with the municipal body, not as a reason to pay more.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Ask three people in Bengaluru what a khata is and you will get three answers, at least one of which will be wrong in a way that costs money. This piece sets out what the document actually is, what the A and B distinction means in practice, and what to do when the property you like has the wrong one.</p>
<h2>What a khata is</h2>
<p>A khata is an account maintained by the municipal body recording who is liable to pay the property tax on a given property, along with the property’s size, location and use. It comes in two parts: the extract, which is the record itself, and the certificate, which is issued when the record is transferred into a new owner’s name.</p>
<p>What it is not is a title document. It does not prove ownership. Ownership comes from the chain of title deeds and the registered sale deed in your name. The khata tells the municipality who to send the bill to, and it is the document you need when you apply for a building plan approval, a trade licence, a water connection or, in most cases, a home loan.</p>
${figure}
<h2>The A and B distinction</h2>
<p>An A khata records a property that the municipal body treats as fully compliant: on approved land, in an approved layout, built to an approved plan, with the applicable charges paid. A B khata records a property that is on the tax rolls — the municipality will take your money — but does not meet one or more of those conditions.</p>
<p>The B register was created so that properties outside the compliance net could still be taxed. It was never designed as a second grade of ownership, which is why the phrase "B khata property" is a little misleading: what is irregular is the property’s compliance status, not its ownership.</p>
<table>
<thead><tr><th></th><th>A khata</th><th>B khata</th></tr></thead>
<tbody>
<tr><td>Property tax</td><td>Payable, recorded in the A register</td><td>Payable, recorded in the B register</td></tr>
<tr><td>Building plan approval</td><td>Available</td><td>Generally not available</td></tr>
<tr><td>Trade licence</td><td>Available</td><td>Generally not available</td></tr>
<tr><td>Home loan</td><td>Widely funded</td><td>Funded by fewer lenders, often on worse terms</td></tr>
<tr><td>Resale market</td><td>Deeper</td><td>Thinner, and priced accordingly</td></tr>
</tbody>
</table>
<h2>What a B khata actually blocks</h2>
<p>The day-to-day consequences are narrower than the folklore suggests, and the long-term ones are wider. You can live in a B khata house. You will struggle to get a sanctioned plan to add a floor, you may find fewer lenders willing to fund the purchase, and when you sell, your buyer will face the same list — which is why the discount exists in the first place.</p>
<p>The discount is real and it is not always irrational. What makes it a bad deal is paying an A khata price for a B khata property because somebody assured you the conversion is "in process".</p>
<h2>Conversion, and the word "soon"</h2>
<p>Routes to regularise properties have opened and closed over the years, and the conditions attached have changed with them. Some properties are convertible on payment of the applicable charges; some are not convertible at all because the underlying land use was never converted from agricultural, or the layout was never approved.</p>
<p>So when a seller says conversion is coming, ask which route, under which rule, and what has actually been filed. Then check it yourself with the municipal body — the current position is published at <a href="https://bbmp.gov.in/" target="_blank" rel="noopener">bbmp.gov.in</a>.</p>
<h2>E-khata and what digitisation changed</h2>
<p>The khata record has moved online, which has made two things easier and one thing harder. Easier: pulling an extract and checking that the details match the deed. Also easier: spotting a property whose record does not exist at all. Harder: relying on a paper extract somebody hands you, because the online record is now the one that counts.</p>
<p>Pull the record yourself, from the municipal portal, using the property identification number. Do not work from a photocopy.</p>
<h2>What to check before you buy</h2>
<ul>
<li>The khata extract, in the current owner’s name, matching the deed exactly — name, dimensions, and the property identification number.</li>
<li>Property tax paid receipts for the last several years, with no gaps.</li>
<li>Whether the record sits in the A or the B register, stated in writing rather than assumed.</li>
<li>For an apartment, whether the khata is for the individual flat or only for the whole building.</li>
<li>For land, whether the conversion from agricultural use was done, and the order that did it — our <a href="/insights/articles/plot-buying-checklist-bda-bmrda-biaapa">plot approvals guide</a> goes through this in detail.</li>
<li>What your lender says. A lender’s legal team looking at the same file for their own money is free diligence.</li>
</ul>
<h2>If you are buying an apartment</h2>
<p>In a registered project the khata question usually resolves itself, because the approvals that produce an A khata are the same ones the project needed to be sanctioned. The exception is a building where the khata has been issued for the property as a whole and never bifurcated into individual flats. Ask specifically for the khata of the flat you are buying; see our <a href="/insights/articles/karnataka-rera-guide-for-homebuyers">RERA guide</a> for the wider set of project documents to ask for, and browse <a href="/buy/ready-to-move">ready-to-move apartments</a> where the paperwork has already been through a handover.</p>
<p>None of this is exotic. It is a document, a register, and a set of consequences that follow from which register you are in. The mistake buyers make is not misunderstanding the rules — it is taking somebody’s word for which side of them a property sits on.</p>
${CTA}
`,
  },
  {
    slug: 'stamp-duty-and-registration-charges-in-karnataka',
    title: 'Stamp Duty and Registration Charges in Karnataka (2026 Guide)',
    category: 'legal-rera',
    author: 'legal-desk',
    tags: ['stamp-duty', 'registration', 'first-time-buyer'],
    status: 'published',
    publishedDaysAgo: 96,
    featured: false,
    viewCount: 1870,
    related: ['bbmp-a-khata-vs-b-khata-explained', 'first-time-homebuyer-checklist-bengaluru'],
    relatedProperties: [4, 8],
    focusKeyword: 'stamp duty in karnataka',
    seoTitle: 'Stamp Duty and Registration in Karnataka',
    excerpt:
      'What you actually pay at the sub-registrar’s office, how guidance value decides the base, and why the number in your budget should be larger than the one in the brochure.',
    figure: {
      seed: 'sna-article-stamp-duty-figure',
      alt: 'A registered sale deed with a stamp and a receipt',
      caption:
        'Registration turns an agreement into a public record. Budget for it from the start.',
    },
    faqs: [
      {
        question: 'Is stamp duty calculated on the price I pay or on the guidance value?',
        answer:
          '<p>On whichever is higher. If you buy below the published guidance value, duty is still assessed on the guidance value, which is why a "deal" below it does not save you the duty.</p>',
      },
      {
        question: 'Can stamp duty be added to my home loan?',
        answer:
          '<p>Lenders vary. Many fund the property value only and expect you to bring the duty, registration and charges from your own funds. Ask before you plan your down payment, not after.</p>',
      },
      {
        question: 'Do I have to be present at registration?',
        answer:
          '<p>You or somebody holding a properly executed power of attorney for the transaction. Both parties, and the witnesses, complete the formalities at the sub-registrar’s office for the jurisdiction the property falls in.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Every first-time buyer in Bengaluru has the same conversation about a month before registration. The budget was built around the price of the flat; nobody mentioned that a substantial amount on top of it has to be paid, in cleared funds, on the day. This guide is about that amount: what it consists of, how it is worked out, and how to plan for it.</p>
<h2>What you pay at registration</h2>
<p>Three things leave your account at the sub-registrar’s office, and they are frequently confused with each other.</p>
<table>
<thead><tr><th>Component</th><th>What it is</th><th>Who fixes it</th></tr></thead>
<tbody>
<tr><td>Stamp duty</td><td>A tax on the instrument that transfers the property</td><td>The state, by statute</td></tr>
<tr><td>Registration fee</td><td>The charge for recording the instrument in the public register</td><td>The state, by statute</td></tr>
<tr><td>Cess and surcharge</td><td>Additions levied on the duty, which vary by local body</td><td>The state and the local body</td></tr>
</tbody>
</table>
<p>The rates for each are set by the state and revised from time to time, sometimes with concessions for smaller ticket sizes or for particular categories of buyer. <strong>Check the current rates on the department’s own portal before you budget</strong> — an article that prints a percentage is out of date the first time the rate moves, including this one.</p>
${figure}
<h2>Guidance value: the number the duty is actually based on</h2>
<p>Karnataka publishes a guidance value — a minimum reference value per unit of area, by locality and by property type. Stamp duty is assessed on the higher of the guidance value and the consideration stated in the deed.</p>
<p>Two consequences follow. First, buying below guidance value does not reduce your duty. Second, when guidance values are revised upward, the cost of registering the same transaction goes up even if nothing about the property has changed.</p>
<p>Guidance values and the registration process both live on the state’s registration portal, <a href="https://kaverionline.karnataka.gov.in/" target="_blank" rel="noopener">kaverionline.karnataka.gov.in</a>, which is also where appointments and much of the paperwork are handled now.</p>
<h2>How the day itself works</h2>
<ol>
<li>The deed is drafted and checked by both sides’ lawyers, with the schedule of the property and the boundaries matching the earlier deeds exactly.</li>
<li>Duty and fees are computed and paid through the portal, and the challan is attached.</li>
<li>An appointment is booked at the sub-registrar’s office for the jurisdiction the property falls in.</li>
<li>Both parties and the witnesses attend, identities are verified, biometrics are captured and the deed is executed.</li>
<li>The registered deed is returned, and the khata transfer follows as a separate application.</li>
</ol>
<p>Registration is not the end of the process. Getting the khata into your name afterwards is a separate exercise, and the one people most often postpone until they need it — see our <a href="/insights/articles/bbmp-a-khata-vs-b-khata-explained">khata guide</a> for why that is a mistake.</p>
<h2>Who pays what</h2>
<p>By convention in Karnataka the buyer bears the stamp duty and registration charges. It is a convention, not a rule, and it is negotiable in a slow market — but assume you are paying unless the agreement says otherwise in writing.</p>
<p>For an under-construction purchase there is a second layer: the agreement to sale is itself stamped, and the tax treatment of an under-construction unit differs from a completed one. Ask your lawyer to set out the sequence of instruments and what each one attracts, before you sign the first of them.</p>
<h2>Budgeting for it</h2>
<ul>
<li>Treat duty, registration and charges as a separate line in your budget, not a rounding error on the price.</li>
<li>Confirm with your lender whether any of it can be funded. Many will not fund it.</li>
<li>If the guidance value for the locality is under revision, ask what the revised figure is expected to be and when it takes effect.</li>
<li>For a resale flat, add the cost of the khata transfer and the society transfer charges.</li>
<li>Keep the challan, the registered deed and the receipts together — you will need them for the khata, for the loan and, eventually, for your own sale.</li>
</ul>
<h2>Concessions, and who gets them</h2>
<p>States periodically offer reduced rates for smaller ticket sizes, for first-time buyers or for particular categories of property, and Karnataka has done so more than once. Concessions are announced with conditions — a value ceiling, a property type, sometimes a window of a few months — and they are withdrawn as readily as they are granted.</p>
<p>If somebody tells you a concession applies to your purchase, ask for the notification number and read it. A sales team’s recollection of a concession is not a basis for a budget, and the difference between qualifying and not qualifying is usually a large number.</p>
<h2>A worked sequence for an under-construction purchase</h2>
<p>Buyers are often surprised that registration is not a single event. For a typical under-construction purchase the sequence runs: booking, then an agreement to sale which is itself stamped, then the construction period with payments against milestones, and only at the end the sale deed which is registered and carries the main duty.</p>
<p>Each of those steps has its own paperwork and its own cost, and they are separated by months or years. Ask for the whole sequence in writing at the booking stage, with the amounts against each step, so that nothing arrives as a surprise eighteen months in.</p>
<h2>Two things people get wrong</h2>
<h3>Treating the agreement value as a variable</h3>
<p>Understating the consideration to save duty is both an offence and a problem for your own resale, because your cost of acquisition is what it says on the deed.</p>
<h3>Forgetting that the money is due on the day</h3>
<p>The duty is payable at registration, in cleared funds. A loan disbursal that arrives the week after registration does not help you at the counter. Plan the cash, not just the financing — our <a href="/insights/articles/home-loan-eligibility-and-foir-explained">home loan guide</a> covers the rest of that arithmetic, and <a href="/buy/ready-to-move">ready-to-move listings</a> are the ones where the sequence is shortest.</p>
${CTA}
`,
  },
  {
    slug: 'home-loan-eligibility-and-foir-explained',
    title: 'Home Loan Eligibility in India: FOIR, Credit Score and EMI Planning',
    category: 'investment-finance',
    author: 'research-desk',
    tags: ['home-loan', 'emi', 'first-time-buyer'],
    status: 'published',
    publishedDaysAgo: 88,
    featured: true,
    viewCount: 2460,
    related: [
      'stamp-duty-and-registration-charges-in-karnataka',
      'under-construction-vs-ready-to-move',
    ],
    relatedProperties: [2, 5],
    focusKeyword: 'home loan eligibility',
    seoTitle: 'Home Loan Eligibility: FOIR and EMI Planning',
    excerpt:
      'How a lender turns your salary slip into a sanction letter: the obligations ratio, the credit score, the loan-to-value cap and the tenure trade-off, with the arithmetic shown.',
    figure: {
      seed: 'sna-article-home-loan-figure',
      alt: 'A household budget and an EMI calculation on paper',
      caption: 'The lender’s arithmetic is not a secret. Doing it yourself first avoids surprises.',
    },
    faqs: [
      {
        question: 'What is FOIR?',
        answer:
          '<p>The fixed obligations to income ratio: the share of your net monthly income that already goes to committed payments, including the EMI you are applying for. Lenders cap it, and the cap is what usually decides the loan amount rather than the property value.</p>',
      },
      {
        question: 'Does a longer tenure get me a bigger loan?',
        answer:
          '<p>Yes, because it lowers the EMI and therefore the obligations ratio. It also increases the total interest you pay considerably. Borrow long to qualify if you must, then prepay early if your income allows.</p>',
      },
      {
        question: 'Will adding a co-applicant help?',
        answer:
          '<p>If the co-applicant has income, usually yes: most lenders combine incomes and obligations. Adding a co-applicant with no income and an existing loan can make the position worse, not better.</p>',
      },
    ],
    body: ({ figure }) => `
<p>A home loan sanction looks like a judgement about you. It is mostly arithmetic, and you can do the arithmetic yourself before you apply. This piece sets out the four numbers a lender works with, in the order they use them.</p>
<h2>1. The obligations ratio</h2>
<p>Lenders start from net monthly income and ask how much of it is already committed: existing loan EMIs, credit card minimums, any other fixed payment. Add the EMI you are applying for, divide by net income, and you have the fixed obligations to income ratio — FOIR.</p>
<p>Each lender caps that ratio, and the cap tends to be more generous at higher incomes, on the reasonable logic that what is left over matters more than the percentage. The ratio, not the property value, is what usually decides the loan amount.</p>
<table>
<thead><tr><th>Applicant</th><th>Net monthly income</th><th>Existing EMIs</th><th>Room for a new EMI at a 50% cap</th></tr></thead>
<tbody>
<tr><td>A</td><td>₹1,00,000</td><td>₹0</td><td>₹50,000</td></tr>
<tr><td>B</td><td>₹1,00,000</td><td>₹18,000 car loan</td><td>₹32,000</td></tr>
<tr><td>C</td><td>₹1,00,000 + ₹60,000 co-applicant</td><td>₹18,000</td><td>₹62,000</td></tr>
</tbody>
</table>
<p>The three rows are the same person with three different balance sheets. Closing the car loan in row B moves the sanction more than any negotiation over the interest rate will.</p>
${figure}
<h2>2. The credit score</h2>
<p>The score decides whether you are approved at all, and increasingly what rate you are offered. What moves it is dull and slow: paying on time, not running cards at their limit, not applying to six lenders in a fortnight, and not having an old dispute sitting unresolved on the file.</p>
<p>Pull your own report before a lender does. Errors are common, and correcting one takes weeks you will not have once you have paid a booking amount.</p>
<h2>3. The loan-to-value cap</h2>
<p>A lender funds a share of the property’s assessed value, not the price you agreed. The share is capped, and the cap is tighter at larger ticket sizes. Two things follow:</p>
<ul>
<li>Your down payment is the gap between the price and the funded share, and it grows with the price.</li>
<li>If the lender’s valuation comes in below your agreed price, the gap widens — and the valuation is theirs, not yours.</li>
</ul>
<p>Stamp duty and registration are usually outside the funded amount entirely, which is the subject of our <a href="/insights/articles/stamp-duty-and-registration-charges-in-karnataka">stamp duty guide</a>. Budget them as cash.</p>
<h2>4. Tenure, and the trade you are making</h2>
<p>A longer tenure lowers the EMI, which raises the amount you qualify for. It also raises the total interest substantially, and it pushes the last instalment further into a future where your income may not still be there.</p>
<p>The practical compromise most borrowers land on: take the longer tenure to get the sanction, then prepay as income allows. On a floating rate, part-prepayment usually carries no charge — confirm that in the sanction letter rather than assuming it.</p>
<h2>Fixed or floating</h2>
<p>Floating rates in India are linked to an external benchmark and reset at defined intervals; fixed rates buy certainty at a premium and often convert to floating after an initial period. Read which benchmark your loan is tied to, what spread the lender has added, and how often it resets. Those three details matter more than the headline rate on the poster.</p>
<h2>Before you apply</h2>
<ol>
<li>Pull your credit report and fix anything wrong on it.</li>
<li>Close or reduce small, high-EMI obligations — they cost you more in sanction than they do in interest.</li>
<li>Get a pre-approval, so you shortlist inside your actual budget rather than above it.</li>
<li>Ask whether the project is already on the lender’s approved list; it shortens everything.</li>
<li>Keep three months of statements, your returns and the salary slips in one folder. You will be asked for them twice.</li>
</ol>
<h2>What happens after the sanction</h2>
<p>A sanction letter is an offer, not a disbursal. Between the two sits the lender’s legal and technical appraisal of the specific property: the title documents, the approvals, the valuation and, for an apartment, whether the project is on the approved list. A sanction can shrink at this stage, and occasionally it disappears.</p>
<p>Read the sanction letter for three things in particular: the validity period, the conditions precedent to disbursal, and what the lender may do if the benchmark rate moves before you draw. All three are negotiable in principle and almost never negotiated in practice, because nobody reads them.</p>
<p>The legal appraisal reads the same documents your own lawyer should be reading, and it is worth asking the lender for their observations rather than only for their decision. Guidance values and the registration formalities the lender will insist on are published at <a href="https://kaverionline.karnataka.gov.in/" target="_blank" rel="noopener">kaverionline.karnataka.gov.in</a>.</p>
<h2>Prepayment: where it actually helps</h2>
<p>Interest on a home loan is front-loaded, which means an early prepayment removes far more interest than the same amount does later. A lump sum in year three does considerably more work than the same lump sum in year twelve.</p>
<p>Two mechanics are worth knowing. Reducing the tenure while keeping the EMI saves more interest than reducing the EMI while keeping the tenure, and most lenders will do either on request. And on a floating-rate loan to an individual, part-prepayment generally carries no charge — confirm it in your own sanction letter rather than taking it as given.</p>
${props('2,5')}
<p>For an under-construction purchase there is one more mechanic to understand: the lender disburses in stages against the builder’s demand letters, and you pay interest on what has been disbursed until the loan is fully drawn. What the builder may demand at each stage is fixed by the project’s registration, which our <a href="/insights/articles/karnataka-rera-guide-for-homebuyers">Karnataka RERA guide</a> sets out.</p>
${CTA}
`,
  },
  {
    slug: 'whitefield-locality-guide',
    title: 'Living in Whitefield: Locality Guide for Buyers and Renters',
    category: 'market-trends',
    author: 'research-desk',
    tags: ['whitefield', 'rental-yield', 'investment'],
    status: 'published',
    publishedDaysAgo: 76,
    featured: true,
    viewCount: 2960,
    related: ['sarjapur-road-investment-guide', 'rental-yields-by-locality-bengaluru'],
    relatedProperties: [1, 31],
    focusKeyword: 'whitefield locality guide',
    seoTitle: 'Whitefield Locality Guide, Bengaluru',
    excerpt:
      'What Whitefield is actually like to live in: how the metro changed the commute, where the supply is, what it costs to buy and rent, and what to check before you commit.',
    figure: {
      seed: 'sna-article-whitefield-figure',
      alt: 'A gated apartment development off a main road in east Bengaluru',
      caption: 'Most of the supply here is gated and mid-rise, set back from the main road.',
    },
    faqs: [
      {
        question: 'Is Whitefield still a good place to buy?',
        answer:
          '<p>It depends on what you want. It has the deepest ready-to-move supply in east Bengaluru and a rental market that clears quickly. What it does not have is scarcity, so price growth tends to follow the wider market rather than lead it.</p>',
      },
      {
        question: 'How long does the commute to the centre take?',
        answer:
          '<p>By metro it is predictable, which is the change of the last few years. By road it varies enormously with the hour. If your office is on the Outer Ring Road rather than in the centre, the equation is different again.</p>',
      },
      {
        question: 'Apartment or villa in Whitefield?',
        answer:
          '<p>Villas here are further out and priced accordingly. Apartments dominate the supply, which means more choice, easier resale and a shorter list of surprises. Villas trade less often, so both the buying and the selling take longer.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Whitefield is the locality most people moving to east Bengaluru look at first, and the one they most often misjudge — in both directions. It is neither the far-flung outpost of its reputation nor the seamless urban neighbourhood the brochures suggest. This guide is what we tell clients before their first visit.</p>
<h2>Where Whitefield actually is</h2>
<p>The name covers a good deal of ground: the stretch from Hope Farm through to Varthur Kodi, the roads behind Whitefield Main Road, and increasingly the developments spilling towards Hoskote. Two addresses both described as Whitefield can be six kilometres and twenty minutes apart, which matters more here than in a compact neighbourhood.</p>
<p>The character changes as you move through it. Closer to the tech park the density is high and the retail is constant. Further out you get gated projects on larger sites, wider roads and less of everything else.</p>
${figure}
<h2>Getting around</h2>
<p>The Purple Line changed the conversation. A commute towards the centre that used to be an unpredictable hour is now a predictable metro ride, and the premium on being within a short auto ride of a station is visible in both prices and rents.</p>
<p>What has not changed is the local road network. Whitefield Main Road carries more than it was built for, and the internal roads behind it are narrow. If you are buying, visit at 9 am on a weekday rather than at 11 am on a Sunday.</p>
<h2>What it costs</h2>
<p>Apartments in the area broadly trade in a band that puts a comfortable three-bedroom home within reach of a dual-income household, with older stock and projects further out at the lower end and new launches near the metro at the upper end. Rents clear quickly, which is why so much of the stock here is investor-owned.</p>
<p>The <a href="/localities/whitefield">Whitefield locality page</a> carries the current indicative band and the connectivity summary; treat any figure more than a few months old, including in this article, as orientation rather than as a quote.</p>
<h2>Where the supply is</h2>
<ul>
<li><strong>Ready-to-move apartments.</strong> The deepest pool in east Bengaluru, which is unusual — most corridors are dominated by under-construction inventory.</li>
<li><strong>New launches.</strong> Concentrated near the metro alignment and towards Hoskote.</li>
<li><strong>Villas and row houses.</strong> Further out, on larger sites, and a much thinner market in both directions.</li>
<li><strong>Rentals.</strong> Constant supply and constant demand, with the shortest vacancy periods in the two- and three-bedroom range.</li>
</ul>
${props('1,31')}
<h2>Schools, hospitals and the rest of it</h2>
<p>This is Whitefield’s real advantage over the newer corridors: the social infrastructure arrived with the offices rather than a decade later. International schools, multi-speciality hospitals and two large shopping centres sit inside the catchment, and the restaurant and retail strip has grown up around Varthur Road.</p>
<p>The corollary is that you are paying for that infrastructure in the price. A comparable flat on a newer corridor costs less precisely because the school run is longer.</p>
<p>One practical check before you commit: confirm which municipal limits the property falls in and which register its khata sits in, at <a href="https://bbmp.gov.in/" target="_blank" rel="noopener">bbmp.gov.in</a>. Parts of the wider Whitefield area have been absorbed into city limits at different times, and the record has not always caught up.</p>
<h2>Three sub-markets inside one name</h2>
<p>It helps to stop thinking of Whitefield as one place. There are three, and they behave differently.</p>
<h3>The metro corridor</h3>
<p>Anything within a short ride of a station. Prices and rents carry a visible premium, vacancy is shortest, and resale is easiest. This is where a buyer who values liquidity should look.</p>
<h3>The interior roads</h3>
<p>Behind the main road, quieter and noticeably cheaper, with the trade-off that the last two kilometres of every journey are slow. Good value if you are buying to live and your commute is local.</p>
<h3>The outer edge, towards Hoskote</h3>
<p>Larger sites, newer projects, the lowest prices and the longest wait for the surrounding infrastructure to arrive. This is a five-year bet rather than a home you move into and forget about.</p>
<h2>The rental market</h2>
<p>Whitefield has one of the deepest rental markets in the city, and for an investor that is the headline. Two- and three-bedroom flats near the employment cluster let quickly; the tenant pool is largely corporate and renews predictably; and furnished units command a premium that is worth the fit-out cost on a three-year view.</p>
<p>What the depth also means is that rents rise slowly. A locality where new supply arrives every quarter does not have the scarcity that pushes rent up sharply, which is the trade an investor makes here. Our <a href="/insights/articles/rental-yields-by-locality-bengaluru">yield comparison</a> puts the numbers next to the rest of the city.</p>
<h2>What to check before you commit</h2>
<ol>
<li>The actual distance to your workplace and to the nearest metro station, measured at the hour you will travel.</li>
<li>Water. Ask which source the project uses, what the storage is, and what the tanker bill looked like last summer.</li>
<li>The association, if the building is occupied. A functioning association is worth more than an extra amenity.</li>
<li>For a new project, the approvals and the registration — our <a href="/insights/articles/karnataka-rera-guide-for-homebuyers">RERA guide</a> lists what to read.</li>
<li>The exit. Ask how many units in the building changed hands in the last two years and at what price.</li>
</ol>
<h2>Who it suits</h2>
<p>Whitefield suits people who work on the eastern corridor and want a wide choice at a fair price, families who value schools and hospitals being close, and investors who want a flat that rents quickly. It suits less well anybody whose office is in the south or west of the city, and anybody who needs scarcity for price growth: there is a lot of supply here, and there will be more.</p>
${CTA}
`,
  },
  {
    slug: 'sarjapur-road-investment-guide',
    title: 'Sarjapur Road: Why Investors Keep Coming Back',
    category: 'investment-finance',
    author: 'research-desk',
    tags: ['sarjapur-road', 'investment', 'rental-yield'],
    status: 'published',
    publishedDaysAgo: 68,
    featured: false,
    viewCount: 1640,
    related: ['whitefield-locality-guide', 'rental-yields-by-locality-bengaluru'],
    relatedProperties: [2, 24],
    focusKeyword: 'sarjapur road investment',
    seoTitle: 'Sarjapur Road: An Investor’s Guide',
    excerpt:
      'The corridor has absorbed more new supply than almost any other in Bengaluru and still clears it. What drives the demand, where the risk sits, and what actually works as an investment here.',
    figure: {
      seed: 'sna-article-sarjapur-figure',
      alt: 'A wide arterial road with new residential development on both sides',
      caption: 'Supply on this corridor arrives faster than the infrastructure that serves it.',
    },
    faqs: [
      {
        question: 'Is Sarjapur Road overbuilt?',
        answer:
          '<p>Supply is heavy, which caps price growth in the short run, but absorption has kept pace because the employment base next to it keeps growing. The risk is not vacancy; it is buying at the top of a launch-price band and finding resale competes with new inventory.</p>',
      },
      {
        question: 'Apartments or plots on this corridor?',
        answer:
          '<p>Different instruments. Apartments produce rent from day one and are easier to exit. Plots produce nothing until you build or sell, and depend entirely on the approval status being clean. Decide which you are buying before you compare prices.</p>',
      },
      {
        question: 'How far out is too far?',
        answer:
          '<p>Watch the commute rather than the kilometre count. Past Dommasandra the price falls faster than the travel time rises, which is attractive — until the morning you actually have to do the drive.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Sarjapur Road has taken more new residential supply over the last decade than almost any other corridor in Bengaluru, and it has absorbed it. That combination — heavy supply, steady absorption — is what makes it interesting to investors and difficult to price.</p>
<h2>What the corridor is</h2>
<p>The road runs south-east from Agara junction on the Outer Ring Road towards Sarjapur town. The first few kilometres, around Ibblur and Kaikondrahalli, are effectively an extension of the Ring Road office belt. Past Dommasandra it changes character: larger sites, villa projects, plotted layouts and considerably lower prices.</p>
${figure}
<h2>What drives the demand</h2>
<ul>
<li><strong>Employment next door.</strong> The campuses on the Ring Road are a short commute, and that is what tenants are buying.</li>
<li><strong>Schools on the road itself.</strong> Several well-known schools sit on the corridor, which is why families take a longer commute to live here.</li>
<li><strong>Price relative to the Ring Road.</strong> The same specification costs meaningfully less two kilometres further out, and the gap is visible on every shortlist.</li>
<li><strong>Supply that keeps the market liquid.</strong> There is always something to buy and always somebody to rent to, which is worth more to an investor than scarcity.</li>
</ul>
<blockquote><p>A corridor with constant supply is a corridor with constant liquidity. That is an advantage when you buy and a constraint when you sell.</p></blockquote>
<h2>What works as an investment</h2>
<p>Three patterns recur among the clients who have done well here.</p>
<ol>
<li><strong>Two- and three-bedroom apartments near the Ibblur end.</strong> Shortest vacancy, widest tenant pool, easiest resale. The yield is unspectacular and the exit is reliable.</li>
<li><strong>Approved plots past Dommasandra, held long.</strong> No rent, no maintenance, and a return that depends entirely on the corridor continuing to build out. The approval status is the whole investment — see our <a href="/insights/articles/plot-buying-checklist-bda-bmrda-biaapa">plot approvals guide</a>.</li>
<li><strong>Under-construction units bought early in a credible project.</strong> The discount to completion price is real, and so is the risk. Read the project’s own declarations before its brochure — our <a href="/insights/articles/karnataka-rera-guide-for-homebuyers">Karnataka RERA guide</a> sets out what they have to contain.</li>
</ol>
<h2>Where the risk sits</h2>
<p>Not in vacancy. The risks on this corridor are three:</p>
<h3>Launch pricing</h3>
<p>When a corridor has this much supply, a launch priced at the top of the band competes with the next launch, and the one after that. Buying at a launch price and selling three years later into a market with fresh inventory is how people lose money here.</p>
<h3>Infrastructure timing</h3>
<p>Road widening and a metro line along the corridor have been discussed for years. Some of it will happen. Pricing a purchase as though a specific line opens on a specific date is speculation, not investment — verify what has actually been sanctioned and what has actually started.</p>
<h3>Project risk</h3>
<p>The corridor’s supply comes from a wide range of developers, not all of them with a delivery record. Read a project’s own declarations on <a href="https://rera.karnataka.gov.in/" target="_blank" rel="noopener">rera.karnataka.gov.in</a> before you read its brochure.</p>
<p><strong>The water and drainage question.</strong> Ask what a project’s water source is and what happens to its sewage. On a corridor that built out faster than its utilities, these are not abstract questions.</p>
<h2>The rental picture</h2>
<p>Rental demand on this corridor is generated by the same campuses that drive the sales market, which makes it both reliable and correlated: when hiring slows on the Ring Road, the effect shows up here within a quarter, in vacancy first and rent second.</p>
<p>Two- and three-bedroom flats near Ibblur let fastest. Villas past Dommasandra let slowly and to a narrower tenant pool, usually families on a company lease, and they sit empty for longer between tenancies. If rental income is the point of the purchase, the apartment is the instrument.</p>
<h2>A five-year view</h2>
<p>The honest position on a corridor like this one is that the direction is clearer than the timing. More employment is being built within a few kilometres, more housing is being built to serve it, and the infrastructure is being planned to connect them. What nobody can tell you is the order in which those three arrive.</p>
<p>That argues for two disciplines. Buy something that produces income while you wait, or buy land cheaply enough that waiting costs you nothing but opportunity. What does not work is buying an expensive under-construction unit on the assumption that a specific piece of infrastructure opens on a specific date.</p>
<h2>How to read a price on this road</h2>
<p>Compare three numbers before you decide anything: the last three registered transactions in the same project, the current asking price of resale units in it, and the launch price of the nearest new project. On this corridor those three numbers often disagree, and the disagreement is the information.</p>
<p>The <a href="/localities/sarjapur-road">Sarjapur Road locality page</a> carries the current indicative band, and our <a href="/insights/articles/rental-yields-by-locality-bengaluru">rental yield comparison</a> puts the corridor next to the rest of the city.</p>
<h2>Who it suits</h2>
<p>It suits an investor who wants liquidity and a tenant pool rather than scarcity, and a buyer whose work is on the eastern belt and who would rather have space than a central address. It suits less well anybody who needs the commute to be short today rather than tolerable on average.</p>
${CTA}
`,
  },
  {
    slug: 'north-bengaluru-airport-corridor',
    title: 'North Bengaluru and the Airport Corridor: Growth Story',
    category: 'market-trends',
    author: 'research-desk',
    tags: ['north-bangalore', 'investment', 'plots'],
    status: 'published',
    publishedDaysAgo: 58,
    featured: false,
    viewCount: 1320,
    related: ['sarjapur-road-investment-guide', 'plot-buying-checklist-bda-bmrda-biaapa'],
    relatedProperties: [3, 23],
    focusKeyword: 'north bengaluru property',
    seoTitle: 'North Bengaluru and the Airport Corridor',
    excerpt:
      'The airport reorganised the north of the city around a single road. What each segment of the corridor offers, why plots dominate the far end, and what to verify before buying into a growth story.',
    figure: {
      seed: 'sna-article-north-figure',
      alt: 'A wide highway heading north out of the city at dusk',
      caption: 'One road organises the whole corridor, which is both its strength and its risk.',
    },
    faqs: [
      {
        question: 'Is Devanahalli too far to live in?',
        answer:
          '<p>For most people working in the city, yes, today. It is bought for the land and for what the corridor is expected to become, not for a short commute. If you need to be in the office five days a week in the south or east of the city, look elsewhere.</p>',
      },
      {
        question: 'Plots or apartments in north Bengaluru?',
        answer:
          '<p>Plots dominate the far end because that is what the land use and the price band support. Apartments make more sense closer in, around Hebbal, Thanisandra and Hennur, where there is an employment base and social infrastructure already.</p>',
      },
      {
        question: 'What should I verify before buying a site here?',
        answer:
          '<p>The approving authority and the approval itself, the release order, the khata, and the conversion from agricultural use. The growth story is irrelevant if the paperwork is not clean.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Bengaluru’s north was reorganised by a single decision: moving the airport. Everything since — the highway, the business parks, the plotted layouts, the hotels — has arranged itself along the road that connects the city to it. That makes the corridor easy to understand and easy to misread.</p>
<h2>What actually changed</h2>
<p>Before the airport, north Bengaluru ended somewhere around Yelahanka. Afterwards, a forty-kilometre strip became legible as a single market, and land that had been agricultural became a proposition. Employment followed in pieces: a business park here, an aerospace and hardware cluster there, hotels and logistics along the highway.</p>
<p>The result is a corridor where the story is genuine and the timing is uncertain. Both halves of that sentence matter to a buyer.</p>
${figure}
<h2>The corridor has four segments</h2>
<h3>Hebbal</h3>
<p>The hinge. Outer Ring Road meets the airport road here, a large technology park sits alongside, and the residential stock ranges from older layouts to high-rise projects with lake frontage. It is the most expensive segment and the one that behaves most like the rest of the city — an established neighbourhood that happens to be close to the airport.</p>
<h3>Thanisandra and Hennur</h3>
<p>Township country. Large gated projects of several hundred units each, built for the technology belt immediately west, with clubhouses, schools and retail inside the gates. Prices sit well below Hebbal and the airport run is still under half an hour outside peak hours. This is where most apartment buyers in the north end up.</p>
<h3>Yelahanka</h3>
<p>An old town with planned new-town sectors around it: wide roads, lakes, a mix of plotted development and low-rise projects. It has more established social infrastructure than anything further north and a shorter airport run than anything further south.</p>
<h3>Devanahalli</h3>
<p>The airport town, and a land market rather than a housing market. Approved plotted layouts dominate, with villa projects alongside and the business and aerospace parks providing the employment story. The social infrastructure is thin, and the price reflects that.</p>
<h2>Why plots dominate the far end</h2>
<p>Three reasons, and they reinforce each other. Land is available in parcels large enough to lay out properly. The price band supports a site rather than a built home for most buyers. And an apartment needs an occupier today, while a site can sit until the corridor catches up.</p>
<p>That last point is the honest case for buying here: a site costs nothing to hold beyond the opportunity cost, and it does not depreciate the way an empty flat does. It is also the honest risk, because a site produces nothing while you wait.</p>
<h2>What to verify before you buy</h2>
<ol>
<li><strong>Which authority approved the layout.</strong> Different bodies sanction different areas along this corridor, and the answer changes what the approval is worth. Our <a href="/insights/articles/plot-buying-checklist-bda-bmrda-biaapa">approvals guide</a> sets out who does what.</li>
<li><strong>The release order.</strong> An approved layout still has sites released in phases. Buying an unreleased site is a different transaction from the one you think you are doing.</li>
<li><strong>The conversion.</strong> Agricultural land converted for residential use carries an order that says so. Ask for it by number.</li>
<li><strong>The khata.</strong> Check which register the property sits in and whether the record exists at all — the municipal position is published at <a href="https://bbmp.gov.in/" target="_blank" rel="noopener">bbmp.gov.in</a> for areas inside its limits, and with the relevant panchayat or authority outside them.</li>
<li><strong>Water.</strong> On this corridor, the water source is a question about the next twenty years, not about the next summer.</li>
</ol>
${props('3,23')}
<h2>What the corridor still lacks</h2>
<p>It is worth being plain about this, because the marketing is not. Social infrastructure thins out quickly north of Yelahanka: schools, hospitals and everyday retail are concentrated at the city end of the corridor, and a family living at the far end will drive for most of them.</p>
<p>Public transport is the other gap. The corridor is served by a highway and, for now, not much else, so a household here is a two-car household by default. Both of those will change over time, and how quickly they change is precisely the uncertainty you take on when you buy at the far end rather than the near one.</p>
<h2>How to price a growth story</h2>
<p>Every corridor with a story attracts pricing that assumes the story has already happened. The discipline is to separate what exists from what is announced.</p>
<p>What exists on this corridor today: an international airport, a highway, a business park, an aerospace cluster, several hotels and a great deal of approved land. What is announced: further road and rail connections, more employment, and the usual set of projects that have been discussed for years. Buy on the first list. Treat the second as upside rather than as the basis of your valuation.</p>
<h2>Who it suits</h2>
<p>It suits a buyer with a long horizon who wants land and is comfortable holding it, a family who flies often enough for the airport to matter, and an apartment buyer who works in the northern technology belt. It suits less well anybody who needs the property to produce rent from next month, or whose office is on the southern or eastern corridors — the city is wide, and a cross-town commute here is a genuine cost.</p>
<p>Our <a href="/localities/devanahalli">Devanahalli</a> and <a href="/localities/hebbal">Hebbal</a> locality pages carry the current indicative bands for both ends of the corridor.</p>
${CTA}
`,
  },
  {
    slug: 'nri-property-buying-checklist-bengaluru',
    title: 'NRI Property Buying in Bengaluru: Checklist and Common Mistakes',
    category: 'buying-guides',
    author: 'legal-desk',
    tags: ['nri', 'checklist', 'registration'],
    status: 'published',
    publishedDaysAgo: 48,
    featured: false,
    viewCount: 980,
    related: [
      'karnataka-rera-guide-for-homebuyers',
      'stamp-duty-and-registration-charges-in-karnataka',
    ],
    relatedProperties: [1, 13],
    focusKeyword: 'nri property buying bengaluru',
    seoTitle: 'NRI Property Buying in Bengaluru',
    excerpt:
      'What a non-resident may buy, how the money has to move, why the power of attorney is the document that derails most remote purchases, and the mistakes we see most often.',
    figure: {
      seed: 'sna-article-nri-figure',
      alt: 'A passport, bank statements and property documents on a table',
      caption: 'Most remote purchases fail on documentation timing, not on the property.',
    },
    faqs: [
      {
        question: 'Can an NRI buy agricultural land in Karnataka?',
        answer:
          '<p>Agricultural land, plantation property and farmhouses are treated differently from residential and commercial property under the exchange-control rules. Take advice on your specific status before you commit to anything of that kind.</p>',
      },
      {
        question: 'Do I need to travel to India to register?',
        answer:
          '<p>Not necessarily. A power of attorney drafted for the specific transaction, executed and attested correctly in the country you are in, lets somebody complete the registration for you. Getting the attestation right is the part that takes time.</p>',
      },
      {
        question: 'How should the payment be made?',
        answer:
          '<p>Through normal banking channels, from the appropriate account, with the trail documented. Confirm the current position with your bank before you remit — the rules are specific and they change.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Buying a home in Bengaluru from another country is mostly an exercise in sequencing. The property decisions are the same ones a resident buyer makes; what is different is that every document takes longer, every signature has to happen in the right place, and a delay of two weeks in one step can cost you the transaction.</p>
<p>This is the checklist we give clients buying remotely, in the order the steps actually occur.</p>
<h2>1. Establish what you may buy</h2>
<p>Non-resident Indians and persons of Indian origin may generally acquire residential and commercial property in India. Agricultural land, plantation property and farmhouses sit under a different regime. Your own status — and your spouse’s, if the purchase is joint — decides which rules apply, and the answer is worth confirming in writing before you shortlist rather than after.</p>
${figure}
<h2>2. Sort the money route first</h2>
<p>Payment has to move through banking channels from an appropriate account, and the trail matters as much as the amount. Speak to your bank in India before you transfer anything, and ask specifically: which account the funds should come from, what documentation the bank will need at the point of remittance, and what it will need again if you ever repatriate the proceeds of a sale.</p>
<blockquote><p>The question that catches people out is not how to bring money in. It is what documentation they will need, years later, to take the proceeds out.</p></blockquote>
<h2>3. Get the power of attorney right</h2>
<p>This is where remote purchases most often stall. A general power of attorney downloaded from the internet is not adequate. What you need is a document drafted for this transaction, naming the specific property and the specific acts — executing the agreement, paying the duty, appearing before the sub-registrar, taking possession — and attested in the manner the jurisdiction you are in requires.</p>
<p>Start this at the shortlisting stage, not after you have agreed a price. Attestation, couriering and any adjudication on arrival routinely take longer than the seller’s patience.</p>
<h2>4. Do the same diligence a resident would, and then some</h2>
<ul>
<li>Thirty years of title, with an encumbrance certificate covering the same period.</li>
<li>The khata, in the seller’s name, in the register you expect — see our <a href="/insights/articles/bbmp-a-khata-vs-b-khata-explained">khata guide</a>.</li>
<li>For an under-construction project, the registration record on the state portal: <a href="https://rera.karnataka.gov.in/" target="_blank" rel="noopener">rera.karnataka.gov.in</a>.</li>
<li>Approved plan, commencement certificate and, for a completed building, the occupancy certificate.</li>
<li>Tax paid receipts, association no-dues, and for a resale flat the share of undivided land recorded in the deed.</li>
</ul>
<p>Appoint your own lawyer rather than relying on the builder’s. The fee is small relative to the transaction and the incentives are yours.</p>
<h2>5. Plan for the tax and the withholding</h2>
<p>Buying from a non-resident seller, and selling as one, both bring withholding obligations into the transaction, and the rates and procedures are specific. So is the treatment of rental income if you let the property afterwards. Take advice from somebody who does this regularly, in both countries, and do it before the deal rather than at the end of the financial year.</p>
<h2>Five mistakes we see most often</h2>
<ol>
<li><strong>Buying on video alone.</strong> Video is fine for the first six shortlisted properties. Somebody you trust should stand in the actual flat before money moves.</li>
<li><strong>Leaving the power of attorney until last.</strong> It is the longest-lead item in the whole process and it is treated as paperwork.</li>
<li><strong>Paying a booking amount to hold a unit.</strong> A booking amount paid before the title check is a booking amount you may be arguing about later.</li>
<li><strong>Underestimating the closing costs.</strong> Stamp duty, registration and charges are payable in cleared funds on the day — see our <a href="/insights/articles/stamp-duty-and-registration-charges-in-karnataka">stamp duty guide</a>.</li>
<li><strong>Ignoring what happens after handover.</strong> Somebody has to hold the keys, pay the maintenance, deal with the association and let the flat if you intend to. Decide who, before you buy.</li>
</ol>
<h2>Letting the property afterwards</h2>
<p>Most non-resident buyers let the property, and the arrangements decide whether the purchase is a pleasure or a running irritation. Decide in advance who holds the keys, who screens tenants, who deals with the association, and who is authorised to spend money on a repair without calling you at three in the morning.</p>
<p>Put the arrangement in writing even when it is family. The agreement that prevents a dispute is the one written while everybody is still cheerful. Rental income earned in India has its own tax treatment for a non-resident, including withholding by the tenant in some cases — confirm the current position before the first rent is paid, not at the end of the year.</p>
<h2>What makes it go smoothly</h2>
<p>Three things, in our experience: a lawyer engaged early, a power of attorney started at the shortlist stage, and a single point of contact in the city who can walk into the building at short notice. With those in place, a remote purchase is slower than a local one but not materially riskier. Without them, every step waits on the previous one, and sellers lose patience.</p>
<p>If you are starting out, our <a href="/buy/ready-to-move">ready-to-move listings</a> are the simplest place to begin: a completed building removes the construction risk that is hardest to monitor from abroad.</p>
${CTA}
`,
  },
  {
    slug: 'rental-yields-by-locality-bengaluru',
    title: 'Rental Yields Across Bengaluru: Where Renters Pay More',
    category: 'investment-finance',
    author: 'research-desk',
    tags: ['rental-yield', 'investment', 'emi'],
    status: 'published',
    publishedDaysAgo: 36,
    featured: false,
    viewCount: 2240,
    related: ['whitefield-locality-guide', 'sarjapur-road-investment-guide'],
    relatedProperties: [27, 29],
    focusKeyword: 'rental yield bangalore',
    seoTitle: 'Rental Yields Across Bengaluru',
    excerpt:
      'Gross yield is easy to calculate and easy to misuse. How to work it out properly, what actually moves it between localities, and the costs that turn a good yield into an average one.',
    figure: {
      seed: 'sna-article-yield-figure',
      alt: 'A calculator, a rent agreement and a set of keys',
      caption: 'Yield is a ratio, not a return. The costs below the line decide the difference.',
    },
    faqs: [
      {
        question: 'What is a good rental yield in Bengaluru?',
        answer:
          '<p>Residential gross yields in the city have historically been modest by comparison with the cost of borrowing, which is why most residential purchases here are not financed by their own rent. Compare a specific property against the current band rather than against a number you remember.</p>',
      },
      {
        question: 'Do furnished flats yield more?',
        answer:
          '<p>They command a higher rent, and they also carry fit-out cost, depreciation and replacement. Over a three-year tenancy the maths usually works; over a single year with a vacancy in the middle, often it does not.</p>',
      },
      {
        question: 'Does a higher yield mean a better investment?',
        answer:
          '<p>Not on its own. A high yield frequently signals weak capital growth expectations or a thin resale market. Look at yield and liquidity together.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Yield is the number every investor asks for first and the number most often quoted wrongly. This piece sets out how to calculate it properly, what moves it across Bengaluru, and why the locality with the highest gross yield is frequently not the one you should buy in.</p>
<h2>Calculating it properly</h2>
<p>Gross yield is annual rent divided by the all-in purchase cost, as a percentage. Two details decide whether the number means anything.</p>
<ul>
<li><strong>All-in cost, not the headline price.</strong> Include stamp duty, registration, brokerage and any fit-out. That is typically several percent on top of the price, and leaving it out flatters the yield.</li>
<li><strong>Annual rent actually collected.</strong> Not twelve times the asking rent. Eleven months collected is a realistic assumption in a market with normal tenant turnover.</li>
</ul>
<p>Net yield subtracts what you actually spend to keep the property let: maintenance, property tax, repairs, the letting fee, and the months it sits empty. The gap between gross and net is usually wider than people expect.</p>
${figure}
<h2>What moves yield between localities</h2>
<table>
<thead><tr><th>Locality type</th><th>Typical pattern</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Employment-adjacent (Bellandur, Marathahalli, Electronic City)</td><td>Higher gross yield</td><td>Rent is set by proximity to work; capital values are held down by constant new supply</td></tr>
<tr><td>Established central (Indiranagar, Jayanagar, Malleshwaram)</td><td>Lower gross yield</td><td>Capital values include scarcity and land value that rent does not pay for</td></tr>
<tr><td>Emerging corridors (Devanahalli, outer Sarjapur)</td><td>Lowest gross yield</td><td>Thin tenant pool today; the case is capital growth, not income</td></tr>
<tr><td>Mid-market with metro (Whitefield, HSR, JP Nagar)</td><td>Middle of the range, shortest vacancy</td><td>Deep tenant pool and steady supply on both sides of the market</td></tr>
</tbody>
</table>
<p>The pattern is consistent and it is not a Bengaluru peculiarity: yield compensates you for what capital growth does not. A locality where both are high is usually a locality where something is wrong with the title, the approvals or the building.</p>
<h2>The costs that eat the difference</h2>
<ol>
<li><strong>Vacancy.</strong> One empty month is over eight percent of the year’s rent. Vacancy, not rent, is what separates two otherwise identical flats.</li>
<li><strong>Maintenance.</strong> Association charges on an amenity-heavy tower are a real cost, and they rise. A pool and a clubhouse raise the rent by less than they raise the bill.</li>
<li><strong>Turnover.</strong> Painting, deep cleaning and the letting fee arrive together every time a tenant leaves.</li>
<li><strong>Property tax and repairs.</strong> Small annually, not small over a decade.</li>
<li><strong>Your own time,</strong> unless you are paying somebody for it — in which case that is a cost too.</li>
</ol>
<h2>What actually rents quickly</h2>
<p>Across our own inventory the pattern is stable. Two- and three-bedroom flats within a short commute of an employment cluster let fastest. Flats with a covered parking bay let faster than those without, by more than the bay is worth. Semi-furnished lets faster than unfurnished and nearly as fast as fully furnished, at a much lower fit-out cost. And the top floor under an uninsulated roof lets slowest of all, in every locality, every year.</p>
<h2>A worked example</h2>
<p>Take a three-bedroom flat bought for a crore, with closing costs and a modest fit-out taking the all-in cost to roughly a crore and seven lakh. It lets at fifty thousand a month.</p>
<p>Twelve months of rent is six lakh, which against the all-in cost is a gross yield a little under six percent. Now subtract reality: one vacant month in the year, association maintenance, property tax, a letting fee every second year, and the painting that goes with a change of tenant. The net figure lands appreciably lower — and that is the number to compare against what the same money would earn elsewhere.</p>
<p>The exercise is not an argument against buying. It is an argument against quoting the gross figure to yourself as though it were what you receive.</p>
<h2>Yield and the loan</h2>
<p>If the purchase is financed, there is a second comparison that matters more than the first: the yield against the interest rate on the loan. In Bengaluru’s residential market the rent generally does not cover the EMI, which means the shortfall comes out of your income every month for years.</p>
<p>That is a perfectly reasonable thing to do — it is how most people accumulate property — but it should be a decision rather than a discovery. Work out the monthly shortfall before you buy, and satisfy yourself that you can carry it through a vacancy and a rate rise at the same time.</p>
<h2>Using yield in a decision</h2>
<p>Yield is a comparison tool, not a target. Three ways to use it well:</p>
<ul>
<li>Compare two properties you would actually buy, with the same assumptions, rather than comparing one property against a remembered benchmark.</li>
<li>Ask what the yield is telling you about liquidity. A high-yield flat in a thin market is a good income and a slow exit.</li>
<li>Check the yield against your cost of borrowing. If the rent does not cover the EMI — and in Bengaluru it usually does not — you are buying capital growth and part-funding it from income, which is a different decision and should be made deliberately.</li>
</ul>
<p>The municipal property tax position, which is part of the cost side, is published at <a href="https://bbmp.gov.in/" target="_blank" rel="noopener">bbmp.gov.in</a>. For the locality-level context behind the table above, see our <a href="/localities/bellandur">Bellandur</a> guide and the <a href="/insights/articles/whitefield-locality-guide">Whitefield locality guide</a>.</p>
${CTA}
`,
  },
  {
    slug: 'plot-buying-checklist-bda-bmrda-biaapa',
    title: 'Buying a Plot in Bengaluru: BDA, BMRDA and BIAAPA Approvals Explained',
    category: 'buying-guides',
    author: 'legal-desk',
    tags: ['plots', 'checklist', 'khata'],
    status: 'published',
    publishedDaysAgo: 24,
    featured: false,
    viewCount: 1450,
    related: ['bbmp-a-khata-vs-b-khata-explained', 'north-bengaluru-airport-corridor'],
    relatedProperties: [23, 25],
    focusKeyword: 'buying a plot in bangalore',
    seoTitle: 'Plot Approvals in Bengaluru: BDA, BMRDA, BIAAPA',
    excerpt:
      'A site is only as good as the approval behind it. Who sanctions what around Bengaluru, what a release order is, why conversion matters, and the red flags that should end a conversation.',
    figure: {
      seed: 'sna-article-plots-figure',
      alt: 'Surveyed plots in a new layout with blacktopped roads',
      caption:
        'Roads and drains laid before sale are a sign of a layout that was approved properly.',
    },
    faqs: [
      {
        question: 'What is a release order?',
        answer:
          '<p>An approved layout hands over a share of the sites to the developer for sale, in phases, by a release order. A site that has not been released is not a site you can safely register, whatever the brochure says.</p>',
      },
      {
        question: 'What does conversion mean?',
        answer:
          '<p>Agricultural land has to be converted for non-agricultural use before it can be laid out for housing. The conversion carries an order, with a number. Ask for it, and check that the extent it covers includes your site.</p>',
      },
      {
        question: 'Is a plot safer than an apartment?',
        answer:
          '<p>Different risks. A plot removes construction risk and adds approval risk: there is no builder to chase, but a defective approval is very hard to cure. Diligence on a plot is mostly documentary.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Buying a site is simpler than buying a flat in every way except one. There is no construction to monitor, no possession date to worry about and no association to inherit. What there is instead is a chain of approvals, and if one link in it is missing, there is usually no way to repair it afterwards.</p>
<p>This guide explains who approves what around Bengaluru, and what to ask for at each step.</p>
<h2>Who sanctions what</h2>
<p>Which authority sanctioned a layout depends on where it is, and the answer changes what you should check.</p>
<ul>
<li><strong>BDA.</strong> The development authority for the city’s own planning area, which both develops its own layouts and approves private ones inside its jurisdiction.</li>
<li><strong>BMRDA.</strong> The metropolitan region authority, covering a much wider area around the city through its local planning authorities. A great deal of the plotted supply on the outer corridors is sanctioned this way.</li>
<li><strong>BIAAPA.</strong> The planning authority for the area around the international airport, which is why it appears on almost every layout in the Devanahalli belt.</li>
<li><strong>BBMP.</strong> The municipal body, which maintains the khata and collects property tax within its limits; outside them, a panchayat or another local body does.</li>
</ul>
<p>A layout approval from the right authority for that location is the foundation. An approval from the wrong one, or a "sanction pending" claim, is not a foundation at all.</p>
${figure}
<h2>The documents to ask for, in order</h2>
<ol>
<li><strong>The layout approval,</strong> with the sanctioned plan showing your site number in the released portion.</li>
<li><strong>The conversion order,</strong> showing the land was converted from agricultural use, and covering the extent your site sits on.</li>
<li><strong>The release order,</strong> confirming your specific site is among those released for sale.</li>
<li><strong>The mother deed and the title chain,</strong> going back thirty years, with an encumbrance certificate for the same period.</li>
<li><strong>The khata</strong> for the site, and the tax paid receipts — our <a href="/insights/articles/bbmp-a-khata-vs-b-khata-explained">khata guide</a> explains which register you want to be in and why.</li>
<li><strong>A current survey sketch,</strong> and ideally your own surveyor walking the site with it.</li>
</ol>
<p>The municipal records for areas inside city limits are published at <a href="https://bbmp.gov.in/" target="_blank" rel="noopener">bbmp.gov.in</a>; outside them, ask which local body maintains the record and check there.</p>
${props('23,24')}
<h2>Walk the site</h2>
<p>Documents tell you what should be there. A visit tells you what is.</p>
<ul>
<li>Are the corner stones in place and does the site match the sketch?</li>
<li>Are the roads formed and blacktopped, or marked on a plan and nothing else?</li>
<li>Are the storm-water drains cut, and does the ground fall away from your site or towards it?</li>
<li>Is there a transformer, are the street lights in, and is there a water line?</li>
<li>What is on the adjoining sites — built houses, or scrub?</li>
</ul>
<p>A layout where the infrastructure went in before the sales started is a layout whose developer had the money to do it properly. That single observation tells you a great deal.</p>
<h2>What a plot costs beyond the price</h2>
<p>Sites look simpler than flats on the cost side, and they are, but there are still line items people forget. Stamp duty and registration apply as they do to any property. Fencing and a gate are the first thing you will spend on. Property tax runs from the year you register, built or not. And if you intend to build, the plan sanction, the deposits for water and power, and the compound wall all arrive before the first course of brickwork.</p>
<p>The other cost is time. A site that sits idle for a decade has cost you whatever that money would otherwise have earned, and unlike a flat it has produced no rent in the meantime. That is the trade a plot buyer is making, and it is worth making deliberately.</p>
<h2>Red flags that should end the conversation</h2>
<p><strong>"Approval is in process."</strong> Buy approved land, or buy nothing.</p>
<p><strong>A price well below the surrounding band.</strong> There is always a reason, and it is usually in the title, the conversion or the release.</p>
<p><strong>Pressure to pay an advance to "hold" a site</strong> before you have seen the approval documents.</p>
<p><strong>A seller who will only show photocopies.</strong> Originals are inspected at your lawyer’s office, not described over the phone.</p>
<p><strong>Encroachment, a drain, or a high-tension line across the site.</strong> All three are visible on a visit and invisible in a brochure.</p>
<h2>After you buy</h2>
<p>Get the khata transferred into your name, pay the property tax annually even though nothing is built, and fence the site. An unfenced, untaxed site with a khata in somebody else’s name is the easiest property in the city to have a dispute about.</p>
<p>If you intend to build, check the layout bye-laws for setbacks and height before you commission a design, and read our <a href="/insights/articles/north-bengaluru-airport-corridor">north corridor guide</a> if the site is in the Devanahalli belt.</p>
<p>One last habit worth forming: visit the site once a year even while it sits idle, and photograph the boundary stones. Encroachment on an unvisited plot starts small, with a neighbour’s wall a foot over the line, and it is far easier to raise in the first month than in the fifth year. A site is a low-maintenance asset, not a no-maintenance one.</p>
${CTA}
`,
  },
  {
    slug: 'under-construction-vs-ready-to-move',
    title: 'Under-construction vs Ready-to-move: Which Should You Choose?',
    category: 'buying-guides',
    author: 'editorial-team',
    tags: ['first-time-buyer', 'home-loan', 'checklist'],
    status: 'draft',
    publishedDaysAgo: 18,
    featured: false,
    viewCount: 380,
    related: ['home-loan-eligibility-and-foir-explained', 'karnataka-rera-guide-for-homebuyers'],
    relatedProperties: [2, 4],
    focusKeyword: 'under construction vs ready to move',
    seoTitle: 'Under-construction vs Ready-to-move',
    excerpt:
      'The two are priced differently because they carry different risks. A plain comparison of cost, timing, tax treatment, loan mechanics and what each one demands of a buyer.',
    figure: {
      seed: 'sna-article-uc-rtm-figure',
      alt: 'A partly built apartment tower next to a completed one',
      caption: 'The discount on the left is the price of the risk you are taking.',
    },
    faqs: [
      {
        question: 'Is under-construction always cheaper?',
        answer:
          '<p>At launch, usually. The gap narrows as the building goes up, and by the time it is complete it has generally closed. What you are buying with the discount is time and risk, not a bargain.</p>',
      },
      {
        question: 'What happens to my EMI while the flat is being built?',
        answer:
          '<p>The lender disburses in stages against the builder’s demands, and you pay interest on what has been disbursed until the loan is fully drawn. If you are also paying rent, budget for both at once.</p>',
      },
      {
        question: 'Which is better for a first home?',
        answer:
          '<p>For most first-time buyers who are currently renting, ready-to-move, because it removes the double outflow and the delivery risk. Under-construction rewards buyers with time, tolerance and a lawyer.</p>',
      },
    ],
    body: ({ figure }) => `
<p>This is the first real decision most buyers make, and it is usually made on price alone. The price difference is the easy part; what it is compensating you for is the part worth understanding.</p>
<h2>The comparison, plainly</h2>
<table>
<thead><tr><th></th><th>Under-construction</th><th>Ready-to-move</th></tr></thead>
<tbody>
<tr><td>Price</td><td>Lower at launch, rising towards completion</td><td>Full price, no further upside from the build</td></tr>
<tr><td>Risk</td><td>Delivery, delay, specification changes</td><td>What you see is what you buy</td></tr>
<tr><td>Payment</td><td>Staged against construction milestones</td><td>Largely at registration</td></tr>
<tr><td>While you wait</td><td>Rent and loan interest together</td><td>Neither</td></tr>
<tr><td>Choice</td><td>Floor, facing and unit still open</td><td>Whatever is left unsold or on resale</td></tr>
<tr><td>Verification</td><td>Documents, approvals, the developer’s record</td><td>The building itself, and the association</td></tr>
</tbody>
</table>
${figure}
<h2>The case for under-construction</h2>
<p>You pay less, you choose the floor and the facing, and the payment is spread over the build rather than demanded at once. On a project that is delivered on time and to specification, the buyer who came in early is straightforwardly better off.</p>
<p>The conditions attached to that sentence are doing a lot of work. "Delivered on time" and "to specification" are the two things you cannot verify in advance, which is why the diligence on an under-construction purchase is documentary: the registration record, the approvals, the developer’s delivery history, the escrow arrangement. Our <a href="/insights/articles/karnataka-rera-guide-for-homebuyers">RERA guide</a> lists what to read and where.</p>
<h2>The case for ready-to-move</h2>
<p>You see the actual flat, the actual light at the actual time of day, the actual water pressure and the actual neighbours. You stop paying rent the month you move in. There is no delivery risk, because delivery has happened.</p>
<p>What you give up is the discount and the choice. Ready inventory is what did not sell, or what somebody is reselling, which means the floor and facing are given rather than chosen. You are also inheriting a building with a history — so the diligence shifts from documents to the fabric: the association accounts, the sinking fund, the last three years of repairs, and what the residents say when you ask them in the lift.</p>
<h2>The money, side by side</h2>
<p>Three differences matter and they compound.</p>
<ol>
<li><strong>Double outflow.</strong> During construction you pay rent and loan interest at the same time. On a three-year build that is a real number, and it eats a good part of the discount.</li>
<li><strong>Staged disbursal.</strong> Interest accrues only on what has been drawn, which helps early and matters less as the draws add up. See our <a href="/insights/articles/home-loan-eligibility-and-foir-explained">home loan guide</a>.</li>
<li><strong>Tax treatment.</strong> An under-construction purchase and a completed one are treated differently for indirect tax, and the deduction position on interest paid during construction has its own rules. Both change from time to time — confirm the current position with your accountant rather than with a brochure.</li>
</ol>
<h2>Verifying an under-construction project</h2>
<p>The diligence here is almost entirely documentary, and it is the same list every time: the registration record and its quarterly updates, the sanctioned plan, the title to the land, the approvals, and the developer’s record on their last three completed projects. That last item is the most predictive and the most often skipped — go and look at a building they finished four years ago, and talk to somebody who lives in it.</p>
<p>Ask also for the specification in writing. A brochure that promises imported marble and an agreement that says vitrified tiles or equivalent are not the same promise, and it is the agreement that governs.</p>
<h2>Verifying a ready-to-move property</h2>
<p>Here the building answers most of the questions, if you look properly. Walk the basement and the terrace. Read the association’s accounts for the last three years and ask what the sinking fund holds. Find out what the last major repair cost and how it was funded. Check the occupancy certificate exists, and check the water arrangement in summer rather than in December.</p>
<p>Then check the one thing a resale buyer inherits that a new buyer does not: the undivided share of land recorded in the deed, and whether the khata for the individual flat has been issued.</p>
<h2>What we tell clients</h2>
<p>If you are renting and your budget is tight, ready-to-move almost always wins, because the double outflow is the thing that breaks household budgets. If you have somewhere to live, a horizon of three years and the stomach for the diligence, under-construction in a credible project is a reasonable trade.</p>
<p>One more consideration that rarely makes the comparison tables: what the two options do to your flexibility. A ready flat can be let from the month you take possession, which turns a purchase into an income-producing asset immediately if your plans change. An under-construction unit cannot be let, cannot easily be sold before completion in a slow market, and ties up money for years in something that does not yet exist.</p>
<p>And if you are on the fence, look at both in the same week. A show flat and a lived-in flat feel completely different, and the difference will tell you more about your own preference than any table will. Start with our <a href="/buy/ready-to-move">ready-to-move listings</a> and compare them against a launch on the same corridor — the state portal at <a href="https://rera.karnataka.gov.in/" target="_blank" rel="noopener">rera.karnataka.gov.in</a> will tell you what the launch has actually declared.</p>
${CTA}
`,
  },
  {
    slug: 'first-time-homebuyer-checklist-bengaluru',
    title: 'First-time Homebuyer Checklist for Bengaluru',
    category: 'buying-guides',
    author: 'editorial-team',
    tags: ['first-time-buyer', 'checklist', 'home-loan'],
    status: 'scheduled',
    publishedDaysAhead: 45,
    featured: false,
    viewCount: 70,
    related: [
      'home-loan-eligibility-and-foir-explained',
      'stamp-duty-and-registration-charges-in-karnataka',
    ],
    relatedProperties: [4, 21],
    focusKeyword: 'first time home buyer checklist',
    seoTitle: 'First-time Homebuyer Checklist, Bengaluru',
    excerpt:
      'Everything a first-time buyer in Bengaluru should do, in the order it should be done: budget, pre-approval, shortlist, visits, diligence, negotiation, registration and the month after.',
    figure: {
      seed: 'sna-article-first-time-figure',
      alt: 'A couple comparing property listings at a kitchen table',
      caption: 'The order of the steps matters more than the speed of any one of them.',
    },
    faqs: [
      {
        question: 'How much should I keep aside beyond the price?',
        answer:
          '<p>Enough for stamp duty, registration, brokerage, the portion the lender will not fund, and the first round of fit-out. Treat it as a separate budget line, because none of it can be deferred.</p>',
      },
      {
        question: 'Should I get a loan pre-approval before shortlisting?',
        answer:
          '<p>Yes. A pre-approval tells you your actual budget rather than your hoped-for one, and it makes your offer stronger with a seller who has been let down before.</p>',
      },
      {
        question: 'How many properties should I see?',
        answer:
          '<p>Enough to calibrate, which for most buyers is six to ten inside a defined budget and locality. Seeing thirty across four corridors usually means the brief is not defined yet.</p>',
      },
    ],
    body: ({ figure }) => `
<p>Buying your first home in Bengaluru is a sequence, and most of the expensive mistakes come from doing the steps out of order — falling in love with a flat before knowing the budget, paying a booking amount before a title check, arranging the loan after agreeing a price. This is the order we recommend.</p>
<h2>1. Work out the real budget</h2>
<p>Not the price you can imagine paying: the total you can actually fund. That means the down payment, the loan you qualify for, the stamp duty and registration, the brokerage, and a fit-out reserve. Our <a href="/insights/articles/stamp-duty-and-registration-charges-in-karnataka">stamp duty guide</a> covers the closing costs, which are the line people most often leave out.</p>
<blockquote><p>A budget that does not include the closing costs is not a budget. It is a hope with a number attached.</p></blockquote>
${figure}
<h2>2. Get a pre-approval</h2>
<p>Before you look. It converts a guess into a number, it surfaces any credit-report problem while you still have time to fix it, and it makes you a more credible buyer. Our <a href="/insights/articles/home-loan-eligibility-and-foir-explained">home loan guide</a> explains what the lender is actually computing.</p>
<h2>3. Define the brief before the shortlist</h2>
<p>Four things, written down: the localities you will consider, the configuration, the maximum all-in price, and the timeline. A brief that says "anywhere in east Bengaluru, two or three bedrooms, around a crore, sometime this year" will produce forty viewings and no decision.</p>
<h2>4. Shortlist, then visit properly</h2>
<ul>
<li>Visit at the hour you would actually commute, not at a convenient hour on a Sunday.</li>
<li>See the actual unit, not the show flat, and stand in it for ten minutes without talking.</li>
<li>Check water pressure, mobile signal, the lift, and what the parking bay is really sized for.</li>
<li>Ask a resident — not the sales team — what the maintenance bill is and what the last big repair was.</li>
<li>Look at the building’s worst corner: the basement, the terrace, the rear service passage.</li>
</ul>
<h2>5. Do the diligence before the money</h2>
<ol>
<li>Title chain and encumbrance certificate, checked by your own lawyer.</li>
<li>Khata and tax paid receipts — which register, in whose name.</li>
<li>Approved plan, commencement and, for a completed building, the occupancy certificate.</li>
<li>For an under-construction project, the record on the state portal at <a href="https://rera.karnataka.gov.in/" target="_blank" rel="noopener">rera.karnataka.gov.in</a>.</li>
<li>For a resale flat, the association no-dues and the undivided land share in the deed.</li>
</ol>
<p>None of this is optional and none of it is expensive relative to the transaction. The lawyer’s fee is the cheapest insurance in the process.</p>
<h2>6. Negotiate on the whole package</h2>
<p>Price is one variable. Others that move more easily: the floor, the parking bay, the payment schedule, who pays the brokerage, what the seller leaves behind, and the date of handover. A seller who will not move on price will often move on three of those.</p>
<h2>7. Register, and then finish the job</h2>
<p>Registration is not the end. Afterwards: transfer the khata into your name, get the electricity and water connections changed over, register with the association, and keep the registered deed, the challan and the receipts together in one place. Our <a href="/insights/articles/bbmp-a-khata-vs-b-khata-explained">khata guide</a> explains why the transfer should not wait.</p>
<h2>8. The month after</h2>
<p>Budget for it. The first month of a new home always costs more than expected — fittings, curtains, a plumber, a deposit for something. A small reserve makes the difference between settling in and starting the first year anxious about money.</p>
<h2>Two mistakes that cost the most</h2>
<p><strong>Stretching the budget because of one feature.</strong> A larger balcony, a nicer lobby or a marginally better view will not feel worth the extra in the third year of the loan. Decide the ceiling before you fall for something, and hold it.</p>
<p><strong>Paying anything before the documents are read.</strong> A booking amount is the moment your negotiating position weakens, and it is almost always paid before the title check because the sales team creates urgency. There is always another flat. There is rarely another chance to unwind a payment cleanly.</p>
<h2>What nobody tells first-time buyers</h2>
<p>Three things worth knowing in advance. The process will take longer than anybody promises, and the delay is usually in documentation rather than in decisions. You will be asked for the same set of papers by three different parties, so scan everything once and keep it in one folder. And the flat that feels right on the second visit usually still feels right on the fifth — the visit that changes your mind is the one where you go alone, at a different hour, and simply stand there.</p>
<h2>The shortest version</h2>
<p>Know the total budget. Get pre-approved. Write the brief. See ten properties, not forty. Let a lawyer read the papers before you pay anything. Negotiate on more than price. Finish the paperwork after registration rather than a year later. If you would like help with any of it, an advisor can take the first three steps with you — and you can start browsing <a href="/buy/ready-to-move">ready-to-move homes</a> whenever you are ready.</p>
${CTA}
`,
  },
];

module.exports = function articles({ stamps, media, lookup, dates }) {
  return ARTICLES.map((entry, index) => {
    const figure = `<figure><img src="${media.photo({
      seed: entry.figure.seed,
      width: 1200,
      height: 700,
      alt: entry.figure.alt,
      folder: 'articles',
      tags: ['article', entry.category],
    })}" alt="${entry.figure.alt}" loading="lazy" width="1200" height="700"><figcaption>${entry.figure.caption}</figcaption></figure>`;

    const content = entry.body({ figure }).trim();
    const contentText = stripHtml(content);
    const words = wordCount(contentText);

    const publishedAt =
      entry.status === 'scheduled'
        ? dates.daysAhead(entry.publishedDaysAhead, 6, 30)
        : entry.status === 'draft'
          ? null
          : dates.daysAgo(entry.publishedDaysAgo, 6, 30);

    return {
      id: index + 1,
      slug: entry.slug,
      title: entry.title,
      excerpt: entry.excerpt,
      content,
      contentText,
      featuredImage: {
        url: media.photo({
          seed: `sna-article-${entry.slug}`,
          width: 1200,
          height: 630,
          alt: entry.title,
          folder: 'articles',
          tags: ['article', entry.category],
        }),
        alt: entry.title,
        caption: null,
      },
      categoryId: lookup.articleCategories[entry.category].id,
      tagIds: entry.tags.map((slug) => lookup.articleTags[slug].id),
      authorId: lookup.authors[entry.author].id,
      status: entry.status,
      publishedAt,
      updatedAtDisplay: null,
      readingTimeMinutes: readingTime(words),
      wordCount: words,
      isFeatured: Boolean(entry.featured),
      allowComments: false,
      relatedArticleIds: entry.related.map((slug) => lookup.articleSlugs[slug]),
      relatedPropertyIds: entry.relatedProperties,
      faqs: entry.faqs,
      tableOfContents: true,
      seo: makeSeo({
        title: entry.seoTitle,
        description: fitDescription(entry.excerpt),
        focusKeyword: entry.focusKeyword,
        secondaryKeywords: entry.tags
          .slice(0, 2)
          .map((tag) => `${tag.replace(/-/g, ' ')} bengaluru`),
        slug: entry.slug,
      }),
      viewCount: entry.viewCount,
      ...stamps({
        createdDaysAgo:
          entry.status === 'scheduled'
            ? 12
            : entry.status === 'draft'
              ? 20
              : entry.publishedDaysAgo,
      }),
    };
  });
};

module.exports.ARTICLES = ARTICLES;
module.exports.CTA = CTA;
module.exports.props = props;
