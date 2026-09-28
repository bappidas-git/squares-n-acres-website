<?php

namespace App\Domain\Properties;

use App\Contract\Contract;
use App\Crud\StaleGuard;
use App\Domain\Tokens\PreviewTokens;
use App\Models\Property;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Text\Slug;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;
use App\Support\Validation\SchemaValidator;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * The writes of the listings (05_BUSINESS_RULES.md → "Property writes",
 * "Duplicating a property", "View counting"; the writes of
 * `mock-server/routes/properties.js`).
 *
 * `POST` starts from the model defaults, `PUT` from the defaults plus the
 * server-managed values of the record it replaces, `PATCH` from the record
 * itself — the §5.8 semantics — with the listing's own invariants on top: the
 * slug (and `seo.slug` beside it), exactly one cover image, ids for the new
 * entries of the nested arrays, `publishedAt` the first time it goes live, and
 * the publish rules (App\Domain\Properties\PropertyRules) for a write that
 * leaves it live.
 */
final class PropertyWriter
{
    /** The nested arrays whose entries carry an id the server assigns (§5.5). */
    private const NESTED_ID_ARRAYS = ['images', 'unitConfigurations', 'floorPlans', 'documents', 'nearbyPlaces', 'constructionTimeline', 'faqs'];

    /**
     * The ids a listing names that the database holds it to with foreign keys
     * (03_ENDPOINTS.md: `exists:property_types,id`…); a list field checks each id.
     */
    private const REFERENCES = [
        'propertyTypeId' => 'propertyTypes',
        'amenityIds' => 'amenities',
        'badgeIds' => 'badges',
        'location.localityId' => 'localities',
        'location.cityId' => 'cities',
        'project.developerId' => 'developers',
        'similarPropertyIds' => 'properties',
        'agent.teamMemberId' => 'teamMembers',
    ];

    private const LIST_REFERENCES = ['amenityIds', 'badgeIds', 'similarPropertyIds'];

    public function __construct(private DocumentStore $store) {}

    /* ------------------------------------------------------------------ *
     * Writes
     * ------------------------------------------------------------------ */

    /** `POST /admin/properties` — the stored listing. */
    public function create(array $body, ?array $user): array
    {
        return DB::transaction(function () use ($body, $user) {
            $body = self::assignNestedIds($body);
            SchemaValidator::validate(Contract::schema('property.create'), $body, ['fillDefaults' => true, 'lookup' => $this->lookup()]);
            $this->refuseDanglingReferences($body);

            $record = $this->build($body, null, 'POST', $user);
            self::refuseUnready($record, 'POST', $body);
            $slug = $this->resolveSlug($body, null);
            unset($record['id']);

            // A title that makes no slug is named after the id, which the insert gives.
            $stored = $this->store->insert('properties', $slug === null ? $record : $this->claimSlug($record, $slug));
            if ($slug === null) {
                $stored = $this->store->update('properties', $this->claimSlug($stored, $this->fallbackSlug($stored['id'])), $stored);
            }
            ApiLog::info('properties', "Created #{$stored['id']}", ['slug' => $stored['slug'], 'isActive' => $stored['isActive'], 'by' => $user['id'] ?? null]);

            return $stored;
        });
    }

    /** `PUT /admin/properties/:id` — a replace, refused when made from an older version. */
    public function replace(array $existing, array $body, ?array $user): array
    {
        return DB::transaction(function () use ($existing, $body, $user) {
            $body = self::assignNestedIds($body);
            StaleGuard::refuse($existing, $body, $this->store, 'listing');
            SchemaValidator::validate(Contract::schema('property.update'), $body, ['lookup' => $this->lookup()]);
            $this->refuseDanglingReferences($body);

            $slug = $this->resolveSlug($body, $existing) ?? $this->fallbackSlug($existing['id']);
            $record = self::applySlug($this->build($body, $existing, 'PUT', $user), $slug);
            self::refuseUnready($record, 'PUT', $body);

            $stored = $this->store->update('properties', $this->claimSlug($record, $slug), $existing);
            ApiLog::info('properties', "Replaced #{$stored['id']}", ['isActive' => $stored['isActive'], 'by' => $user['id'] ?? null]);

            return $stored;
        });
    }

    /**
     * `PATCH /admin/properties/:id`. It re-slugs only when it says so:
     * renaming a listing must not silently move its public URL (§5.9).
     */
    public function patch(array $existing, array $body, ?array $user): array
    {
        return DB::transaction(function () use ($existing, $body, $user) {
            $body = self::assignNestedIds($body);
            SchemaValidator::validate(Contract::schema('property.patch'), $body, ['partial' => true, 'lookup' => $this->lookup()]);
            $this->refuseDanglingReferences($body);

            $slug = array_key_exists('slug', $body)
                ? $this->resolveSlug(['slug' => $body['slug'], 'title' => $body['title'] ?? $existing['title'] ?? null], $existing) ?? $this->fallbackSlug($existing['id'])
                : $existing['slug'];
            $record = self::applySlug($this->build($body, $existing, 'PATCH', $user), $slug);
            self::refuseUnready($record, 'PATCH', $body);

            $stored = $this->store->update('properties', $this->claimSlug($record, $slug), $existing);
            ApiLog::info('properties', "Patched #{$stored['id']}", ['fields' => array_keys($body), 'by' => $user['id'] ?? null]);
            if (($existing['isActive'] ?? false) !== ($stored['isActive'] ?? false)) {
                ApiLog::info('properties', "#{$stored['id']} ".($stored['isActive'] ? 'published' : 'switched off'));
            }

            return $stored;
        });
    }

    /**
     * `POST /admin/properties/:id/duplicate`: everything copied — children and
     * pivots included — as an inactive, unfeatured draft with a fresh slug.
     *
     * The copy is a different page, so three parts of the original's `seo`
     * are not its to inherit, as for a page or an article duplicated in the
     * browser: the score and the analysis answer for the original's text,
     * `canonicalUrl` would quietly canonicalise the copy to the original, and
     * `redirect` would send every visitor of the copy somewhere else.
     * `analysis` is reset to its object of four lists, never `[]`.
     */
    public function duplicate(array $existing, ?array $user): array
    {
        return DB::transaction(function () use ($existing, $user) {
            $now = Clock::nowIso();
            $slug = Slug::unique($this->store->all('properties'), Js::string($existing['slug'] ?? null).'-copy');
            $copy = [
                ...$existing,
                'title' => self::copyTitle(Js::string($existing['title'] ?? null)),
                'isActive' => false,
                'isFeatured' => false,
                'viewCount' => 0,
                'enquiryCount' => 0,
                'publishedAt' => null,
                'createdBy' => $user['id'] ?? null,
                'updatedBy' => $user['id'] ?? null,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];
            $copy['seo'] = [
                ...Js::entries($copy['seo'] ?? null),
                'canonicalUrl' => null,
                'redirect' => ['enabled' => false, 'toPath' => '', 'statusCode' => 301],
                'score' => null,
                'scoreBand' => 'none',
                'testsPassed' => 0,
                'testsTotal' => 0,
                'analysis' => ['basic' => [], 'additional' => [], 'titleReadability' => [], 'contentReadability' => []],
                'lastAnalyzedAt' => null,
            ];

            $stored = $this->store->insert('properties', $this->claimSlug(self::applySlug($copy, $slug), $slug));
            ApiLog::info('properties', "Duplicated #{$existing['id']} as #{$stored['id']}", ['slug' => $slug, 'by' => $user['id'] ?? null]);

            return $stored;
        });
    }

    /**
     * `<title> (Copy)`. The mock appends the suffix whatever the length; the
     * title column holds the schema's 200 characters, so a title too long for
     * the suffix is cut to make room rather than failing the copy.
     */
    private static function copyTitle(string $title): string
    {
        $suffix = ' (Copy)';
        $room = (int) Contract::model('properties')['fields']['title']['maxLength'] - Js::length($suffix);
        if (Js::length($title) <= $room) {
            return $title.$suffix;
        }
        while (Js::length($title) > $room) {
            $title = mb_substr($title, 0, -1);
        }

        return rtrim($title).$suffix;
    }

    /**
     * Deletes a listing (soft: the row keeps `deleted_at`) and the references
     * other listings hold to it — their `updatedAt` stays, it is not their edit.
     */
    public function remove(array $property): void
    {
        DB::transaction(function () use ($property) {
            foreach ($this->store->all('properties') as $other) {
                $ids = $other['similarPropertyIds'] ?? null;
                if (! Js::isList($ids)) {
                    continue;
                }
                $kept = array_values(array_filter($ids, fn ($id) => ! PropertyReads::sameId($id, $property['id'])));
                if (count($kept) !== count($ids)) {
                    $this->store->update('properties', [...$other, 'similarPropertyIds' => $kept], $other);
                }
            }
            $this->store->delete('properties', $property['id']);
        });
        ApiLog::info('properties', "Deleted #{$property['id']}");
    }

    /**
     * One counted view: `viewCount` goes up by one — atomically — and a
     * `propertyViews` row feeds the dashboard's trend. A view is not an edit:
     * `updatedAt` stays where it is, or every visit would reshuffle the
     * `relevance` order.
     */
    public function recordView(array $property, mixed $referrer): int
    {
        return DB::transaction(function () use ($property, $referrer) {
            $this->store->setColumns('properties', $property['id'], ['view_count' => DB::raw('view_count + 1')]);
            $this->store->insert('propertyViews', [
                'propertyId' => $property['id'],
                'viewedAt' => Clock::nowIso(),
                // The column holds 500 characters; the rest of an address is no referrer worth keeping.
                'referrer' => is_string($referrer) ? mb_substr($referrer, 0, 500) : null,
            ]);
            $viewCount = (int) ($this->store->find('properties', $property['id'])['viewCount'] ?? 0);
            ApiLog::info('properties', "View counted on #{$property['id']}", ['viewCount' => $viewCount]);

            return $viewCount;
        });
    }

    /**
     * A share link (prompt 51): a listing shown before it is published, to
     * somebody who does not sign in — one token per listing, 24 hours.
     *
     * @return array{token: string, expiresAt: string, url: string}
     */
    public function previewToken(array $property): array
    {
        ['token' => $token, 'expiresAt' => $expiresAt] = PreviewTokens::issue('property', $property['id']);

        return [
            'token' => $token,
            'expiresAt' => $expiresAt,
            'url' => $this->siteUrl().'/properties/'.Js::string($property['slug'] ?? null)."?preview={$token}",
        ];
    }

    /* ------------------------------------------------------------------ *
     * Building a record
     * ------------------------------------------------------------------ */

    /**
     * Turns a request body into the record to store. A POST carries the id
     * the mock would give it (`max + 1`), which is what a refusal names.
     */
    private function build(array $body, ?array $existing, string $method, ?array $user): array
    {
        $fields = Contract::model('properties')['fields'];
        $clean = Documents::sanitize($body, $fields);
        $now = Clock::nowIso();
        $userId = $user['id'] ?? null;

        $record = match ($method) {
            'POST' => [
                ...Documents::mergeDefaults(Documents::defaults($fields), $clean),
                'id' => self::nextId($this->store->all('properties')),
                'viewCount' => 0,
                'enquiryCount' => 0,
                'publishedAt' => null,
                'createdBy' => $userId,
                'updatedBy' => $userId,
                'createdAt' => $now,
                'updatedAt' => $now,
            ],
            'PUT' => [
                ...Documents::mergeDefaults(
                    [...Documents::defaults($fields), ...Documents::serverManagedValues($existing, $fields)],
                    $clean,
                ),
                'id' => $existing['id'],
                'createdBy' => $existing['createdBy'] ?? null,
                'updatedBy' => $userId,
                'createdAt' => $existing['createdAt'] ?? null,
                'updatedAt' => $now,
            ],
            default => [...$existing, ...Documents::deepPatch($existing, $clean), 'updatedBy' => $userId, 'updatedAt' => $now],
        };

        if (array_key_exists('images', $record)) {
            $record['images'] = self::ensureSingleCover($record['images']);
        }
        // Published the first time it goes live; switched off and on again, it keeps that date (§6.1).
        if (($record['isActive'] ?? false) && ! ($record['publishedAt'] ?? null)) {
            $record['publishedAt'] = $now;
        }

        return $record;
    }

    /**
     * Gives every entry of the nested arrays an id, keeping the ones it has:
     * the form posts a new image without one, and the API assigns `max + 1`
     * inside that array, so the entries that had an id keep it.
     */
    private static function assignNestedIds(array $body): array
    {
        foreach (self::NESTED_ID_ARRAYS as $field) {
            if (! Js::isList($body[$field] ?? null)) {
                continue;
            }
            $highest = 0;
            foreach ($body[$field] as $entry) {
                $id = self::numberOf(Js::get($entry, 'id'));
                if ($id !== null && $id > $highest) {
                    $highest = $id;
                }
            }
            $body[$field] = array_map(function (mixed $entry) use (&$highest) {
                if (! is_array($entry) && ! $entry instanceof stdClass) {
                    return $entry;
                }
                if (Js::isInteger(Js::get($entry, 'id'))) {
                    return $entry;
                }
                $highest += 1;

                return [...Js::entries($entry), 'id' => $highest];
            }, $body[$field]);
        }

        return $body;
    }

    /** `Number(value)` of an entry's id, null for NaN (`maxId` of lib/ids.js). */
    private static function numberOf(mixed $value): int|float|null
    {
        if ($value instanceof stdClass || Js::isPlainObject($value) || $value === null) {
            return null;
        }
        $number = Js::toNumber($value);

        return $number !== null && is_finite((float) $number) ? $number : null;
    }

    /** `max(id) + 1` of the stored listings. */
    private static function nextId(array $rows): int
    {
        return $rows === [] ? 1 : max(array_map(fn (array $row) => (int) $row['id'], $rows)) + 1;
    }

    /** Exactly one cover (§6.1): the marked one, else the first image. */
    private static function ensureSingleCover(mixed $images): mixed
    {
        if (! Js::isList($images) || $images === []) {
            return $images;
        }
        $chosen = 0;
        foreach ($images as $index => $image) {
            if (Js::get($image, 'isCover')) {
                $chosen = $index;
                break;
            }
        }

        return array_map(fn (mixed $image, int $index) => [...Js::entries($image), 'isCover' => $index === $chosen], $images, array_keys($images));
    }

    /**
     * The publish rules, asked of a write that leaves a listing live: every
     * create and replace, and a PATCH that publishes it or touches what the
     * rules read (PropertyRules::PUBLISH_FIELDS).
     *
     * @throws ApiException 422 keyed by field, the message naming what is missing
     */
    private static function refuseUnready(array $record, string $method, array $body): void
    {
        if (($record['isActive'] ?? null) !== true) {
            return;
        }
        if ($method === 'PATCH' && array_intersect(PropertyRules::PUBLISH_FIELDS, array_keys($body)) === []) {
            return;
        }
        $problems = PropertyRules::problems($record);
        if ($problems === []) {
            return;
        }

        $gaps = PropertyRules::gaps($problems, $record);
        ApiLog::info('properties', 'Refused to put a listing live', ['id' => $record['id'] ?? null, 'gaps' => $gaps]);

        throw ApiException::validation(
            $problems,
            PropertyRules::notReadyMessage($record, $gaps),
            ['notReady' => [['id' => $record['id'] ?? null, 'title' => $record['title'] ?? null, 'gaps' => $gaps]]],
        );
    }

    /**
     * The ids the schema's foreign keys hold a listing to. The mock stores any
     * integer here; a database with foreign keys cannot, so an id that names
     * no record is refused as the `exists` rule of 03_ENDPOINTS.md refuses it
     * — 422 under its key — rather than failing the write.
     */
    private function refuseDanglingReferences(array $body): void
    {
        $errors = [];
        foreach (self::REFERENCES as $path => $collection) {
            [$field, $nested] = array_pad(explode('.', $path, 2), 2, null);
            if (! array_key_exists($field, $body)) {
                continue;
            }
            $value = $nested === null ? $body[$field] : Js::get($body[$field], $nested);
            $ids = in_array($field, self::LIST_REFERENCES, true) ? (array) $value : [$path => $value];
            foreach ($ids as $index => $id) {
                if ($id !== null && $this->store->find($collection, $id) === null) {
                    $key = is_int($index) ? "{$path}.{$index}" : $path;
                    $errors[$key] = ["The selected {$key} is invalid."];
                }
            }
        }
        if ($errors !== []) {
            ApiLog::info('properties', 'Refused ids that name no record', ['errors' => array_keys($errors)]);

            throw ApiException::validation($errors);
        }
    }

    /** `exists` rules read another collection through this. */
    private function lookup(): \Closure
    {
        return fn (string $collection) => $this->store->all($collection);
    }

    /* ------------------------------------------------------------------ *
     * Slugs
     * ------------------------------------------------------------------ */

    /**
     * The slug of a write: the one the client chose — a taken one is a 409
     * (§5.9) — or one made from the title, de-duplicated silently, which is
     * what lets the form leave the field alone. A title with no Latin letter
     * or digit makes none: the listing keeps the slug it has, or (null) is
     * named `property-<id>`.
     */
    private function resolveSlug(array $body, ?array $existing): ?string
    {
        $rows = $this->store->all('properties');
        $excludeId = $existing['id'] ?? null;

        $requested = Slug::make(Js::string($body['slug'] ?? ''));
        if ($requested !== '') {
            if (! Slug::check($rows, $requested, $excludeId)['available']) {
                ApiLog::info('properties', "Slug {$requested} is taken — 409");

                throw ApiException::conflict('The slug has already been taken.', ['slug' => ['The slug has already been taken.']]);
            }

            return $requested;
        }

        $derived = Slug::unique($rows, Js::string($body['title'] ?? $existing['title'] ?? ''), $excludeId);
        if ($derived !== '') {
            return $derived;
        }
        $kept = $existing['slug'] ?? null;

        return is_string($kept) && $kept !== '' ? $kept : null;
    }

    /** `property-45` — the slug of a listing whose title makes none. */
    private function fallbackSlug(int $id): string
    {
        return Slug::unique($this->store->all('properties'), "property-{$id}", $id);
    }

    /** The entity slug and `seo.slug` are always the same string (§5.9). */
    private static function applySlug(array $record, string $slug): array
    {
        $record['slug'] = $slug;
        $record['seo'] = [...Js::entries($record['seo'] ?? null), 'slug' => $slug];

        return $record;
    }

    /**
     * The record with its slug, once no deleted listing holds that slug.
     *
     * A deleted listing's address is free again, as it is in the mock, which
     * forgets a deleted record. MySQL keeps the soft-deleted row under the
     * slug's unique index, so that row gives the slug up (`~<id>~<slug>`,
     * which no live slug can be); its `seo.slug` keeps the original.
     */
    private function claimSlug(array $record, string $slug): array
    {
        $holders = Property::onlyTrashed()->where('slug', $slug)->pluck('id');
        foreach ($holders as $id) {
            Property::onlyTrashed()->toBase()->where('id', $id)->update(['slug' => substr("~{$id}~{$slug}", 0, Slug::MAX_LENGTH)]);
            ApiLog::debug('properties', "Deleted #{$id} gave up the slug {$slug}");
        }

        return self::applySlug($record, $slug);
    }

    /** The site a share link is built on (§9.1). */
    private function siteUrl(): string
    {
        $seo = $this->store->singleton('seoSettings');
        $settings = $this->store->singleton('siteSettings');
        $url = $seo['siteUrl'] ?? Js::get($settings['general'] ?? null, 'siteUrl') ?? '';

        return (string) preg_replace('~/+$~', '', Js::string($url));
    }
}
