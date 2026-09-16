# Seed guide

`db.json` at the repository root is the **seed** of the mock API: a complete,
internally consistent database in the shape of `prompts/00_MASTER_CONTEXT.md`
§6. The mock server reads it, copies it to `mock-server/.runtime/db.json` and
works there, so the committed file is never written by the running application.

Since prompt 10 the file is **generated**, not hand-edited:
`scripts/seed/build-seed.js` assembles it from the modules in
`scripts/seed/data/`. `docs/DATA_MODEL.md` is the field-by-field reference;
this is the operational side.

**Generated for `2026-09-16T09:00:00.000Z`** (`GENERATED_AT` in
`scripts/seed/lib/dates.js`). Every relative date in the seed — "created 40
days ago", "follow up in a week", the scheduled article — is measured from that
instant rather than from the clock, which is what makes two builds identical.

## Contents

| Collection              | Count  | Notes                                                                            |
| ----------------------- | ------ | -------------------------------------------------------------------------------- |
| `properties`            | 40     | 38 active, 2 drafts; 10 featured, 20 verified; all 17 types, all 3 listing types |
| `localities`            | 20     | The real Bengaluru neighbourhoods of §10; 8 featured                             |
| `cities`                | 1      | Bengaluru                                                                        |
| `propertyTypes`         | 17     | The complete list of §6.3, plural slugs (D25)                                    |
| `amenities`             | 46     | All eight categories of §6.4                                                     |
| `badges`                | 8      | Tone names, never hex (§2.4)                                                     |
| `developers`            | 8      | Fictional; `aurelia-estates` is id 1; 4 featured                                 |
| `banks`                 | 6      | Fictional; every rate marked indicative                                          |
| `leads`                 | 45     | Last 90 days; all 29 sources, every status, 15 to sales, 5 to the manager        |
| `articles`              | 12     | 10 published, 1 scheduled, 1 draft; 838–1 154 words each                         |
| `articleCategories`     | 4      | D76                                                                              |
| `articleTags`           | 15     |                                                                                  |
| `authors`               | 3      | Editorial Team, Research Desk, Legal Desk (placeholders)                         |
| `faqs`                  | 20     | All eight categories; 6 `showOnHome`                                             |
| `testimonials`          | 8      | `isSample: true` — never rendered in a production build (D41)                    |
| `teamMembers`           | 6      | Placeholders (`Team Member 1`…)                                                  |
| `partners`              | 6      | Fictional, across all five categories                                            |
| `pages`                 | 15     | The §6.10 set; four slugs are paths (`buyer-assistance/home-loan`)               |
| `jobOpenings`           | 4      | `real-estate-advisor-bengaluru` is id 1                                          |
| `jobApplications`       | 3      |                                                                                  |
| `media`                 | 389    | One record per distinct image, document and video URL                            |
| `siteSettings`          | object | Fully populated with the placeholders of §14                                     |
| `seoSettings`           | object | Title templates §9.5, `robotsTxt` §9.8, `llmsTxt` empty so the mock generates it |
| `redirects`             | 3      | `/old-properties`, `/blog`, `/flats-in-whitefield`                               |
| `newsletterSubscribers` | 12     | Two unsubscribed                                                                 |
| `adminUsers`            | 3      | admin / manager / sales (§6.14)                                                  |
| `apiTokens`             | 0      | Written at runtime by the mock                                                   |
| `propertyViews`         | 0      | Written at runtime by the mock                                                   |

The file is about 1.4 MB.

## Regenerating

```
npm run seed:build     # writes db.json from scripts/seed/
npm run validate:seed  # checks every rule below; exits 1 on any problem
npm run mock:reset     # refreshes mock-server/.runtime/db.json from the seed
```

`npm run seed:build` is **deterministic**: a fixed PRNG seed
(`scripts/seed/lib/rng.js`, mulberry32) and the fixed `GENERATED_AT` mean two
runs produce a byte-identical file. Run it twice and `git diff` is empty. The
practical consequence is that a change to one data module produces a diff you
can actually read.

## How it is put together

```
scripts/seed/
  build-seed.js          assembles the collections, derives media, writes db.json
  lib/
    rng.js               mulberry32 + pick/sample/shuffle
    dates.js             GENERATED_AT and every relative date helper
    stamps.js            createdAt / updatedAt for a record
    seo.js               the §9.6 object and the 120–160 character description fitter
    media.js             the media registry: minting a URL registers its record
    text.js              ₹ and area formatting, HTML paragraph helpers
    property.js          expands a property spec into the full §6.1 record
  data/
    cities · localities · propertyTypes · amenities · badges · developers · banks
    properties (specs) · nearby (landmarks per locality)
    articles · articleTaxonomy · authors · faqs · testimonials · team · partners
    pages · jobs · leads · subscribers · redirects · settings · users
```

The division of labour matters: a **data module holds what only a person can
decide** — a project's name, what it is like, what it costs, the sentences that
describe it — and **everything implied is derived**. A property's price per
square foot comes from its price, its badges from its construction status, its
FAQs from its own numbers, its media records from the images it uses, and its
`enquiryCount` from the leads that name it. That is why forty listings stay
consistent with each other, and why a hand-edit to `db.json` is the wrong way
to change anything: the next build overwrites it.

## Rules the seed follows

**Ids** are integers starting at 1, unique per collection, assigned in document
order, and inside the ranges `docs/DATA_MODEL.md` reserves. The build fails if
`media` exceeds the 400 ids reserved for it.

**Timestamps** are ISO-8601 UTC, spread over the 180 days before
`GENERATED_AT`. `publishedAt` is set on active properties and published
articles, and is `null` on the two drafts.

**Every field of §6 is present.** Optional fields carry their documented
default (`null`, `[]`, `''`, `false`) rather than being omitted, so no screen
can read `undefined` off a seeded record. The exceptions are the fields marked
`read` in `mock-server/schemas/models.js` — the embedded display objects
(`property.locality`, `article.author`, …) and the computed counters
(`propertyCount`, `articleCount`) — which the API derives on the way out.
`contentText`, `wordCount` and `readingTimeMinutes` **are** stored, computed
with the same `mock-server/lib/html.js` the API uses on save.

**Foreign keys resolve**, including `similarPropertyIds`, `relatedArticleIds`,
`relatedPropertyIds`, a page block's `faqIds` and `memberIds`, and a lead's
`propertyId`, `articleId` and `assignedTo`.

**Slugs** are unique per collection and lowercase `[a-z0-9-]`, and
`entity.seo.slug` mirrors `entity.slug` (D34). CMS pages are the one exception:
their slug is a URL **path** (`buyer-assistance/home-loan`), which
`mock-server/routes/pages.js` serves through `slug/:slug(*)`.

**Images** are `https://picsum.photos/seed/<unique-seed>/<w>/<h>` plus the
project's own Cloudinary brand assets. Every image, document and video URL the
seed mentions anywhere — including inside an article's HTML — has a matching
`media` record, and `media` holds nothing that is not used. The validator
checks both directions.

**Quality rules** (§10) the validator enforces on top of the field types:

- an active listing has ≥ 5 images with alt text and one cover, ≥ 8 amenities,
  ≥ 3 FAQs, a description of ≥ 300 characters and a filled-in `seo` object;
- a rent or lease listing carries `rentPerMonth` and no `pricing.price`; a rent
  listing also carries a `securityDeposit`;
- a land listing carries `plotArea` and no `configuration.bedrooms`; a
  commercial listing carries no bedrooms either;
- `pre-launch` and `under-construction` carry a `possessionDate`, a
  `constructionTimeline` and a `constructionProgressPercent`; `ready-to-move`
  and `resale` carry `ageOfPropertyYears`;
- badges match the record: "Ready to Move" only on ready-to-move, "New Launch"
  only on pre-launch or under-construction, "RERA Approved" only where
  `reraRegistered`, "Verified" only where `isVerified`;
- **`enquiryCount` is at least** the number of leads naming the property. Not
  "equal to": the counter is the listing's lifetime total while `leads` holds
  only the last ninety days, so a counter that shrank when old leads were
  archived would be wrong.
- a published article is ≥ 800 words, its excerpt ≤ 300 characters and its
  featured image has alt text;
- block ids are unique within a page;
- the collection counts of §10 are met.

The validator also **warns** (without failing) when the scheduled article's
`publishedAt` has drifted into the past — the signal to bump `GENERATED_AT` and
rebuild.

## What is fictional and what is a placeholder (§14)

**Invented, clearly fictional:** project names (Lakeview Heights, Aurelia Park
Residences…), the eight developers, the six banks, the six partners, the
testimonials (`isSample: true`, "Sample — A. Rao"), the team members
("Team Member 1", designations marked "(placeholder)"), the job openings, the
leads (Indian names, synthetic `98765000xx` numbers, `@example.com`
addresses), the authorship ("Editorial Team"), and every photograph.

**Real, on purpose:** the twenty locality names, their approximate coordinates
and pincodes, and the landmarks in `nearbyPlaces`. A "nearby" section that says
"International school, 1.8 km" tells a buyer nothing; the point of the section
is that somebody recognises where the listing sits.

**Labelled placeholders the client replaces:** the contact phone and WhatsApp
number, the office address, the RERA and GST numbers, the company story,
mission and vision on the About page, every legal page, the footer disclaimer,
and the interior packages' "[indicative]" prices. Statistics are seeded as
**empty** `stats` blocks so nothing renders — an invented "500+ families" is the
one placeholder that becomes a false claim the moment its origin is forgotten.

**Legal, tax and regulatory figures** in the articles and on the awareness page
are written as "check the current position with the authority" rather than as
numbers (D84), and every one of them is listed in
`docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` (prompt 48).

Two phone numbers deserve a note: §14's display placeholder `+91 98XXX XXXXX`
is not a valid Indian mobile and the model validates the field, so the seed
stores the structurally valid, obviously synthetic `+919800000001` instead.

## Adding to the seed

**A property.** Add an entry to `PROPERTIES` in
`scripts/seed/data/properties.js`. The required keys are the slug, the project
name, the type, the listing type, the construction status, the locality, the
size and the price (or rent and deposit), an amenity set name, and the four
strings only a person can write: `short`, `character`, `usage` and two or three
`highlights`. `scripts/seed/lib/property.js` derives the title, the
description, the areas, the rate per square foot, the badges, the images, the
plans, the FAQs, the timeline and the `seo` object. If your listing needs a new
amenity set, add it to `AMENITY_SETS` and `AMENITY_FEATURES` in the same file —
`AMENITY_FEATURES` picks the four amenities the copy leads with.

**An article.** Add an entry to `ARTICLES` in `scripts/seed/data/articles.js`.
`body` is a function receiving `{ figure }` — the pre-registered
`<figure>` markup — and returning HTML. Keep it semantic: `<h2>`/`<h3>`,
`<p>`, `<ul>`/`<ol>`, a `<table>` where the content is a table. Published
pieces need 800 words. The two block markers (`data-sna-block="properties"`,
`data-sna-block="cta"`) are placeholders the public renderer expands.

**A page.** Add an entry to `DEFINITIONS` in `scripts/seed/data/pages.js`.
`blocks` is a function returning block objects without ids; the module numbers
them and their `order`. Use the `field()` helper for lead-form fields — §6.10
leaves the field config's shape open and the seed fixes one:
`{ name, label, type, required, placeholder, options[], fullWidth }`.

**A locality, developer, bank, FAQ or job.** One entry in the corresponding
`scripts/seed/data/*.js` table.

After any of these: `npm run seed:build && npm run validate:seed && npm run mock:reset`.

## Runtime database

| Task                                | Command                     |
| ----------------------------------- | --------------------------- |
| Start the API on the runtime copy   | `npm run mock`              |
| Discard runtime changes             | `npm run mock:reset`        |
| Start from a fresh copy of the seed | `MOCK_FRESH=1 npm run mock` |

`mock-server/.runtime/db.json` is git-ignored. Anything created through the
admin panel lives there and disappears on the next reset — which is the point:
the seed stays reviewable, and every developer starts from the same data.

## Tests and the seed

`mock-server/__tests__/` runs against **`__tests__/fixtures/starter-db.json`**,
a frozen copy of the prompt-06 starter seed, not against `db.json`. Those
suites pin exact ids and totals ("`?bedrooms=3` returns listings 1 and 2")
because they describe the behaviour of the filters, and reading the live seed
would make them fail whenever an editor adds a listing — the wrong failure.

The shipped seed is covered instead by `mock-server/__tests__/seed.test.js`
(the reserved slugs, the page slug with a slash, the collection sizes, the
dashboard) and by `npm run smoke`, which walks the whole endpoint registry
against a running server.

## Mock credentials

| Role    | E-mail                      | Password      |
| ------- | --------------------------- | ------------- |
| admin   | `admin@squaresnacres.com`   | `Admin@123`   |
| manager | `manager@squaresnacres.com` | `Manager@123` |
| sales   | `sales@squaresnacres.com`   | `Sales@123`   |

Local mock only (§6.14, D80). They are stored in plaintext in the seed because
the mock compares them directly; Laravel stores a hash, and these three
accounts are rotated before go-live.
