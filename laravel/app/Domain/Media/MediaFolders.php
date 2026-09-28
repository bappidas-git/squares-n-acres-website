<?php

namespace App\Domain\Media;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Time\Clock;
use App\Support\Validation\SchemaValidator;
use Collator;
use Illuminate\Support\Facades\DB;

/**
 * The library's folders (05_BUSINESS_RULES.md → "Media library", prompt 51).
 *
 * A folder is a string on its files (D12), filed clean: its segments trimmed,
 * no slash at either end and none doubled — `" /projects//aurelia/ "` is
 * `projects/aurelia`, the name the upload gives Cloudinary — and a blank one
 * is `null`. The record used to keep the slashes: one folder under two names.
 * Moving and renaming change the library's filing only: every record keeps
 * its `url` and `publicId`, so nothing that points at the asset breaks.
 */
final class MediaFolders
{
    /** The longest folder a record keeps (`media.folder`). */
    public const MAX_LENGTH = 120;

    private static ?Collator $collator = null;

    /** A folder name as the library files it, or `''` for none. */
    public static function clean(mixed $folder): string
    {
        $segments = array_map(fn (string $segment) => Js::trim($segment), explode('/', $folder === null ? '' : Js::string($folder)));

        return implode('/', array_filter($segments, fn (string $segment) => $segment !== ''));
    }

    /** A write's `folder` filed clean, when it sends one. */
    public static function normaliseBody(array $body): array
    {
        if (is_string($body['folder'] ?? null)) {
            $clean = self::clean($body['folder']);
            $body['folder'] = $clean === '' ? null : $clean;
        }

        return $body;
    }

    /** Whether `folder` is `parent` or a folder inside it. */
    public static function contains(mixed $folder, string $parent): bool
    {
        return is_string($folder) && ($folder === $parent || str_starts_with($folder, "{$parent}/"));
    }

    /**
     * `meta.folders`: each folder of a set of files with how many it holds,
     * sorted by name — the folder rail's "properties (284)".
     *
     * @return array<int, array{name: string, count: int}>
     */
    public static function counts(array $rows): array
    {
        $counts = [];
        foreach ($rows as $row) {
            $folder = $row['folder'] ?? null;
            if (is_string($folder) && $folder !== '') {
                $counts[$folder] = ($counts[$folder] ?? 0) + 1;
            }
        }
        $names = array_map('strval', array_keys($counts));
        usort($names, fn (string $left, string $right) => self::collator()->compare($left, $right));

        return array_map(fn (string $name) => ['name' => $name, 'count' => $counts[$name]], $names);
    }

    /** `unfiled=true` keeps the files in no folder, `false` the files in one. */
    public static function unfiledFilter(array $record, mixed $raw): bool
    {
        $wanted = Filters::bool($raw);
        if ($wanted === null) {
            return true;
        }
        $filed = is_string($record['folder'] ?? null) && $record['folder'] !== '';

        return $wanted ? ! $filed : $filed;
    }

    /**
     * The bulk `move`'s changes: `payload.folder` cleaned as a record's folder
     * is, `null` (or blank) for no folder at all. Worked out once, before any
     * record is touched.
     *
     * @throws ApiException 422 on `payload.folder`
     */
    public static function moveChanges(mixed $payload): array
    {
        $named = Js::isPlainObject($payload) && Js::has($payload, 'folder');
        $folder = $named ? Js::get($payload, 'folder') : null;
        if (! $named || ($folder !== null && ! is_string($folder))) {
            throw ApiException::validation(['payload.folder' => 'Name the folder to move the files to, or send null for no folder.']);
        }
        $clean = self::clean($folder);
        if (Js::length($clean) > self::MAX_LENGTH) {
            throw ApiException::validation(['payload.folder' => 'The folder may not be greater than '.self::MAX_LENGTH.' characters.']);
        }

        return ['folder' => $clean === '' ? null : $clean];
    }

    /**
     * `POST /admin/media/folders/rename { from, to, merge? }`: refiles every
     * record of a folder — and of every folder inside it, `projects/aurelia`
     * going along with `projects` — in one write.
     *
     * A name the library already uses is a 422 on `to` carrying
     * `data.existing: { name, count }`, unless `merge: true` says to move the
     * files in beside the ones already there.
     *
     * @return array{from: string, to: string, moved: int, merged: bool}
     */
    public static function rename(DocumentStore $store, array $body): array
    {
        SchemaValidator::validate(Contract::schema('media.renameFolder'), $body, ['fillDefaults' => true]);

        $from = self::clean($body['from']);
        $to = self::clean($body['to']);
        if ($from === '') {
            throw ApiException::validation(['from' => 'Name the folder to rename.']);
        }
        if ($to === '') {
            throw ApiException::validation(['to' => 'Name the folder to move the files to.']);
        }

        $rows = $store->all('media');
        $moving = array_values(array_filter($rows, fn (array $record) => self::contains($record['folder'] ?? null, $from)));
        if ($moving === []) {
            throw ApiException::validation(['from' => "No file is filed in “{$from}”."]);
        }
        if ($to === $from) {
            throw ApiException::validation(['to' => 'That is the folder’s name already.']);
        }
        if (self::contains($to, $from)) {
            throw ApiException::validation(['to' => 'A folder cannot move into a folder inside itself.']);
        }

        $renamed = fn (string $folder) => $to.substr($folder, strlen($from));
        foreach ($moving as $record) {
            if (Js::length($renamed($record['folder'])) > self::MAX_LENGTH) {
                throw ApiException::validation([
                    'to' => "“{$renamed($record['folder'])}” would be longer than ".self::MAX_LENGTH.' characters — choose a shorter name.',
                ]);
            }
        }

        $existing = count(array_filter(
            $rows,
            fn (array $record) => ! self::contains($record['folder'] ?? null, $from) && self::contains($record['folder'] ?? null, $to),
        ));
        if ($existing > 0 && ($body['merge'] ?? null) !== true) {
            ApiLog::info('media', "Rename of “{$from}” refused: “{$to}” holds {$existing} file(s)");

            throw ApiException::validation(
                ['to' => "“{$to}” already holds {$existing} ".($existing === 1 ? 'file' : 'files').' — merge into it, or choose another name.'],
                data: ['existing' => ['name' => $to, 'count' => $existing]],
            );
        }

        DB::transaction(function () use ($store, $moving, $renamed) {
            $now = Clock::nowIso();
            foreach ($moving as $record) {
                $store->update('media', [...$record, 'folder' => $renamed($record['folder']), 'updatedAt' => $now], $record);
            }
        });
        ApiLog::info('media', "Folder “{$from}” renamed to “{$to}”", ['moved' => count($moving), 'merged' => $existing > 0]);

        return ['from' => $from, 'to' => $to, 'moved' => count($moving), 'merged' => $existing > 0];
    }

    /** Folder names in the order every list of them is read: `localeCompare(…, 'en', { sensitivity: 'base' })`. */
    private static function collator(): Collator
    {
        if (self::$collator === null) {
            self::$collator = new Collator('en');
            self::$collator->setStrength(Collator::PRIMARY);
        }

        return self::$collator;
    }
}
