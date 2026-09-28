<?php

namespace App\Crud\Definitions;

use App\Contract\Contract;
use App\Crud\Usage;
use App\Domain\Articles\ArticleVisibility;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Js;
use App\Support\Text\Html;

/**
 * Master data and content lists (01_API_CONTRACT.md §5.14,
 * 05_BUSINESS_RULES.md → "Master data writes and reads", "Content writes and reads").
 *
 * Fifteen collections — localities, cities, segments, property types,
 * amenities, badges, developers, banks, article categories, article tags,
 * authors, FAQs, testimonials, team members and partners — each with a public
 * list, a public slug lookup where it has a public page, and the admin CRUD,
 * `bulk` and `check-slug`. The shape of all that is App\Crud\CrudResource;
 * this is the part that differs per collection. Reading one entry top to
 * bottom tells you everything the API does with that resource.
 *
 * Every collection here whose `order` the admin drags settles on write
 * (`settleOrder`): a POST, and a PUT that changes the number, put the record
 * at that position and renumber the rest `1..n`. Every one is typed into a
 * form, so the text it sends is trimmed (`trimStrings`).
 */
final class MasterData
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        // Every collection here is typed into a form, and the API trims what a
        // form sends (Laravel's TrimStrings, applied where the shape says text).
        return array_map(fn (array $definition) => $definition + ['trimStrings' => true], self::resources());
    }

    /** @return array<string, array> */
    private static function resources(): array
    {
        return [
            'localities' => [
                'collection' => 'localities',
                'basePath' => 'localities',
                'schema' => 'locality',
                // A form opened before somebody else's save is refused, not replayed over it.
                'staleGuard' => 'locality',
                'noun' => ['one' => 'locality', 'many' => 'localities'],
                'deleteGuard' => 'locality',
                'beforeSave' => [self::class, 'checkLocality'](...),
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'city' => self::ref($ctx['store'], 'cities', $record['cityId'] ?? null),
                    'propertyCount' => self::countActiveProperties($ctx['store'], fn ($p) => Usage::sameId(Js::get($p['location'] ?? null, 'localityId'), $record['id'])),
                ],
                'publicFilters' => [
                    'zone' => ['field' => 'zone'],
                    'cityId' => ['field' => 'cityId'],
                    'isFeatured' => ['field' => 'isFeatured', 'type' => 'bool'],
                ],
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'propertyCount' => '-propertyCount'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'cities' => [
                'collection' => 'cities',
                'basePath' => 'cities',
                'schema' => 'city',
                'noun' => ['one' => 'city', 'many' => 'cities'],
                'deleteGuard' => 'city',
                'sorts' => ['name' => 'name', 'order' => 'name'],
                'defaultSort' => 'name',
            ],

            'segments' => [
                'collection' => 'segments',
                'basePath' => 'segments',
                'schema' => 'segment',
                'noun' => ['one' => 'segment', 'many' => 'segments'],
                'deleteGuard' => 'segment',
                // Every segment is public (the inactive ones flagged); no page, so no read by slug.
                'routes' => ['list', 'adminList', 'create', 'get', 'update', 'patch', 'remove', 'bulk', 'checkSlug'],
                'beforeValidate' => [self::class, 'keepSegmentIdentity'](...),
                'protect' => fn (array $record) => self::isBuiltInSegment($record['slug'] ?? null)
                    ? 'A built-in segment cannot be deleted: the site’s own pages are built on it.'
                    : null,
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'builtIn' => self::isBuiltInSegment($record['slug'] ?? null),
                    'propertyTypeCount' => count(array_filter(
                        $ctx['store']->all('propertyTypes'),
                        fn ($type) => ($type['segment'] ?? null) === $record['slug'],
                    )),
                    'propertyCount' => self::countActiveProperties($ctx['store'], fn ($p) => ($p['segment'] ?? null) === $record['slug']),
                ],
                'publicFilters' => ['kind' => ['field' => 'kind']],
                'sorts' => [
                    'order' => 'order,name',
                    'name' => 'name',
                    'propertyTypeCount' => '-propertyTypeCount',
                    'propertyCount' => '-propertyCount',
                ],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'propertyTypes' => [
                'collection' => 'propertyTypes',
                'basePath' => 'property-types',
                'schema' => 'propertyType',
                'noun' => ['one' => 'property type', 'many' => 'property types'],
                'deleteGuard' => 'propertyType',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'propertyCount' => self::countActiveProperties($ctx['store'], fn ($p) => Usage::sameId($p['propertyTypeId'] ?? null, $record['id'])),
                ],
                'publicFilters' => ['segment' => ['field' => 'segment']],
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'propertyCount' => '-propertyCount'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'amenities' => [
                'collection' => 'amenities',
                'basePath' => 'amenities',
                'schema' => 'amenity',
                'noun' => ['one' => 'amenity', 'many' => 'amenities'],
                'deleteGuard' => 'amenity',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'propertyCount' => self::countActiveProperties($ctx['store'], fn ($p) => in_array($record['id'], (array) ($p['amenityIds'] ?? []), false)),
                ],
                'publicFilters' => ['category' => ['field' => 'category']],
                'sorts' => [
                    'order' => 'order,name',
                    'name' => 'name',
                    // The categories in the order a listing page groups them, not the alphabet's.
                    'category' => ['spec' => 'category,order', 'rank' => ['category' => Contract::enumValues('AMENITY_CATEGORIES')]],
                    'propertyCount' => '-propertyCount',
                ],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'badges' => [
                'collection' => 'badges',
                'basePath' => 'badges',
                'schema' => 'badge',
                'noun' => ['one' => 'badge', 'many' => 'badges'],
                'deleteGuard' => 'badge',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'propertyCount' => self::countActiveProperties($ctx['store'], fn ($p) => in_array($record['id'], (array) ($p['badgeIds'] ?? []), false)),
                ],
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'propertyCount' => '-propertyCount'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'developers' => [
                'collection' => 'developers',
                'basePath' => 'developers',
                'schema' => 'developer',
                'staleGuard' => 'developer',
                'noun' => ['one' => 'developer', 'many' => 'developers'],
                'deleteGuard' => 'developer',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'propertyCount' => self::countActiveProperties($ctx['store'], fn ($p) => Usage::sameId(Js::get($p['project'] ?? null, 'developerId'), $record['id'])),
                ],
                'publicFilters' => ['isFeatured' => ['field' => 'isFeatured', 'type' => 'bool']],
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'propertyCount' => '-propertyCount'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'banks' => [
                'collection' => 'banks',
                'basePath' => 'banks',
                'schema' => 'bank',
                'noun' => ['one' => 'bank', 'many' => 'banks'],
                // A reference table for the EMI calculator: nothing points at a row.
                'deleteGuard' => false,
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'interestRateMin' => 'interestRateMin'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'articleCategories' => [
                'collection' => 'articleCategories',
                'basePath' => 'article-categories',
                'schema' => 'articleCategory',
                'noun' => ['one' => 'category', 'many' => 'categories'],
                'deleteGuard' => 'articleCategory',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'articleCount' => self::countLiveArticles($ctx['store'], fn ($a) => Usage::sameId($a['categoryId'] ?? null, $record['id'])),
                ],
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'articleCount' => '-articleCount'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'articleTags' => [
                'collection' => 'articleTags',
                'basePath' => 'article-tags',
                'schema' => 'articleTag',
                'noun' => ['one' => 'tag', 'many' => 'tags'],
                'deleteGuard' => 'articleTag',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'articleCount' => self::countLiveArticles($ctx['store'], fn ($a) => in_array($record['id'], (array) ($a['tagIds'] ?? []), false)),
                ],
                'sorts' => ['name' => 'name', 'articleCount' => '-articleCount'],
                'defaultSort' => 'name',
            ],

            'authors' => [
                'collection' => 'authors',
                'basePath' => 'authors',
                'schema' => 'author',
                'noun' => ['one' => 'author', 'many' => 'authors'],
                'deleteGuard' => 'author',
                'afterRead' => fn (array $record, array $ctx) => [
                    ...$record,
                    'articleCount' => self::countLiveArticles($ctx['store'], fn ($a) => Usage::sameId($a['authorId'] ?? null, $record['id'])),
                ],
                // An author's e-mail is private (§5.10), stated where it is enforced.
                'publicTransform' => fn (array $record) => array_diff_key($record, ['email' => true]),
                'sorts' => ['name' => 'name', 'articleCount' => '-articleCount'],
                'defaultSort' => 'name',
            ],

            'faqs' => [
                'collection' => 'faqs',
                'basePath' => 'faqs',
                'schema' => 'faq',
                'noun' => ['one' => 'FAQ', 'many' => 'FAQs'],
                'deleteGuard' => 'faq',
                'beforeValidate' => function (array $body) {
                    if (is_string($body['question'] ?? null)) {
                        $body['question'] = Js::trim($body['question']);
                    }

                    return $body;
                },
                'beforeSave' => [self::class, 'checkFaq'](...),
                'settleOrder' => true,
                'publicFilters' => [
                    'category' => ['field' => 'category'],
                    'showOnHome' => ['field' => 'showOnHome', 'type' => 'bool'],
                    'propertyTypeId' => ['field' => 'propertyTypeId'],
                ],
                'sorts' => [
                    'order' => 'order,question',
                    'question' => 'question',
                    'category' => 'category,order',
                    'updatedAt' => '-updatedAt',
                ],
                'defaultSort' => 'order',
            ],

            'testimonials' => [
                'collection' => 'testimonials',
                'basePath' => 'testimonials',
                'schema' => 'testimonial',
                'noun' => ['one' => 'testimonial', 'many' => 'testimonials'],
                'deleteGuard' => 'testimonial',
                'publicFilters' => ['isFeatured' => ['field' => 'isFeatured', 'type' => 'bool']],
                // Seeded placeholders: how an editor finds them to replace.
                'adminFilters' => ['isSample' => ['field' => 'isSample', 'type' => 'bool']],
                'sorts' => [
                    'order' => 'order,name',
                    'name' => 'name',
                    'rating' => '-rating',
                    'createdAt' => '-createdAt',
                    'updatedAt' => '-updatedAt',
                ],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'teamMembers' => [
                'collection' => 'teamMembers',
                'basePath' => 'team',
                'schema' => 'teamMember',
                'noun' => ['one' => 'team member', 'many' => 'team members'],
                'deleteGuard' => 'teamMember',
                // How many listings name the member as their advisor, drafts included.
                'afterRead' => fn (array $record, array $ctx) => $ctx['admin']
                    ? [
                        ...$record,
                        'listingCount' => count(array_filter(
                            $ctx['store']->all('properties'),
                            fn ($p) => Usage::sameId(Js::get($p['agent'] ?? null, 'teamMemberId'), $record['id']),
                        )),
                    ]
                    : $record,
                'publicFilters' => ['showOnAbout' => ['field' => 'showOnAbout', 'type' => 'bool']],
                'sorts' => ['order' => 'order,name', 'name' => 'name', 'listingCount' => '-listingCount'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],

            'partners' => [
                'collection' => 'partners',
                'basePath' => 'partners',
                'schema' => 'partner',
                'noun' => ['one' => 'partner', 'many' => 'partners'],
                'deleteGuard' => 'partner',
                'publicFilters' => ['category' => ['field' => 'category']],
                'sorts' => ['order' => 'order,name', 'name' => 'name'],
                'defaultSort' => 'order',
                'settleOrder' => true,
            ],
        ];
    }

    /* ------------------------------------------------------------------ *
     * Rules the schema cannot state
     * ------------------------------------------------------------------ */

    /** residential, commercial and land: slug and kind fixed, never deleted. */
    public static function isBuiltInSegment(mixed $slug): bool
    {
        return in_array($slug, Contract::enumValues('SEGMENTS'), true);
    }

    /**
     * A segment keeps its slug once it exists — listings and property types
     * are filed under it — and a built-in one keeps its `kind`.
     */
    public static function keepSegmentIdentity(array $body, array $ctx): array
    {
        $existing = $ctx['existing'] ?? null;
        if ($existing === null) {
            return $body;
        }
        $sent = $body['slug'] ?? null;
        if ($sent !== null && $sent !== '' && $sent !== $existing['slug']) {
            throw ApiException::validation(['slug' => 'A segment keeps its key: listings and property types are filed under it.']);
        }
        $body['slug'] = $existing['slug'];

        if (self::isBuiltInSegment($existing['slug']) && array_key_exists('kind', $body) && $body['kind'] !== $existing['kind']) {
            throw ApiException::validation(['kind' => 'A built-in segment keeps its layout: the site’s own pages are built on it.']);
        }

        return $body;
    }

    /** A city lists a locality once: `name` is unique within its city, case and spacing aside. */
    public static function checkLocality(array $record, array $ctx): array
    {
        $key = self::nameKey($record['name'] ?? '');
        if ($key === '') {
            return $record;
        }
        $existing = $ctx['existing'] ?? null;
        if ($existing !== null && self::nameKey($existing['name'] ?? '') === $key && Usage::sameId($existing['cityId'] ?? null, $record['cityId'] ?? null)) {
            return $record;
        }

        $store = $ctx['store'];
        foreach ($store->all('localities') as $locality) {
            if (! Usage::sameId($locality['id'], $existing['id'] ?? $record['id'] ?? null)
                && Usage::sameId($locality['cityId'] ?? null, $record['cityId'] ?? null)
                && self::nameKey($locality['name'] ?? '') === $key) {
                $city = $store->find('cities', $record['cityId'] ?? null);

                throw ApiException::validation(['name' => 'This locality is already in '.($city['name'] ?? 'this city').'.']);
            }
        }

        return $record;
    }

    /**
     * A FAQ's answer has words and runs nothing, its property type exists,
     * and a category asks a question once. A PATCH is asked only about what
     * it sends.
     */
    public static function checkFaq(array $record, array $ctx): array
    {
        $body = $ctx['body'] ?? [];
        $touches = fn (string $field) => $ctx['method'] !== 'PATCH' || array_key_exists($field, $body);
        $found = [];

        $answer = $record['answer'] ?? null;
        if ($touches('answer') && is_string($answer) && Js::trim($answer) !== '') {
            if (Html::unsafe($answer)) {
                $found['answer'] = 'The text may not carry a script, an inline event handler or a javascript: link.';
            } elseif (Html::strip($answer) === '') {
                $found['answer'] = 'The answer field is required.';
            }
        }

        $typeId = $record['propertyTypeId'] ?? null;
        if ($touches('propertyTypeId') && $typeId !== null && $ctx['store']->find('propertyTypes', $typeId) === null) {
            $found['propertyTypeId'] = 'The selected propertyTypeId is invalid.';
        }

        if ($touches('question') || $touches('category')) {
            $key = self::questionKey($record['question'] ?? '');
            $existing = $ctx['existing'] ?? null;
            foreach ($ctx['store']->all('faqs') as $faq) {
                if ($key !== ''
                    && ! Usage::sameId($faq['id'], $existing['id'] ?? $record['id'] ?? null)
                    && ($faq['category'] ?? null) === ($record['category'] ?? null)
                    && self::questionKey($faq['question'] ?? '') === $key) {
                    $tab = Contract::enumLabel('FAQ_CATEGORIES', $record['category'] ?? null) ?: (string) ($record['category'] ?? '');
                    $found['question'] = "This question is already under {$tab}.";
                    break;
                }
            }
        }

        if ($found !== []) {
            throw ApiException::validation($found);
        }

        return $record;
    }

    /* ------------------------------------------------------------------ */

    /** `{ id, name, slug }` of a record, or null. */
    public static function ref(DocumentStore $store, string $collection, mixed $id): ?array
    {
        $record = $store->find($collection, $id);

        return $record === null ? null : ['id' => $record['id'], 'name' => $record['name'] ?? null, 'slug' => $record['slug'] ?? null];
    }

    /** How many active listings the predicate accepts (`propertyCount`). */
    public static function countActiveProperties(DocumentStore $store, callable $predicate): int
    {
        $count = 0;
        foreach ($store->all('properties') as $property) {
            if (($property['isActive'] ?? false) && $predicate($property)) {
                $count++;
            }
        }

        return $count;
    }

    /** How many live articles the predicate accepts (`articleCount`). */
    public static function countLiveArticles(DocumentStore $store, callable $predicate): int
    {
        return count(array_filter(ArticleVisibility::live($store->all('articles')), $predicate));
    }

    private static function nameKey(mixed $text): string
    {
        return Js::trim(Js::collapseSpaces(Js::lower((string) $text)));
    }

    private static function questionKey(mixed $text): string
    {
        $text = Js::collapseSpaces(Js::lower((string) $text));
        $text = (string) preg_replace('/['.Js::SPACE.'?？]+$/u', '', $text);

        return Js::trim($text);
    }
}
