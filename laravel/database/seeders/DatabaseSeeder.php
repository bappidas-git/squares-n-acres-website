<?php

namespace Database\Seeders;

use App\Store\DocumentStore;
use App\Store\TableMapper;
use App\Support\Json\JsonValue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Imports the seed — `db.json`, the same data the mock serves and every
 * example of backend_developer_guidelines was made from — as
 * backend_developer_guidelines/seed-mapping.md maps it:
 *
 *  - every record keeps the id it has in the file: `propertyId`, `amenityIds`,
 *    the smoke test's `example: 1` all point at them;
 *  - a document's nested arrays become child rows (the item's id kept in
 *    `local_id`), its id lists pivot rows, everything else nested a JSON
 *    column exactly as the file holds it;
 *  - the three seed passwords are hashed on the way in — and must be rotated
 *    before the API is reachable from anything but localhost;
 *  - `apiTokens` is not imported: Sanctum owns tokens here.
 *
 *   php artisan migrate:fresh --seed
 *   SEED_PATH=/path/to/db.json php artisan db:seed
 */
class DatabaseSeeder extends Seeder
{
    /** seed-mapping.md → "Import order" (the users first: `created_by` points at them). */
    private const ORDER = [
        'adminUsers',
        'cities',
        'localities',
        'segments',
        'propertyTypes',
        'amenities',
        'badges',
        'developers',
        'banks',
        'teamMembers',
        'articleCategories',
        'articleTags',
        'authors',
        'properties',
        'articles',
        'headerMenus',
        'pages',
        'faqs',
        'testimonials',
        'partners',
        'jobOpenings',
        'jobApplications',
        'leads',
        'media',
        'redirects',
        'newsletterSubscribers',
        'siteSettings',
        'seoSettings',
        'propertyViews',
        'notFoundLog',
    ];

    public function run(DocumentStore $store): void
    {
        $path = env('SEED_PATH') ?: database_path('seeders/data/db.json');
        if (! is_file($path)) {
            throw new RuntimeException("No seed at {$path}.");
        }
        $seed = JsonValue::decode((string) file_get_contents($path));
        if (! is_array($seed)) {
            throw new RuntimeException("The seed at {$path} is not a JSON object.");
        }

        // `property_similar` and `created_by` point both ways through the
        // list; the file is consistent as a whole, so the checks wait for it.
        Schema::disableForeignKeyConstraints();
        try {
            DB::transaction(function () use ($seed, $store) {
                foreach (self::ORDER as $collection) {
                    $this->importCollection($store, $collection, $seed[$collection] ?? null);
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        $this->resetAutoIncrements();
        $store->flush();
    }

    private function importCollection(DocumentStore $store, string $collection, mixed $records): void
    {
        if ($records === null) {
            return;
        }
        $mapper = TableMapper::for($collection);

        if ($mapper->isSingleton()) {
            $store->import($collection, JsonValue::toArray($records));
            $this->command?->info("  {$collection}: 1 row");

            return;
        }

        $count = 0;
        foreach ((array) $records as $record) {
            $record = JsonValue::toArray($record);
            $extra = [];
            if ($collection === 'adminUsers') {
                // Plaintext in the seed only — hashed here, and never returned.
                $extra['password'] = Hash::make((string) ($record['password'] ?? ''));
                unset($record['password']);
            }
            $store->import($collection, $record, $extra);
            $count++;
        }

        $this->command?->info("  {$collection}: {$count} rows");
    }

    /** seed-mapping.md: the first record an editor creates must not collide. */
    private function resetAutoIncrements(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }
        foreach (self::ORDER as $collection) {
            $mapper = TableMapper::for($collection);
            if ($mapper->isSingleton()) {
                continue;
            }
            foreach ([$mapper->table(), ...array_column($mapper->children, 'name')] as $table) {
                $next = (int) DB::table($table)->max('id') + 1;
                DB::statement("ALTER TABLE `{$table}` AUTO_INCREMENT = {$next}");
            }
        }
    }
}
