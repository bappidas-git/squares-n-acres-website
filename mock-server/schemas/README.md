# Schema descriptors

`models.js` describes every `db.json` collection — one descriptor per collection, listing
every field of `prompts/00_MASTER_CONTEXT.md` §6 with its type, nullability and default.
`src/services/schemas/*.js` describes every request body in the same mini-language and is
the source of each collection's **writable** part, so the storage contract and the request
contract cannot drift.

Three consumers read these descriptors:

| Consumer                                  | Use                                                        |
| ----------------------------------------- | ---------------------------------------------------------- |
| `mock-server/middleware/validate.js`      | 422 responses in the Laravel error shape (§5.3)            |
| `scripts/validate-seed.js`                | the seed must satisfy the same rules as an API write        |
| `scripts/generate-backend-guidelines.js`  | renders each field as a Laravel validation rule string      |

## Collection descriptor

```js
{
  collection: 'properties',          // db.json key
  singleton: true,                   // optional; the record is an object, not an array
  slugField: 'slug',                 // the unique public slug, or null
  publicRead: false,                 // optional; the collection has no public endpoint at all
  searchable: ['title', 'projectName'],          // fields the `q` parameter matches
  sortable: ['newest', 'price-asc', 'title'],    // values the `sort` parameter accepts
  defaultSort: { field: 'relevance', order: 'desc' },
  publicScope: { isActive: true },   // filter forced on public reads, or null
  publicOmit: ['createdBy'],         // fields stripped from public responses (§5.10)
  fields: { /* name → field descriptor */ },
}
```

## Field descriptor

```js
{
  type: 'string',        // see the table below
  required: true,        // must be present and non-empty on create / replace
  nullable: true,        // null is a valid value
  enum: ['sale', 'rent'],// allowed values, with type 'enum'
  accepts: ['sale_x'],   // extra values the API tolerates and normalises (legacy input)
  min: 10,               // number: minimum · string: minimum length · array: minimum length
  max: 100,              // number: maximum · array: maximum length
  maxLength: 300,        // string maximum length
  pattern: '^/',         // regular-expression source the value must match
  unique: true,          // unique across the collection
  items: { type: 'int' },// element descriptor, with type 'array'
  shape: { /* … */ },    // { field: descriptor }, with type 'object'
  default: 0,            // what the API stores when the key is absent
  read: true,            // computed or embedded by the API; ignored when a client sends it
  serverManaged: true,   // set by the API only; never accepted from a client
  secret: true,          // never returned by any endpoint
  note: 'Active properties in this locality',
}
```

### Types

| Type       | Accepts                                    | Laravel rule                          |
| ---------- | ------------------------------------------ | ------------------------------------- |
| `string`   | text                                        | `string`                              |
| `int`      | integer                                     | `integer`                             |
| `number`   | integer or decimal                          | `numeric`                             |
| `bool`     | `true` / `false`                            | `boolean`                             |
| `enum`     | one of `enum`                               | `in:a,b,c`                            |
| `date`     | `yyyy-mm-dd`                                | `date_format:Y-m-d`                   |
| `datetime` | ISO-8601 UTC                                | `date`                                |
| `email`    | e-mail address                              | `email`                               |
| `phone`    | Indian mobile, 10 digits starting 6–9       | `regex:/^(\+91)?[6-9]\d{9}$/`         |
| `url`      | absolute URL                                | `url`                                 |
| `html`     | sanitised HTML                              | `string`                              |
| `slug`     | `[a-z0-9-]`, ≤ 75 chars                     | `regex:/^[a-z0-9-]+$/`                |
| `array`    | list of `items`                             | `array`                               |
| `object`   | map of `shape`                              | `array` (associative)                 |

## Rendering a descriptor as Laravel rules

Rules are assembled in this order: presence → nullability → type → bounds → relations.

| Descriptor                                                         | Laravel rule                                  |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `{ type: 'string', required: true, maxLength: 300 }`               | `required\|string\|max:300`                   |
| `{ type: 'string', required: true, min: 10, maxLength: 200 }`      | `required\|string\|min:10\|max:200`           |
| `{ type: 'int', nullable: true }` on `localityId`                  | `nullable\|integer\|exists:localities,id`     |
| `{ type: 'enum', enum: ['sale', 'rent', 'lease'] }`                | `in:sale,rent,lease`                          |
| `{ type: 'bool', default: false }`                                 | `boolean`                                     |
| `{ type: 'number', min: 0 }`                                       | `numeric\|min:0`                              |
| `{ type: 'email', required: true, unique: true }`                  | `required\|email\|unique:<table>,<column>`     |
| `{ type: 'array', items: { type: 'int' } }` on `amenityIds`        | `array` + `amenityIds.*` → `integer\|exists:amenities,id` |
| `{ type: 'object', shape: { … } }` on `location`                   | `array` + one rule per `location.<key>`        |
| `{ type: 'slug', maxLength: 75 }`                                  | `nullable\|regex:/^[a-z0-9-]+$/\|max:75\|unique:<table>,slug` |
| `{ type: 'date', nullable: true }`                                 | `nullable\|date_format:Y-m-d`                 |
| `{ read: true }` / `{ serverManaged: true }`                        | not validated — stripped from the request      |

A field name ending in `Id` (or `Ids` for an array's items) maps to `exists:<collection>,id`
on the collection its name points at: `localityId` → `localities`, `propertyTypeId` →
`propertyTypes`, `amenityIds.*` → `amenities`, `assignedTo` → `adminUsers`.

Nested keys keep their dotted path in the 422 error body — `location.localityId`,
`images.0.alt` (§5.3).
