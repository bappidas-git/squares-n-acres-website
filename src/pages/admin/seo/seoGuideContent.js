/**
 * The Squares N Acres SEO playbook (§4.8 of prompt 37).
 *
 * The boilerplate shipped sixteen accordions of generic advice written for
 * somebody else's site: another city's examples, another company's domain and
 * scoring rules that did not match the engine the admin actually runs (BUG-11,
 * ADD-20). This file replaces them.
 *
 * Three rules hold every topic below together:
 *
 *   1. **It is about this site.** Every example is a Bengaluru locality, a
 *      property type or an article this installation actually has; nothing
 *      names a placeholder domain or a company we are not.
 *   2. **It agrees with the engine.** Where a topic states a threshold — 50–60
 *      characters, 0.5–2.5 % density, five images on a listing — that is the
 *      rule `src/seo` scores against, documented in `docs/SEO_ENGINE.md`. The
 *      page renders the weight table from `WEIGHTS` itself, so the numbers an
 *      editor reads are the numbers the panel uses.
 *   3. **It is advice an editor can act on this afternoon.** Not "improve your
 *      authority": write the locality into the title, add the third FAQ, give
 *      the cover image an alt that says what the photograph shows.
 *
 * Content, not components: the page decides how a topic is drawn.
 */

/** The six parts of the playbook, in the order the page renders them. */
export const GUIDE_SECTIONS = [
  { id: 'scoring', title: 'How the score works' },
  { id: 'writing', title: 'Writing for search' },
  { id: 'content', title: 'Content and structure' },
  { id: 'technical', title: 'Technical SEO' },
  { id: 'beyond', title: 'Local, trust and AI search' },
  { id: 'shipping', title: 'Measuring and shipping' },
];

/**
 * @type {Array<{
 *   id: string, section: string, icon: string, title: string, summary: string,
 *   points: string[],
 *   example?: { good?: string, bad?: string, note?: string },
 *   render?: 'weights',
 * }>}
 */
export const SEO_GUIDE_TOPICS = [
  /* ---------------- How the score works ---------------- */
  {
    id: 'score-bands',
    section: 'scoring',
    icon: 'mdi:speedometer',
    title: 'What the score out of 100 actually measures',
    summary:
      'Every record is asked the tests that apply to its kind, and the score is what it earned out of the marks those tests carry.',
    points: [
      'Good is 81 and above (green), Needs work is 51–80 (amber), Poor is 50 and below (red). “Not analysed” is grey and means nobody has opened the panel on that record yet — it is not a bad score, it is no score.',
      'A test that does not apply is removed from the total rather than failed: a property is never marked down for having no article category.',
      'A pass earns the full mark, a warning earns half, a failure earns nothing. That is why clearing three warnings often moves a record further than fixing one failure.',
      'A record with nothing written in it — no title, no slug, no description, no body, no keyword — scores 0 on purpose. A warning about the FAQs a blank page has not got would otherwise earn it marks for nothing.',
      'The score is stored on the record when the panel runs, so the dashboard lists the whole site without re-analysing it. “Re-analyse all” is what refreshes it after a bulk content change.',
    ],
    example: {
      note: 'Aim for Good on every property and article. For a property type or an author page, Needs work is often the honest ceiling — those pages have no body to score.',
    },
  },
  {
    id: 'score-groups',
    section: 'scoring',
    icon: 'mdi:format-list-checks',
    title: 'The four groups of tests',
    summary:
      'Basic, Additional, Title readability and Content readability — in that order of importance, and in that order of effort.',
    points: [
      '**Basic** is the keyword and the snippet: is a focus keyword set, is it in the title, the description, the URL and the opening of the body, is the title and description the right length, is the description used anywhere else on the site.',
      '**Additional** is everything that makes the page real: the URL’s shape, a share image, a canonical address, whether the page is indexable at all, the keyword in a subheading and an image alt, and per type — enough photographs on a listing, a category and tags on an article, connectivity notes on a locality.',
      '**Title readability** is five quick wins: the keyword at the front, a number in the title, a persuasive word, sentence case rather than capitals, and a title nothing else on the site uses.',
      '**Content readability** is asked of articles, pages and localities only. A listing is a specification rather than an essay, so the whole group is skipped for a property.',
      'The panel lists failures first. Work down the list — the order is already the order of impact.',
    ],
  },
  {
    id: 'score-weights',
    section: 'scoring',
    icon: 'mdi:scale-balance',
    title: 'What each test is worth',
    summary:
      'The weights below are read from the engine itself, so this table cannot drift from what the panel scores.',
    points: [
      'Each test carries an importance from 1 to 5 that means the same thing whatever record it measures; the importances are then shared out to exactly 100 for each kind of record.',
      'A record type with fewer applicable tests concentrates the same 100 marks into them — which is why a focus keyword is worth 10 on an author page and 6 on a property.',
      'A dash means the test is never asked of that kind of record.',
    ],
    render: 'weights',
  },

  /* ---------------- Writing for search ---------------- */
  {
    id: 'focus-keyword',
    section: 'writing',
    icon: 'mdi:key-outline',
    title: 'Choosing a focus keyword for Bengaluru property',
    summary:
      'One phrase per record, in the words a buyer types — almost always a configuration, a property type and a locality.',
    points: [
      'The pattern that works for listings is **[configuration] [type] in [locality]**: “3 BHK apartment in Whitefield”, “2 BHK flat in Sarjapur Road”, “residential plot in Devanahalli”.',
      'A locality page takes the locality itself plus the intent: “property in Hebbal”, “flats for rent in Indiranagar”, “apartments in HSR Layout”.',
      'An article takes the question it answers, not its headline: the Khata guide targets “A Khata vs B Khata”, not “What every buyer should know”.',
      'Word order matters to the engine and to a reader: “flats in Whitefield” and “Whitefield flats” are two different searches. Pick the one people actually type.',
      'Plurals, hyphens and spaces are forgiven — “ready-to-move” matches “ready to move”, “flats” matches “flat” — so choose the natural form and write it once.',
      'Never reuse a focus keyword on two records. The dashboard flags it as a duplicate, and two of our own pages competing for one search is a page we lose to ourselves.',
      'Secondary keywords are for the variations a page genuinely covers — “Whitefield apartments”, “flats near ITPL” — not for stuffing five more localities into one listing.',
    ],
    example: {
      good: '3 BHK apartment in Whitefield',
      bad: 'best luxury property bangalore whitefield apartments flats for sale',
    },
  },
  {
    id: 'titles',
    section: 'writing',
    icon: 'mdi:format-title',
    title: 'Titles that fit and get clicked',
    summary:
      '50–60 characters, the keyword at the front, and something concrete a result can show — a price, a configuration, a year.',
    points: [
      'The panel measures both the character count and the pixel width, because Google cuts on width: 50–60 characters and under about 580 pixels is a full title.',
      'Open with the keyword. “3 BHK Apartment in Whitefield — …” beats “Discover our premium collection of …”, which spends the first thirty characters saying nothing.',
      'A number earns a mark and earns clicks: a price, a configuration, a floor count, the year.',
      'Sentence case, not capitals. BHK, RERA, ORR and BBMP are initialisms and are not counted as shouting.',
      'Leave the title blank and the record takes the template for its kind, filled in from its own fields — which is usually better than a hand-written title nobody keeps up to date. Write one only when the template cannot say what this record needs.',
      'Templates take the variables listed beside the field: %bhk%, %propertytype%, %locality%, %city%, %price%, %sep% and the rest. An unresolved variable is removed and the punctuation it leaves behind is cleaned up, so a plot with no BHK does not publish a title with a hole in it.',
      'Every title on the site must be different. Two listings in the same project need the configuration or the tower in the title to tell them apart.',
    ],
    example: {
      good: '3 BHK Apartment for Sale in Whitefield, Bengaluru – ₹1.42 Cr',
      bad: 'Property For Sale | Squares N Acres | Best Flats In Bangalore',
    },
  },
  {
    id: 'descriptions',
    section: 'writing',
    icon: 'mdi:text-box-outline',
    title: 'Meta descriptions that earn the click',
    summary: '120–160 characters of what the page actually offers, ending in a reason to open it.',
    points: [
      'The description is not a ranking factor and is absolutely a click factor. It is the two lines a buyer reads before choosing between us and four portals.',
      '120–160 characters, under about 920 pixels. Shorter wastes the space; longer is cut mid-sentence.',
      'Name the thing in the first eighty characters: the project, the configuration, the locality and the price or possession. A reader deciding in one second should not have to reach the end.',
      'Finish with the next step — “Book a site visit”, “See the floor plans”, “Check the EMI”.',
      'Write a different one for every record. The site-wide default is used when a record has none, and the same sentence on four hundred pages is the problem this field exists to prevent — the panel warns when two records share one.',
      'Do not repeat the title. The two are read together.',
    ],
    example: {
      good: '3 BHK apartment at Lakeview Heights, Whitefield — 1,650 sq ft, ready to move, ₹1.42 Cr. See floor plans, amenities and the EMI estimate.',
      bad: 'We are a leading real estate consultancy offering the best properties at the best prices. Contact us today for more information about our services.',
    },
  },
  {
    id: 'slugs',
    section: 'writing',
    icon: 'mdi:link-variant',
    title: 'URLs and slugs',
    summary:
      'Short, lower case, hyphenated, carrying the keyword — and changed as rarely as possible.',
    points: [
      'Keep it under 75 characters, lower case, `a–z`, `0–9` and hyphens. Nothing else is allowed.',
      'Carry the keyword: `/properties/lakeview-heights-3-bhk-whitefield` says what the page is before it loads.',
      'Drop the filler. “the”, “a”, “in”, “for” add length and nothing else — the panel hints at them rather than failing them, because sometimes the phrase needs one.',
      'Never a bare number or a date. `/insights/articles/karnataka-rera-guide-for-homebuyers` still makes sense in three years; `/insights/articles/2026-05-post-14` never did.',
      'The record’s slug and its SEO slug are the same thing — editing either changes both, because the page has one address.',
      'Changing a live slug throws away every link and every ranking pointing at the old one **unless** you add a redirect. The SEO panel’s Advanced tab writes one for you; do not skip it.',
    ],
  },

  /* ---------------- Content and structure ---------------- */
  {
    id: 'content-length',
    section: 'content',
    icon: 'mdi:file-document-outline',
    title: 'How much to write, per kind of page',
    summary:
      'Enough to answer the question completely, and the engine’s targets are the floor rather than the goal.',
    points: [
      'Article: 600 words is the target, 300 the minimum. A RERA or Khata explainer that earns links is usually 1,200–1,800.',
      'Property: 300 words is the target, 150 the minimum — the description, the highlights and the specification notes all count.',
      'CMS page: 300 words is the target. A page of three blocks and a form is not a page that ranks.',
      'Locality and developer: 200 words is the target. A locality guide with connectivity, schools, hospitals and a price line is both more useful and more rankable than a paragraph.',
      'Word count is a symptom, not a treatment. Write the answer; the count follows. Padding is visible to a reader and, increasingly, to the model summarising the page.',
      'The keyword should appear in the opening tenth of the body. If it does not, the page is probably warming up instead of answering.',
    ],
  },
  {
    id: 'headings',
    section: 'content',
    icon: 'mdi:format-header-pound',
    title: 'Headings, paragraphs and readability',
    summary:
      'One H1 per page (the page gives it), H2 for sections, short paragraphs, and a subheading at least every 300 words.',
    points: [
      'Never write an H1 inside the body. The page already renders one from the record’s title, and a second one confuses what the page is about — the panel flags it.',
      'Open the body at H2 and do not skip a level: H2 → H3 → H4.',
      'A subheading every 300 words keeps a mobile reader oriented; the engine warns past 450.',
      'Keep paragraphs under 150 words and sentences under 25 words on average. Long sentences read as legal text, which is exactly what a buyer is afraid of.',
      'Aim for a Flesch reading ease of 50 or better. Property is a technical subject; it does not have to be written technically.',
      'Use transition words — “however”, “because”, “in practice”, “for example” — in at least a fifth of sentences. It is what makes a list of facts read as an explanation.',
      'Passive voice is a warning, never a failure. “The approval was obtained by the developer” is weaker than “The developer obtained the approval”, and that is all it means.',
    ],
  },
  {
    id: 'images',
    section: 'content',
    icon: 'mdi:image-multiple-outline',
    title: 'Images and alt text',
    summary: 'Five photographs on a listing is the floor, every one of them described in words.',
    points: [
      'A property needs at least five images to pass, and a listing with a cover, elevations, interiors, the clubhouse and the locality is what a buyer expects to see.',
      'Every image needs an alt that describes the photograph: “Living room of the 3 BHK at Lakeview Heights, Whitefield”. Not “image1”, not the file name, not the keyword repeated.',
      'One alt on the page should carry the focus keyword — usually the cover. Do not put it in all of them.',
      'An article needs at least one image, and its featured image alt should say what it shows.',
      'Set the share image on the Social tab. Without it the share card falls back to the cover, and without a cover to the site-wide default, which is the company logo — fine for a policy page, weak for a listing.',
      'Upload at the size the layout needs — gallery images at 1920 × 1080, share images at 1200 × 630. Every Cloudinary image is served resized and re-encoded, but the original still has to be downloaded once.',
    ],
  },
  {
    id: 'internal-links',
    section: 'content',
    icon: 'mdi:link-box-variant-outline',
    title: 'Internal linking: localities ↔ listings ↔ guides',
    summary: 'The three link directions that make this site more than a list of pages.',
    points: [
      'Every article about a locality should link to that locality page: the Whitefield guide links to `/localities/whitefield`.',
      'Every locality page should link to the guides that explain buying there, and to the listings it contains — the page does the second automatically.',
      'Every listing should link to its locality and its builder. Both are done by the record’s own fields; fill them in.',
      'Link with words that say where the link goes. “Read the Karnataka RERA guide” tells a reader and a crawler something; “click here” tells neither.',
      'Articles and pages are scored on having at least one internal link. Two or three well-chosen ones is the norm; twenty is a directory.',
      'Use the Related articles picker rather than pasting links into the body — the relationship then shows on both pages and in the structured data.',
    ],
  },
  {
    id: 'external-links',
    section: 'content',
    icon: 'mdi:open-in-new',
    title: 'Linking out, and when to nofollow',
    summary: 'Citing the authority you are explaining is a strength, not a leak.',
    points: [
      'An article that explains a rule should link to the body that made it — the state RERA authority, the municipal body, the registration department.',
      'At least one followed outbound link on an explainer is scored. Marking every outbound link nofollow is a warning: it tells search engines we do not stand behind anything we cite.',
      'Use nofollow for paid placements, for anything user-submitted, and for links we cannot vouch for.',
      'Outbound links open in a new tab from the article body; check the destination still exists when you update the piece.',
      'Never link to a competitor’s listing page to “prove” a price. Quote the figure and name the source instead.',
    ],
  },
  {
    id: 'faqs',
    section: 'content',
    icon: 'mdi:comment-question-outline',
    title: 'FAQs, and the rich result they earn',
    summary:
      'Three genuine questions per listing and per guide, answered in two or three sentences each.',
    points: [
      'A listing with three or more FAQs scores better and publishes FAQ structured data, which can show the questions directly in the result.',
      'Use the questions buyers actually ask us: possession date, what the price includes, the maintenance charge, the approval status, the distance to the nearest metro or tech park.',
      'Answer in two or three sentences. An answer that runs to a page is not the answer to a question.',
      'The answer must appear on the page as well as in the markup. Questions marked up but not visible are a guidelines violation, not a shortcut.',
      'Do not repeat the same three FAQs on forty listings. Duplicated answers are duplicated content, and the dashboard will show it.',
    ],
  },

  /* ---------------- Technical ---------------- */
  {
    id: 'structured-data',
    section: 'technical',
    icon: 'mdi:code-json',
    title: 'Structured data the site publishes for you',
    summary:
      'One JSON-LD graph per page, generated from the record — the panel’s Schema tab is where you tune it, not where you write it.',
    points: [
      'Every page carries the organisation and, where there is a trail, a BreadcrumbList.',
      'A property publishes RealEstateListing with the offer, the address, the floor size, the rooms, the amenities and the images — plus FAQPage when it has FAQs and VideoObject when it has a tour.',
      'An article publishes Article or BlogPosting with the author, the publisher, the dates and the word count. Locality and builder pages publish Place and Organization; listings publish an ItemList of their results.',
      'Only the geo coordinates of a listing that has “show exact location” switched on are published — a map pin is a privacy decision as much as an SEO one.',
      'Switch off a generated type on the Schema tab when it would be wrong; add custom JSON-LD only when the site genuinely cannot generate it. Invalid custom JSON-LD invalidates the whole block, so the panel refuses to save it.',
      'Structured data must match what the page shows. Marking up a price the page does not display is the fastest way to lose a rich result.',
    ],
  },
  {
    id: 'canonicals',
    section: 'technical',
    icon: 'mdi:content-copy',
    title: 'Canonicals and the listing filters',
    summary: 'Every page states its own address, and a filtered listing states the unfiltered one.',
    points: [
      'A canonical URL is the page saying “this is my address”. It stops the same listing being indexed twice because it was reached two ways.',
      'The site builds canonicals itself, without a trailing slash and without query parameters — override one only when the same content genuinely lives at another address.',
      'A listing keeps only the filters worth indexing in its canonical: listing type, segment, property type, locality, construction status, bedrooms and the page number.',
      'Anything else — a search phrase, a price band, an amenity, a sort order — makes the page noindex, because there is an unlimited number of those pages and none of them is a page anybody searched for.',
      'Page 2 and beyond canonicalise to themselves and carry rel=prev/next, unless the noindex rule for paginated listings is switched on in SEO settings.',
    ],
  },
  {
    id: 'indexing',
    section: 'technical',
    icon: 'mdi:magnify-scan',
    title: 'What gets indexed, and how to get it indexed faster',
    summary: 'Publish, submit, link. Nothing else reliably moves a new page into the index.',
    points: [
      'A record that is not published is noindex whatever its own robots switches say. The “Not indexable” issue on the dashboard is usually a draft, not a mistake.',
      'The site’s sitemaps are generated from the data: properties, localities, developers, articles and pages, each with its own file behind a sitemap index. A record can be left out individually from the panel’s Advanced tab.',
      'Submit the sitemap index once in Google Search Console and once in Bing Webmaster Tools. After that, new records are found on their own.',
      'Ask for indexing manually only for something genuinely urgent — a new project launch. It is a request, not a command.',
      'The fastest reliable way to get a new page indexed is a link to it from a page that already is: the locality page, the guides index, the home page rows.',
      'Search Console’s “Pages” report tells you why a page is not indexed. “Crawled – currently not indexed” almost always means the page is thin or duplicates another.',
    ],
  },
  {
    id: 'sitemaps-robots',
    section: 'technical',
    icon: 'mdi:robot-outline',
    title: 'robots.txt, sitemaps and the crawl budget',
    summary:
      'Let the crawlers in, keep them out of the places with no content, and point them at the sitemap.',
    points: [
      'The recommended robots.txt allows everything except the admin, the shortlist, preview links and search result pages — those have nothing to index and would waste every crawl.',
      'It names the sitemap explicitly. “Restore recommended” in SEO settings puts that file back if it is ever edited into something odd.',
      'Disallowing a page does **not** remove it from the index — it only stops it being read. Use the noindex switch on the record for that.',
      'The sitemap section of SEO settings sets the change frequency and priority per kind of record. Both are hints; getting them roughly right is enough, and a priority of 1.0 on everything means nothing.',
      'Exclude URLs from the sitemap sparingly. A page worth having is a page worth listing.',
    ],
  },
  {
    id: 'redirects',
    section: 'technical',
    icon: 'mdi:swap-horizontal',
    title: 'Redirects: keeping every old link alive',
    summary: 'A changed address without a redirect is a 404 for everyone who had the old one.',
    points: [
      'Add a redirect whenever a slug changes, a listing is retired into another, or a page is merged. The Redirects screen is the whole table.',
      '301 means permanent and passes the ranking on; 302 means temporary and does not. Use 301 unless the old address really is coming back.',
      'Never chain redirects: A → B → C loses value at every hop and can time out. Point A at C. The API refuses to store a rule pointing at another rule’s source for exactly this reason.',
      'Never point a redirect at itself, and never redirect everything to the home page — a visitor who wanted a listing and lands on the home page leaves.',
      'This is a single-page application, so the browser performs the redirect after the app loads. For a true server-side 301, export the Nginx snippet from the Redirects screen and hand it to whoever runs the deployment.',
      'The hits column tells you which old URLs people still use. A rule with thousands of hits is a link somebody should be asked to update.',
    ],
  },
  {
    id: 'speed',
    section: 'technical',
    icon: 'mdi:rocket-launch-outline',
    title: 'Speed and Core Web Vitals',
    summary:
      'Largest Contentful Paint under 2.5 s, layout shift under 0.1, and the biggest lever is the images you upload.',
    points: [
      'The three numbers Google measures: LCP (how fast the main thing appears), CLS (how much the page jumps while loading) and INP (how quickly it answers a tap).',
      'Oversized images are the usual cause of a slow listing. Upload at the recommended size; the site resizes and re-encodes, but the original is still fetched once.',
      'Every image on the site sits in an aspect-ratio box, which is what keeps layout shift near zero. Do not paste raw `<img>` tags into an article body — use the editor’s image block.',
      'A video tour is loaded only when a visitor asks for it. Do not embed an autoplaying video in a page body.',
      'Check a real page with PageSpeed Insights on mobile, not the desktop score. Our budget is 85 or better on mobile for the home page, listings, property details, locality pages and articles.',
    ],
  },
  {
    id: 'mobile',
    section: 'technical',
    icon: 'mdi:cellphone',
    title: 'Mobile first, because the index is',
    summary: 'Google ranks what the phone sees. If it is not on the phone, it does not exist.',
    points: [
      'Write for a 390-pixel screen: short paragraphs, a subheading every few paragraphs, tables that scroll rather than shrink.',
      'Everything hidden behind a “read more” is still indexed — but everything genuinely missing from the mobile layout is not. Never publish content that only the desktop layout renders.',
      'Check the enquiry buttons on a phone after any layout change. A listing that cannot be enquired about is a listing that ranks for nothing useful.',
      'Keep the first screen honest: the title, the price, the configuration and the locality. A hero image with no facts is a bounce.',
    ],
  },

  /* ---------------- Local, trust, AI ---------------- */
  {
    id: 'local-seo',
    section: 'beyond',
    icon: 'mdi:map-marker-radius-outline',
    title: 'Local SEO for a Bengaluru consultancy',
    summary:
      'A verified business profile, one consistent set of contact details, and a real page per locality we work in.',
    points: [
      'Claim and verify the Google Business Profile. Category, service area, hours, photographs and the phone number all come from it — and it is what shows in the map pack.',
      'Keep NAP consistent: the name, address and phone number must be written **identically** on the site, the business profile and every directory. “Squares N Acres” never becomes “Squares and Acres”.',
      'The address, phone, email and geo coordinates in SEO settings are what the site publishes as structured data. They must match the business profile exactly.',
      'A locality page earns local rankings only if it is genuinely about the locality: connectivity, employment hubs, schools and hospitals, price movement, what living there is like. Twenty listings under a heading is not a locality page.',
      'Ask satisfied buyers for a review on the business profile, and never incentivise one.',
      'Get listed where Bengaluru buyers already look — a local business directory, an industry body, the builder’s own channel-partner page. Those are links no keyword can buy.',
    ],
  },
  {
    id: 'eeat',
    section: 'beyond',
    icon: 'mdi:account-check-outline',
    title: 'E-E-A-T: experience, expertise, authority, trust',
    summary: 'Property advice is money advice. Show who wrote it and why they are worth reading.',
    points: [
      'Every article has an author record with a real biography, a photograph and the author page it links to. “Admin” as a byline is worse than no byline.',
      'Say where a figure came from and when: “as notified by the state authority, checked in March 2026”. Numbers without a source age badly and lose trust twice — once when they are wrong, once when a reader notices.',
      'Show the working: a RERA number on a listing, an approval status on a plot, the assumptions behind an EMI estimate.',
      'Keep the contact details, office address and registration details easy to find. A site that is hard to contact is a site that is hard to trust.',
      'Update the guides that quote rules and rates when the rules change, and change the modified date by actually editing the page.',
      'Never publish an invented statistic, award or client count. One wrong number is more expensive than ten missing ones.',
    ],
  },
  {
    id: 'ai-search',
    section: 'beyond',
    icon: 'mdi:robot-happy-outline',
    title: 'Being readable by AI search',
    summary:
      'Assistants quote the page that answers the question in the first paragraph, from a site that lets them in.',
    points: [
      'Answer first. Open the section with the answer in two sentences, then explain it. An assistant quotes the paragraph that contains the answer, not the one that builds up to it.',
      'Write the question as the subheading. “What is B Khata?” is retrievable; “A note on classifications” is not.',
      'Facts belong in text, not only in a graphic. A table of stamp duty rates as an image is invisible to everything that summarises the page.',
      'The site publishes an llms.txt — a plain-Markdown map of the localities, property types, featured listings and guides. Regenerate it from SEO settings after a big content change so what it lists is what exists.',
      'The recommended robots.txt allows the assistant crawlers by name as well as the search engines. Blocking them removes us from those answers without improving anything.',
      'Structured data does double duty here: the same JSON-LD that earns a rich result is what lets a model state a price or a possession date with confidence.',
      'Keep one idea per page. A page that answers one question well is cited; a page that answers nine is summarised and forgotten.',
    ],
  },

  /* ---------------- Measuring and shipping ---------------- */
  {
    id: 'measuring',
    section: 'shipping',
    icon: 'mdi:chart-line',
    title: 'Measuring what changed',
    summary:
      'Search Console for how search sees us, analytics for what visitors do, the dashboard for what we have not written yet.',
    points: [
      'Search Console is the only source of truth for impressions, clicks, average position and which queries reach which page. Check the Pages report for indexing problems and the Queries report for the searches we nearly rank for.',
      'Analytics answers the other half: which pages lead to an enquiry. A listing with traffic and no enquiries has a content problem, not an SEO one.',
      'Give a change four to six weeks before judging it. Ranking movement inside a week is noise.',
      'Watch the queries where we sit between position 5 and 15 — those are the pages one honest improvement away from the first page.',
      'Re-analyse the site from the dashboard after a bulk content change so the cards describe the site as it is now.',
      'Record what you changed and when. Without that, no ranking movement can ever be explained.',
    ],
  },
  {
    id: 'checklist',
    section: 'shipping',
    icon: 'mdi:clipboard-check-outline',
    title: 'The publishing checklist',
    summary: 'Nine things before anything goes live. It takes two minutes.',
    points: [
      'A focus keyword is set, and nothing else on the site targets it.',
      'The title is 50–60 characters, opens with the keyword and is unique.',
      'The description is 120–160 characters, names the thing and ends with the next step.',
      'The slug is short, lower case and carries the keyword — and if it changed, a redirect exists.',
      'The body answers the question in its first paragraph and uses the keyword there.',
      'Images: five or more on a listing, one or more on an article, every one with a real alt, and a share image set.',
      'At least one internal link out and, on a guide, one link to the authority it explains.',
      'Three FAQs, answered in two or three sentences each.',
      'The SEO panel shows Good, and every failure in the list is either fixed or a deliberate decision.',
    ],
  },
];

/** How many topics the playbook carries — asserted by the page’s test. */
export const TOPIC_COUNT = SEO_GUIDE_TOPICS.length;

/** The topics of one section, in order. */
export const topicsOf = (sectionId) =>
  SEO_GUIDE_TOPICS.filter((topic) => topic.section === sectionId);

export default SEO_GUIDE_TOPICS;
