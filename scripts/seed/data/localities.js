/**
 * `localities` — the twenty Bengaluru neighbourhoods of §10.
 *
 * The place names are real, because a locality page that invents a
 * neighbourhood is useless to a buyer and invisible to a search engine. What
 * is written about them stays on the safe side of D84: character, the roads
 * and lines that serve the area, and an indicative price band, each ending in
 * a reminder that the figures are worth checking. Nothing here claims a
 * completion date, an approval or a statistic as fact.
 *
 * Coordinates are approximate neighbourhood centres and `showExactLocation`
 * stays false on the listings that sit in them (§14).
 */

const { fitDescription, makeSeo } = require('../lib/seo');
const { paragraphs } = require('../lib/text');

/** One sentence per locality, rotated so twenty descriptions do not read alike. */
const CAVEATS = [
  'Prices and travel times are indicative and worth checking against current market data before you commit to anything.',
  'Treat the band as a starting point: the figure a specific project commands depends on the block, the floor and the stage of construction.',
  'Rates move with supply, so use this as orientation and ask an advisor for the current numbers on a shortlist.',
  'Metro timelines and price bands both change; verify the current position before it decides a purchase for you.',
];

/** How each locality description signs off; rotated for the same reason. */
const CLOSINGS = [
  'An advisor can put the current shortlist in front of you rather than a portal average.',
  'Tell us the budget and the configuration and we will come back with what is actually available.',
  'We visit what we list, so ask about the things a photograph cannot show you.',
  'Send us a requirement and we will say honestly whether this locality fits it.',
];

const LOCALITIES = [
  {
    name: 'Whitefield',
    zone: 'east',
    latitude: 12.9698,
    longitude: 77.75,
    pincodes: ['560066', '560067'],
    avgPricePerSqft: 8200,
    isFeatured: true,
    short:
      "East Bengaluru's best-known technology corridor: gated apartment projects, international schools and Purple Line metro stations along the main road.",
    character:
      'Whitefield began as a settlement on the eastern edge of the city and is now its best-known technology corridor. The stretch between Hope Farm and Varthur Kodi carries a dense mix of gated apartment projects, older independent houses and villa communities set back from the main road.',
    connectivity:
      'Purple Line metro stations along Whitefield Main Road have made the run towards the centre far more predictable than the road alone ever was. Outer Ring Road is roughly 12 km west, and Kempegowda International Airport about 45 km north.',
    social:
      'International schools, multi-speciality hospitals and two large shopping centres sit inside the catchment, and the restaurant and retail strip around Varthur Road has grown with the offices behind it.',
    supply:
      'Most of what we list here is two- and three-bedroom stock in gated projects, with a steady flow of resale flats from the first generation of buyers moving on.',
    band: '₹7,500 to ₹9,500 per square foot',
    priceTrendNote: 'Indicative range for apartments; confirm against current market data.',
    highlights: [
      'Established technology corridor with a deep rental market',
      'Purple Line metro connectivity towards the city centre',
      'International schools and multi-speciality hospitals within the neighbourhood',
      'The widest choice of ready-to-move gated apartments in east Bengaluru',
    ],
    connectivityRows: [
      ['Metro', 'Purple Line, along Whitefield Main Road'],
      ['Outer Ring Road', '12 km'],
      ['Kempegowda Airport', '45 km'],
      ['Railway', 'Whitefield station, 3 km'],
    ],
  },
  {
    name: 'Sarjapur Road',
    zone: 'east',
    latitude: 12.901,
    longitude: 77.687,
    pincodes: ['560035', '562125'],
    avgPricePerSqft: 8600,
    isFeatured: true,
    short:
      'A corridor running south-east from Agara junction, filled in behind the Outer Ring Road campuses, with schools along the road and villas beyond Dommasandra.',
    character:
      'Sarjapur Road runs south-east from Agara junction towards Sarjapur town, and the corridor has filled in steadily behind the office campuses on Outer Ring Road. Supply ranges from compact two-bedroom flats near Kaikondrahalli to large villa projects past Dommasandra.',
    connectivity:
      'The road meets Outer Ring Road at Agara, about 6 km from the Ibblur end, and the airport is roughly 55 km away. A metro line along the corridor has been planned for some time; check where construction has actually reached before you count on it.',
    social:
      'Several well-known schools sit on the road itself, with hospitals, supermarkets and a large shopping centre clustered around the Ibblur and Kaikondrahalli stretches.',
    supply:
      'Our listings on this road split roughly in half: apartments near the Ibblur end for buyers who want the commute, and villa plots further out for buyers who want the land.',
    band: '₹7,800 to ₹9,800 per square foot',
    priceTrendNote: 'Indicative range; the far end of the road trades lower than Ibblur.',
    highlights: [
      'Direct access to the Outer Ring Road office corridor at Agara',
      'Schools and hospitals along the road rather than a drive away',
      'Apartments near Ibblur, villa projects past Dommasandra',
      'One of the busiest new-launch corridors in the city',
    ],
    connectivityRows: [
      ['Metro', 'Planned along the corridor; verify current status'],
      ['Outer Ring Road', '6 km (Agara junction)'],
      ['Kempegowda Airport', '55 km'],
      ['Railway', 'Carmelaram station, 4 km'],
    ],
  },
  {
    name: 'Electronic City',
    zone: 'south',
    latitude: 12.8452,
    longitude: 77.6602,
    pincodes: ['560100'],
    avgPricePerSqft: 6800,
    isFeatured: true,
    short:
      "Bengaluru's first planned technology hub, split into two phases off Hosur Road, with the most affordable apartment stock of the major employment corridors.",
    character:
      "Electronic City was Bengaluru's first planned technology hub and is still organised around it: two phases of campuses off Hosur Road, with residential layouts, apartment projects and older villages filling the land between them and Bommasandra.",
    connectivity:
      'The elevated expressway carries traffic over Hosur Road towards the city, and the Yellow Line metro runs along the same corridor. The airport is roughly 55 km north, which is the long end of any commute from here.',
    social:
      'Schools, a multi-speciality hospital and two shopping centres serve the area, and the campuses themselves supply much of the day-to-day retail and food.',
    supply:
      'Two-bedroom flats are the working currency here, and a large share of them are bought to let rather than to live in.',
    band: '₹5,800 to ₹7,500 per square foot',
    priceTrendNote: 'The most affordable of the major employment corridors; indicative.',
    highlights: [
      'The most affordable apartment stock among the employment corridors',
      'Elevated expressway and Yellow Line metro along Hosur Road',
      'Walk-to-work options for the campuses in both phases',
      'Strong rental demand from a young workforce',
    ],
    connectivityRows: [
      ['Metro', 'Yellow Line, along Hosur Road'],
      ['Outer Ring Road', '14 km (Silk Board)'],
      ['Kempegowda Airport', '55 km'],
      ['Railway', 'Heelalige station, 6 km'],
    ],
  },
  {
    name: 'Hebbal',
    zone: 'north',
    latitude: 13.0358,
    longitude: 77.597,
    pincodes: ['560024', '560092'],
    avgPricePerSqft: 9800,
    isFeatured: true,
    short:
      'The junction of Outer Ring Road and the airport road, with a lake at its centre, a large technology park alongside and the easiest airport run in the city.',
    character:
      'Hebbal is defined by its junction: Outer Ring Road meets the airport road here, and the flyover above the lake is the hinge between north Bengaluru and the rest of the city. A large technology park sits alongside, and the residential stock around it runs from older layouts to high-rise gated projects.',
    connectivity:
      'Kempegowda International Airport is about 27 km up the Ballari Road, which makes the drive north the easiest in the city outside peak hours. Outer Ring Road heads east towards the technology corridor from the same junction.',
    social:
      'Multi-speciality hospitals, established schools and a shopping centre are all within the catchment, and the lake and its park give the area something most employment hubs do not have.',
    supply:
      'Three-bedroom apartments and the occasional penthouse make up most of what reaches the market, and lake-facing blocks are the ones that sell first.',
    band: '₹8,500 to ₹11,500 per square foot',
    priceTrendNote: 'Premium for lake-facing and park-facing blocks; indicative.',
    highlights: [
      'The shortest airport run of any established residential area',
      'A large technology park within the neighbourhood',
      'Lake and park frontage on the better blocks',
      'Outer Ring Road access towards the eastern corridor',
    ],
    connectivityRows: [
      ['Metro', 'Blue Line planned via the corridor; verify current status'],
      ['Outer Ring Road', 'At the junction'],
      ['Kempegowda Airport', '27 km'],
      ['Railway', 'Yeshwanthpur station, 8 km'],
    ],
  },
  {
    name: 'Yelahanka',
    zone: 'north',
    latitude: 13.1007,
    longitude: 77.5963,
    pincodes: ['560064', '560063'],
    avgPricePerSqft: 7600,
    isFeatured: false,
    short:
      'An old town with planned new-town sectors around it, lakes, wide roads and a shorter airport run than anywhere south of the Ring Road.',
    character:
      'Yelahanka pairs an old town with the planned sectors of its new town, and the difference shows on the ground: narrow older streets on one side, wide layout roads and gated projects on the other. Lakes and open land still break up the built-up area.',
    connectivity:
      'The airport is about 18 km up the Ballari Road, and Hebbal — where Outer Ring Road begins its eastern run — is roughly 11 km south. The Green Line metro terminates to the west at Nagasandra.',
    social:
      'Schools, a few colleges and neighbourhood hospitals serve the area, with most large-format retail a short drive south towards Hebbal.',
    supply:
      'Plotted sites and low-rise projects dominate the listings, and buyers here are usually choosing between land now and a built home later.',
    band: '₹6,500 to ₹8,800 per square foot',
    priceTrendNote: 'New-town sectors carry a premium over the old town; indicative.',
    highlights: [
      'Short, predictable drive to the airport',
      'Planned new-town sectors with wide roads and parks',
      'Lower entry prices than the neighbouring Hebbal corridor',
      'Plotted development alongside gated apartment projects',
    ],
    connectivityRows: [
      ['Metro', 'Green Line terminus at Nagasandra, 12 km'],
      ['Outer Ring Road', '11 km (Hebbal)'],
      ['Kempegowda Airport', '18 km'],
      ['Railway', 'Yelahanka junction, 2 km'],
    ],
  },
  {
    name: 'Devanahalli',
    zone: 'north',
    latitude: 13.2437,
    longitude: 77.7126,
    pincodes: ['562110'],
    avgPricePerSqft: 6500,
    isFeatured: true,
    short:
      'The airport town: approved plotted layouts, business and aerospace parks, and the lowest per-square-foot entry point of the twenty localities we cover.',
    character:
      'Devanahalli is the airport town, and most of what is being built here follows from that: approved plotted layouts, a business park, an aerospace and hardware park, and villa projects aimed at buyers who want land rather than a floor in a tower.',
    connectivity:
      'Kempegowda International Airport is about 8 km away and the city centre roughly 38 km down the Ballari Road highway, which is fast outside peak hours and slow inside them.',
    social:
      'Schools and a hospital serve the town itself, with the larger institutions clustered back towards Yelahanka and Hebbal. The social infrastructure is thinner than in the established corridors, and that is reflected in the price.',
    supply:
      'Nearly everything we hold here is land: approved sites in layouts, sold by dimension, with a handful of villa projects alongside.',
    band: '₹4,500 to ₹7,000 per square foot for approved sites',
    priceTrendNote: 'Plot-led market; approvals drive the price more than the address does.',
    highlights: [
      'The shortest airport access of any locality we cover',
      'Approved plotted layouts with BIAAPA and BMRDA sanction',
      'The lowest entry price band of the twenty localities',
      'Employment moving in with the business and aerospace parks',
    ],
    connectivityRows: [
      ['Metro', 'Not served; nearest planned station at Yelahanka'],
      ['Outer Ring Road', '30 km (Hebbal)'],
      ['Kempegowda Airport', '8 km'],
      ['Railway', 'Devanahalli station, 3 km'],
    ],
  },
  {
    name: 'Koramangala',
    zone: 'south',
    latitude: 12.9352,
    longitude: 77.6245,
    pincodes: ['560034', '560095'],
    avgPricePerSqft: 14000,
    isFeatured: true,
    short:
      "Eight numbered blocks of low-rise housing, small offices and the city's densest restaurant strip, with almost no new supply and consistently high resale prices.",
    character:
      "Koramangala is eight numbered blocks of bungalows, low-rise apartments and converted houses that now hold small offices. It is where much of the city's startup economy settled, and the restaurant and retail density follows from that rather than from any plan.",
    connectivity:
      'Inner Ring Road and Hosur Road both border the neighbourhood, the Yellow Line metro runs along its southern edge, and the airport is about 40 km north. Getting out of Koramangala at 6 pm is the part nobody enjoys.',
    social:
      'Schools, clinics, a multi-speciality hospital and an unusual concentration of restaurants and independent retail are all within walking distance of most blocks.',
    supply:
      'Supply is thin and almost entirely resale, so the useful conversation is usually about which block and which floor rather than which project.',
    band: '₹12,000 to ₹16,000 per square foot',
    priceTrendNote: 'Almost entirely a resale market; new supply is rare.',
    highlights: [
      'Central position with Inner Ring Road and Hosur Road on two sides',
      'Walkable retail, restaurants and everyday services',
      'Predominantly a resale market with very little new supply',
      'Among the strongest rental yields in south Bengaluru',
    ],
    connectivityRows: [
      ['Metro', 'Yellow Line, along the southern edge'],
      ['Outer Ring Road', '5 km (Agara)'],
      ['Kempegowda Airport', '40 km'],
      ['Railway', 'Bengaluru Cantonment, 8 km'],
    ],
  },
  {
    name: 'Indiranagar',
    zone: 'central',
    latitude: 12.9784,
    longitude: 77.6408,
    pincodes: ['560038', '560008'],
    avgPricePerSqft: 13500,
    isFeatured: true,
    short:
      'Tree-lined residential stages behind two busy retail spines, with Purple Line metro stations on CMH Road and the shortest run to the central business district.',
    character:
      'Indiranagar keeps two characters at once: 100 Feet Road and CMH Road carry the retail and the restaurants, while the numbered stages behind them stay tree-lined, low-rise and residential. Old sites are steadily being replaced by builder floors and small apartment blocks.',
    connectivity:
      'Purple Line metro stations on CMH Road put the central business district a few stops away, and Old Airport Road and Outer Ring Road are both minutes off. The airport is roughly 35 km north.',
    social:
      'Established schools, hospitals and a shopping centre are all inside the neighbourhood, and almost everything else is within a short walk of wherever you live in it.',
    supply:
      'Builder floors and small apartment blocks make up most listings, and the ones on quiet cross streets behind the main roads are the ones people ask about twice.',
    band: '₹12,000 to ₹16,500 per square foot',
    priceTrendNote: 'Metro-adjacent stages carry a clear premium; indicative.',
    highlights: [
      'Purple Line metro on CMH Road, four stops from the centre',
      'Quiet residential stages behind two retail spines',
      'Builder floors and boutique apartment blocks rather than towers',
      'Rental demand from both families and professionals',
    ],
    connectivityRows: [
      ['Metro', 'Purple Line, CMH Road and Indiranagar stations'],
      ['Outer Ring Road', '6 km'],
      ['Kempegowda Airport', '35 km'],
      ['Railway', 'Bengaluru Cantonment, 5 km'],
    ],
  },
  {
    name: 'HSR Layout',
    zone: 'south',
    latitude: 12.9116,
    longitude: 77.6474,
    pincodes: ['560102'],
    avgPricePerSqft: 11500,
    isFeatured: true,
    short:
      'A planned layout of seven sectors with wide roads, parks and small offices, bordered by Outer Ring Road and hemmed in by the Silk Board junction.',
    character:
      'HSR Layout is a planned development of seven sectors, which is why the roads are wide, the parks are where you expect them to be and the addresses are easy to find. Small offices have moved into the commercial plots, and the housing mix runs from independent houses to mid-rise apartments.',
    connectivity:
      'Outer Ring Road runs along the northern edge at Agara and the Yellow Line metro follows Hosur Road alongside. The Silk Board junction is the bottleneck every resident learns to plan around; the airport is roughly 45 km north.',
    social:
      'Schools, clinics, a hospital and a dense strip of restaurants and everyday retail sit inside the layout, most of them along the sector main roads.',
    supply:
      'Three-bedroom apartments and independent houses on layout sites are the two halves of this market, with small offices taking up the commercial plots.',
    band: '₹10,000 to ₹13,000 per square foot',
    priceTrendNote: 'Sector 1 and 2 trade above the layout average; indicative.',
    highlights: [
      'Planned sectors with wide roads, parks and clear addressing',
      'Outer Ring Road frontage on the northern edge',
      'A working mix of homes, small offices and neighbourhood retail',
      'Consistently strong rental demand',
    ],
    connectivityRows: [
      ['Metro', 'Yellow Line, along Hosur Road'],
      ['Outer Ring Road', 'At the northern edge (Agara)'],
      ['Kempegowda Airport', '45 km'],
      ['Railway', 'Bengaluru Cantonment, 12 km'],
    ],
  },
  {
    name: 'JP Nagar',
    zone: 'south',
    latitude: 12.9063,
    longitude: 77.5857,
    pincodes: ['560078', '560076'],
    avgPricePerSqft: 9600,
    isFeatured: false,
    short:
      'Nine phases of established south Bengaluru housing, with Green Line metro along the western edge and a mature mix of schools, parks and retail.',
    character:
      'JP Nagar runs through nine phases, and they read like a timeline of south Bengaluru: older sites and independent houses in the early phases, apartment projects and gated developments in the later ones, with neighbourhood parks throughout.',
    connectivity:
      'Green Line metro stations run along Kanakapura Road on the western edge, and Outer Ring Road crosses the area on its way towards Silk Board. The airport is about 45 km north, which is the longest leg of living here.',
    social:
      'Schools, colleges, hospitals and two shopping centres serve the phases, and the retail on the main roads is dense enough that most errands stay local.',
    supply:
      'The listings run from older two-bedroom flats in the early phases to new gated projects in the later ones, which is a wide range of prices for one name.',
    band: '₹8,500 to ₹11,000 per square foot',
    priceTrendNote: 'Later phases price below the older, better-connected ones.',
    highlights: [
      'Established residential area with mature social infrastructure',
      'Green Line metro along the Kanakapura Road edge',
      'Outer Ring Road access towards Electronic City and Silk Board',
      'A mix of independent houses, builder floors and gated projects',
    ],
    connectivityRows: [
      ['Metro', 'Green Line, along Kanakapura Road'],
      ['Outer Ring Road', 'Crosses the area'],
      ['Kempegowda Airport', '45 km'],
      ['Railway', 'Bengaluru City junction, 12 km'],
    ],
  },
  {
    name: 'Bannerghatta Road',
    zone: 'south',
    latitude: 12.888,
    longitude: 77.597,
    pincodes: ['560076', '560083'],
    avgPricePerSqft: 8400,
    isFeatured: false,
    short:
      'A hospital-and-college corridor running south from Jayadeva junction towards the national park, with apartment projects filling in either side.',
    character:
      'Bannerghatta Road runs south from the Jayadeva junction towards the national park, and the corridor is best known for what sits on it: hospitals, colleges and a large shopping centre, with apartment projects filling the land behind them.',
    connectivity:
      'Outer Ring Road crosses at Jayadeva and a metro line along the corridor has been under construction for some years — check where services have actually started before you plan around them. The airport is roughly 50 km north.',
    social:
      'The concentration of hospitals and colleges is the corridor s defining feature, and schools and everyday retail have followed the residential growth south.',
    supply:
      'Apartment projects are the bulk of what we list, and the further south the address, the more space the same budget buys.',
    band: '₹7,500 to ₹9,800 per square foot',
    priceTrendNote: 'The stretch beyond Hulimavu trades below the inner corridor.',
    highlights: [
      'Hospitals and colleges within the corridor itself',
      'Outer Ring Road interchange at Jayadeva',
      'Apartment projects at a lower band than neighbouring JP Nagar',
      'Open land and the national park at the southern end',
    ],
    connectivityRows: [
      ['Metro', 'Pink Line under construction; verify current status'],
      ['Outer Ring Road', 'At Jayadeva junction'],
      ['Kempegowda Airport', '50 km'],
      ['Railway', 'Bengaluru City junction, 14 km'],
    ],
  },
  {
    name: 'Kanakapura Road',
    zone: 'south',
    latitude: 12.889,
    longitude: 77.556,
    pincodes: ['560062', '560082'],
    avgPricePerSqft: 7200,
    isFeatured: false,
    short:
      'A wide southern arterial with Green Line metro to its southern terminus, plotted layouts, gated projects and green cover close to the city edge.',
    character:
      'Kanakapura Road is one of the few southern arterials with room to breathe: a wide carriageway, plotted layouts on either side, gated apartment projects at intervals and the Turahalli tree cover close enough to matter.',
    connectivity:
      'The Green Line metro runs down the road to its southern terminus, which has changed the commute for everyone living along it. Outer Ring Road is about 7 km north and the airport roughly 50 km.',
    social:
      'Schools and neighbourhood hospitals serve the corridor, with the larger institutions a short drive towards JP Nagar and Jayanagar.',
    supply:
      'Plots and gated apartment projects arrive here in roughly equal measure, and distance to a metro station is the first question almost every buyer asks.',
    band: '₹6,200 to ₹8,200 per square foot',
    priceTrendNote: 'Metro proximity is the strongest single driver on this corridor.',
    highlights: [
      'Green Line metro along the arterial itself',
      'A wide, fast road by south Bengaluru standards',
      'Plotted layouts alongside gated apartment projects',
      'Green cover and lower density than the inner corridors',
    ],
    connectivityRows: [
      ['Metro', 'Green Line, along Kanakapura Road'],
      ['Outer Ring Road', '7 km'],
      ['Kempegowda Airport', '50 km'],
      ['Railway', 'Bengaluru City junction, 13 km'],
    ],
  },
  {
    name: 'Marathahalli',
    zone: 'east',
    latitude: 12.9591,
    longitude: 77.6974,
    pincodes: ['560037'],
    avgPricePerSqft: 8800,
    isFeatured: false,
    short:
      'The junction where Outer Ring Road meets Varthur Road: dense retail, older apartment stock and a short hop to the eastern technology parks.',
    character:
      'Marathahalli is a junction before it is a neighbourhood — Outer Ring Road meets Varthur Road here, and the retail that grew around the crossing now defines it. The housing is a dense mix of older apartment blocks, newer mid-rise projects and rented independent houses.',
    connectivity:
      'Outer Ring Road runs through it towards Bellandur one way and KR Puram the other, and the eastern technology parks are within a few kilometres. The airport is roughly 40 km north.',
    social:
      'Schools, clinics, a hospital and a great deal of everyday retail sit on and around the junction; the shopping is the reason many people come here rather than a by-product of living here.',
    supply:
      'Older apartment stock is what makes this address affordable, and it is also what makes a proper condition check worth the time.',
    band: '₹7,800 to ₹10,000 per square foot',
    priceTrendNote: 'Older stock trades well below new launches on the same road.',
    highlights: [
      'Outer Ring Road frontage with the technology parks minutes away',
      'The densest everyday retail on the eastern corridor',
      'Affordable older apartment stock alongside new launches',
      'Deep rental market driven by the neighbouring offices',
    ],
    connectivityRows: [
      ['Metro', 'Blue Line planned along Outer Ring Road; verify status'],
      ['Outer Ring Road', 'At the junction'],
      ['Kempegowda Airport', '40 km'],
      ['Railway', 'KR Puram station, 8 km'],
    ],
  },
  {
    name: 'Bellandur',
    zone: 'east',
    latitude: 12.926,
    longitude: 77.6762,
    pincodes: ['560103'],
    avgPricePerSqft: 9500,
    isFeatured: false,
    short:
      'High-rise living on the Outer Ring Road office corridor, wrapped around a lake, with the shortest commute of any residential address on the eastern belt.',
    character:
      'Bellandur is what happens when an office corridor grows its own housing: high-rise gated projects packed along Outer Ring Road and the roads behind it, wrapped around a lake that the city is still working to clean up.',
    connectivity:
      'The largest office campuses on the eastern belt are within walking or cycling distance of several projects here, which is unusual for Bengaluru. Sarjapur Road is 4 km south and the airport roughly 45 km north.',
    social:
      'Schools, clinics and large-format retail line the Ring Road, and the internal roads carry the restaurants and services the campuses generate.',
    supply:
      'Almost everything here is a high-rise flat in a large project, bought as often by investors letting to the campuses as by families.',
    band: '₹8,500 to ₹11,000 per square foot',
    priceTrendNote: 'Walk-to-work blocks carry the premium here; indicative.',
    highlights: [
      'Walk-to-work distance from the Outer Ring Road campuses',
      'Predominantly high-rise gated projects with full amenities',
      'Lake frontage on the southern blocks',
      'The strongest corporate rental demand on the eastern belt',
    ],
    connectivityRows: [
      ['Metro', 'Blue Line planned along Outer Ring Road; verify status'],
      ['Outer Ring Road', 'At the address'],
      ['Kempegowda Airport', '45 km'],
      ['Railway', 'Carmelaram station, 6 km'],
    ],
  },
  {
    name: 'Hennur',
    zone: 'north',
    latitude: 13.041,
    longitude: 77.64,
    pincodes: ['560043', '560077'],
    avgPricePerSqft: 7400,
    isFeatured: false,
    short:
      'A north Bengaluru corridor running towards Bagalur, with new gated projects, easy access to the Manyata employment belt and a moderate price band.',
    character:
      'Hennur Main Road runs north-east towards Bagalur, and the corridor has changed quickly: farmland and small layouts have given way to gated apartment projects aimed mostly at the technology workforce a few kilometres west.',
    connectivity:
      'The northern employment belt is about 6 km away and Outer Ring Road meets the corridor at its southern end. The airport is roughly 26 km north, which is one of the shorter runs in the city.',
    social:
      'Schools and neighbourhood clinics have followed the housing, with the larger hospitals and retail clustered back towards Hebbal and Kalyan Nagar.',
    supply:
      'New launches dominate, which means most listings come with a possession date rather than a key, and the timeline deserves as much attention as the price.',
    band: '₹6,500 to ₹8,500 per square foot',
    priceTrendNote: 'New-launch led corridor; the band widens past Bagalur Cross.',
    highlights: [
      'Short run to both the airport and the northern office belt',
      'Predominantly new gated projects with current-generation amenities',
      'A moderate price band for a north Bengaluru address',
      'Outer Ring Road access at the southern end of the corridor',
    ],
    connectivityRows: [
      ['Metro', 'Not served; nearest station at Nagawara'],
      ['Outer Ring Road', '4 km'],
      ['Kempegowda Airport', '26 km'],
      ['Railway', 'Banaswadi station, 6 km'],
    ],
  },
  {
    name: 'Thanisandra',
    zone: 'north',
    latitude: 13.057,
    longitude: 77.627,
    pincodes: ['560077'],
    avgPricePerSqft: 7800,
    isFeatured: false,
    short:
      'Large gated townships along Thanisandra Main Road, built for the northern technology belt, with the airport road a short drive west.',
    character:
      'Thanisandra Main Road carries some of the largest gated townships in north Bengaluru — projects of several hundred units with their own clubhouses, schools and retail — built for the technology belt immediately to the west.',
    connectivity:
      'The northern employment belt is roughly 4 km away, Outer Ring Road meets the corridor at Nagawara, and the airport is about 28 km up the Ballari Road.',
    social:
      'The larger townships carry schools and convenience retail inside them, with hospitals and shopping centres a short drive towards Hebbal.',
    supply:
      "Township units make up most of the supply, and where a unit sits inside the township matters more than the township's name.",
    band: '₹6,800 to ₹9,000 per square foot',
    priceTrendNote: 'Township projects set the band; standalone blocks trade below it.',
    highlights: [
      'Large townships with clubhouses, schools and retail on site',
      'Four kilometres from the northern technology belt',
      'Outer Ring Road access at Nagawara',
      'Airport within a half-hour drive outside peak hours',
    ],
    connectivityRows: [
      ['Metro', 'Not served; nearest station at Nagawara'],
      ['Outer Ring Road', '3 km (Nagawara)'],
      ['Kempegowda Airport', '28 km'],
      ['Railway', 'Yeshwanthpur station, 11 km'],
    ],
  },
  {
    name: 'Jayanagar',
    zone: 'south',
    latitude: 12.925,
    longitude: 77.5938,
    pincodes: ['560011', '560041'],
    avgPricePerSqft: 12500,
    isFeatured: false,
    short:
      'One of the oldest planned neighbourhoods in the city: numbered blocks, tree cover, a shopping complex at its centre and builder floors replacing old sites.',
    character:
      'Jayanagar is one of the oldest planned neighbourhoods in Bengaluru, laid out in numbered blocks around a central shopping complex. The tree cover is the best in south Bengaluru, and old sites are steadily being replaced by builder floors and small apartment blocks.',
    connectivity:
      'Green Line metro stations serve the western blocks and Outer Ring Road is a short drive south. The airport is about 42 km north, which is the one inconvenience of an otherwise central address.',
    social:
      'Schools, colleges, hospitals, markets and the shopping complex are all inside the neighbourhood, and most of them have been for decades.',
    supply:
      'Listings are mostly builder floors and redeveloped sites, and the land share behind the flat is usually the number worth asking about.',
    band: '₹11,000 to ₹14,500 per square foot',
    priceTrendNote: 'Site value dominates; built-up rates vary widely by block.',
    highlights: [
      'Planned blocks with the best tree cover in south Bengaluru',
      'Green Line metro serving the western blocks',
      'Mature schools, hospitals and markets within walking distance',
      'Builder floors on redeveloped sites rather than large towers',
    ],
    connectivityRows: [
      ['Metro', 'Green Line, western blocks'],
      ['Outer Ring Road', '6 km'],
      ['Kempegowda Airport', '42 km'],
      ['Railway', 'Bengaluru City junction, 8 km'],
    ],
  },
  {
    name: 'Rajajinagar',
    zone: 'west',
    latitude: 12.9916,
    longitude: 77.554,
    pincodes: ['560010', '560021'],
    avgPricePerSqft: 10500,
    isFeatured: false,
    short:
      'A planned west Bengaluru neighbourhood on the Green Line, with a large shopping centre, established markets and a steady supply of redevelopment projects.',
    character:
      'Rajajinagar is planned west Bengaluru: numbered blocks, a grid of main roads, established markets and a large shopping centre on the western edge. Redevelopment has brought a steady supply of new apartment blocks onto old sites.',
    connectivity:
      'Green Line metro stations run through the neighbourhood, the city railway station is about 4 km away and Outer Ring Road meets the area to the north-west. The airport is roughly 33 km.',
    social:
      'Schools, hospitals, markets and one of the larger shopping centres in the city are all inside the catchment, and the metro has made the rest of the city easy to reach without a car.',
    supply:
      'Redevelopment blocks of eight to twenty flats are the typical listing, and proximity to a metro station separates the fast sales from the slow ones.',
    band: '₹9,500 to ₹12,000 per square foot',
    priceTrendNote: 'Metro-adjacent blocks trade at the top of the band.',
    highlights: [
      'Green Line metro stations inside the neighbourhood',
      'Established markets and a large shopping centre',
      'Redevelopment supply of new apartments on old sites',
      'Four kilometres from the city railway station',
    ],
    connectivityRows: [
      ['Metro', 'Green Line, through the neighbourhood'],
      ['Outer Ring Road', '5 km'],
      ['Kempegowda Airport', '33 km'],
      ['Railway', 'Bengaluru City junction, 4 km'],
    ],
  },
  {
    name: 'Malleshwaram',
    zone: 'west',
    latitude: 13.0035,
    longitude: 77.5647,
    pincodes: ['560003', '560055'],
    avgPricePerSqft: 12000,
    isFeatured: false,
    short:
      'Numbered cross streets, old houses, temples and markets, with metro on Sampige Road and very little new supply outside redevelopment.',
    character:
      'Malleshwaram is a grid of numbered cross streets with old houses, temples, markets and a strong sense of its own history. New supply is almost entirely redevelopment: small apartment blocks and builder floors on sites that held a single house.',
    connectivity:
      'Metro on Sampige Road connects the neighbourhood to the centre and the north, Yeshwanthpur railway station is close by, and the airport is about 31 km up the Ballari Road.',
    social:
      'Schools, colleges, hospitals and the 8th Cross market sit inside the neighbourhood, and the walkability is unusual for a city this size.',
    supply:
      'Supply is thin enough that a good flat rarely stays listed long, and most of it comes from redevelopment rather than from new projects.',
    band: '₹11,000 to ₹14,000 per square foot',
    priceTrendNote: 'Thin supply keeps the band firm; site value dominates.',
    highlights: [
      'Metro on Sampige Road and Yeshwanthpur station nearby',
      'Genuinely walkable streets, markets and schools',
      'Redevelopment supply rather than large projects',
      'Established address with consistently thin resale supply',
    ],
    connectivityRows: [
      ['Metro', 'Green Line, Sampige Road'],
      ['Outer Ring Road', '6 km'],
      ['Kempegowda Airport', '31 km'],
      ['Railway', 'Yeshwanthpur station, 3 km'],
    ],
  },
  {
    name: 'KR Puram',
    zone: 'east',
    latitude: 13.007,
    longitude: 77.7,
    pincodes: ['560036', '560049'],
    avgPricePerSqft: 7000,
    isFeatured: false,
    short:
      'A rail and road junction on Old Madras Road with Purple Line metro, cheaper stock than the corridors it connects and quick access to both of them.',
    character:
      'KR Puram sits where the railway line, Old Madras Road and Outer Ring Road meet, and it has always been a place people pass through. The housing is older and cheaper than the corridors on either side, with new projects appearing on the roads behind the junction.',
    connectivity:
      'Purple Line metro runs through towards Whitefield one way and the centre the other, the railway station handles suburban and long-distance services, and Outer Ring Road turns south here towards Marathahalli.',
    social:
      'Schools, clinics and everyday retail serve the area, with the larger hospitals and shopping centres a short drive east or south.',
    supply:
      'Older flats and newer mid-rise projects sit side by side here, and the gap in price between them is wider than the gap in address.',
    band: '₹6,000 to ₹8,000 per square foot',
    priceTrendNote: 'The most affordable metro-served address on the eastern belt.',
    highlights: [
      'Purple Line metro and a working railway station',
      'Outer Ring Road and Old Madras Road at the same junction',
      'The lowest price band of the metro-served eastern localities',
      'Quick access to both the Whitefield and Hebbal corridors',
    ],
    connectivityRows: [
      ['Metro', 'Purple Line, KR Puram station'],
      ['Outer Ring Road', 'At the junction'],
      ['Kempegowda Airport', '32 km'],
      ['Railway', 'KR Puram station, at the junction'],
    ],
  },
];

module.exports = function localities({ stamps, slugify, media }) {
  return LOCALITIES.map((entry, index) => {
    const slug = slugify(entry.name);
    const caveat = CAVEATS[index % CAVEATS.length];

    return {
      id: index + 1,
      name: entry.name,
      slug,
      cityId: 1,
      zone: entry.zone,
      description: paragraphs(
        entry.character,
        entry.connectivity,
        entry.social,
        `Apartments in ${entry.name} typically trade in the ${entry.band} band. ${caveat}`,
        `${entry.supply} ${CLOSINGS[index % CLOSINGS.length]}`
      ),
      shortDescription: entry.short,
      heroImageUrl: media.photo({
        seed: `sna-locality-${slug}`,
        width: 1600,
        height: 900,
        alt: `${entry.name}, Bengaluru`,
        folder: 'localities',
        tags: ['locality', entry.zone],
      }),
      latitude: entry.latitude,
      longitude: entry.longitude,
      pincodes: entry.pincodes,
      highlights: entry.highlights,
      connectivity: entry.connectivityRows.map(([label, value]) => ({ label, value })),
      avgPricePerSqft: entry.avgPricePerSqft,
      priceTrendNote: entry.priceTrendNote,
      isFeatured: entry.isFeatured,
      isActive: true,
      order: index + 1,
      seo: makeSeo({
        title: `Property in ${entry.name}, Bengaluru`,
        description: fitDescription(entry.short),
        focusKeyword: `property in ${entry.name.toLowerCase()}`,
        secondaryKeywords: [
          `flats in ${entry.name.toLowerCase()}`,
          `${entry.name.toLowerCase()} bangalore price`,
        ],
        slug,
      }),
      ...stamps({ createdDaysAgo: 175 }),
    };
  });
};
