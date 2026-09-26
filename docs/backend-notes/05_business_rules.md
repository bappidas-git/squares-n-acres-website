# Backend notes — business rules

Merged into `backend_developer_guidelines/05_BUSINESS_RULES.md`. Everything the
API does that a schema and a route table cannot express, with the formulas the
mock actually implements — `mock-server/` is the executable version of this
file, and the smoke test proves the two agree.

Edit this file, never the generated one.

## Slugs

Every public entity has one, and the API owns it (§5.9).

- Generate from the title when the client sends `slug: ""` or omits it:
  lowercase, transliterate, keep `[a-z0-9-]`, collapse runs of `-`, trim, cut to
  **75 characters**.
- De-duplicate by suffixing `-2`, `-3`, … against the same collection, ignoring
  the record being updated. Cutting to 75 happens **before** the suffix, so
  `…-2` never overflows.
- A duplicate **explicit** slug is a conflict, not a silent rename: **409** with
  `errors.slug`.
- **An empty slug is never stored** (QA-60). A title with no Latin letter or
  digit in it — `"!!"`, `"北京 नगर"`, a listing titled in Devanagari alone —
  makes no slug at all: it used to be stored as `""`, two such records shared
  it and neither had a page. Such a record keeps the slug it already has, or is
  given `<noun>-<id>` (`locality-21`, `property-type-18`, `property-45`),
  de-duplicated like any other; the editor can replace it.
- `GET /admin/<resource>/check-slug?slug=&excludeId=` answers
  `{ data: { available, suggestion } }`. `suggestion` is the de-duplicated form
  and is `null` when the slug is free.
- `entity.slug` and `entity.seo.slug` are always the same value. The API writes
  both; a client that sends only one gets both updated.
- Changing a slug does **not** create a redirect automatically. The admin offers
  it — a page (QA-56), and a locality, a developer and a property type (QA-60),
  whose old addresses it sends to the new ones with a 301 — and the API only
  stores what `/admin/redirects` is told.

## Property search

`GET /properties` and `GET /admin/properties` share one filter implementation
(§5.7). Four rules are easy to get subtly wrong:

**Price.** The value a filter and a sort compare against is not one column:

```
priceOf(property) =
    null                      when pricing.priceOnRequest
    pricing.rentPerMonth      when listingType in (rent, lease)
    pricing.price ?? pricing.priceRangeMin    otherwise
```

`priceOnRequest` records are **excluded** when `minPrice` or `maxPrice` is set,
and sort **last** on `price-asc` and `price-desc` — last in both directions,
because "unknown" is not "cheapest".

A sale's total and a rental's monthly figure are two scales, so a price sort
never compares one with the other: **sales first, then rents and leases**, each
group in the requested direction. A plain numeric sort put every ₹21,000/month
flat ahead of the cheapest ₹34.5 L sale on "low to high".

**Bedrooms.** `bedrooms=3` matches a property whose `configuration.bedrooms` is 3
**or** that has an active unit configuration with 3 bedrooms. `bedrooms=5` means
**five or more**, in the filter and in the facet. In SQL that is a join against
`property_unit_configurations` with `is_active = 1`, plus the property's own
column, `UNION`ed.

**Area.** The headline area is `superBuiltUpArea ?? carpetArea ?? plotArea`,
converted to the requested `areaUnit` before comparing. The factors to square
feet are: `sqm` 10.7639, `sqyd` 9, `acre` 43560, `cent` 435.6, `guntha` 1089.
Storing a generated `area_sqft` column is the sane way to make it indexable.

**Sorting.**

| `sort`                     | Order                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| `relevance` (default)      | `is_featured DESC, priority_order DESC, updated_at DESC`            |
| `newest`                   | `published_at DESC`, nulls last                                     |
| `price-asc` / `price-desc` | sales before rentals, then `priceOf` asc / desc, nulls last in both |
| `area-desc`                | headline area in sq ft, descending, nulls last                      |
| `popular`                  | `view_count DESC`                                                   |

The admin list adds the plain columns `updatedAt`, `createdAt`, `price`,
`viewCount`, `priorityOrder`, `title` and `seoScore`, and those alone honour
`order=asc|desc`. `title` compares case- and accent-insensitively; `price`
groups sales before rentals exactly as `price-asc`/`price-desc` do.

**Facets** (`meta.facets`, on both property lists) are counted on the result set
**after every other filter and before pagination** — that is what makes
"Whitefield (3)" mean three of the results you are looking at. A property is
counted under _every_ bedroom count it can be found under, exactly as the filter
matches it; the other three facets count each property once. Sort each facet by
count descending, then by label, so ties do not shuffle between requests.

## Similar properties

`GET /properties/:id/similar` returns at most **six**:

1. The editor's own `similarPropertyIds`, in their order, skipping any that are
   inactive or gone.
2. Topped up from the active pool, excluding the property itself and the ones
   already chosen, by: **same `listingType`** _and_ (**same `localityId`** _or_
   **same `propertyTypeId`**), ordered by `relevance`.
3. Cut to six.

An inactive property has no similar list at all: the endpoint is 404.

## Property writes

What a listing must be before it is stored live, and what a replace made from an
older version of it is answered with (QA-62). The form had refused a
half-written listing since prompt 21; the API had not, so the list's eye toggle,
its row menu and its bulk "Activate" — none of which goes through the form — put
a listing with no photograph, no description and no price on the site, and,
featured, into the home page's Featured row.

**Going live.** A listing whose stored result is `isActive: true` needs, each
refused under its own 422 key:

- an image with both a `url` and an `alt` — `images`: "A published listing needs
  at least one image with a description."
- at least 300 characters of text in `description`, tags stripped and entities
  read as spaces — `description`: "A published listing needs a description of at
  least 300 characters (this one has _n_)."
- a non-empty `shortDescription` — `shortDescription`: "A published listing needs
  a one-line summary."
- a price: for a sale `price`, or both ends of the range; for a rent or a lease
  `rentPerMonth`; or `priceOnRequest` either way — `pricing.price`: "A published
  listing needs a price, a price range, or “Price on request”." /
  `pricing.rentPerMonth`: "A published rental needs a monthly rent, or “Price on
  request”."

The rules and the sentences live in `src/config/propertyRules.js`, which the form
and the mock both read. They are asked of every `POST` and `PUT` that leaves the
listing live, and of a `PATCH` that sends `isActive`, `listingType`, `images`,
`description`, `shortDescription` or `pricing` — a featured star or a priority on
a live listing is not a publish, and is not asked. A draft (`isActive: false`)
may be anything. The refusal also names what is missing in one sentence, so a
client that is not a form can say it:

```jsonc
// 422 — PATCH /admin/properties/41 { "isActive": true }
{
  "message": "“Bare Draft” is not ready to go live: no photograph with a description, 0 of 300 characters of description, no one-line summary, no price.",
  "errors": { "images": ["…"], "description": ["…"], "shortDescription": ["…"], "pricing.price": ["…"] },
  "data": {
    "notReady": [
      {
        "id": 41,
        "title": "Bare Draft",
        "gaps": ["no photograph with a description", "0 of 300 characters of description", "no one-line summary", "no price"],
      },
    ],
  },
}
```

**Bulk activate.** `POST /admin/properties/bulk { action: 'activate' }` asks the
same rules of every listing it would put live, **all or nothing**, like the
articles' bulk "publish": one refusal lists every listing in the way — `message`
"2 of the selected properties are not ready to go live, so none was activated."
(or the single sentence above for one), `errors.ids` one line per listing,
`data.notReady` as above. A listing already live is not asked. The admin list
asks the rules before it calls, names each listing and what it lacks, and offers
to activate the ones that are ready.

**A replace made from an older version.** `PUT /admin/properties/:id` may carry
`updatedAt` — the value the client read. When the stored `updatedAt` differs,
the listing was saved by somebody else in between, and the replace is refused
rather than written: a `PUT` sends every field, so the older copy would silently
undo the other save (a form left open un-featured a listing starred from the
list meanwhile).

```jsonc
// 409
{
  "message": "Admin User saved this listing after you opened it.",
  "data": {
    "conflict": "stale",
    "current": { "updatedAt": "2026-09-25T06:12:03.412Z", "updatedBy": { "id": 1, "name": "Admin User" } },
  },
}
```

Compare the value byte for byte with what this API itself serialises for
`updatedAt` — the client only ever echoes it. A body without `updatedAt` replaces
as before: that is every client written before the check, and the form's "Save
mine anyway". The slug's 409 is told apart by `errors.slug`; this one carries
`data.conflict`. `PATCH` is not checked — it writes only the keys it sends.

```php
// app/Http/Controllers/Admin/PropertyController.php
public function update(PropertyRequest $request, Property $property)
{
    $readAt = $request->input('updatedAt');
    if ($readAt !== null && $readAt !== $property->updated_at?->toJSON()) {
        return response()->json([
            'message' => ($property->updatedBy?->name ?? 'Somebody else').' saved this listing after you opened it.',
            'data' => ['conflict' => 'stale', 'current' => [
                'updatedAt' => $property->updated_at?->toJSON(),
                'updatedBy' => $property->updatedBy?->only(['id', 'name']),
            ]],
        ], 409);
    }
    // …the replace, which PropertyRequest has already asked the publish rules of.
}
```

**The featured row.** `GET /properties/featured` honours the §5.7 filters its
registry entry declares (it answered every featured listing whatever was asked).
The home page's Featured row asks for up to 24 — the §8.6 cap on a page — rather
than 8, so featuring a listing puts it in the row; the order is still `relevance`
(priority, then the latest edit).

## View counting

`POST /properties/:id/view` increments `view_count` and answers
`{ data: { viewCount } }`.

It is **debounced per IP per property per hour**: the same visitor reloading a
listing counts once. The mock keeps the window in memory; Laravel should use the
cache, which survives a restart and is shared across workers:

```php
$key = "view:{$request->ip()}:{$property->id}";
if (Cache::add($key, true, now()->addHour())) {
    $property->increment('view_count');
    PropertyView::create(['property_id' => $property->id, 'viewed_at' => now(),
                          'referrer' => $request->headers->get('referer')]);
}
```

`Cache::add` is the atomic form — it writes only when the key is absent, so two
simultaneous requests cannot both count.

The `property_views` row is what the dashboard's `viewsByDay` trend reads. Prune
it beyond 90 days; nothing in the contract looks further back.

## Counters

`view_count` and `enquiry_count` are **server-managed**. They are returned on
reads and ignored on every write — a client that sends them changes nothing.
`enquiry_count` moves in one place only: `POST /leads` with a `propertyId`
increments the property it names. Use `increment()`, never read-modify-write.

## Leads

`POST /leads` is the busiest write in the system and does seven things:

1. Maps a legacy `source` through `LEGACY_LEAD_SOURCE_MAP` (§6.17) — the old
   site's values still arrive from bookmarked pages and third-party forms.
2. Sets `status: 'new'` and `priority` from `siteSettings.leads.defaultPriority`.
3. Stores `utm`, `pageUrl`, `ipAddress` and `userAgent` from the request.
4. Appends `activities[0]`: `{ type: 'created', description: 'Lead created via <source label>' }`.
5. Increments the named property's `enquiry_count`.
6. Auto-assigns when `siteSettings.leads.autoAssign === 'round-robin'`:
   active sales users ordered by id; find the one who got the **most recent**
   round-robin lead; assign to the next in the ring, wrapping; assign to the
   first when none has one yet. With no active sales user, leave it unassigned.
7. Answers **201** with the stored lead, plus `access`: the token that opens the
   gated files of the listing the lead names, or `null` when it names no active
   listing (see [Gated files](#gated-files)). The token is never stored on the
   lead.

**Activities are appended, never edited.** A `PATCH` that changes `status`,
`assignedTo`, `priority` or `followUpAt` appends one entry per field that
actually changed — comparing against the stored value, so a no-op write records
nothing and leaves `updated_at` alone. Adding a note appends `note-added`. The
entry carries the acting user, and every response names them:
`activities[].createdByName` is joined from `admin_users` on read, as a note's
author is — a sales user cannot list the directory, so an id alone left the
manager's "Assigned to Sales User" with no author (QA-53).

The sentences are fixed text, dates in **IST**: "Follow-up set for 20 Sep 2026,
03:30 pm", and a move to Lost carries its reason — "Status changed from
Contacted to Lost — Bought elsewhere".

**Lost asks why** (prompt 29 §7, QA-53):

- moving a lead to `lost` needs `lostReason`, trimmed, 3–300 characters — 422 on
  `lostReason` otherwise; so does rewriting the reason of a lead that is lost;
- moving a lost lead to any other status clears `lost_reason` — the activity of
  the move to Lost still holds it;
- a `lostReason` on a lead that is not, and is not becoming, lost is a 422.

**Owners.** `assignedTo` is an existing user's integer id or `null`; a
deactivated user is refused as a **new** owner (422 "The selected user is
inactive."), while a lead already held by one keeps them until reassigned.

**Sorting and searching the CRM.** `sort=status` follows the funnel — new,
contacted, qualified, site-visit, negotiation, converted, then lost — and
`sort=priority` runs low, medium, high: the enum's order, never the words'
(alphabetical put "High" between nothing and "Low"). Rows that tie keep newest
first, then the higher id, so a page boundary is stable. `q` matches name,
e-mail, phone and message as typed, and a query made only of phone characters
also matches on digits: `98765 43210`, `+91 98765 43210` and `098765 43210` all
find a lead stored as `9876543210` or `+919876543210`.

**Dates are Indian days.** `from` and `to` compare the **IST** calendar date of
`created_at` (UTC+05:30; India keeps no daylight saving, so the offset is a
constant and two servers still agree). The panel prints every date in IST, and
a lead that arrived at 01:30 on the 14th is found by "created on the 14th"; the
UTC date put it on the 13th. This supersedes D96.

**Phone numbers.** `POST /leads` stores an Indian mobile as `+91` and its ten
digits. The country code is taken off only when it is one — twelve digits
starting 91 — and the trunk zero only from eleven digits: a ten-digit mobile of
the 91xxx series is a whole number, not `+91` and eight digits.

**`isPossibleDuplicate`** is computed on read, never stored: the phone number,
normalised to its last ten digits, matches another lead created within
**30 days** of this one. The window is measured **between the two leads**, not
from today, so the answer for a pair never changes as the calendar moves on. It
is computed over **all** leads, including the ones outside a sales user's
scope — whether a caller has enquired before is a fact about the caller.

`POST /admin/leads/:id/claim` sets `assigned_to` to the caller **only while the
lead is unassigned**; otherwise 409.

## Scheduled publishing

An article is public when `status = 'published'`, or when `status = 'scheduled'`
and `published_at <= now()`. Two consequences:

- Every **public** article query carries that condition. It must not depend on a
  job having run, or an article scheduled for 06:30 is invisible until the job's
  next tick.
- A job flips the row so the admin list tells the truth:

```php
// app/Console/Kernel.php
$schedule->command('articles:publish-scheduled')->everyMinute();

// the command
Article::where('status', 'scheduled')->where('published_at', '<=', now())
       ->update(['status' => 'published']);
```

`scheduled` with a `published_at` in the past is rejected at write time with 422,
and so is `scheduled` with no `published_at` at all.

`published_at` on a **property** is different: it is stamped the first time
`is_active` becomes true and never cleared again.

## Preview tokens

`GET /admin/articles/:id/preview-token` and the same on pages answer
`{ data: { token, url } }`. The token is valid **24 hours** and is bound to that
one record.

`GET /articles/slug/:slug?preview=<token>` and `GET /pages/slug/:slug?preview=<token>`
return a draft or scheduled record when the token matches, and 404 when it does
not. Nothing else changes: the response is the ordinary one, so the public page
renders a draft without knowing it.

Store them in the cache keyed by token with the record id as the value, and add
`Disallow: /*?preview=` to `robots.txt` — which the default already does.

## Article writes

What an article must be before it is stored, asked on the API as well as in the
form (QA-55). The form had enforced most of this since prompt 33; the API had
not, so the list's bulk "Publish" — which never goes through the form — put a
four-word draft with no picture and no excerpt on the site, and a request that
never touched the admin could do the same. Every rule answers in **one** 422: a
body that breaks three of them hears about all three.

**Going live.** `published` and `scheduled` both put an article in front of a
visitor (a scheduled article is a published one with a date on it, P33), so both
need:

| Rule                                        | 422 key             | Message                                                            |
| ------------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| a non-empty `excerpt`                       | `excerpt`           | An excerpt is required before an article goes live.                |
| a `featuredImage.url`                       | `featuredImage.url` | A featured image is required before an article goes live.          |
| ≥ 300 words in the body (derived, as below) | `content`           | An article needs at least 300 words to go live — this one has _n_. |

The word count is the one the API derives from `content` for `wordCount`, so the
number in the message is the number the admin shows. The rules and the sentences
live in `src/config/articleRules.js`, which the form and the mock both read. They
are asked on every `POST` and `PUT`, and on a `PATCH` that sends `status`,
`publishedAt`, `excerpt`, `content` or `featuredImage` — flipping `isFeatured` on
a live article is not a publish. Alt text is required whenever there is an image,
whatever the status; that was already a schema rule.

**Dates.** `scheduled` needs a `publishedAt` in the future (above).
`published` may **not** carry one: the public site reads the date, not the word
(`published_at <= now()`), so a "published" article dated next month is a 404
the admin calls live. 422 on `publishedAt`: "A published article cannot carry a
date in the future — schedule it instead." A published article without a date
is stamped with the moment it went live; unpublishing and republishing keeps
the original.

**Bulk publish.** `POST /admin/articles/bulk { action: 'publish' }` asks the same
rules of every article it would put live, **all or nothing** — like a bulk
delete that would strand a reference, one refusal lists everything in the way:

```jsonc
// 422
{
  "message": "2 of the selected articles are not ready to go live.",
  "errors": { "ids": ["“Stamp duty basics”: no excerpt, 212 of 300 words.", "…"] },
  "data": {
    "notReady": [
      { "id": 14, "title": "Stamp duty basics", "gaps": ["no excerpt", "212 of 300 words"] },
    ],
  },
}
```

An article already published is not asked and not counted (publishing it again
changes nothing). A **scheduled** article that is bulk-published goes live
**now**: its `publishedAt` becomes the moment of the request, not the future
date it was waiting for. The admin list asks the rules before it calls, names
each article and what it lacks, and offers to publish the ones that are ready.

**References.** Every id an article names must name a record:
`categoryId` → `exists:article_categories,id`, `authorId` → `exists:authors,id`,
`tagIds.*` → `exists:article_tags,id`, `relatedArticleIds.*` →
`exists:articles,id`, `relatedPropertyIds.*` → `exists:properties,id`. The 422
is Laravel's own sentence keyed by the field — "The selected categoryId is
invalid.", `tagIds.2` for the third tag. An article is not related to itself
("An article cannot be related to itself." on `relatedArticleIds.n`). A `PATCH`
is asked only about the references it sends.

**Markup.** `content` and every `faqs.*.answer` are refused (422) when they carry
a `<script>`, an inline event handler (`onerror=`, `onclick=`…) or a
`javascript:` link: "The text may not carry a script, an inline event handler or
a javascript: link." The editor never writes one and the public page drops them
(`SafeHtml`), so one arriving here came from somewhere else; refusing it keeps
the stored body the one every client can render.

```php
// app/Http/Requests/ArticleRequest.php — the rules the schema cannot say
public function withValidator($validator): void
{
    $validator->after(function ($v) {
        $status = $this->input('status', $this->article?->status);
        if (in_array($status, ['published', 'scheduled'], true)) {
            // The helper that derives `word_count`, so the message and the admin agree.
            $words = Article::wordCountOf($this->input('content', $this->article?->content));
            if (blank($this->input('excerpt', $this->article?->excerpt)))
                $v->errors()->add('excerpt', 'An excerpt is required before an article goes live.');
            if (blank(data_get($this->input('featuredImage'), 'url', $this->article?->featured_image_url)))
                $v->errors()->add('featuredImage.url', 'A featured image is required before an article goes live.');
            if ($words < 300)
                $v->errors()->add('content', "An article needs at least 300 words to go live — this one has {$words}.");
        }
        if ($status === 'published' && $this->date('publishedAt')?->isFuture())
            $v->errors()->add('publishedAt', 'A published article cannot carry a date in the future — schedule it instead.');
    });
}
```

## Pages

What the CMS pages must be (QA-56). The site answers some addresses itself and
links to others by address, so not every page is the editor's to delete or move.
`src/config/pages.js` is the list, and the sentences below are the ones the API
answers with and the admin shows.

**Built-in pages.** One record per page the site generates from its own data —
`properties`, `buy`, `rent`, `commercial`, `lease`, `plots`, `localities`,
`builders`, `insights/articles`, `insights/faqs`, `shortlist` — with
`template: 'system'`. They exist so an editor can rename one, place it in the
header or the footer and order it like any page; what they list comes from the
listings, the localities, the articles… and their head from the page-type
templates of the SEO settings.

| Rule                                               | Answer                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST` with `template: 'system'`                   | 422 on `template` — “Built-in” is kept for the pages that come with the site.                              |
| a write moving a page into or out of `system`      | 422 on `template` — A built-in page keeps its template: the site generates it.                             |
| `status` other than `published` on a built-in page | 422 on `status` — A built-in page is always live: the site generates it. Take it out of the menus instead. |
| non-empty `blocks` on a built-in page              | 422 on `blocks` — A built-in page has no blocks: the site generates its content.                           |

They are left out of the CMS sitemap loop (their routes are in the static
sitemap already), of the SEO desk and of the dashboard's page counts.

**Protected pages** — the built-in ones, and the written pages the site's own
templates reach by address: `home` (the home page reads its two bands and its
head from it, D81), `contact`, `careers`, `sell-let`, `privacy-policy`,
`terms-of-use`, `disclaimer` and `insights/real-estate-awareness` (its prefix is
reserved, so deleted it could never be made again at that address, D11).

- **Never deleted.** `DELETE` is **409** with the reason in `message` (“The home
  page cannot be deleted: …”, ““Buy” is built into the site and cannot be
  deleted. Take it out of the menus instead.”, ““Contact Us” cannot be deleted:
  the site links to it by its address. Unpublish it instead.”).
- **Keep their slug.** A write that sends a different slug is **422** on `slug`;
  an empty slug on a `PUT` keeps the stored one instead of deriving a new one.
- A protected **written** page may still be unpublished; the admin asks first,
  because the site's links to it lead to a 404 until it is published again.
- **The home page is not redirected.** Its address is `/`; `seo.redirect.enabled`
  set on the `home` record is **422** on that key (“The home page cannot be
  redirected: its address is /, where every visitor arrives.”). The admin locks
  the switch.
- **Its preview URL is the site root**: `GET /admin/pages/:id/preview-token` for
  `home` answers `https://…/?preview=<token>`, and the public route `/home`
  redirects to `/`.

**A bulk action is refused whole** when any selected page cannot take it —
**409** for `delete`, **422** for `unpublish` — naming the pages in
`data.refused[] { id, title, reason }`, and nothing is written. The admin checks
the rows first and offers to run the action on the rest.

**Placement.** `headerMenu` names a `header_menus.slug` (`exists`, required while
`showInHeader` is true); `headerSubmenu` names one of that menu's
`submenus[].slug` or is `null` (422 “The selected headerSubmenu is invalid.”),
and is cleared when the page leaves its menu. `footerColumn` is required while
`showInFooter` is true. `order` is an integer 0–100 000 and the title 2–150
characters.

**Moving a live page.** The admin offers — on by default — a 301 from the
address a published page leaves to the one it moves to, written as a `redirects`
row after the page is saved, and retires an active rule from the new address
that would now loop. The API itself writes no redirect on a slug change.

```php
// app/Http/Requests/PageRequest.php — the rules the descriptor cannot say
public function withValidator($v): void
{
    $v->after(function ($v) {
        $page = $this->route('page'); // null on POST
        if (!$page && $this->input('template') === 'system')
            $v->errors()->add('template', '“Built-in” is kept for the pages that come with the site.');
        if ($page && $page->isProtected() && $this->filled('slug') && Str::slugPath($this->input('slug')) !== $page->slug)
            $v->errors()->add('slug', $page->slugRefusal());
        if ($page?->isSystem() && $this->has('status') && $this->input('status') !== 'published')
            $v->errors()->add('status', 'A built-in page is always live: the site generates it. Take it out of the menus instead.');
        if ($page?->slug === 'home' && data_get($this->input('seo'), 'redirect.enabled') === true)
            $v->errors()->add('seo.redirect.enabled', 'The home page cannot be redirected: its address is /, where every visitor arrives.');
    });
}
```

## Header menus

The header's menus are records (QA-56): an editor adds, renames, reorders,
hides and deletes them, gives them submenus, places pages in them (from the
menu's dialog or from each page's form) and types links into them. The header
draws the active menus left to right by `order`; within a menu, the pages
(published only, by their own `order`) come before the links, grouped by
submenu, and a menu's own list comes first.

- **A menu keeps its `slug`** — pages are filed under it (422 on `slug`); an
  empty or missing one on a `PUT` keeps the stored slug. It is derived from the
  name on `POST` and de-duplicated (§5.9).
- **Names are unique**, ignoring case and surrounding space: a menu's in the
  header (422 on `name`: “The header already has a menu called “Company”. Give
  this one another name.”), a submenu's within its menu (422 on
  `submenus.<n>.name`).
- **`source`** is `custom` for a menu of pages and links. `buy`, `rent` and
  `commercial` are the site's generated mega menus: they come with the site, are
  never created by a client (422 on `source`), never change source and are never
  deleted (**409**: ““Buy” is generated by the site and cannot be deleted. Hide
  it instead.”). They take pages and links after their generated columns.
- **Submenus** have a slug derived from their name when sent empty, unique within
  the menu (422 on `submenus.<n>.slug` for one sent twice). Renaming a submenu
  keeps its slug, so its pages stay in it. **Removing** one moves its pages into
  the menu's own list (`headerSubmenu = null`, their `updated_at` moves).
- **Links** carry `label`, `href` (a path on this site or an `http(s)` address —
  anything else, `javascript:` included, is 422), `submenu` (one of the menu's
  submenus or `null`, 422 per index otherwise), `order` and `newTab`.
- **Deleting a menu** takes its pages out of the header — `show_in_header = 0`,
  `header_menu = NULL`, `header_submenu = NULL` — and leaves them published at
  their addresses. The foreign key is `ON DELETE SET NULL`; clear
  `show_in_header` in the same transaction.
- **`GET /header-menus`** answers the active menus, unpaginated, with a
  read-only `builtIn` flag; hidden menus keep their pages and links.

## Writes that change nothing

A `PUT` or `PATCH` whose result would be the record already stored — every
field equal, leaving aside `updated_at` and `updated_by` — writes nothing and
answers **200** with the stored record. `updated_at` does not move (QA-55). A
second Save of an untouched article used to be written anyway, which moved it to
the top of every list sorted by "Updated" and changed the `lastmod` its sitemap
entry reports. Eloquent already behaves this way: `save()` on a model with no
dirty attributes issues no `UPDATE`.

The same holds per record in a bulk action: a record already in the target
state is not written, keeps its `updated_at`, and is not counted in `affected`.

## URLs

Every field the request schemas type `url` is at most **500 characters**, at any
depth and in any list of them — `logoUrl`, `featuredImage.url`,
`footer.galleryImageUrls.*`, `pageUrl` (QA-65). Its column is a `VARCHAR(500)`,
and the addresses kept inside JSON columns — every record's `seo`, the
`social_links` of authors and team members, `site_settings` and `seo_settings` —
are held to the same; the rule is `url|max:500`. A longer address
answers **422** under its dotted key — "The logoUrl may not be greater than 500
characters." — rather than failing the write or being cut short by the
database. A descriptor may name its own `maxLength`, and its column is then that
wide; none names a different one today.

Two public writes carry an address the visitor may not have chosen. The lead
forms send the page the visitor was on as `pageUrl`: past 500 characters — an
advertisement's `gclid`, `gbraid` and `_gl` tags — the frontend sends it without
its fragment, then without its query (the `utm_*` values travel in `utm`), so an
enquiry is never refused over it. A job application's `resumeUrl` is the
address of the uploaded file, well under 500, or a link the applicant pasted —
an expiring cloud-drive link can be longer — and the form says a pasted link is
too long before it is sent.

## Gated files

An editor can keep a listing's brochure (`brochure_lead_gated`, default on) and
any of its documents (`documents[].lead_gated`, default on, D64) behind the lead
form, and the floor plans are always behind it — every drawing and every PDF,
on the plans and on the unit configurations; there is no switch for those.
**The gate is the API's, not the page's**: a public read never carries the
address of a gated file, so reading the JSON or the page source does not get
round it. (Until QA-51 it did — the gate was the page's word only.)

**Public reads** — every public property shape: `GET /properties`,
`/properties/featured`, `/properties/slug/:slug`, `/properties/:id/similar`:

- `brochureUrl` is `null` while the brochure is gated. `hasBrochure` says whether
  a brochure is attached at all, gated or not.
- A gated document keeps its row (`id`, `title`, `type`, `order`) with
  `url: null`, `leadGated: true` and `hasFile: true`. Every document carries
  `hasFile`, so the page can tell "nothing attached" from "attached, ask first".
- **One file, one gate.** An open document — or an open brochure — whose address
  is also a gated file's is gated with it, and says so (`leadGated: true`,
  `brochureLeadGated: true`): otherwise the open copy would hand the gated file
  out.
- A document whose address is the brochure's own is left out of `documents[]`:
  it is the brochure, offered once. The page always did this; with the address
  gone it has to be the API that does it.
- Every floor plan keeps its row with `imageUrl: null`, `pdfUrl: null`,
  `hasImage` and `hasPdf`; every unit configuration keeps its row with
  `floorPlanImageUrl: null`, `floorPlanPdfUrl: null`, `hasFloorPlanImage` and
  `hasFloorPlanPdf`. The drawings count as gated files for the one-file rule
  above: an open paper that is a floor plan's PDF is gated with it.
- The photo gallery (`images[]`) is not a gated file. A drawing the editor also
  puts among the photographs is public through the gallery — and in the
  sitemap's `<image:image>` entries, which read the gallery only.
- **Admin reads are unchanged** — `/admin/properties…` answers the record as
  stored, addresses and all.

**The token.** `POST /leads` answers a lead whose `propertyId` names an active
listing with `access: { token, expiresAt }`, and every other lead with
`access: null`. The honeypot's `{ data: null, message: 'ok' }` hands out
nothing. The token:

- is opaque and unguessable (the mock uses 24 random bytes, base64url);
- opens **every** gated file of that one listing, and nothing on any other;
- lives **24 hours**, and dies with its lead — a lead deleted as spam takes its
  token with it;
- is a credential for that answer only: never stored on the lead, never shown in
  the CRM.

Any lead about the listing earns it, whatever form it came from. That is the
rule the page already applied when deciding not to ask a visitor twice (P24,
P28): somebody who has enquired, or asked for any one paper, is not asked
again for the next. The page's per-kind unlock (`floorPlans`, `documents`) is
how it presents that fact; the brochure and the documents are one kind.

**The exchange.** `POST /properties/:id/documents/access` with `{ "token": "…" }`
answers every file of the listing that has an address — the open papers too, so
the page renders one list, but not a document that is the brochure's own file —
and the drawings and PDFs of the floor plans and of the **active** unit
configurations (a retired unit is never on the page):

```json
{
  "data": {
    "brochureUrl": "https://files.example.com/lakeview/brochure.pdf",
    "documents": [{ "id": 2, "url": "https://files.example.com/lakeview/price-list.pdf" }],
    "floorPlans": [
      {
        "id": 1,
        "imageUrl": "https://files.example.com/lakeview/plan-2bhk.png",
        "pdfUrl": "https://files.example.com/lakeview/plan-2bhk.pdf"
      }
    ],
    "unitConfigurations": [
      {
        "id": 1,
        "floorPlanImageUrl": "https://files.example.com/lakeview/unit-2bhk.png",
        "floorPlanPdfUrl": null
      }
    ]
  }
}
```

- `404` — the listing is missing or inactive, whatever the token;
- `422` — no `token`;
- `403` `{ "message": "Share your details to open the files of this listing." }` —
  the token is unknown, expired, issued for another listing, or its lead is gone.

It is a read and writes nothing: the lead that earned the token already records
what was asked for (`message: "Requested: <file>"`), and the page counts the
download in analytics (`brochure_download`, `document_download`). It needs no
rate limit of its own — the tokens cannot be guessed, and `POST /leads`, which
issues them, is throttled.

In Laravel keep the grant in the cache, like a preview token:

```php
// POST /leads — after the lead is stored
$access = null;
if ($property?->is_active) {
    $token = Str::random(40);
    Cache::put("file-access:{$token}",
        ['property_id' => $property->id, 'lead_id' => $lead->id], now()->addDay());
    $access = ['token' => $token, 'expiresAt' => now()->addDay()->toIso8601String()];
}
return (new LeadResource($lead))->additional(['data' => ['access' => $access]])
    ->response()->setStatusCode(201);

// POST /properties/{property}/documents/access
abort_unless($property->is_active, 404);
$grant = Cache::get('file-access:' . $request->validate(['token' => 'required|string|max:200'])['token']);
abort_unless($grant
    && $grant['property_id'] === $property->id
    && Lead::whereKey($grant['lead_id'])->exists(),
    403, 'Share your details to open the files of this listing.');
return ['data' => PropertyFiles::for($property)];
```

**What the page does with it** (`useGatedFiles`, `DocumentsSection`,
`FloorPlansSection`, `UnitConfigurationsSection`, `LeadCaptureModal`): it keeps
the token in `sna_lead.access[propertyId]` (sessionStorage) and fetches the
addresses right after the form — a file opens in a new tab from the same click —
or as soon as it finds a gate already open, so the next row, drawing or
thumbnail opens at once. The three sections share one request per token. The
floor-plan lock blurs a stand-in sketch rather than the drawing, which it no
longer has. A visitor the page does not ask again (P28) needs the token too;
when it is missing or refused (a restarted API, a day-old tab), the page asks
for their details again, which files a new lead and earns a new token.

## Dashboard

`GET /admin/dashboard` is one response (§6.16), all of it computed:

| Figure                                                    | Formula                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `conversionRate`                                          | `round(converted / total * 1000) / 10` — one decimal, `0` when there are no leads                               |
| `leadsToday` / `leadsThisMonth` / `leadsLastMonth`        | by `created_at`, in **IST** (UTC+05:30, a constant), the day the lead list's `from`/`to` count                  |
| `trends.leadsByDay`, `trends.viewsByDay`                  | exactly **30** IST days ending today, `{ date: 'yyyy-mm-dd', count }`, including the days with none             |
| `trends.leadsBySource`, `leadsByStatus`                   | one entry per value that occurs, count descending                                                               |
| `recentLeads`                                             | 10, newest first                                                                                                |
| `topProperties`                                           | 5 by `view_count` descending                                                                                    |
| `upcomingFollowUps`                                       | 10 by `follow_up_at` ascending, future only                                                                     |
| `seoHealth.averageScore`                                  | mean of the stored `seo.score` over the eight SEO entity types, one decimal, `0` when nothing has been analysed |
| `seoHealth.good/ok/poor`                                  | counted by the stored `seo.scoreBand`; `none` is not reported                                                   |
| `seoHealth.missingFocusKeyword`, `missingMetaDescription` | records whose value is absent or blank                                                                          |

For a **sales** user every lead figure is scoped (see `02_auth.md`); the
property, article and SEO figures stay global.

A gap day must be present with `count: 0`. The chart draws what it is given, and
a missing day silently becomes a straight line between its neighbours.

## SEO overview

`GET /admin/seo/overview?type=…` flattens eight entity types — property,
article, page, locality, developer, articleCategory, author, propertyType — into
one list of lightweight rows: `{ key, id, type, title, slug, url, seo,
duplicateOf, isActive, status, updatedAt }`. `perPage=all` is allowed.

- `key` is `"<type>:<id>"`. An id is unique only inside its collection, and the
  eight share one list.
- **Scores are read, never recomputed.** They are calculated in the browser by
  `src/seo/` and stored on the record.
- `duplicateOf` is the list of `key`s whose `seo.title`, `seo.description` or
  `seo.focusKeyword` matches this row's. Group by value in one pass; do not
  compare pairwise. **Empty values never collide** — two records nobody has
  written a description for are not duplicates of each other.
- `scoreBand` filters on the stored band: `good` ≥ 81, `ok` 51–80, `poor` ≤ 50,
  `none` not analysed.

## Admin users

- `password` is at least 8 characters with a letter and a digit, on create and
  on any `PUT`/`PATCH` that carries one (QA-64) — the rule `PUT /auth/password`
  keeps. A `PUT` without `password` keeps the stored one.
- Setting a password (an administrator's reset) revokes every token of the
  account, except the caller's own when it is their own account. Deactivating an
  account revokes its tokens; deleting one revokes them and unassigns its leads,
  with an `assigned` activity "Unassigned (user deleted)".
- Nobody deactivates, deletes or changes the role of their own account; the last
  active admin cannot be deactivated, demoted or deleted — checked against the
  state the request would produce, before the "yourself" rules, and in a bulk
  action for the whole batch (422 on `id`, the batch unapplied).
- A bulk `activate`/`deactivate` counts only the accounts whose state changes
  ([Bulk actions](#bulk-actions)): an account already active is not written, not
  counted and keeps its tokens.
- E-mail addresses are unique case-insensitively (409 on `email`).
- `avatarUrl`, like every URL, is at most 500 characters ([URLs](#urls)), on
  `PUT /auth/profile` and on the users routes alike (QA-65).
- `PUT /auth/password` allows five attempts a minute per account, every session
  of it counted together; the sixth is `429` with `Retry-After` (QA-65).

## Bulk actions

`POST /admin/<resource>/bulk { ids, action, payload? }` →
`{ data: { affected: n }, message }`.

- `affected` counts the records that **changed**, not the ids received. An id
  that does not exist, or a record already in the target state, is not counted
  and is not an error.
- An action the resource does not support is **422** on `action`, not 404.
- Every resource supports `delete`. `activate`/`deactivate` exist where the model
  has `is_active`, `feature`/`unfeature` where it has `is_featured`; articles and
  pages add `publish`/`unpublish`; leads add `status`, `assign` and `priority`,
  each reading `payload`. A lead `status` of `lost` needs `payload.lostReason`
  (3–300 characters, 422 on `payload.lostReason`), recorded on every lead it
  closes — a lead already lost keeps its own; `assign` takes an integer id or
  `null`, and refuses a deactivated user.
- Run it in one transaction and apply the same per-record rules a single write
  would: a bulk `delete` of master data still respects the guard below, a bulk
  `assign` still refuses a sales user assigning to somebody else, and an
  article's bulk `publish` asks the publish rules of every article it would put
  live and refuses the batch whole ([Article writes](#article-writes)). A
  scheduled article that is bulk-published goes live now. A page's bulk `delete`
  or `unpublish` that names a protected page is refused whole with
  `data.refused[]` ([Pages](#pages)).
- A bulk `delete` refused over the delete guard names **every** selected record
  in the way, not the first one (QA-59): `message` counts them ("2 of the
  selected FAQs are still in use, so none was deleted."; "… cannot be deleted,
  so none was deleted." when one of them is protected rather than used),
  `data.refused[]` is `{ id, label, reason, usedBy[] }` per record, and
  `data.usedBy` stays the union so a client reading only that still lists every
  holder. A bulk delete of one record answers exactly as the single delete does.

## Duplicating a property

`POST /admin/properties/:id/duplicate` copies everything, with these changes:

- `title` → `"<title> (Copy)"`
- `slug` → `<slug>-copy`, de-duplicated to `-copy-2`, `-copy-3`, …
- `isActive: false`, `isFeatured: false`, `publishedAt: null`
- `viewCount: 0`, `enquiryCount: 0`
- `seo.score: null`, `seo.scoreBand: 'none'` — the copy has not been analysed
- new `id`, fresh timestamps, `createdBy` the caller

Children are copied too: images, documents, floor plans, unit configurations,
nearby places, timeline, FAQs, and the amenity and badge pivots. Answer **201**
with the whole new record, the same shape a create returns.

## CSV export

`GET /admin/leads/export` and `GET /admin/newsletter-subscribers/export` answer
`text/csv` with **no envelope**, honouring the same filters as their list
endpoint (and the same sales scoping).

- The body starts with a **UTF-8 byte-order mark** (`EF BB BF`). Without it Excel
  reads the file as Windows-1252 and turns every Indian name with an accent into
  mojibake. It is not optional.
- Rows are `CRLF`-separated, and the file ends with one.
- A cell is quoted when it contains a comma, a quote or a newline; a quote inside
  a quoted cell is doubled.
- A cell beginning with `=`, `+`, `-`, `@`, a tab or a carriage return is
  prefixed with an apostrophe, so a spreadsheet does not execute a lead's message
  as a formula; a plain negative number is left alone. A `+91…` phone number is
  such a cell, and unguarded Excel showed it as `9.19877E+11`.
- The lead export's columns are ID, Name, Phone, Email, Source, Status, Lost
  Reason, Priority, Assigned To, Property, Requirement, Message, Follow-up (IST)
  and Created At (IST). Cells carry what the CRM prints, not stored values — the
  source, status and priority labels; the requirement as "Buy · Apartments · 3 BHK
  · Whitefield · ₹1.1 Cr – ₹1.4 Cr · 1–3 months"; the two dates as IST wall-clock
  `yyyy-mm-dd hh:mm`, which a spreadsheet reads as dates. The rows come in the
  order `sort`/`order` ask for, the table's.
- `Content-Disposition: attachment; filename="leads-<yyyy-mm-dd>.csv"`, and
  `Content-Disposition` must be in the CORS `exposed_headers` or the browser
  cannot read the name.

## Master data delete guards

Deleting a locality, city, property type, amenity, badge, developer or bank that
a property still points at is **409**, never a cascade and never a silent
orphan:

```json
{
  "message": "This locality is used by 3 properties.",
  "errors": { "id": ["Used by 3 properties"] },
  "data": { "usedBy": [{ "type": "property", "id": 12, "title": "Lakeview Heights" }] }
}
```

The admin renders `data.usedBy` as a list of links, so the editor can go and fix
them. Cap the list at ten and keep the count honest in `message`.

The same guard covers an article category or author still carrying articles, a
job opening with applications, and a media record something still displays — the
last one alone accepts `?force=true` to delete anyway, because a picture may
legitimately be replaced.

At the database level this is `ON DELETE RESTRICT`, which makes the guard a
belt-and-braces check rather than the only thing standing between a listing and
a missing locality.

## Media library

What the library's endpoints owe the admin's Media screen and its picker (QA-63).

- **Where a file is used.** `usedIn` is found by looking for the file's address
  in every record a visitor can see it on: properties, articles, pages,
  localities, developers, banks, authors, team members, partners, testimonials,
  FAQs, job openings, the site settings and the SEO settings. It is a match of
  the **whole** address — one followed by more of a path (`…/villa.jpg.webp`,
  `…/seed/sna-1` inside `…/seed/sna-10`) is another file. A usage is
  `{ type, id, title }`, `type` one of `property`, `article`, `page`,
  `locality`, `developer`, `bank`, `author`, `teamMember`, `partner`,
  `testimonial`, `faq`, `job`, `settings`, `seoSettings`; the two settings
  report `id: 0`. The 409 of a delete says it in words
  (`"Used by 1 bank and the SEO settings"`), never in these keys.
- **The list asks it for its page only.** `withUsage=true` on
  `GET /admin/media` fills `usedIn` for the rows of the page it answers, after
  paging: nothing filters or sorts on it. Working it out for every file before
  paging cost the mock a second per page of the grid. Laravel should load the
  page, then search for its twenty-four addresses — not the library's.
- **`meta.folders`.** The list's `meta` carries the folders that hold a file
  every _other_ filter lets through — the list's own query with its `folder`
  and `unfiled` conditions left out — sorted, whatever the page: the folder
  rail's entries. Nothing chosen, that is every folder; under `type=document` (a
  brochure's picker), only the folders that hold documents, so no entry leads
  to "Nothing to choose from". Each is `{ name, count }` (prompt 51) and
  `meta.unfiled` counts the files in no folder: `SELECT folder, COUNT(*) … WHERE
  <every filter but folder and unfiled> AND folder IS NOT NULL GROUP BY folder
  ORDER BY folder`, and the same `WHERE` with `folder IS NULL` for `unfiled`.
  The admin reads plain names as well, but prints no counts for them.
- **`unfiled` and `usage`.** `unfiled=true` keeps the files with no folder
  (`false`, the files with one). `usage=unused` keeps the files the search
  under "Where a file is used" finds nowhere — the same search a delete asks
  first, so everything it lists deletes without a 409; any other value filters
  nothing. It is the one filter that reads other tables: build the set of used
  addresses once per request, not once per row.
- **Moving files.** `POST /admin/media/bulk { action: 'move', ids, payload:
  { folder } }` files every selected record that exists under `folder`, cleaned
  as a record's own folder is — `null` or blank for no folder, 422 on
  `payload.folder` for anything that is not a string or `null`, or longer than
  120 characters. The answer is `{ affected, missing }`: `affected` the records
  whose folder changed, `missing` the ids that matched no record. A move is not
  all or nothing — an id that has gone is reported, not a reason to refuse the
  rest.
- **Renaming a folder.** `POST /admin/media/folders/rename { from, to, merge? }`
  refiles every record whose folder is `from` or starts with `from/` —
  `projects` → `archive` moves `projects/aurelia` to `archive/aurelia` — and
  answers `{ from, to, moved, merged }` with the message "Moved 12 files from
  “projects” to “archive”." Both names are cleaned first. 422 on `from` when no
  record is filed there; on `to` when it equals `from`, lies inside `from`, or
  would make some record's folder longer than 120 characters; and on `to` with
  `data.existing: { name, count }` when records outside `from` are already
  filed under `to` — unless `merge: true`, which moves them in beside those
  ("Merged …"). One transaction; `updated_at` moves on every record it
  refiles. It changes the library's filing only: `url` and `public_id` stay, so
  the Cloudinary asset keeps the path it was uploaded to and nothing that
  points at it breaks.
- **Folders are filed clean.** A `folder` is stored with its segments trimmed,
  no slash at either end and none doubled — `" /projects//aurelia/ "` is
  `projects/aurelia`, the name the upload gives Cloudinary (`sna/projects/aurelia`)
  — and a blank one as `null`. The record used to keep the slashes: one folder
  under two names.
- **Search.** `q` reads `alt`, `title`, `folder`, `public_id`, `url` and the
  tags (`JSON_SEARCH(tags, 'one', CONCAT('%', ?, '%'))`, or a `LIKE` over the
  column).
- **One record per address.** `url` is `unique:media,url` and `max:500` (the
  column is `VARCHAR(500)`): a second record for the same file answers 422 on
  `url` with "The url has already been taken."; the dialog tells the editor the
  address is already in the library. A record keeps its own address through a
  save.
- **Tags** are trimmed, blank ones dropped, and each kept once whatever its
  case, the first spelling winning: `[" Aerial ", "aerial", "  ", "dusk"]` is
  stored `["Aerial", "dusk"]`.
- **`PATCH` infers nothing.** `provider`, `type` and `format` are worked out
  from the address on a `POST` or `PUT` that omits them; a `PATCH` writes only
  what it sends. A patch of the address alone used to re-infer the type from
  it, and an extension-less photograph's address turned the image into a
  "document".
- **Bulk delete is all or nothing.** `POST /admin/media/bulk { action: 'delete' }`
  refuses the whole batch with 409 when any selected file is still in use —
  `message` counts them ("2 of the selected files are still in use, so none was
  removed."), `data.refused[]` is `{ id, label, reason, usedBy[] }` per file and
  `data.usedIn` the union — and `?force=true` removes them all, as on a single
  delete. It used to remove file by file and stop at the first in use, answering
  409 with the files before it already gone.

## Master data writes and reads

What a master-data write keeps, and what a public read shows of it (QA-60).

- **Text is trimmed before it is checked.** Laravel's `TrimStrings` middleware
  does this for every request; the mock does it for every collection of
  `routes/masterData.js` (`trimStrings`): a `string` field, the strings of an
  array of them (a locality's `highlights`) and the strings of an array of
  objects (its `connectivity` rows). HTML, slugs and URLs are left as sent.
  `"  Mysuru  "` was stored with its spaces and sorted above `"Bengaluru"`; and
  `" A "` is one character, so it fails `min: 2`.
- **A city lists a locality once.** `name` is unique within its city, case and
  spacing aside (422 on `name`, "This locality is already in Bengaluru."), as
  the data model has always said; another city may have a locality of the same
  name. Asked of a create and of a write that changes the name or the city.
  Laravel: `Rule::unique('localities', 'name')->where('city_id', $cityId)
  ->ignore($id)`, under the case-insensitive collation the schema uses (the
  mock also reads a run of spaces as one). A second "Whitefield" in Bengaluru
  was stored, and every locality picker, the listing filters and `/localities`
  offered two.
- **`sort=category` on amenities orders the categories as the site groups
  them** — `basic, lifestyle, safety, sports, kids, eco, convenience,
  commercial` (`AMENITY_CATEGORIES`) — then by `order`. By the alphabet,
  Commercial came second in the admin's grouped table and last everywhere else.
  Laravel: `ORDER BY FIELD(category, 'basic', 'lifestyle', …), `order``.
- **A public property read shows only the master data that is switched on.**
  An inactive amenity or badge is left out of `amenities[]` and `badges[]` —
  "Price Drop" switched off once the offer ended was still on every card. An
  inactive locality or developer keeps its `id` and `name` in
  `location.locality` / `project.developer` but answers `slug: null`: its page
  answers 404, and every link the site draws from a listing (the locality guide,
  the builder, the breadcrumb, the JSON-LD) is drawn only when there is a slug.
  Admin reads are unchanged, so the property form never drops a tick it cannot
  see.

## Content writes and reads

What the Content screens' writes keep, and what a public read shows (QA-61).

- **Job openings are trimmed like master data.** `"Sales "` was stored beside
  `"Sales"`, and the department filter and the careers page offered both.
  Laravel's `TrimStrings` covers it; the mock turns `trimStrings` on for
  `routes/jobs.js`.
- **An opening's description has words and runs nothing.** Empty once its
  markup is stripped — an emptied bullet or heading, `<ul><li><p></p></li></ul>`
  — is 422 on `description` ("The description field is required."), and the
  careers page no longer prints "About the role" over nothing; a script, an
  inline handler or a `javascript:` link is 422 with the articles' sentence (the
  FAQ answer's rule, QA-59). A `PATCH` is asked only about what it sends.
- **An opening is open to the end of its closing day in IST** (D22).
  `closes_at` is a date — the last day the role takes applications — and the day
  is Bengaluru's: `GET /jobs` lists it until midnight IST, then leaves it out;
  `GET /jobs/slug/:slug` still answers it, with `isOpen: false`; and
  `POST /jobs/:id/apply` answers 404 "This opening is closed." The mock compared
  against the end of the day in UTC, which is 05:30 the next morning in IST.
  Laravel: `today('Asia/Kolkata')->toDateString() <= $job->closes_at`.
- **`sort=status` on applications is the desk's order** — `new, shortlisted,
  interview, rejected, hired` (`JOB_APPLICATION_STATUS`), newest first within a
  status; `order=desc` reverses the statuses. By spelling it read hired,
  interview, new… Laravel: `ORDER BY FIELD(status, 'new', 'shortlisted', …),
  created_at DESC`.
- **A switched-off team member answers for no listing.** On a public property
  read, `agent` is filled from its `team_member_id` only while that member is
  active. Someone who had left went on showing — name, photograph, phone,
  WhatsApp and e-mail — on every listing that named them. Switched off, they
  fill in nothing: what the listing typed itself still shows, and with nothing
  typed the site draws no advisor card. Admin reads are unchanged, so the
  property form still names the member and an editor can pick somebody else.

## FAQs

The FAQ library (`faqs`) feeds `/insights/faqs`, the home page (`show_on_home`),
the FAQ block of a CMS page (`faq_ids`) and property pages (QA-59):

- **Property pages.** A property page asks `GET /faqs?propertyTypeId=<its type>`
  and shows those questions after the listing's own, in the library's order,
  and in its `FAQPage` markup. A question the listing already asks is not asked
  twice. Only active FAQs are public, as everywhere.
- **The answer has words.** `answer` is required and a string of markup with
  no text (`<ul><li><p></p></li></ul>`, `<h3> </h3>`) is empty: **422** on
  `answer`, "The answer field is required."
- **The answer runs nothing.** A `<script>`, an inline event handler or a
  `javascript:` address (entity-encoded too) is **422** on `answer`, as for an
  article body ([Article writes](#article-writes)).
- **The property type exists.** `property_type_id` is `exists:property_types,id`
  (**422**), and deleting a property type a FAQ names is refused by the delete
  guard.
- **A category asks a question once.** A question equal to another FAQ's in the
  same category — ignoring case, runs of spaces and a final "?" — is **422** on
  `question`: "This question is already under Legal." Another category may ask
  it. A record is never its own twin.
- **The question is trimmed** before it is checked and stored.
- **`order` is 0–100 000** and is a position: see [Ordering](#ordering).
- **Search.** `q` matches the question and the answer's **text**: the markup is
  stripped and entities decoded first, so `<p` or `href` matches nothing and
  `R&D` matches `R&amp;D`.

## Segments

A segment became master data after 1.0.0 (QA-52): the property form's first
choice is a `segments` row, and an editor can add one — "Industrial",
"Agricultural" — from Master data → Segments or from the property form itself.

- **`kind` decides the behaviour, the slug only names it.** A segment's `kind`
  is one of `residential`, `commercial`, `land`: which fields a listing has (a
  home's rooms, an office's built-up areas, a plot's measurements), whether a
  title carries a BHK, the listing's schema.org `@type` (`Place` for the
  commercial and land kinds), and whether a property type's landing page is
  `/commercial/<slug>` or `/buy/<slug>`. Anything the Laravel API derives from a
  segment reads its kind the same way.
- **A segment keeps its slug.** Properties and property types store it. A `PUT`
  or `PATCH` that sends a different slug is **422** under `errors.slug`; an empty
  or missing one keeps the stored slug (a rename must not derive a new one).
- **The three built-in segments** — slug `residential`, `commercial`, `land`,
  each of its own kind — keep their `kind` too (**422** under `errors.kind`) and
  are never deleted: `DELETE` is **409** with an empty `usedBy`, and a bulk
  delete that names one is refused whole. `/commercial` and `/plots` are built
  on them. They may be renamed, re-described, reordered and deactivated.
- **Any other segment** is refused a delete (**409**, `data.usedBy`) while a
  property type or a property names it — the property types first.
- **`GET /segments` answers every segment**, the inactive ones included and
  flagged by `isActive`: a listing filed under a retired segment still needs the
  layout its kind gives it. There is no public read by slug.
- **A property's and a property type's `segment` must exist** (`exists:segments,slug`):
  a slug no segment holds is **422** under `errors.segment`. The existing rule
  stands that a property keeps its own `segment` when its type moves (D88).

## Settings

`PUT /admin/settings` and `PUT /admin/seo/settings` **deep-merge**:

- A group the body omits is untouched. `{ "general": { "contactPhone": "…" } }`
  changes the phone and nothing else — it does not wipe the rest of `general`.
- A key the model does not know is dropped silently, not stored and not an error.
- An array is **replaced**, never merged: `footer.columns` is a list whose order
  is the content.
- `updatedAt` is stamped on every successful write.
- The admin screen sends **only what changed** since it loaded or last saved
  (QA-64): `{ "hero": { "title": "…" } }` for a new title. Two admins, or one
  admin in two tabs, saving different fields must not undo each other, so the
  merge above is load-bearing — a Laravel `PUT` that replaced whole groups would
  bring the lost update back. The response is the whole stored record; the
  screen takes it as its new starting point.

`GET /settings` and `GET /seo/settings` are the **public subsets**. The public
settings response omits `leads` entirely (notification addresses and the
assignment policy are internal); everything else — including the analytics ids
and the Cloudinary cloud name — is public by nature, since the browser needs it
to render the page. There is no secret in this model, and none may be added to
it without a private endpoint to hold it.

## Redirects

- `GET /redirects` (public) returns the **active** ones as
  `[{ fromPath, toPath, statusCode }]`. The SPA loads it once and resolves
  matches client-side, so keep it small and cacheable.
- `GET /redirects/resolve?path=` resolves one path and increments `hits`. It is
  what a server-side 404 handler and the parity smoke test call.
- `from_path` is unique, always starts with `/`, and is compared **without** the
  query string; the query of the incoming request is preserved on the redirect.
- A redirect that points at another redirect is not followed: resolve one hop,
  and refuse to create a cycle with 422.
- `statusCode` is 301 or 302 only.
- The real 301 belongs at the web server (see `07_DEPLOYMENT.md`); the endpoint
  is how the admin manages the list and how the SPA covers the gap.

## Newsletter and spam

- `POST /newsletter/subscribe` with an address already stored answers **200**
  with `{ "data": null, "message": "Already subscribed" }` — never 409, and
  never a second row. A new address answers **201** with the record.
- An address that unsubscribed and comes back is **re-subscribed**: set
  `status` back to `subscribed` rather than creating a row.
- The address is compared case-insensitively and trimmed.
- The honeypot `website` field applies here, on `POST /leads` and on
  `POST /jobs/:id/apply`: non-empty means a bot, so answer **200**
  `{ "data": null, "message": "ok" }` and store nothing. It must look exactly
  like a success — a bot that learns it was caught comes back smarter.

## Ordering

Master data, FAQs, team members, partners, banks, pages, header menus and
property images all carry `order`, and the admin reorders them by dragging.

A reorder sends **one** `PATCH` — the moved record's new position — and the API
works out the rest: sort the collection by `order`, break ties in favour of the
record just touched, then in the order the admin list shows them (the
resource's own `order` sort: `order, question` for FAQs, `order, name` for most
master data), then renumber the whole collection `1..n`.

That is what lets an editor drag a row while the table is filtered: the rows on
screen are a slice, so the client can only say "put it where this other one is"
(`order = neighbour.order` to land before it, `neighbour.order + 1` to land
after it), and the records it cannot see keep their relative positions either
way. Renumber inside the transaction, and return the record the client patched.

**The neighbour by id (QA-59).** The admin also sends the row it dropped the
record next to: `{ "order": 12, "before": 7 }` or `{ "order": 13, "after": 7 }`.
When `before`/`after` names another record of the collection, it wins over the
number: make the collection dense `1..n` in the order it reads, then place the
record immediately before or after that one, then renumber. The number alone
could not say where a row landed once two records shared it ("before the one
holding 0" is before every one of them), nor when it was stale — a second move
sent before the list had been re-read carried the numbers of the first. An
anchor that names nothing, or the record itself, is ignored and the number is
used. Neither key is stored.

**An `order` PATCH always settles.** A position equal to the record's own still
renumbers: with two records sharing 3, dragging the second above the first sends
`order: 3`, and must put it first of the two rather than answer "nothing
changed".

**Master data and content settle on every write that places a record
(QA-59).** In these collections a `POST`, and a `PUT` whose `order` differs
from the stored one, place the written record and renumber the collection
around it:

| Collection         | Admin screen                 | Its form                        |
| ------------------ | ---------------------------- | ------------------------------- |
| FAQs               | FAQs                         | dialog                          |
| testimonials       | Content → Testimonials       | dialog                          |
| team members       | Content → Team               | dialog                          |
| partners           | Content → Partners           | dialog                          |
| localities         | Master data → Localities     | full page (`LocalityFormPage`)  |
| segments           | Master data → Segments       | dialog                          |
| property types     | Master data → Property types | dialog                          |
| amenities          | Master data → Amenities      | dialog                          |
| badges             | Master data → Badges         | dialog                          |
| developers         | Master data → Developers     | full page (`DeveloperFormPage`) |
| banks              | Master data → Banks          | dialog                          |
| article categories | Articles → Categories        | dialog                          |

Placing: make the other records dense `1..n-1` in the order they read, give the
record the position its `order` names, clamped to `1..n`, and move the ones from
there on down one. A record created at 0 (every one of those forms' default) is
first, as is one created at 1 (the testimonial, team and partner forms open at
1, the number their hint calls first — QA-61); one saved at 3 is third, whether
it moved up or down; one saved at 99 is last and the response says `n`; a `PUT`
that keeps the stored `order` moves nothing. The response carries the settled number, and the two full-page forms
show it once they have saved. No two records share a number, so the Order column
reads as positions, the neighbour rule above stays exact, and a public list
never falls back to its secondary sort (the name; a FAQ's question) inside a
tie.

Do not place a form's number the way a reorder PATCH is settled. The PATCH's
number is read off the list as it was before the move, and `neighbour.order + 1`
lands after the neighbour only because it ties with the next row and wins. A
form's number is a position in the list as it will read: settled by the tie, a
record saved from 1 to 3 landed second, because leaving 1 had already moved the
others up one.

**A delete closes the gap it leaves (QA-61).** In the same collections a
`DELETE`, and a bulk `delete`, renumber what is left `1..n` in the order it
reads — nothing else about those records changes, `updated_at` included.
Deleting the first of three testimonials left `2, 3`: the new first read 2 in
the Order column and in its form until a drag or a placing save happened to
settle the collection. Renumber inside the transaction that deletes.

Pages and header menus are not among them: a `POST`/`PUT` leaves those
collections alone, and only an `order` PATCH renumbers them.
