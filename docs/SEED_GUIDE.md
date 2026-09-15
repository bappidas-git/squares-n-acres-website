# Seed guide

`db.json` at the repository root is the **seed** of the mock API: a complete,
hand-checked database in the shape of `prompts/00_MASTER_CONTEXT.md` §6. The
mock server reads it, copies it to `mock-server/.runtime/db.json` and works
there, so the committed file is never written by the running application.

This document describes how the seed is built and how to change it safely.
`docs/DATA_MODEL.md` is the field-by-field reference; this is the operational
side.

## Current contents (prompt 06 — the starter seed)

| Collection              | Count  | Notes                                                                             |
| ----------------------- | ------ | --------------------------------------------------------------------------------- |
| `properties`            | 6      | ids 1–6; one rent, one lease, one under construction, one villa, one plot         |
| `localities`            | 6      | Whitefield (id 1), Sarjapur Road, Electronic City, Hebbal, Koramangala, Yelahanka |
| `cities`                | 1      | Bengaluru                                                                         |
| `propertyTypes`         | 17     | The complete list of §6.3, plural slugs (D25)                                     |
| `amenities`             | 20     | At least one in each of the eight categories                                      |
| `badges`                | 8      | Tone names, never hex (§6.4)                                                      |
| `developers`            | 3      | Fictional; `aurelia-estates` is id 1                                              |
| `banks`                 | 3      | Fictional; rates marked indicative                                                |
| `leads`                 | 6      | Across sources, statuses, notes and activities                                    |
| `articles`              | 3      | Published HTML, `karnataka-rera-guide-for-homebuyers` is id 1                     |
| `articleCategories`     | 4      | D76                                                                               |
| `articleTags`           | 15     |                                                                                   |
| `authors`               | 3      | Editorial Team, Research Desk, Legal Desk (placeholders)                          |
| `faqs`                  | 8      | One per FAQ category                                                              |
| `testimonials`          | 2      | `isSample: true` — never rendered in a production build (D41)                     |
| `teamMembers`           | 2      | Placeholders                                                                      |
| `partners`              | 3      | Fictional, `category: 'developer'` (D78)                                          |
| `pages`                 | 2      | `home` and `about`                                                                |
| `jobOpenings`           | 1      | `real-estate-advisor-bengaluru`                                                   |
| `jobApplications`       | 0      |                                                                                   |
| `media`                 | 58     | One record per image URL the seed uses                                            |
| `siteSettings`          | object | Fully populated with the placeholders of §14                                      |
| `seoSettings`           | object | Title templates §9.5, `robotsTxt` §9.8                                            |
| `redirects`             | 2      | `/old-properties` and `/blog`                                                     |
| `newsletterSubscribers` | 2      |                                                                                   |
| `adminUsers`            | 3      | admin / manager / sales (§6.14)                                                   |
| `apiTokens`             | 0      | Filled at runtime by prompt 07                                                    |
| `propertyViews`         | 0      | Filled at runtime by prompt 08                                                    |

Prompt 10 expands this to the full data set of §10 — 36+ properties, 20
localities, 12+ articles, 15 CMS pages, 45 leads — using the same rules.

## Rules the seed follows

**Ids** are integers starting at 1, unique per collection, and assigned in
document order. The API continues them with `max(id) + 1` (D14), and
`docs/DATA_MODEL.md` reserves a range per collection so a record added by a
later prompt cannot collide with a hand-written cross-reference.

**Timestamps** are ISO-8601 UTC strings. `createdAt` and `updatedAt` exist on
every record; `publishedAt` is set on active properties and published articles.

**Every field of §6 is present.** Optional fields carry their documented
default (`null`, `[]`, `''`, `false`) rather than being omitted, so no screen
can read `undefined` off a seeded record. The only exceptions are the fields
marked `read` in `mock-server/schemas/models.js` — the embedded display objects
(`property.locality`, `article.author`, …) and the computed counters
(`propertyCount`, `readingTimeMinutes`, `wordCount`, `contentText`) — which the
API derives on the way out and the seed therefore does not store.

**Foreign keys resolve.** `localityId`, `cityId`, `propertyTypeId`,
`developerId`, `amenityIds[]`, `badgeIds[]`, `similarPropertyIds[]`,
`categoryId`, `authorId`, `tagIds[]`, `assignedTo`, `propertyId`, `jobId`,
`agent.teamMemberId`, `relatedArticleIds[]`, `relatedPropertyIds[]` and the
`faqIds` inside a page block all point at a record that exists.

**Slugs** are unique per collection, lowercase `[a-z0-9-]`, at most 75
characters, and `entity.seo.slug` always mirrors `entity.slug` (D34).

**Images** are `https://picsum.photos/seed/<unique-seed>/<width>/<height>` plus
the project's own Cloudinary brand assets. Every image URL used anywhere has a
matching record in `media`, and `media` holds nothing that is not used. The
boilerplate's placeholder image host, its old Cloudinary cloud and its video
host never appear — `npm run check:traces` is what keeps them out.

**Content is placeholder content** (§14). Project, developer, bank and partner
names are fictional; testimonials are `isSample: true`; team members and
authors are labelled placeholders; contact details, the address, the RERA
number and the GST number are the editable placeholders of §14, and no
statistic, award or year is presented as fact. The phone numbers
(`98765000xx`, `98800000xx`) are valid Indian mobile numbers and obviously
synthetic.

**Structural rules** that the field descriptors cannot express: exactly one
`isCover` per non-empty `images[]`, all 18 `sectionVisibility` keys on every
property, the full §9.6 `seo` object on every entity that owns a public URL,
and a property never listing itself in `similarPropertyIds`.

## Changing the seed

1. Edit `db.json` directly. Keep the key order of §6 (`id`, `slug`, `title`,
   then the rest), two-space indentation and a trailing newline.
2. Run `npm run validate:seed`. It checks every rule above and prints a table
   of collection, record count and error count; any error exits 1.
   `npm run validate:seed --stats` prints the counts only.
3. Run `npm run mock:reset` so the running mock picks the change up — the
   runtime copy is not refreshed automatically.

`npm run check:traces` also scans `db.json`, so boilerplate strings and hex
colour literals cannot reach the seed through it.

## Runtime database

| Task                                | Command                     |
| ----------------------------------- | --------------------------- |
| Start the API on the runtime copy   | `npm run mock`              |
| Discard runtime changes             | `npm run mock:reset`        |
| Start from a fresh copy of the seed | `MOCK_FRESH=1 npm run mock` |

`mock-server/.runtime/db.json` is git-ignored. Anything created through the
admin panel lives there and disappears on the next reset — which is the point:
the seed stays reviewable, and every developer starts from the same data.

## Mock credentials

| Role    | E-mail                      | Password      |
| ------- | --------------------------- | ------------- |
| admin   | `admin@squaresnacres.com`   | `Admin@123`   |
| manager | `manager@squaresnacres.com` | `Manager@123` |
| sales   | `sales@squaresnacres.com`   | `Sales@123`   |

Local mock only (§6.14, D80). They are stored in plaintext in the seed because
the mock compares them directly; Laravel stores a hash, and these three
accounts are rotated before go-live.
