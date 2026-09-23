# Backend notes — relational mapping

Merged into `backend_developer_guidelines/04_DATA_MODELS.md`. The field tables,
the column mapping and `schema.sql` are generated from
`mock-server/schemas/models.js` and the rules in
`scripts/lib/guidelines/sql.js`; this file explains why the rules are what they
are.

Edit this file, never the generated one.

## Child tables

`db.json` is a document store, so a property carries its images, its documents
and its FAQs inside itself. MySQL is not, and the question for each nested array
is the same one: **does anything ever query it, order it, or count it on its
own?** If yes it is a table; if no it is a JSON column.

Fourteen arrays answer yes:

| JSON path                           | Table                            | Parent key    | `ON DELETE` |
| ----------------------------------- | -------------------------------- | ------------- | ----------- |
| `properties.images[]`               | `property_images`                | `property_id` | `CASCADE`   |
| `properties.documents[]`            | `property_documents`             | `property_id` | `CASCADE`   |
| `properties.floorPlans[]`           | `property_floor_plans`           | `property_id` | `CASCADE`   |
| `properties.unitConfigurations[]`   | `property_unit_configurations`   | `property_id` | `CASCADE`   |
| `properties.nearbyPlaces[]`         | `property_nearby_places`         | `property_id` | `CASCADE`   |
| `properties.constructionTimeline[]` | `property_construction_timeline` | `property_id` | `CASCADE`   |
| `properties.faqs[]`                 | `property_faqs`                  | `property_id` | `CASCADE`   |
| `properties.amenityIds[]`           | `property_amenity` (pivot)       | `property_id` | `CASCADE`   |
| `properties.badgeIds[]`             | `property_badge` (pivot)         | `property_id` | `CASCADE`   |
| `properties.similarPropertyIds[]`   | `property_similar` (self-pivot)  | `property_id` | `CASCADE`   |
| `leads.notes[]`                     | `lead_notes`                     | `lead_id`     | `CASCADE`   |
| `leads.activities[]`                | `lead_activities`                | `lead_id`     | `CASCADE`   |
| `articles.tagIds[]`                 | `article_tag` (pivot)            | `article_id`  | `CASCADE`   |
| `pages.blocks[]`                    | `page_blocks`                    | `page_id`     | `CASCADE`   |

Every one of them earns its table:

- `property_images` is filtered (`is_cover`), ordered, counted for the gallery
  badge, and joined by the sitemap, which emits an `<image:image>` per picture.
- `property_unit_configurations` is **searched**: `bedrooms=3` matches either the
  property's own `configuration.bedrooms` or any active unit configuration
  (§5.7). That is a `JOIN`, not a `JSON_CONTAINS`.
- `property_amenity` is searched with `AND` semantics — several `amenityIds` mean
  _all_ of them must match — which is a `GROUP BY … HAVING COUNT(DISTINCT …) = n`.
- `lead_activities` is the audit trail: append-only, read newest-first, never
  rewritten. A JSON column would be rewritten in full on every append.
- `page_blocks` keeps `data` as a JSON column of its own: the block's _type_ is
  queried, its payload never is.

Rules that come with them:

- **`ON DELETE CASCADE` everywhere.** A row of a child table has no meaning
  without its parent, and the API never exposes one on its own.
- **An `order` column**, because SQL rows have none. It carries the position the
  admin dragged the row to; read them `ORDER BY \`order\`, id`.
- **The array's `id` is not the table's `id`.** The ids inside `db.json`'s nested
  arrays are local to the parent document and repeat across properties. The table
  gets its own `AUTO_INCREMENT` primary key; see `seed-mapping.md`.
- **Write the whole array.** `PUT` replaces the record, so the handler deletes
  the children and re-inserts them inside one transaction. Diffing row by row
  buys nothing and loses the order.

## JSON columns

Everything else nested stays `JSON`. These are payloads the API reads and writes
whole and never filters on:

| Column                                                                                                    | What it holds                                                                          |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `properties.section_visibility`                                                                           | eighteen booleans deciding which sections the detail page renders                      |
| `properties.other_charges` (`pricing.otherCharges`)                                                       | `{ label, amount, note? }[]` shown under the price                                     |
| `properties.highlights`, `specifications`, `construction_specs`, `project_approvals`                      | label/value lists rendered as-is                                                       |
| `seo` on properties, articles, pages, localities, developers, property types, article categories, authors | the whole §9.6 object, including the analysis the SEO panel stores                     |
| `leads.requirement`                                                                                       | what the enquirer is looking for                                                       |
| `leads.utm`                                                                                               | the campaign parameters of the visit                                                   |
| `leads.meta`                                                                                              | free-form, source-specific — the financial-assessment answers and score, the bank name |
| `site_settings.*`, `seo_settings.*`                                                                       | one JSON column per settings group                                                     |
| `localities.pincodes`, `highlights`, `connectivity`                                                       | lists shown on the locality guide                                                      |
| `authors.social_links`, `team_members.social_links`                                                       | a handful of profile URLs                                                              |
| `developers.rera_ids`, `highlights`; `banks.features`; `job_openings.responsibilities`, `requirements`    | lists rendered as bullets                                                              |
| `articles.faqs`, `related_article_ids`, `related_property_ids`                                            | hand-picked sets, read whole with the article                                          |
| `media.tags`                                                                                              | free-text labels for the library filter                                                |

A JSON column is not an excuse to skip validation: every one of them has a shape
in `04_DATA_MODELS.md` and a rule in `03_ENDPOINTS.md`, and the API must reject a
malformed payload with 422 exactly as it does for a scalar.

MySQL 8 indexes JSON through generated columns if a report ever needs one:

```sql
ALTER TABLE properties
  ADD COLUMN seo_score INT AS (JSON_UNQUOTE(JSON_EXTRACT(seo, '$.score'))) STORED,
  ADD INDEX properties_seo_score_index (seo_score);
```

That is what `seoScoreBand` on the admin list filters on.

## Naming

- JSON is **camelCase**, columns are **snake_case**, and the API Resource is the
  only place that knows both. `superBuiltUpArea` ↔ `super_built_up_area`.
- The flattened objects lose their prefix when the key already carries the
  context: `location.address` → `address`, `pricing.price` → `price`,
  `area.carpetArea` → `carpet_area`, `configuration.bedrooms` → `bedrooms`.
- They keep it when dropping it would collide or mislead: `project.totalFloors` →
  `project_total_floors` (the property has its own `total_floors`),
  `agent.name` → `agent_name`. `project.landmarkProject` becomes
  `is_landmark_project`, which is what every other boolean in the schema looks
  like.
- Foreign keys are `<singular>_id`: `locality_id`, `property_type_id`,
  `article_tag_id`. The three that are not — `assigned_to`, `created_by`,
  `updated_by` — point at `admin_users` and are named for the relationship
  rather than the table, which is how they read in the API too.
- One reference is by slug rather than by id: `properties.segment` and
  `property_types.segment` hold a `segments.slug` (QA-52), because the contract
  has always carried the segment as a word (`residential`, `commercial`, `land`)
  and every URL, filter and cached record already uses it. Declare it a foreign
  key onto the unique `segments.slug` column (`exists:segments,slug` on write);
  the API never changes a segment's slug once it exists, so the reference never
  needs a cascade.
- The full column-by-column mapping is generated below; take it as the
  specification for the API Resources.

## Indexes

The generated schema carries these. They are not decoration — each one answers a
query the site makes on its first page load:

| Index                                                                              | Query it serves                                                                              |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `slug` UNIQUE on every public entity                                               | `GET /<resource>/slug/:slug`, and the `check-slug` guard                                     |
| `properties(locality_id)`, `(city_id)`, `(property_type_id)`, `(developer_id)`     | the filter rail of the listing page, and every "more in this locality" block                 |
| `properties(listing_type)`, `(segment)`, `(construction_status)`, `(availability)` | the category tiles and the four most-used filters                                            |
| `properties(is_active)`, `(is_featured)`                                           | the public scope (`isActive = 1`) is on **every** public read; featured drives the home page |
| `properties(price)`, `(rent_per_month)`                                            | `minPrice`/`maxPrice`, and `sort=price-asc\|price-desc`                                      |
| `properties(published_at)`                                                         | `sort=newest`, and the sitemap's `<lastmod>`                                                 |
| `articles(status)`, `(published_at)`, `(category_id)`, `(author_id)`               | the blog index, its taxonomy pages, and the scheduled-publishing job                         |
| `leads(status)`, `(source)`, `(priority)`, `(assigned_to)`                         | the CRM list filters and every dashboard aggregate                                           |
| `<child>(<parent>_id)`, `<child>(order)`                                           | loading a property's children in display order                                               |
| `redirects(from_path)` UNIQUE                                                      | the lookup on every 404                                                                      |

Two full-text indexes carry the `q` parameter:

```sql
FULLTEXT KEY properties_fulltext (title, project_name, short_description)
FULLTEXT KEY articles_fulltext (title, content_text)
```

`q` on properties also matches the locality name and the developer name (§5.7),
which the index cannot cover — join those two and `OR` a `LIKE` against them, or
denormalise both names onto `properties` if the plan proves slow. Start with the
join; 36 seed properties and a few thousand real ones will not notice.

`articles.content_text` is the plain-text projection the API writes on every save
(it is what `readingTimeMinutes` and `wordCount` are computed from). Index that,
never `content`: an HTML column full of tags matches on `<strong>`.

Below the InnoDB default, `ft_min_word_len`/`innodb_ft_min_token_size` is 3, so a
two-letter search term returns nothing from `MATCH … AGAINST`. The mock's
substring search does find it. If the difference shows up in the parity run, fall
back to `LIKE '%term%'` for terms shorter than three characters rather than
lowering the server-wide setting.
