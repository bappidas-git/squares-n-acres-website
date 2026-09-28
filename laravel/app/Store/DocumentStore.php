<?php

namespace App\Store;

use App\Models;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The API's collections as JSON documents, over the relational schema.
 *
 * The contract describes every resource as one document — a listing with its
 * images, its pricing and its amenity ids inside it — and every business rule
 * of 05_BUSINESS_RULES.md is written against that document. This store is
 * the one place that knows the tables behind it (App\Store\TableMapper):
 * it loads a collection's documents once per request, and writes a document
 * back as its row, its child rows and its pivots inside one transaction
 * ("Write the whole array", 04_DATA_MODELS.md).
 *
 * The four soft-deleted tables (properties, articles, pages, leads) keep a
 * deleted record's row with `deleted_at` set; the store never reads it again.
 *
 * Bound as a scoped singleton: one per request.
 */
final class DocumentStore
{
    /**
     * The Eloquent model of each table: reads and writes go through the
     * model's query (and so through its global scopes — the soft-delete one
     * included), without hydrating a model per row.
     */
    private const MODELS = [
        'admin_users' => Models\AdminUser::class,
        'cities' => Models\City::class,
        'localities' => Models\Locality::class,
        'segments' => Models\Segment::class,
        'property_types' => Models\PropertyType::class,
        'amenities' => Models\Amenity::class,
        'badges' => Models\Badge::class,
        'developers' => Models\Developer::class,
        'banks' => Models\Bank::class,
        'team_members' => Models\TeamMember::class,
        'article_categories' => Models\ArticleCategory::class,
        'article_tags' => Models\ArticleTag::class,
        'authors' => Models\Author::class,
        'properties' => Models\Property::class,
        'property_images' => Models\PropertyImage::class,
        'property_documents' => Models\PropertyDocument::class,
        'property_floor_plans' => Models\PropertyFloorPlan::class,
        'property_unit_configurations' => Models\PropertyUnitConfiguration::class,
        'property_nearby_places' => Models\PropertyNearbyPlace::class,
        'property_construction_timeline' => Models\PropertyConstructionMilestone::class,
        'property_faqs' => Models\PropertyFaq::class,
        'articles' => Models\Article::class,
        'header_menus' => Models\HeaderMenu::class,
        'pages' => Models\Page::class,
        'page_blocks' => Models\PageBlock::class,
        'faqs' => Models\Faq::class,
        'testimonials' => Models\Testimonial::class,
        'partners' => Models\Partner::class,
        'job_openings' => Models\JobOpening::class,
        'job_applications' => Models\JobApplication::class,
        'leads' => Models\Lead::class,
        'lead_notes' => Models\LeadNote::class,
        'lead_activities' => Models\LeadActivity::class,
        'media' => Models\Media::class,
        'redirects' => Models\Redirect::class,
        'newsletter_subscribers' => Models\NewsletterSubscriber::class,
        'site_settings' => Models\SiteSetting::class,
        'seo_settings' => Models\SeoSetting::class,
        'property_views' => Models\PropertyView::class,
        'not_found_log' => Models\NotFoundLog::class,
    ];

    /** @var array<string, array<int, array>> collection → id → document */
    private array $documents = [];

    /** @var array<string, array> singleton collection → document */
    private array $singletons = [];

    /** Every document of a collection, in id order. */
    public function all(string $collection): array
    {
        return array_values($this->load($collection));
    }

    /**
     * One document by id, or null. An id matches when it reads as the stored
     * one — `String(a) === String(b)`, as the mock compares them — so `01`
     * and ` 1` name nothing.
     */
    public function find(string $collection, mixed $id): ?array
    {
        if (is_float($id) && floor($id) === $id) {
            $id = (int) $id;
        }
        if (! is_int($id) && ! (is_string($id) && preg_match('/^(0|[1-9]\d*)$/', $id))) {
            return null;
        }

        return $this->load($collection)[(int) $id] ?? null;
    }

    /** Whether a record of the collection holds the id. */
    public function exists(string $collection, mixed $id): bool
    {
        return $this->find($collection, $id) !== null;
    }

    /**
     * Inserts a document; `$extra` carries columns that are no field of it
     * (a user's password hash). The id the database gives it is returned in
     * the document.
     */
    public function insert(string $collection, array $document, array $extra = []): array
    {
        $mapper = TableMapper::for($collection);
        unset($document['id']);
        self::assertStorable($mapper, $document);

        $id = DB::transaction(function () use ($mapper, $document, $extra) {
            $id = (int) self::query($mapper->table())->insertGetId([...$mapper->toRow($document), ...$extra]);
            $this->writeRelations($mapper, $document, $id, null);

            return $id;
        });

        $stored = $this->reload($collection, $id);
        ApiLog::debug('store', "Inserted {$collection} #{$id}");

        return $stored;
    }

    /**
     * Inserts a document with the id it already has — the seed import
     * (seed-mapping.md → "Preserving ids"). Nothing is read back.
     */
    public function import(string $collection, array $document, array $extra = []): void
    {
        $mapper = TableMapper::for($collection);
        if ($mapper->isSingleton()) {
            $this->saveSingleton($collection, $document);

            return;
        }
        $id = (int) $document['id'];
        self::query($mapper->table())->insert(['id' => $id, ...$mapper->toRow($document), ...$extra]);
        $this->writeRelations($mapper, $document, $id, null);
        unset($this->documents[$collection]);
    }

    /**
     * Replaces a stored document. With `$before`, only the child tables and
     * pivots whose arrays changed are rewritten.
     */
    public function update(string $collection, array $document, ?array $before = null, array $extra = []): array
    {
        $mapper = TableMapper::for($collection);
        $id = (int) $document['id'];
        self::assertStorable($mapper, $document);

        DB::transaction(function () use ($mapper, $document, $before, $id, $extra) {
            self::queryWithTrashed($mapper->table())->where('id', $id)->update([...$mapper->toRow($document), ...$extra]);
            $this->writeRelations($mapper, $document, $id, $before);
        });

        $stored = $this->reload($collection, $id);
        ApiLog::debug('store', "Updated {$collection} #{$id}");

        return $stored;
    }

    /**
     * Writes some columns of one row without going through a document: the
     * order a renumber settles, a counter, a password hash. `updated_at` is
     * left alone unless named.
     */
    public function setColumns(string $collection, mixed $id, array $columns): void
    {
        $mapper = TableMapper::for($collection);
        self::queryWithTrashed($mapper->table())->where('id', (int) $id)->update($columns);
        $this->forgetRecord($collection, (int) $id);
    }

    /** The `order` of many records at once — what a renumber settles. */
    public function setOrders(string $collection, array $orders): void
    {
        if ($orders === []) {
            return;
        }
        $mapper = TableMapper::for($collection);
        DB::transaction(function () use ($mapper, $orders) {
            foreach ($orders as $id => $order) {
                self::query($mapper->table())->where('id', (int) $id)->update(['order' => (int) $order]);
            }
        });
        if (isset($this->documents[$collection])) {
            foreach ($orders as $id => $order) {
                if (isset($this->documents[$collection][(int) $id])) {
                    $this->documents[$collection][(int) $id]['order'] = (int) $order;
                }
            }
        }
        ApiLog::debug('store', 'Renumbered '.count($orders)." {$collection}");
    }

    /**
     * Deletes one record: soft for the four tables that keep `deleted_at`,
     * with its child rows and pivots (ON DELETE CASCADE) for the rest.
     */
    public function delete(string $collection, mixed $id): bool
    {
        $mapper = TableMapper::for($collection);
        // Through the model's scope, a soft-deleted row is already gone.
        $query = self::query($mapper->table())->where('id', (int) $id);
        $affected = $mapper->softDeletes
            ? $query->update(['deleted_at' => now()->format('Y-m-d H:i:s.v')])
            : $query->delete();

        $this->forgetRecord($collection, (int) $id);
        if ($affected > 0) {
            ApiLog::debug('store', "Deleted {$collection} #{$id}".($mapper->softDeletes ? ' (soft)' : ''));
        }

        return $affected > 0;
    }

    /** A singleton's document (`siteSettings`, `seoSettings`), or null before the first save. */
    public function singleton(string $collection): ?array
    {
        if (array_key_exists($collection, $this->singletons)) {
            return $this->singletons[$collection];
        }
        $mapper = TableMapper::for($collection);
        $row = self::query($mapper->table())->where('id', 1)->first();

        return $this->singletons[$collection] = $row === null ? null : $mapper->toDocument((array) $row);
    }

    /** Writes a singleton's document. */
    public function saveSingleton(string $collection, array $document): array
    {
        $mapper = TableMapper::for($collection);
        self::assertStorable($mapper, $document);
        $row = $mapper->toRow($document);
        $exists = self::query($mapper->table())->where('id', 1)->exists();
        if ($exists) {
            unset($row['created_at']);
            self::query($mapper->table())->where('id', 1)->update($row);
        } else {
            self::query($mapper->table())->insert(['id' => 1, ...$row]);
        }
        unset($this->singletons[$collection]);
        ApiLog::debug('store', "Saved {$collection}");

        return $this->singleton($collection) ?? $document;
    }

    /** Forgets what was loaded, so the next read goes to the database. */
    public function flush(?string $collection = null): void
    {
        if ($collection === null) {
            $this->documents = [];
            $this->singletons = [];

            return;
        }
        unset($this->documents[$collection], $this->singletons[$collection]);
    }

    /* ------------------------------------------------------------------ */

    /** A table's query, through its model when it has one. */
    public static function query(string $table): Builder
    {
        $model = self::MODELS[$table] ?? null;

        return $model === null ? DB::table($table) : $model::query()->toBase();
    }

    /** A table's query including soft-deleted rows. */
    private static function queryWithTrashed(string $table): Builder
    {
        $model = self::MODELS[$table] ?? null;
        if ($model !== null && method_exists($model, 'withTrashed')) {
            return $model::withTrashed()->toBase();
        }

        return self::query($table);
    }

    /** @return array<int, array> id → document */
    private function load(string $collection): array
    {
        if (isset($this->documents[$collection])) {
            return $this->documents[$collection];
        }

        return $this->documents[$collection] = ApiLog::measure("load {$collection}", fn () => $this->read($collection));
    }

    /** @return array<int, array> */
    private function read(string $collection, ?int $only = null): array
    {
        $mapper = TableMapper::for($collection);
        // The model's soft-delete scope leaves the deleted rows out.
        $query = self::query($mapper->table())->orderBy('id');
        if ($only !== null) {
            $query->where('id', $only);
        }
        $rows = $query->get()->map(fn ($row) => (array) $row)->all();
        if ($rows === []) {
            return [];
        }

        $ids = array_map(fn (array $row) => (int) $row['id'], $rows);
        $children = [];
        foreach ($mapper->children as $field => $table) {
            $childQuery = self::query($table['name'])->orderBy('position')->orderBy('id');
            if ($only !== null) {
                $childQuery->where($mapper->parentKey, $only);
            }
            foreach ($childQuery->get() as $child) {
                $child = (array) $child;
                $children[(int) $child[$mapper->parentKey]][$field][] = $child;
            }
        }
        $pivots = [];
        foreach ($mapper->pivots as $field => $table) {
            $related = $mapper->pivotRelatedKey($field);
            $pivotQuery = DB::table($table['name'])->orderBy('position')->orderBy($related);
            if ($only !== null) {
                $pivotQuery->where($mapper->parentKey, $only);
            }
            foreach ($pivotQuery->get() as $pivot) {
                $pivot = (array) $pivot;
                $pivots[(int) $pivot[$mapper->parentKey]][$field][] = (int) $pivot[$related];
            }
        }

        $documents = [];
        foreach ($rows as $index => $row) {
            $id = $ids[$index];
            $documents[$id] = $mapper->toDocument($row, $children[$id] ?? [], $pivots[$id] ?? []);
        }

        return $documents;
    }

    /** Reads one record back after a write and puts it in the loaded collection. */
    private function reload(string $collection, int $id): array
    {
        $fresh = $this->read($collection, $id)[$id] ?? [];
        if (isset($this->documents[$collection])) {
            $this->documents[$collection][$id] = $fresh;
            ksort($this->documents[$collection]);
        }

        return $fresh;
    }

    private function forgetRecord(string $collection, int $id): void
    {
        if (! isset($this->documents[$collection][$id])) {
            return;
        }
        $fresh = $this->read($collection, $id)[$id] ?? null;
        if ($fresh === null) {
            unset($this->documents[$collection][$id]);
        } else {
            $this->documents[$collection][$id] = $fresh;
        }
    }

    /**
     * A document holding what its tables cannot (TableMapper::storageProblems)
     * is refused with a 422 naming each field, before anything is written.
     */
    private static function assertStorable(TableMapper $mapper, array $document): void
    {
        $problems = $mapper->storageProblems($document);
        if ($problems !== []) {
            ApiLog::info('store', "Refused a {$mapper->table()} write its columns cannot hold", ['errors' => $problems]);

            throw ApiException::validation($problems);
        }
    }

    private function writeRelations(TableMapper $mapper, array $document, int $id, ?array $before): void
    {
        foreach ($mapper->children as $field => $table) {
            if (! array_key_exists($field, $document)) {
                continue;
            }
            if ($before !== null && json_encode($before[$field] ?? []) === json_encode($document[$field])) {
                continue;
            }
            self::query($table['name'])->where($mapper->parentKey, $id)->delete();
            $rows = $mapper->toChildRows($field, $document, $id);
            if ($rows !== []) {
                self::query($table['name'])->insert($rows);
            }
        }
        foreach ($mapper->pivots as $field => $table) {
            if (! array_key_exists($field, $document)) {
                continue;
            }
            if ($before !== null && json_encode($before[$field] ?? []) === json_encode($document[$field])) {
                continue;
            }
            DB::table($table['name'])->where($mapper->parentKey, $id)->delete();
            $rows = $mapper->toPivotRows($field, $document, $id);
            if ($rows !== []) {
                DB::table($table['name'])->insert($rows);
            }
        }
    }
}
