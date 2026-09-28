<?php

namespace App\Domain;

use App\Store\DocumentStore;
use App\Support\Js;

/**
 * Denormalised read objects (01_API_CONTRACT.md §5.5).
 *
 * Writes send ids (`localityId`, `amenityIds`, `categoryId`); reads embed the
 * display object the site needs, so a card never has to fetch master data to
 * render a locality's name.
 */
final class Embed
{
    public function __construct(private DocumentStore $store) {}

    /** `{ keys… }` of a record, missing keys null; null for no record. */
    public static function pick(?array $record, array $keys): ?array
    {
        if ($record === null) {
            return null;
        }
        $picked = [];
        foreach ($keys as $key) {
            $picked[$key] = $record[$key] ?? null;
        }

        return $picked;
    }

    /** `{ id, name, slug }`. */
    public static function ref(?array $record): ?array
    {
        return self::pick($record, ['id', 'name', 'slug']);
    }

    /** Whether a master-data record is switched on (`isActive` defaults to true). */
    public static function isLive(?array $record): bool
    {
        return $record !== null && ($record['isActive'] ?? true) !== false;
    }

    private function byId(string $collection, mixed $id): ?array
    {
        return $id === null ? null : $this->store->find($collection, $id);
    }

    /**
     * The contact card of a listing: an agent naming a team member is filled
     * from the member wherever the listing left a field empty. On the public
     * read a switched-off member fills in nothing.
     */
    public function agent(mixed $agent, bool $publicRead = false): mixed
    {
        if (! Js::isPlainObject($agent)) {
            return $agent ?? null;
        }
        $agent = Js::entries($agent);
        $member = $this->byId('teamMembers', $agent['teamMemberId'] ?? null);
        if ($member === null || ($publicRead && ($member['isActive'] ?? true) === false)) {
            return $agent;
        }

        return [
            ...$agent,
            'name' => $agent['name'] ?? $member['name'] ?? null,
            'phone' => $agent['phone'] ?? $member['phone'] ?? null,
            'whatsapp' => $agent['whatsapp'] ?? $member['whatsapp'] ?? null,
            'email' => $agent['email'] ?? $member['email'] ?? null,
            'photoUrl' => $agent['photoUrl'] ?? $member['photoUrl'] ?? null,
        ];
    }

    /**
     * A listing with its `propertyType`, `amenities`, `badges`,
     * `location.locality`, `location.city`, `project.developer` and `agent`
     * embedded. The public read shows only what is switched on: an inactive
     * amenity or badge is left out, and an inactive locality or developer is
     * named without a slug, so nothing links to a page that answers 404.
     */
    public function property(array $property, bool $publicRead = false): array
    {
        $shown = fn (?array $record) => $record !== null && (! $publicRead || self::isLive($record));
        $linkable = fn (?array $record, ?array $reference) => $publicRead && $record !== null && ! self::isLive($record) && $reference !== null
            ? [...$reference, 'slug' => null]
            : $reference;

        $location = Js::entries($property['location'] ?? []);
        $project = Js::entries($property['project'] ?? []);
        $locality = $this->byId('localities', $location['localityId'] ?? null);
        $developer = $this->byId('developers', $project['developerId'] ?? null);

        $amenities = [];
        foreach ((array) ($property['amenityIds'] ?? []) as $id) {
            $amenity = $this->byId('amenities', $id);
            if ($shown($amenity)) {
                $amenities[] = self::pick($amenity, ['id', 'name', 'slug', 'icon', 'category']);
            }
        }
        $badges = [];
        foreach ((array) ($property['badgeIds'] ?? []) as $id) {
            $badge = $this->byId('badges', $id);
            if ($shown($badge)) {
                $badges[] = self::pick($badge, ['id', 'name', 'slug', 'color', 'icon']);
            }
        }

        return [
            ...$property,
            'propertyType' => self::pick($this->byId('propertyTypes', $property['propertyTypeId'] ?? null), ['id', 'name', 'slug', 'segment']),
            'amenities' => $amenities,
            'badges' => $badges,
            'location' => [
                ...$location,
                'locality' => $linkable($locality, self::ref($locality)),
                'city' => self::ref($this->byId('cities', $location['cityId'] ?? null)),
            ],
            'project' => [
                ...$project,
                'developer' => $linkable($developer, self::pick($developer, ['id', 'name', 'slug', 'logoUrl'])),
            ],
            'agent' => $this->agent($property['agent'] ?? null, $publicRead),
        ];
    }

    /** What a lead keeps of the listing it named: title, slug, locality name. */
    public function propertySnapshot(?array $property): ?array
    {
        if ($property === null) {
            return null;
        }
        $locality = $this->byId('localities', Js::get($property['location'] ?? null, 'localityId'));

        return [
            'title' => $property['title'] ?? '',
            'slug' => $property['slug'] ?? '',
            'localityName' => $locality['name'] ?? null,
        ];
    }

    /**
     * A listing's name as a lead reads it: the listing, or — once it is
     * deleted — the snapshot the lead took, "(deleted)" after its title.
     */
    public function leadProperty(array $lead): ?array
    {
        $live = self::pick($this->byId('properties', $lead['propertyId'] ?? null), ['id', 'title', 'slug']);
        if ($live !== null) {
            return $live;
        }
        $snapshot = Js::entries($lead['propertySnapshot'] ?? null);
        if (empty($snapshot['title'])) {
            return null;
        }

        return ['id' => $lead['propertyId'] ?? null, 'title' => "{$snapshot['title']} (deleted)", 'slug' => null, 'deleted' => true];
    }

    /** A lead with `property` and `assignedUser` embedded. */
    public function lead(array $lead): array
    {
        return [
            ...$lead,
            'property' => $this->leadProperty($lead),
            'assignedUser' => self::pick($this->byId('adminUsers', $lead['assignedTo'] ?? null), ['id', 'name']),
        ];
    }

    /** An article with `category`, `tags` and `author` embedded. */
    public function article(array $article): array
    {
        $tags = [];
        foreach ((array) ($article['tagIds'] ?? []) as $id) {
            $tag = $this->byId('articleTags', $id);
            if ($tag !== null) {
                $tags[] = self::ref($tag);
            }
        }

        return [
            ...$article,
            'category' => self::ref($this->byId('articleCategories', $article['categoryId'] ?? null)),
            'tags' => $tags,
            'author' => self::pick($this->byId('authors', $article['authorId'] ?? null), ['id', 'name', 'slug', 'avatarUrl', 'designation']),
        ];
    }

    /** A job application with `job` embedded. */
    public function jobApplication(array $application): array
    {
        return [
            ...$application,
            'job' => self::pick($this->byId('jobOpenings', $application['jobId'] ?? null), ['id', 'title', 'slug']),
        ];
    }
}
