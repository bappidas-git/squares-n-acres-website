<?php

namespace App\Domain\Redirects;

use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use Illuminate\Support\Facades\DB;

/**
 * `POST /admin/redirects/import { rows }` (05_BUSINESS_RULES.md → "Redirects"):
 * an upsert keyed on `fromPath`, answered `{ created, updated, skipped }`.
 *
 * An import is a bulk paste from a spreadsheet: a row that would be refused —
 * no leading `/`, an empty target, a target equal to its source, a status
 * other than 301 or 302 — is counted and skipped rather than failing the
 * file. A row is a rule the editor wants in force as it reads (prompt 51): an
 * updated rule that had been switched off is switched on again, and a row's
 * `note` replaces the stored one (blank clears it).
 */
final class RedirectImport
{
    /** The widest paths and note the columns hold; a longer value is a refused row too. */
    private const PATH_MAX_LENGTH = 500;

    private const NOTE_MAX_LENGTH = 300;

    public function __construct(private DocumentStore $store) {}

    /**
     * @param  mixed  $rows  the body's `rows`
     * @return array{created: int, updated: int, skipped: int}
     *
     * @throws ApiException 422 when `rows` is not a list
     */
    public function run(mixed $rows): array
    {
        if (! Js::isList($rows)) {
            throw ApiException::validation(['rows' => 'The rows field must be an array.']);
        }

        $summary = DB::transaction(function () use ($rows) {
            $now = Clock::nowIso();
            $summary = ['created' => 0, 'updated' => 0, 'skipped' => 0];

            foreach ($rows as $row) {
                $fromPath = RedirectRules::normalizePath(Js::get($row, 'fromPath'));
                $toPath = RedirectRules::normalizePath(Js::get($row, 'toPath'));
                $statusCode = self::statusCode(Js::get($row, 'statusCode'));
                $note = Js::get($row, 'note');

                if (! str_starts_with($fromPath, '/') || $toPath === '' || $fromPath === $toPath
                    || ($statusCode !== 301 && $statusCode !== 302)
                    || Js::length($fromPath) > self::PATH_MAX_LENGTH || Js::length($toPath) > self::PATH_MAX_LENGTH
                    || (is_string($note) && Js::length($note) > self::NOTE_MAX_LENGTH)) {
                    $summary['skipped']++;

                    continue;
                }

                $existing = null;
                foreach ($this->store->all('redirects') as $record) {
                    if (RedirectRules::normalizePath($record['fromPath'] ?? null) === $fromPath) {
                        $existing = $record;
                        break;
                    }
                }

                if ($existing !== null) {
                    $this->store->update('redirects', [
                        ...$existing,
                        'toPath' => $toPath,
                        'statusCode' => $statusCode,
                        'isActive' => true,
                        ...(is_string($note) ? ['note' => Js::trim($note) !== '' ? Js::trim($note) : null] : []),
                        'updatedAt' => $now,
                    ], $existing);
                    $summary['updated']++;

                    continue;
                }

                $this->store->insert('redirects', [
                    'fromPath' => $fromPath,
                    'toPath' => $toPath,
                    'statusCode' => $statusCode,
                    'isActive' => true,
                    'hits' => 0,
                    'note' => is_string($note) ? $note : null,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);
                $summary['created']++;
            }

            return $summary;
        });
        ApiLog::info('redirects', 'Imported', $summary);

        return $summary;
    }

    /** `Number(row.statusCode ?? 301)`: 301 or 302 as a number or a numeric string; null for anything else. */
    private static function statusCode(mixed $value): ?int
    {
        if ($value === null) {
            return 301;
        }
        $number = Js::isPlainObject($value) ? null : Js::toNumber($value);

        return $number !== null && ($number == 301 || $number == 302) ? (int) $number : null;
    }
}
