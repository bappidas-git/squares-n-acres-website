# SEO_ENGINE — `src/seo/`

> The SEO engine of `00_MASTER_CONTEXT.md` §9: a pure, framework-free library
> that answers two questions — **how good is the SEO of this record, and what
> should be fixed first?** and **what does this record actually publish?**
> Written by prompt 35, extended by prompt 36 (`resolve.js`,
> `schema.buildGraph`) and by prompt 38 (`breadcrumbs.js`, `pageTypes.js`,
> `pageGraph.js`, `schema/jobPosting.js`), read by the SEO panel (36), the SEO
> dashboard (37), the public `<Seo>` component (38) and the two validators
> `npm run check:links` / `npm run check:jsonld` (38).

Nothing in `src/seo/` imports React, calls the API or touches the DOM beyond an
optional `DOMParser` and an optional `<canvas>`, both of which have a Node
fallback. Everything is a function of its arguments, so everything is tested in
Jest (`src/seo/__tests__/`).

**Half of it is CommonJS** (D36b, extended in prompt 38): `text.js`, `urls.js`,
`variables.js`, `entityAdapters.js`, `resolve.js`, `breadcrumbs.js`,
`pageTypes.js`, `pageGraph.js` and all of `schema/`, plus the three leaves they
reach — `src/config/site.js`, `src/routes/paths.js`, `src/utils/format.js`.
React and Jest import them exactly as before, because `module.exports` is the
namespace object the default import already was. The reason is
`scripts/validate-jsonld.js`, which has to build the _same_ graph the browser
builds: a validator that re-implemented the builder would only ever be checking
its own opinion. The analysers, the scorer and `snippet.js` stay ESM — no Node
script reads them.

---

## 1. The one call

```js
import { analyze } from '../seo';

const analysis = analyze('property', property, {
  seoSettings, // GET /seo/settings
  siteIndex, // GET /admin/seo/overview — the rows the uniqueness tests compare against
  localities,
  cities,
  propertyTypes,
  developers,
  categories,
  authors,
});
// → { score, band, testsPassed, testsTotal, groups: { basic, additional, titleReadability, contentReadability } }
```

The answer is exactly the shape §9.6 stores on `entity.seo`, so the panel saves
it without translating it.

### One result

```js
{
  id: 'title-length',        // the test, stable across releases
  group: 'basic',            // which of the four lists it is drawn in
  status: 'pass',            // 'pass' | 'warn' | 'fail' | 'skip'
  message: '55 characters, 489 px of the 580 px a result shows.',
  hint: '',                  // what to do about it, empty when nothing is wrong
  field: 'seo.title',        // the dotted path the panel focuses when the row is clicked
  weight: 6,                 // what this test is worth out of 100 for this entity type
  value: 55,                 // the measured number, where there is one
}
```

`skip` means the test does not apply to this kind of record. Skipped tests are
shown, never counted, and never scored (§9.1).

---

## 2. How the score is computed (`score.js`)

1. Each test carries **points** — an importance from 1 to 5 that means the same
   thing whatever record it is measuring (`POINTS`).
2. `APPLICABILITY[entityType]` lists the tests that type is asked.
3. `WEIGHTS[entityType]` is those points apportioned to **exactly 100** by the
   largest-remainder method, ties broken by test id so the table is identical on
   every run. Every applicable test is worth at least 1.
4. A result earns its full weight when it **passes**, half when it **warns**,
   nothing when it **fails**.
5. A `skip` is removed from the denominator and the rest is re-normalised, so a
   property is never marked down for having no article category.
6. `band` comes from `SEO_SCORE_BANDS.bandOf` (§6.17): **good ≥ 81**,
   **ok 51–80**, **poor ≤ 50**, `none` when nothing applied.
7. `testsPassed` counts `pass` only; `testsTotal` counts everything that applied.

A record nobody has written yet — no title, no slug, no description, no body, no
keyword — has every applicable test read as a failure and scores **0**
(`analyze.js`). A warning about the FAQs a record has not got, or an "it may be
indexed" about a record that does not exist, would otherwise score points for
nothing.

---

## 3. The tests

### 3.1 Basic (SEO-06) — `analyzers/basic.js`

| Test                          | Pass                                        | Warn                                                                    | Fail                                    |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `focus-keyword-set`           | a focus keyword is set                      | —                                                                       | none                                    |
| `keyword-in-title`            | the effective title carries it              | —                                                                       | it does not, or there is no keyword     |
| `keyword-in-description`      | `seo.description` carries it                | —                                                                       | it does not, or there is no description |
| `keyword-in-slug`             | the slug carries it                         | —                                                                       | it does not, or there is no slug        |
| `keyword-in-first-10-percent` | it appears in the opening tenth of the body | —                                                                       | later, or not at all                    |
| `keyword-in-content`          | the body uses it                            | —                                                                       | it never does                           |
| `content-length`              | at or above the type's target               | between the two thresholds                                              | below the lower one                     |
| `title-length`                | 50–60 characters **and** ≤ 580 px           | 40–49 or 61–65 characters, or inside the characters but over the pixels | anything else, or no title              |
| `description-length`          | 120–160 characters **and** ≤ 920 px         | 100–119 or 161–180 characters, or over the pixels                       | anything else, or no description        |
| `description-unique`          | no other record uses it                     | another record does                                                     | no description to compare               |

`content-length` targets (good / acceptable, in words): **article 600 / 300**,
**property 300 / 150**, **page 300 / 150**, **locality 200 / 100**,
**developer 200 / 100**. The three content tests are not asked of
`articleCategory`, `author` or `propertyType`.

The description tests measure `seo.description` alone. `seoSettings.defaults.
metaDescription` is what a visitor would see when it is empty (§9.3), but it is
the same sentence on every page — which is the thing this group exists to
prevent.

`description-unique` and every other uniqueness test read `context.siteIndex`
(the `GET /admin/seo/overview` rows). Without it they `skip`.

### 3.2 Additional (SEO-07) — `analyzers/additional.js`

Every record: `slug-quality`, `keyword-unique-site`, `og-image-set`,
`canonical-set`, `indexable`.
Records with a body (property, article, page, locality, developer):
`keyword-in-subheading`, `keyword-in-image-alt`, `keyword-density`.

| Test                    | Pass                                                                     | Warn                                             | Fail                                                |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------- |
| `keyword-in-subheading` | an H2–H6 carries the keyword (an H1 in the body is ignored)              | —                                                | none does, or there are no subheadings              |
| `keyword-in-image-alt`  | an alt carries the keyword                                               | images exist but no alt carries it               | no images, or no keyword                            |
| `keyword-density`       | 0.5 %–2.5 %                                                              | 0.3 %–0.5 % or 2.5 %–3.5 %                       | outside that, or no body                            |
| `slug-quality`          | ≤ 75 characters, `a–z0–9-`, not numbers-only (stop words are a **hint**) | —                                                | too long, wrong characters, numbers-only, or absent |
| `keyword-unique-site`   | no other record targets it                                               | another does                                     | no keyword                                          |
| `og-image-set`          | `seo.og.imageUrl` is set                                                 | only the cover image, which will be used instead | neither                                             |
| `canonical-set`         | a canonical resolves                                                     | —                                                | no slug, so no address                              |
| `indexable`             | published and `robots.index`                                             | —                                                | noindexed on purpose, or not published              |

Article and page: `internal-link` (pass on one internal link).
Article only: `external-dofollow-link` (pass on a followed outbound link, warn
when every outbound link is `nofollow`), `image-count` (≥ 1).
Property: `image-count` (≥ 5, and warn when any image has no alt text).

Property only: `price-present` (a price, **or** `priceOnRequest`, which passes
with "Price on request acknowledged"), `locality-in-title`,
`description-mentions-locality-and-type` (warn when it names one of the two),
and four enhancements whose worst outcome is a **warning** — `rera-present`,
`faqs-min-3`, `floor-plan-or-units`, `amenities-min-8`.

Locality only: `connectivity-present`, `highlights-present` (pass at 3, warn at
1–2, fail at none).

Article only: `excerpt-present` (warn under 60 characters), `category-assigned`,
`tags-min-2` (warn at one), and three warn-only enhancements —
`featured-image-alt-keyword`, `faq-block-present`, `related-links-present`.

### 3.3 Title readability (SEO-08) — `analyzers/titleReadability.js`

Every entity type is asked all five.

| Test                 | Pass                                                  | Warn                                                                         | Fail                                     |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| `keyword-at-start`   | the title opens with the keyword                      | it starts within the first 30 %                                              | later, absent, or no keyword             |
| `title-has-number`   | a digit anywhere                                      | no digit                                                                     | no title                                 |
| `title-power-word`   | one of `data/powerWords.js`, or the current/next year | none of them                                                                 | no title                                 |
| `title-not-all-caps` | sentence case                                         | more than one shouted word (initialisms such as BHK, RERA, ORR are forgiven) | the whole title in capitals, or no title |
| `title-unique-site`  | no other record uses this title                       | another does                                                                 | no title                                 |

### 3.4 Content readability (SEO-09) — `analyzers/contentReadability.js`

Asked of **articles, pages and localities**. A listing is a specification rather
than an essay, so the whole group is skipped for a property.

| Test                         | Pass                             | Warn                                                                  | Fail                                         |
| ---------------------------- | -------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `toc-present` (article only) | ≥ 3 H2s and `tableOfContents` on | —                                                                     | ≥ 3 H2s and it is off (**skip** under three) |
| `short-paragraphs`           | every paragraph ≤ 150 words      | up to a fifth of them run over                                        | more than a fifth, or no body                |
| `has-media`                  | an image or a video in the body  | only the cover image                                                  | nothing                                      |
| `flesch-reading-ease`        | ≥ 50                             | below 50 (the number is always in the message)                        | nothing to score                             |
| `sentence-length`            | ≤ 25 words on average            | ≤ 30                                                                  | over 30, or no body                          |
| `subheading-distribution`    | ≤ 300 words between subheadings  | ≤ 450                                                                 | over 450, or no body                         |
| `passive-voice`              | ≤ 10 % of sentences              | over 10 %                                                             | no body                                      |
| `transition-words`           | ≥ 20 % of sentences              | ≥ 12 %                                                                | under 12 %, or no body                       |
| `heading-hierarchy`          | opens at H2 and skips no level   | an H1 inside the body (§9.7), a skipped level, or an opening below H2 | no headings at all                           |

---

## 4. The weight tables

Points are the importance; the columns are the apportioned weights, which sum to
100 down each column. `—` is a test that entity type is never asked.

| Test                                     | Pts | property | article | page | locality | developer | articleCategory | author | propertyType |
| ---------------------------------------- | --- | -------- | ------- | ---- | -------- | --------- | --------------- | ------ | ------------ |
| **basic**                                |     |          |         |      |          |           |                 |        |              |
| `focus-keyword-set`                      | 5   | 6        | 4       | 6    | 6        | 7         | 10              | 10     | 10           |
| `keyword-in-title`                       | 5   | 6        | 4       | 6    | 6        | 7         | 9               | 9      | 9            |
| `keyword-in-description`                 | 4   | 5        | 3       | 5    | 5        | 6         | 8               | 8      | 8            |
| `keyword-in-slug`                        | 4   | 5        | 3       | 5    | 5        | 6         | 8               | 8      | 8            |
| `keyword-in-first-10-percent`            | 3   | 3        | 2       | 3    | 3        | 4         | —               | —      | —            |
| `keyword-in-content`                     | 4   | 5        | 3       | 5    | 5        | 6         | —               | —      | —            |
| `content-length`                         | 5   | 6        | 4       | 6    | 6        | 7         | —               | —      | —            |
| `title-length`                           | 5   | 6        | 4       | 6    | 6        | 7         | 9               | 9      | 9            |
| `description-length`                     | 5   | 6        | 4       | 6    | 6        | 7         | 10              | 10     | 10           |
| `description-unique`                     | 3   | 4        | 3       | 4    | 3        | 4         | 6               | 6      | 6            |
| **additional**                           |     |          |         |      |          |           |                 |        |              |
| `keyword-in-subheading`                  | 3   | 3        | 2       | 3    | 3        | 4         | —               | —      | —            |
| `keyword-in-image-alt`                   | 2   | 2        | 2       | 2    | 2        | 3         | —               | —      | —            |
| `keyword-density`                        | 3   | 3        | 3       | 3    | 3        | 4         | —               | —      | —            |
| `slug-quality`                           | 3   | 3        | 2       | 3    | 3        | 4         | 6               | 6      | 6            |
| `keyword-unique-site`                    | 2   | 2        | 2       | 2    | 2        | 3         | 4               | 4      | 4            |
| `og-image-set`                           | 2   | 2        | 2       | 2    | 2        | 3         | 4               | 4      | 4            |
| `canonical-set`                          | 2   | 2        | 2       | 2    | 2        | 3         | 4               | 4      | 4            |
| `indexable`                              | 3   | 4        | 3       | 3    | 3        | 4         | 6               | 6      | 6            |
| `image-count`                            | 3   | 4        | 3       | —    | —        | —         | —               | —      | —            |
| `price-present`                          | 3   | 3        | —       | —    | —        | —         | —               | —      | —            |
| `locality-in-title`                      | 3   | 3        | —       | —    | —        | —         | —               | —      | —            |
| `rera-present`                           | 1   | 1        | —       | —    | —        | —         | —               | —      | —            |
| `faqs-min-3`                             | 2   | 2        | —       | —    | —        | —         | —               | —      | —            |
| `floor-plan-or-units`                    | 2   | 2        | —       | —    | —        | —         | —               | —      | —            |
| `amenities-min-8`                        | 2   | 2        | —       | —    | —        | —         | —               | —      | —            |
| `description-mentions-locality-and-type` | 2   | 2        | —       | —    | —        | —         | —               | —      | —            |
| `internal-link`                          | 3   | —        | 3       | 3    | —        | —         | —               | —      | —            |
| `external-dofollow-link`                 | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `excerpt-present`                        | 3   | —        | 3       | —    | —        | —         | —               | —      | —            |
| `category-assigned`                      | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `tags-min-2`                             | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `featured-image-alt-keyword`             | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `faq-block-present`                      | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `related-links-present`                  | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `connectivity-present`                   | 2   | —        | —       | —    | 2        | —         | —               | —      | —            |
| `highlights-present`                     | 2   | —        | —       | —    | 2        | —         | —               | —      | —            |
| **titleReadability**                     |     |          |         |      |          |           |                 |        |              |
| `keyword-at-start`                       | 3   | 3        | 3       | 3    | 3        | 4         | 6               | 6      | 6            |
| `title-has-number`                       | 1   | 1        | 1       | 1    | 1        | 2         | 2               | 2      | 2            |
| `title-power-word`                       | 1   | 1        | 1       | 1    | 1        | 1         | 2               | 2      | 2            |
| `title-not-all-caps`                     | 1   | 1        | 1       | 1    | 1        | 1         | 2               | 2      | 2            |
| `title-unique-site`                      | 2   | 2        | 2       | 2    | 2        | 3         | 4               | 4      | 4            |
| **contentReadability**                   |     |          |         |      |          |           |                 |        |              |
| `toc-present`                            | 2   | —        | 2       | —    | —        | —         | —               | —      | —            |
| `short-paragraphs`                       | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |
| `has-media`                              | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |
| `flesch-reading-ease`                    | 3   | —        | 3       | 3    | 3        | —         | —               | —      | —            |
| `sentence-length`                        | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |
| `subheading-distribution`                | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |
| `passive-voice`                          | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |
| `transition-words`                       | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |
| `heading-hierarchy`                      | 2   | —        | 2       | 2    | 2        | —         | —               | —      | —            |

Two tests with the same points can differ by one within a column: the
apportionment gives each test either the floor of its exact share or one more,
and the extras go to the largest fractions first. `score.test.js` asserts that
every column sums to 100 and that no weight is 0.

---

## 5. The rest of the engine

| Module              | What it answers                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text.js`           | HTML → text, words, sentences, paragraphs, headings, images, links. One event stream, two parsers: `DOMParser` in a browser, a tag scanner in Node, asserted identical.                          |
| `readability.js`    | Flesch Reading Ease, sentence and paragraph lengths, subheading distribution, the passive-voice heuristic, the transition-word share.                                                            |
| `keywords.js`       | Does this text carry this keyword, how often, how early — with the plural, hyphen and punctuation folding of §6 below.                                                                           |
| `snippet.js`        | Character and pixel widths, and what a result will actually show (`truncateToWidth`).                                                                                                            |
| `variables.js`      | The §9.5 template variables, `resolveTemplate`, `cleanTitle`, `listVariables`. `cleanTitle` removes an unresolved variable and then the punctuation it left: a leading separator, a doubled one, `in , Bengaluru`, and — since prompt 45 (NEW-39) — a comma, semicolon or colon standing immediately in front of the separator, so `"3 BHK in Whitefield, – Squares N Acres"` reads as it should. A comma doing its job (`Whitefield, Bengaluru`, `₹1,20,000 - ₹1,50,000`) is untouched. |
| `urls.js`           | `publicPathFor`, `canonicalFor`, `isNoindexListing` — the §9.4 whitelist and the "no trailing slash" policy.                                                                                     |
| `entityAdapters.js` | Eight record shapes into the one shape the analysers read, including a CMS page's blocks as a body.                                                                                              |
| `schema/`           | One generator per JSON-LD type of §9.3, `mergeGraph`, `parseCustom`, and a structural `validate`.                                                                                                |
| `breadcrumbs.js`    | `breadcrumbsFor(type, entity, extras)` → the one trail `<Breadcrumbs>` draws and `<Seo>` publishes; speaks both `{ name, path }` and `{ label, to }`.                                            |
| `pageTypes.js`      | The tables that join a `<Seo type>` to a record type: which pages are never indexed, which are records, what an index page is called, the `og:type`s and the verification meta names.            |
| `pageGraph.js`      | `buildPageGraph(...)` — what a **page** publishes, as against what a record does: the publisher, the site node, the `ItemList`, the `FAQPage`, the reviews. Shared by `<Seo>` and the validator. |
| `suggestions.js`    | Focus keyword suggestions built from the record's own facts.                                                                                                                                     |
| `autoGenerate.js`   | Title, description, focus keyword and share image defaults — **never over an editor's own value** unless asked.                                                                                  |

---

## 6. The judgement calls

- **Snippet widths (D85).** A browser measures with `canvas.measureText` in
  Arial 20 px (titles) and 14 px (descriptions). Node, Jest and jsdom — which
  has a `document` but no 2D context — use a per-character width table, the
  Helvetica metric set Arial was drawn to match, in 1/1000 em units. An unknown
  character is charged the width of a digit. Limits: 580 px and 920 px.
- **Stemming is light on purpose.** The regular plural (`flats` → `flat`), the
  `-es` plural (`houses`, `boxes`), the `-ies` plural (`cities` → `city`), and
  the Indian-English irregulars (`BHKs` → `bhk`, `properties` → `property`).
  Hyphens and spaces are interchangeable, so `ready-to-move` matches `ready to
move` both ways. Word order is **not** forgiven: "flats in whitefield" and
  "whitefield flats" are two different searches.
- **Passive voice is a heuristic.** An auxiliary (`is`, `are`, `was`, `were`,
  `be`, `been`, `being`, `am`, `get`) followed — optionally through an adverb —
  by a past participle: a word of four letters or more ending `-ed`/`-en`, or
  one of about fifty irregulars. About forty words that end that way and are not
  participles (`red`, `open`, `kitchen`, `between`) are excluded by name. It
  warns, never fails.
- **Density counts occurrences, not words.** One use of a four-word phrase
  counts once; the question is how often the phrase is used.

---

## 6a. What a record publishes (`resolve.js`, prompt 36)

`analyze()` answers how good a record's SEO is. `resolveSeoOutput()` answers
what it actually sends, by the rules of §9.3:

```js
import { resolveSeoOutput } from '../seo';

const out = resolveSeoOutput('property', property, seoSettings, context);
// → { title, titleSource, description, descriptionSource, canonical,
//     canonicalSource, robots, robotsList, indexable, ogType, og, twitter }
```

- **Title** — `seo.title` verbatim when it is set, still passed through the
  variable resolver, so an editor may type `%bhk% in %locality%` by hand;
  otherwise the type's template from `seoSettings.titleTemplates` (§9.5).
- **Description** — `seo.description`, then `seoSettings.defaults.
metaDescription`. `descriptionSource` says which, because the panel has to be
  able to tell an editor that the sentence they are reading is the site's and
  not this page's.
- **Canonical** — `seo.canonicalUrl` when it is set, otherwise the computed
  address (`urls.canonicalForEntity`).
- **Robots** — `robotsDirectives()`: the two switches first, then the three
  "do not" flags, then the three limits, each printed only when it has been
  set. A record that is not published is forced to `noindex` whatever its own
  `robots.index` says.
- **Social** — the §9.3 image chain (`seo.og.imageUrl` → the record's cover →
  `seoSettings.defaults.ogImageUrl` → `BRAND.ogImageUrl`), `og:type` `article`
  for an article and `profile` for an author, and the two cards falling back to
  the search title and description.

The panel's "Resolved values" box renders exactly this object, and prompt 38's
`<Seo>` puts the same strings in the head — one resolver, so the box and the
page cannot disagree.

**`schema.buildGraph(entityType, entity, seoSettings, context)`** is the
counterpart for structured data: the record's own share of the `@graph` — the
node its type leads with, its questions, its video and its trail — with
`seo.schema.type` retyping the leading node, `disabledAutoTypes` removing
generated nodes by type, and a valid `schema.custom` appended.
`autoNodeTypes()` lists what it would publish (the panel's checklist) and
`schemaTypeOptions(entityType)` narrows `SEO_SCHEMA_TYPES` to the types that
entity type could honestly claim. `Organization`, `WebSite` and the lists of
whatever else a page shows belong to the **page**, not the record, and arrive
with `<Seo>`.

---

## 6b. What the desk does with it (prompt 37)

`/admin/seo` runs the same engine over the whole site rather than over one
record, which is three jobs and one rule.

**Re-analyse all** (`SeoBulkTools.planReanalysis`) reads each record in full,
calls `analyze`, and stores `{ score, scoreBand, testsPassed, testsTotal,
analysis, lastAnalyzedAt }` through `PATCH { seo }` — **only when the answer
differs from what is stored**. The comparison is on the answer, not the run:
the score, the two counts and every test's `id:status:message`. A second pass
over an unchanged site writes nothing (measured on the seed: 47 written, 72
skipped).

**Auto-generate missing** (`planGeneration`) calls `generateDefaults` and stores
the difference. Without `overwrite` the generator returns the editor's own
values unchanged, so the difference is empty and the record is counted as
skipped — which is how "never overwrite what somebody wrote" is enforced rather
than merely intended. `overwrite: true` is a separate, confirmed decision.

Both runs are **sequential** and both keep everything written before a stop: the
loop breaks at the record it is on, and the records before it are saved.

**The issues tab** reads the stored `analysis` rather than re-analysing. Eight
tests count as critical — `focus-keyword-set`, `keyword-in-title`,
`title-length`, `description-length`, `indexable`, `og-image-set`,
`canonical-set`, `image-count` — and each row carries the dotted path the fix
dialog opens on. A record nobody has analysed contributes nothing: an empty
analysis is "no answer", not "failed".

**Duplicates** are not computed here at all. `GET /admin/seo/overview` returns
`duplicateOf: { title, description, focusKeyword }` per row, because grouping
eight collections by three values is a pairwise comparison the browser would
repeat on every render (`docs/API_CONTRACT.md` → `SeoOverviewRow`).

`resolveSeoOutput` also answers for the three page types that are not records:
`templateKeyFor` selects the `home`, `listing` and `search` templates of §6.14
as well as the eight record types, so the settings screen's head preview and
prompt 38's `<Seo type="home">` resolve the template an editor wrote rather than
falling through to `default`.

---

## 6c. What the public site does with it (prompt 38)

`src/components/seo/Seo.jsx` is the only head on the site. It renders;
`useSeoResolved.js` decides, by calling `resolveSeoOutput` for the words,
`urls.js` for the canonical, `breadcrumbs.js` for the trail and
`pageGraph.buildPageGraph` for the JSON-LD. A page passes what it knows:

```jsx
<Seo
  type="property"            // one of the 21 of `pageTypes.PAGE_TYPES`
  entity={property}          // the record, with its §9.6 `seo` branch
  description={…}            // the page's own summary, when it composes one
  breadcrumbs={crumbs}       // the same array `<Breadcrumbs>` is drawing
  faqs={faqs}                // the questions this page actually shows
  items={cards}              // what this page is a list of
  overrides={{ noindex }}    // what only the page can know
/>
```

**Two title channels.** `title` is the page's own name and goes **through** the
type's §9.5 template; `overrides.title` is the finished `<title>` and is used
verbatim (still variable-resolved, §9.3). Only `ListingEngine` wants the second,
because `listingSeo.js` has already applied the `listing` template.

**Robots, in three steps.** A page nobody should keep _or follow_ — `admin`,
`search`, `shortlist`, `notFound`, `error`, anything under `?preview=` — says
`noindex, nofollow`. A page that is this visitor's view of a list (§9.4's
filtered listing) or a record that is not published is `noindex, follow`.
Everything else publishes the record's own directives.

**One graph per page.** The publisher and the `WebSite` on every page, the
`SearchAction` on the home page only, then the record's own nodes
(`schema.buildGraph`), then what belongs to the page: the `ItemList`, the
`FAQPage` of the questions on screen, and `Review`/`AggregateRating` for
testimonials that are not seeded samples (D41). Merging is by `@id` and later
wins, which is how a property page's fuller FAQ list replaces the record's.

It is also the one tag `<Seo>` writes **outside** Helmet. Helmet de-duplicates a
`<script>` by its contents, so a page that renders its head twice — every
listing does, once before its results arrive and once with them — can end up
publishing both graphs. `components/seo/JsonLd.jsx` owns a single
`<script data-sna-jsonld>` in the head and rewrites its text in place instead.

**The validators.** `npm run check:jsonld` walks the sitemaps and checks the
head of every URL; `npm run check:links` follows every internal link. With
`CHROME_PATH` both read a real rendered page — which is the only way to see one
`<h1>` per page, `<img alt>` and a link that 404s. Without it they resolve the
records behind those URLs through this library and say which checks they
skipped. Both need `npm run dev` running and neither is part of `check:all`.

---

## 7. Adding a test

1. Add its id to the right list in `TEST_GROUPS` (`score.js`) and its importance
   to `POINTS`.
2. Add the id to each `APPLICABILITY[entityType]` that should be asked it. The
   weights re-apportion themselves; nothing else needs editing to keep the
   column at 100.
3. Write the rule in the matching `analyzers/*.js` file, as one entry of its
   `tests` map, returning `make(id, status, { message, hint, field, value })`.
   A test whose subject is missing **fails** rather than passing vacuously.
4. Add its row to §3 and §4 of this document (`WEIGHTS` prints the new column).
5. Cover it in `src/seo/__tests__/` with a pass, a warn, a fail and — where the
   test belongs to one entity type — a skip.
