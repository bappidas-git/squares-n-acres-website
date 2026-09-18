# Data model — Squares N Acres

Every `db.json` collection and every field, copied verbatim from
`prompts/00_MASTER_CONTEXT.md` §6.1–§6.14, followed by the field-by-field mapping from the
boilerplate's shape (§6.15) that the seed conversion applies, and the id ranges the seed
reserves.

The same fields are machine-readable in `mock-server/schemas/models.js` (types, defaults,
validation) and their writable subset in `src/services/schemas/`; every enumerated value
comes from `src/config/enums.js`. The endpoints that serve them are in
`docs/API_CONTRACT.md`.

---

## 6. Data model (`db.json` collections; every field camelCase; `?` = nullable/optional; `(read)` = computed/embedded by the API, ignored on write)

Column legend: **Type** · **Null** (Y/N) · **Default** · **Enum/notes**. Every record also has `id` (int), `createdAt`, `updatedAt` unless stated.

### 6.1 `properties`

| Field | Type | Null | Default | Enum / notes |
| ----------------------------- | ----------------------- | ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------- | ------------------ | ---------- | --------------------------------- | ---------- | ----------- |
| `slug` | string | N | from title | unique |
| `title` | string | N | — | ≥ 10 chars |
| `projectName` | string | Y | null | |
| `listingType` | enum | N | `sale` | `sale                                                                                                                                                                                                                                          | rent               | lease` |
| `segment` | enum | N | `residential` | `residential                                                                                                                                                                                                                                   | commercial         | land` |
| `propertyTypeId` | int | N | — | FK propertyTypes |
| `propertyType` | object (read) | | | `{id,name,slug,segment}` |
| `constructionStatus` | enum | N | `ready-to-move` | `pre-launch                                                                                                                                                                                                                                    | under-construction | ready-to-move                         | resale` |
| `availability` | enum | N | `available` | `available                                                                                                                                                                                                                                     | sold               | rented                                | reserved` |
| `possessionDate` | date (yyyy-mm-dd) | Y | null | required for pre-launch/under-construction |
| `ageOfPropertyYears` | int | Y | null | ready-to-move/resale |
| `furnishing` | enum | Y | null | `unfurnished                                                                                                                                                                                                                                   | semi-furnished     | fully-furnished` |
| `facing` | enum | Y | null | `north                                                                                                                                                                                                                                         | south              | east                                  | west               | north-east | north-west                        | south-east | south-west` |
| `floorNumber` | int | Y | null | |
| `totalFloors` | int | Y | null | |
| `ownership` | enum | Y | null | `freehold                                                                                                                                                                                                                                      | leasehold          | co-operative-society                  | power-of-attorney` |
| `reraNumber` | string | Y | null | |
| `reraRegistered` | bool | N | false | |
| `description` | string (sanitised HTML) | N | `''` | ≥ 300 chars to activate |
| `shortDescription` | string | N | `''` | ≤ 300 chars |
| `highlights` | string[] | N | `[]` | |
| `amenityIds` | int[] | N | `[]` | FK amenities |
| `amenities` | object[] (read) | | | `{id,name,slug,icon,category}` |
| `badgeIds` | int[] | N | `[]` | FK badges |
| `badges` | object[] (read) | | | `{id,name,slug,color,icon}` |
| `specifications` | object[] | N | `[]` | `{ group (SPEC_GROUPS), label, value, icon? }` |
| `constructionSpecs` | object[] | N | `[]` | `{ group (SPEC_GROUPS), label, value }` |
| `unitConfigurations` | object[] | N | `[]` | `{ id, name, bedrooms?, bathrooms?, superBuiltUpArea?, carpetArea?, areaUnit, price?, priceOnRequest, floorPlanImageUrl?, floorPlanPdfUrl?, availableUnits?, isActive }` |
| `floorPlans` | object[] | N | `[]` | `{ id, title, imageUrl, pdfUrl?, area?, areaUnit, bedrooms?, price?, order }` |
| `images` | object[] | N | `[]` | `{ id, url, alt, caption?, order, isCover }`; exactly one `isCover` when non-empty |
| `videoUrl` | string | Y | null | YouTube/Vimeo/MP4 URL |
| `virtualTourUrl` | string | Y | null | |
| `brochureUrl` | string | Y | null | |
| `brochureLeadGated` | bool | N | true | |
| `documents` | object[] | N | `[]` | `{ id, title, url, type (brochure                                                                                                                                                                                                              | approval           | legal                                 | floor-plan         | price-list | other), leadGated, order }` |
| `location` | object | N | see notes | `{ address, localityId, locality (read {id,name,slug}), cityId, city (read), pincode?, landmark?, latitude?, longitude?, mapEmbedUrl?, showExactLocation (bool, default false) }` |
| `nearbyPlaces` | object[] | N | `[]` | `{ id, name, category (NEARBY_CATEGORIES), distanceKm?, travelTimeMin?, order }` |
| `pricing` | object | N | see notes | `{ price?, priceOnRequest (bool), priceRangeMin?, priceRangeMax?, pricePerSqft?, priceNegotiable (bool), rentPerMonth?, securityDeposit?, maintenanceChargesMonthly?, bookingAmount?, otherCharges[] {label, amount, note?}, currency:'INR' }` |
| `area` | object | N | see notes | `{ superBuiltUpArea?, builtUpArea?, carpetArea?, plotArea?, areaUnit (AREA_UNITS, default sqft), plotLength?, plotWidth?, plotDimensionUnit? }` |
| `configuration` | object | N | see notes | `{ bedrooms?, bathrooms?, balconies?, parkingCovered?, parkingOpen?, servantRoom (bool), studyRoom (bool), poojaRoom (bool), kitchenType? (modular                                                                                             | semi-modular       | regular) }` |
| `project` | object | N | see notes | `{ developerId?, developer (read {id,name,slug,logoUrl}), totalUnits?, totalTowers?, totalFloors?, projectAreaAcres?, openAreaPercent?, launchDate?, approvals[] (bbmp                                                                         | bda                | bmrda                                 | biaapa             | rera       | other), landmarkProject (bool) }` |
| `constructionTimeline` | object[] | N | `[]` | `{ id, milestone, date?, status (completed                                                                                                                                                                                                     | in-progress        | upcoming), imageUrl?, note?, order }` |
| `constructionProgressPercent` | int | Y | null | 0–100 |
| `faqs` | object[] | N | `[]` | `{ id, question, answer (HTML), order }` |
| `similarPropertyIds` | int[] | N | `[]` | max 6, ordered |
| `sectionVisibility` | object | N | all true | keys `overview, highlights, specifications, amenities, unitConfigurations, floorPlans, gallery, video, virtualTour, documents, construction, builder, nearby, location, finance, faqs, similar, enquiry` (bool each). The labels, the order the page prints them in and the data each one needs are `src/utils/propertySections.js` (`SECTION_DEFINITIONS`); a section renders only when its key is not `false` **and** `hasData()` is true |
| `agent` | object | N | `{showOnListing:false}` | `{ teamMemberId?, name?, phone?, whatsapp?, email?, photoUrl?, showOnListing }` |
| `seo` | object | N | §9.6 defaults | §9.6 |
| `isActive` | bool | N | false | |
| `isFeatured` | bool | N | false | |
| `isVerified` | bool | N | false | |
| `priorityOrder` | int | N | 0 | |
| `viewCount` | int | N | 0 | server-managed |
| `enquiryCount` | int | N | 0 | server-managed |
| `publishedAt` | datetime | Y | null | set when `isActive` first becomes true |
| `createdBy`, `updatedBy` | int | Y | null | user ids (admin only) |

### 6.2 `localities` and `cities`

`localities`: `name` (string, unique per city), `slug` (unique), `cityId` (int), `city` (read), `zone` (`north|south|east|west|central`), `description` (HTML), `shortDescription` (≤ 300), `heroImageUrl?`, `latitude?`, `longitude?`, `pincodes` (string[]), `highlights` (string[]), `connectivity` (`{label, value}[]`), `avgPricePerSqft?` (int), `priceTrendNote?`, `isFeatured` (false), `isActive` (true), `order` (0), `seo`, `propertyCount` (read: active properties).
`cities`: `name`, `slug`, `state`, `isActive` (seed: `{id:1, name:'Bengaluru', slug:'bengaluru', state:'Karnataka', isActive:true}`).

### 6.3 `propertyTypes`

`name`, `slug` (**plural URL form**, D25: `apartments, villas, independent-houses, row-houses, penthouses, duplexes, studios, builder-floors, residential-plots, farm-land, office-spaces, co-working-spaces, retail-shops, warehouses, industrial-sheds, commercial-plots, pg-co-living`), `segment` (residential for the first 8; `residential-plots` and `farm-land` → `land`; `office-spaces`…`industrial-sheds` → `commercial`; `commercial-plots` → `land`; `pg-co-living` → `residential`), `icon` (Iconify id), `description?`, `isActive`, `order`, `seo`, `propertyCount` (read: active listings of this type).

### 6.4 `amenities` and `badges`

`amenities`: `name`, `slug`, `category` (`basic|lifestyle|safety|sports|kids|eco|convenience|commercial`), `icon`, `isActive`, `order`. Seed ≥ 40 across all categories (e.g. basic: Power Backup, Lift, Water Supply, Piped Gas, Intercom; lifestyle: Swimming Pool, Clubhouse, Gymnasium, Spa, Mini Theatre, Library, Party Hall, Landscaped Gardens; safety: 24×7 Security, CCTV, Fire Safety, Gated Community, Video Door Phone; sports: Tennis, Badminton, Basketball, Cricket Pitch, Jogging Track, Yoga Deck, Table Tennis; kids: Kids Play Area, Crèche, Kids Pool; eco: Rainwater Harvesting, Solar Lighting, STP, Organic Waste Converter, EV Charging; convenience: Covered Parking, Visitor Parking, Wi-Fi, Convenience Store, ATM, Cafeteria; commercial: Conference Room, Reception, Pantry, Server Room, Loading Dock, Cold Storage).
`badges`: `name`, `slug`, `color` (**token name**, e.g. `primary`, `success`, `info`, `warning`, `charcoal` — never hex), `icon?`, `isActive`, `order`. Seed: New Launch, Hot Deal, Ready to Move, RERA Approved, Verified, Premium, Price Drop, Limited Units.
Both collections also carry `propertyCount` (read: active listings that carry the record), which the admin lists show and sort on.

### 6.5 `developers`

`name`, `slug`, `logoUrl?`, `coverImageUrl?`, `description` (HTML), `shortDescription`, `establishedYear?`, `headquarters?`, `website?`, `totalProjects?`, `ongoingProjects?`, `completedProjects?`, `reraIds` (string[]), `highlights` (string[]), `isFeatured`, `isActive`, `order`, `seo`, `propertyCount` (read). **Seed developers are fictional** (e.g. "Aurelia Estates", "Nandi Ridge Developers", "Cauvery Homes", "Prakriti Builders", "Skyline Bengaluru", "Trident Habitat", "Vasanth Constructions", "Greenfield Realty").

### 6.6 `banks`

`name`, `slug`, `logoUrl?`, `interestRateMin` (number, % p.a.), `interestRateMax`, `processingFeeNote?`, `maxTenureYears`, `maxLtvPercent`, `minLoanAmount?`, `maxLoanAmount?`, `features` (string[]), `applyUrl?`, `isActive`, `order`. Seed: 6 **fictional** banks ("Garden City Bank", "Southern Housing Finance", "Nandi Cooperative Bank", "Cauvery Home Finance", "Metro Capital Bank", "Prime Housing NBFC"). Replaces `DEFAULT_BANKS`; when no active bank exists the finance section is hidden.

### 6.7 `leads`

`name` (N), `email?`, `phone` (N, Indian mobile), `message?`, `source` (LEAD_SOURCES), `propertyId?`, `property` (read `{id,title,slug}`), `articleId?`, `pageSlug?`, `pageUrl?`, `requirement` (`{ listingType?, propertyTypeId?, localityId?, bedrooms?, budgetMin?, budgetMax?, timeline? (immediate|1-3-months|3-6-months|6-12-months|exploring) }`), `status` (`new|contacted|qualified|site-visit|negotiation|converted|lost`, default new), `priority` (`low|medium|high`, default from `siteSettings.leads.defaultPriority`), `assignedTo?` (user id), `assignedUser` (read `{id,name}`), `followUpAt?`, `lostReason?`, `notes[]` (`{ id, text, createdBy, createdByName, createdAt }`), `activities[]` (`{ id, type (created|status-changed|assigned|note-added|follow-up-set|contacted|email-sent|call-logged|priority-changed), description, createdBy?, createdAt }`), `utm` (`{source?, medium?, campaign?, term?, content?}`), `consent` (bool), `meta?` (object — **D56**: free-form source-specific payload, e.g. the financial assessment answers/score and the bank name), `ipAddress?`, `userAgent?`.

`pageSlug` holds a CMS page's **whole** slug, which §6.10 types as a URL path:
a lead sent from `buyer-assistance/home-loan` carries that string, separators
and all. It is a slug path and never a URL — a leading `/` is a 422 (prompt 45,
MB-02) — and it is capped at the page's own 120 characters.

### 6.8 `articles`, `articleCategories`, `articleTags`, `authors`

`articles`: `slug`, `title` (20–100), `excerpt` (≤ 300), `content` (sanitised HTML), `contentText` (read: plain text generated on save), `featuredImage` (`{url, alt, caption?}`), `categoryId`, `category` (read `{id,name,slug}`), `tagIds[]`, `tags` (read), `authorId`, `author` (read `{id,name,slug,avatarUrl,designation}`), `status` (`draft|scheduled|published|archived`), `publishedAt?`, `updatedAtDisplay?`, `readingTimeMinutes` (computed: ceil(words/200)), `wordCount` (computed), `isFeatured`, `allowComments` (false, reserved), `relatedArticleIds[]`, `relatedPropertyIds[]`, `faqs[]` (`{question, answer}`), `tableOfContents` (true), `seo`, `viewCount`.
`articleCategories`: `name`, `slug`, `description?`, `seo`, `order`, `isActive`, `articleCount` (read). Seed 4 (D76): `buying-guides` "Buying Guides", `market-trends` "Market Trends", `legal-rera` "Legal & RERA", `investment-finance` "Investment & Finance".
`articleTags`: `name`, `slug`, `articleCount` (read). Seed 15 (rera, khata, stamp-duty, home-loan, whitefield, sarjapur-road, north-bangalore, nri, rental-yield, plots, first-time-buyer, checklist, emi, registration, investment).
`authors`: `name`, `slug`, `designation?`, `bio` (HTML), `avatarUrl?`, `email?` (private), `socialLinks` (`{linkedin?, twitter?, website?}`), `isActive`, `seo`. Seed 3 placeholder authors ("Editorial Team", "Research Desk", "Legal Desk" — designations as placeholders).

### 6.9 `faqs`, `testimonials`, `teamMembers`, `partners`

`faqs`: `question`, `answer` (HTML), `category` (`buying|selling|renting|home-loan|legal|rera|nri|general`), `order`, `isActive`, `showOnHome` (bool), `propertyTypeId?`.
`testimonials`: `name`, `designation?`, `location?`, `rating` (1–5), `message`, `avatarUrl?`, `propertyId?`, `isFeatured`, `isActive`, `order`, `isSample` (true in seed; sample records never render in production builds).
`teamMembers`: `name`, `slug`, `designation`, `phone?`, `whatsapp?`, `email?`, `photoUrl?`, `bio?`, `reraId?`, `socialLinks` (object), `order`, `isActive`, `showOnAbout`.
`partners`: `name`, `logoUrl`, `websiteUrl?`, `category` (`developer|bank|legal|interior|other`), `order`, `isActive`.

### 6.10 `pages` (CMS)

`slug`, `title`, `template` (`standard|service|about|contact|careers|awareness|legal|landing`), `status` (`draft|published`), `heroImageUrl?`, `blocks[]` (`{ id, type, order, data }`), `leadSource?`, `seo`, `order`, `showInFooter` (bool), `footerColumn?` (`company|services|insights`), `showInHeader` (bool), `headerMenu?` (`buyer-assistance|company|insights`).

A page's `slug` is a URL **path** — one or more slug segments joined by `/`,
≤ 120 characters — and `seo.slug` mirrors it. Two rules the API enforces (prompt
45): an **empty** slug is a request to derive one from the title, exactly as it
is for every other slugged resource (§5.9, MB-03); and a slug whose first
segment is one of `RESERVED_PATH_PREFIXES` is refused with a 422 keyed `slug`,
because the router answers those paths before the CMS catch-all, so such a page
would exist and never be reachable (D11, MB-04). A page **already** living under
one keeps its slug — the rule fires on a create and on an update that changes
the slug, which is how the seeded `insights/real-estate-awareness` page stays
where it is.

Block types and `data` shapes (BLOCK_TYPES):

| type | data |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | -------------------------------- |
| `hero` | `{ title, subtitle, imageUrl?, ctaLabel?, ctaHref? }` |
| `richText` | `{ html }` |
| `features` | `{ title, subtitle?, items[] { icon, title, text } }` |
| `steps` | `{ title, subtitle?, items[] { title, text } }` |
| `stats` | `{ items[] { label, value, suffix? } }` — rendered only when `items.length > 0` |
| `faq` | `{ title, faqIds[]?, items[] { question, answer }? }` |
| `cta` | `{ title, text, buttonLabel, buttonHref, leadSource? }` (when `leadSource` is set the button opens `LeadCaptureModal`) |
| `leadForm` | `{ title, subtitle, fields[] (LeadForm field config), leadSource, successMessage }` |
| `team` | `{ title, memberIds[] }` (empty = all `showOnAbout`) |
| `testimonials` | `{ title, ids[] }` (empty = featured) |
| `properties` | `{ title, mode (featured                                                                                                                                     | ids | filter), ids[], filter {} }` |
| `articles` | `{ title, mode (latest                                                                                                                                       | ids | category), ids[], categoryId? }` |
| `checklist` | `{ title, intro?, items[] { text, detail? } }` (interactive, progress persisted in localStorage `sna_checklist:<pageSlug>`) |
| `quiz` | `{ title, intro?, questions[] { question, options[], answerIndex, explanation } }` |
| `map` | `{ embedUrl? , latitude?, longitude? }` (falls back to settings) |
| `contactInfo` | `{}` (reads settings) |
| `image` | `{ url, alt, caption? }` |
| `banks` | `{ title, showEmiCalculator (bool) }` |
| `partners` | `{ title, category? }` |
| `html` | `{ html }` (sanitised) |
| `jobs` | `{ title }` (lists active jobs; careers template) |
| `facts` | `{ title, items[] { stat, label, icon } }` (the "Did you know" cards of the awareness page) |
| `expandableCards` | `{ title, items[] { id, icon, title, summary, html } }` (the "Essential knowledge" cards; also used by Legal services) |
| `packages` | `{ title, items[] { name, price, unit, features[], highlighted, ctaLabel? } }` (interior design packages; CTA opens lead modal with the page's `leadSource`) |
| `gallery` | `{ title, items[] { url, alt, caption? } }` |

Seed pages (each reproduces the HOM page's structure/type of content with SNA-neutral placeholder copy): `home` (landing: `features` "Why choose Squares N Acres" ×4, `steps` "How it works" ×4), `about` (about: hero, richText story, `steps` timeline-as-steps, `features` values, richText mission/vision, `stats` (empty → hidden), `team`, `testimonials`, `cta`), `contact` (contact: hero, `contactInfo`, `leadForm` source `contact-page` with subject select, `map`), `sell-let` (service: hero, `stats` (empty), `features` benefits ×4, `steps` ×4, `leadForm` source `sell-let` with propertyType/location/askingPrice/description fields), `careers` (careers: hero, `features` culture ×3, `jobs`, `features` perks ×6), `partnership` (service: hero, `features` why ×4, `features` types ×4, `partners`, `leadForm` source `partnership` with companyName/partnershipType), `buyer-assistance/home-loan` (service: hero, `banks` with EMI calculator, `steps` ×4, `checklist` documents ×8, `leadForm` source `home-loan` with monthlyIncome/desiredLoanAmount, `faq`), `buyer-assistance/legal-assistance` (service: hero, `stats` (empty), `expandableCards` services ×6, `steps` ×3, `leadForm` source `legal-assistance` with serviceType, `faq`), `buyer-assistance/interior-designing` (service: hero, `features` rooms ×6, `steps` ×5, `gallery` ×8 placeholders, `packages` ×3, `leadForm` source `interior-design` with propertyType/budget), `flexible-workspace` (service: hero, `features` ×6, `features` benefits ×4, `leadForm` source `flexible-workspace` with workspaceType/teamSize), `direct-lease-retails` (service: hero, `features` ×4, `features` ×4, `steps` ×4, `leadForm` source `direct-lease-retail` with spaceType/areaRequired), `insights/real-estate-awareness` (awareness: hero, `facts` ×6, `expandableCards` ×6, `quiz` ×5, `checklist` ×10, `leadForm` source `real-estate-awareness` with interest select), `privacy-policy`, `terms-of-use`, `disclaimer` (legal: hero + richText placeholders clearly marked "[Client to provide]").

### 6.11 `jobOpenings`, `jobApplications`

`jobOpenings`: `slug`, `title`, `department`, `location`, `employmentType` (`full-time|part-time|contract|internship`), `experience?`, `description` (HTML), `responsibilities[]`, `requirements[]`, `salaryRange?`, `isActive`, `postedAt`, `closesAt?`.
`jobApplications`: `jobId`, `job` (read `{id,title,slug}`), `name`, `email`, `phone`, `resumeUrl`, `coverLetter?`, `linkedinUrl?`, `status` (`new|shortlisted|interview|rejected|hired`), `notes?`, `createdAt`.

### 6.12 `media`

`url`, `publicId?`, `provider` (`cloudinary|external`), `type` (`image|video|document`), `width?`, `height?`, `bytes?`, `format?`, `alt`, `title?`, `folder?`, `tags[]`, `usedIn[]?` (read, best-effort `{type,id,title}`), `createdBy?`, `createdAt`.

### 6.13 `siteSettings` (singleton object, not an array)

```
general { siteName:'Squares N Acres', tagline, logoUrl, iconUrl, siteUrl, defaultLanguage:'en-IN', contactEmail, contactPhone, alternatePhone?, whatsappNumber, whatsappDefaultMessage,
          address { line1, line2?, locality?, city, state, pincode, country }, mapEmbedUrl?, latitude?, longitude?, workingHours[] { days, hours }, reraNumber?, gstNumber?, establishedYear? }
hero { title, subtitle, backgroundImageUrl?, backgroundVideoUrl?, mobileImageUrl?, searchTabs[] (sale|rent|lease|commercial|plots), stats[] { label, value, suffix? } (empty = hidden), badges[] (strings) }
navigation { headerCtaLabel:'Post Requirement', headerCtaHref:'#post-requirement', showCallButton:true, showWhatsappButton:true }
social { facebook?, instagram?, linkedin?, youtube?, x?, pinterest? }
footer { aboutText, columns[] { title, links[] { label, href, external } }, disclaimer, copyrightText, showNewsletter:true, showGallery:false, galleryImageUrls[] }
newsletter { enabled:true, title, subtitle, successMessage }
integrations { googleAnalyticsId?, googleTagManagerId?, facebookPixelId?, googleMapsApiKey?, cloudinaryCloudName?, cloudinaryUploadPreset?, recaptchaSiteKey? }
leads { notificationEmails[], autoAssign ('none'|'round-robin'), defaultPriority:'medium' }
updatedAt
```

Public subset (`GET /settings`): everything except `leads` and `integrations.recaptchaSiteKey`-style secrets (`integrations` public keys: `googleAnalyticsId`, `googleTagManagerId`, `facebookPixelId`, `googleMapsApiKey`, `cloudinaryCloudName`, `cloudinaryUploadPreset`, `recaptchaSiteKey` are all public by nature — there are no secrets in the model; `leads.*` is admin-only).

### 6.14 `seoSettings` (singleton), `redirects`, `newsletterSubscribers`, `adminUsers`, `apiTokens`, `propertyViews`

`seoSettings`: `siteUrl`, `separator` (`'|'`), `titleTemplates { default, home, property, listing, locality, developer, article, articleCategory, page, author, search }` (§9.5 defaults), `defaults { metaDescription, ogImageUrl, twitterCard:'summary_large_image', robots { index:true, follow:true } }`, `knowledgeGraph { type (Organization|RealEstateAgent|LocalBusiness), name, legalName?, logoUrl, description, phone, email, address { streetAddress, addressLocality, addressRegion, postalCode, addressCountry:'IN' }, geo { latitude, longitude }, openingHours[] (schema.org strings), priceRange?, areaServed[], sameAs[] }`, `verification { google?, bing?, pinterest?, yandex? }`, `robotsTxt` (string, §9.8 default), `llmsTxt` (string), `sitemap { enabled, includeProperties, includeLocalities, includeDevelopers, includeArticles, includePages, changefreq { property:'weekly', locality:'weekly', developer:'monthly', article:'monthly', page:'monthly' }, priority { property:0.8, locality:0.7, developer:0.6, article:0.6, page:0.5 }, excludeUrls[] }`, `breadcrumbs { enabled:true, homeLabel:'Home' }`, `noindex { searchResults:true, paginatedListings:false, filteredListings:true, adminAndAuth:true }`, `customHeadHtml?`, `customBodyEndHtml?`, `updatedAt`.
`redirects`: `fromPath`, `toPath`, `statusCode` (301|302), `isActive`, `hits`, `note?`.
`newsletterSubscribers`: `email` (unique), `name?`, `source`, `status` (`subscribed|unsubscribed`).
`adminUsers`: `name`, `email` (unique), `password` (**plaintext only in the mock seed**; Laravel hashes), `role` (`admin|manager|sales`), `phone?`, `avatarUrl?`, `isActive`, `lastLoginAt?`. Seed: `admin@squaresnacres.com / Admin@123`, `manager@squaresnacres.com / Manager@123`, `sales@squaresnacres.com / Sales@123` (mock only; documented for rotation).
`apiTokens` (mock only): `userId`, `token` (48 chars), `expiresAt`, `createdAt`.
`propertyViews` (optional analytics): `propertyId`, `viewedAt`, `referrer?` — the mock appends one record per counted view and the dashboard `viewsByDay` reads it.

### HOM → SNA field mapping

The contract for the seed conversion (D38): every left-hand field of the boilerplate has a
destination, and nothing is dropped without a decision saying so.

| HOM (`db.json` / form) | SNA | Rule |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| `properties.type` (`sale                                                                                                                                                                                                                         | rent`) | `listingType` | + `lease` supported |
| `status` (`pre-launch                                                                                                                                                                                                                            | under-construction                                                                                                                                                                                                                                                                                                                                  | ready-to-move`) | `constructionStatus` | + `resale` |
| `propertyType` / `category` (`apartment`, `villa`, …) | `propertyTypeId` → `propertyTypes.slug` plural (`apartments`, `villas`) | `segment` derived from the type |
| `publishStatus` (`published                                                                                                                                                                                                                      | draft`) / `isActive` | `isActive` (+ `publishedAt`) | draft ⇒ `isActive:false` |
| `price` + `priceUnit` (`onwards`, `per month`, `Cr`, `Lakhs`) | sale: `pricing.price` (= starting price), `pricing.priceRangeMax` when unit configurations exist; rent/lease: `pricing.rentPerMonth` | `priceUnit` dropped |
| `configuration[]` (`"2 BHK"`, `"3 BHK"`) | `unitConfigurations[].name/bedrooms` + `configuration.bedrooms` = min | strings parsed with `/(\d+(\.\d+)?)\s*BHK/` |
| `dimensionRange {min,max,unit}` | `area.superBuiltUpArea` = min, `area.areaUnit` = unit; max lives in `unitConfigurations` | |
| `possession` (string) | `possessionDate` (yyyy-mm-01) or `ageOfPropertyYears` for ready-to-move | "Ready to Move" ⇒ null |
| `developer` (string) + `developerInfo {name,description,logo,stats[]}` | `developers` record + `project.developerId`; `stats` → `establishedYear`/`totalProjects`/`completedProjects` | fictional names in seed |
| `description` (plain text) | `description` (HTML `<p>…</p>`) | |
| `highlights[]` (strings) + `specialities[] {icon,name,description}` | `highlights[]` strings (`name — description`) | icons dropped (D60) |
| `specifications` object (`projectArea, towers, totalUnits, floors, constructionType, reraId, launchDate, possessionDate`) / `specificationsArray[] {key,value,icon}` | `project.projectAreaAcres/totalTowers/totalUnits/totalFloors/launchDate`, `reraNumber`, `possessionDate`, remaining → `specifications[] { group:'other', label:key, value }` | |
| `constructionSpecs { flooring:[{area,spec}], doors, structure, electrical, plumbing, others }` | `constructionSpecs[] { group (flooring→flooring, doors→doors-windows, structure→structure, electrical→electrical, plumbing→bathroom, others→other), label:area, value:spec }` | |
| `amenities[] {icon,name,category}` | `amenityIds[]` (matched by name to master data; unknown → created in seed) | categories re-mapped (leisure→lifestyle, fitness→lifestyle) |
| `floorPlans[] {config, area, price, image, bedrooms, bathrooms}` | `unitConfigurations[]` **and** `floorPlans[]` | see D61 |
| `gallery[]` (URL strings incl. `.mp4`) | `images[] {url, alt, order, isCover}`; video URLs → `videoUrl` | alt generated `"<title> – photo n"` in seed, then improved manually |
| `brochureUrl`, `floorPlanPdfUrl` | `brochureUrl` (+ `brochureLeadGated:true`); `floorPlanPdfUrl` → `floorPlans[0].pdfUrl` | |
| `documents[] {name, icon, url}` | `documents[] {title, url, type, leadGated:true, order}` | type by name (RERA→approval, brochure→brochure, floor plan→floor-plan, else other) |
| `nearbyPlaces[] {name, distance:"3 km", type}` | `nearbyPlaces[] {name, category, distanceKm, order}` | type map: education→school, healthcare→hospital, shopping→mall, transport→metro (or other), workplace→it-park, landmark→other, entertainment→other, school→school, hospital→hospital, restaurant→restaurant, park→park, bank→bank |
| `constructionTimeline[] {label,status:pending                                                                                                                                                                                                    | in-progress                                                                                                                                                                                                                                                                                                                                         | completed,icon}` | `constructionTimeline[] {milestone,status: pending→upcoming, order}` | |
| `faqs[] {question,answer}` | `faqs[] {id,question,answer (HTML),order}` | |
| `similarPropertyIds[]` (strings) | `similarPropertyIds[]` (ints) | |
| `tags[]` (`featured, popular, just-launched, premium, hot-deal, trending, new-launch, …`) | `isFeatured` (from `featured`), `badgeIds` (`premium`→Premium, `hot-deal`→Hot Deal, `new-launch`/`just-launched`→New Launch, `ready-to-move`→Ready to Move); everything else dropped | D58 |
| `sections {overview, details, highlights, amenities, floorPlans, finance, location, documents, construction, constructionSpecs, developer, faqs, similar}` | `sectionVisibility` (details→specifications, constructionSpecs→specifications, location→location+nearby, developer→builder; new keys default true) | D59 |
| `seoTitle, seoDescription, seoKeywords[], canonicalUrl, ogTitle, ogDescription, ogImage, twitterCard, schemaMarkup` | `seo.title`, `seo.description`, `seo.focusKeyword` = keywords[0], `seo.secondaryKeywords` = keywords[1..4], `seo.canonicalUrl` regenerated, `seo.og.*`, `seo.twitter.card`; `schemaMarkup` dropped (auto-generated) | |
| `location {area, city, state, lat, lng, address}` | `location.localityId` (locality matched/created from `area`), `cityId`, `address`, `latitude`, `longitude`, `showExactLocation:false` | |
| `neighborhoods {name, image, propertyCount, city, isActive}` | `localities {name, slug, heroImageUrl, cityId, isActive, order}`; `propertyCount` computed | |
| `partners {name, logo, website, isActive, order}` | `partners {name, logoUrl, websiteUrl, category:'developer', isActive, order}` | fictional names |
| `faqs.category` `finance` | `home-loan` | answers wrapped in `<p>` |
| `articles {content (Markdown), image, category (enum), tags[] strings, author string, readTime, isTrending, trendingOrder, isActive, seoTitle, seoDescription}` | `content` HTML, `featuredImage{url,alt}`, `categoryId`, `tagIds[]`, `authorId`, `readingTimeMinutes` computed, trending dropped (viewCount), `status`, `seo.title/description` | |
| `leads {source, notes[] {text, addedAt}, assessmentData, propertyId mixed types}` | `source` via the map in §6.17, `notes[] {id,text,createdBy,createdByName,createdAt}`, `meta` = assessmentData, `propertyId` int | |
| `siteSettings {contactInfo, socialLinks, newsletterText, newsletterSubtitle, heroText{title,subtitle,backgroundMedia,backgroundImage}, tagline, companyName, companySubtitle, companyDescription, footerLinks, footerLinkGroups, footerGallery}` | `general.contact*`, `social`, `newsletter.title/subtitle`, `hero.title/subtitle/backgroundVideoUrl/backgroundImageUrl`, `general.tagline`, `general.siteName`, `footer.aboutText`, `footer.columns` (from `footerLinkGroups`), `footer.galleryImageUrls` (from `footerGallery`, default hidden); `companySubtitle` and legacy `footerLinks` dropped | |
| `adminUsers {avatar}` | `avatarUrl` | new emails/passwords |

### Singletons

`siteSettings` and `seoSettings` are **objects, not arrays**. They carry no `id`, are never
created or deleted, and are read and replaced through their own endpoints
(`GET /settings`, `GET|PUT /admin/settings`, `GET /seo/settings`,
`GET|PUT /admin/seo/settings`). `PUT` deep-merges the known keys only, so a form that posts
one branch never wipes the others. On Laravel they are a single row each (or a key/value
settings table); `mock-server/schemas/models.js` marks them `singleton: true`.

### Seed ids

Ids are integers assigned by the API as `max(id) + 1` per collection (D14), which is what
MySQL auto-increment does. The seed (prompt 10) re-ids everything from 1 and stays inside
the range reserved below, so a hand-written cross-reference in the seed (a
`similarPropertyIds`, a `propertyId` on a lead) can never collide with a record a later
prompt adds.

| Collection              | Reserved ids | Seeded                                |
| ----------------------- | ------------ | ------------------------------------- |
| `properties`            | 1–60         | 36+                                   |
| `localities`            | 1–30         | 20                                    |
| `cities`                | 1–5          | 1 (Bengaluru)                         |
| `propertyTypes`         | 1–20         | 17                                    |
| `amenities`             | 1–60         | 40+                                   |
| `badges`                | 1–10         | 8                                     |
| `developers`            | 1–15         | 8                                     |
| `banks`                 | 1–10         | 6                                     |
| `leads`                 | 1–100        | 45                                    |
| `articles`              | 1–30         | 12+                                   |
| `articleCategories`     | 1–10         | 4                                     |
| `articleTags`           | 1–30         | 15                                    |
| `authors`               | 1–10         | 3                                     |
| `faqs`                  | 1–40         | 20                                    |
| `testimonials`          | 1–20         | 8                                     |
| `teamMembers`           | 1–15         | 6                                     |
| `partners`              | 1–15         | 6                                     |
| `pages`                 | 1–30         | 15                                    |
| `jobOpenings`           | 1–10         | 4                                     |
| `jobApplications`       | 1–20         | 3                                     |
| `media`                 | 1–400        | one per seeded image                  |
| `redirects`             | 1–10         | 3                                     |
| `newsletterSubscribers` | 1–30         | 12                                    |
| `adminUsers`            | 1–5          | 3 (admin, manager, sales)             |
| `apiTokens`             | from 1       | none — written at runtime by the mock |
| `propertyViews`         | from 1       | none — written at runtime by the mock |

Nested collections (`property.images`, `property.unitConfigurations`, `lead.notes`,
`page.blocks`, …) carry their own integer `id`, unique inside the parent record only.
