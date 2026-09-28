<?php

namespace App\Domain\Media;

use App\Crud\Usage;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use stdClass;
use WeakMap;

/**
 * Where a library file is shown, and what that stops (05_BUSINESS_RULES.md →
 * "Media library", prompt 39 §5, QA-63).
 *
 * `usedIn` is a best-effort search for the file's whole address in every
 * record a visitor can see it on (App\Crud\Usage::mediaIndex()). A `DELETE` of
 * a used file is a 409 listing where it is used, because removing the entry
 * for a photograph eight listings show would leave them pointing at a picture
 * nobody can find again; `?force=true` goes ahead anyway — the search is a
 * string search and can be wrong, and an editor who has read the list is
 * better placed to decide. Either way the asset stays where it is hosted.
 */
final class MediaUsage
{
    /** @var WeakMap<DocumentStore, stdClass>|null one index per request, for the `usage` filter */
    private static ?WeakMap $perRequest = null;

    /** Where the file at `url` is shown. */
    public static function of(DocumentStore $store, mixed $url): array
    {
        if (! is_string($url) || $url === '') {
            return [];
        }

        return (new Usage($store))->mediaIndex()($url);
    }

    /**
     * Whether anything shows the file, by the search the delete guard runs —
     * the index built once per request and each address answered once, since
     * the filter asks for every row and again for the folder counts.
     */
    public static function isUsed(DocumentStore $store, mixed $url): bool
    {
        self::$perRequest ??= new WeakMap;
        $memo = self::$perRequest[$store] ??= (object) ['usagesOf' => (new Usage($store))->mediaIndex(), 'answers' => []];
        $key = Js::string($url);
        if (! array_key_exists($key, $memo->answers)) {
            $memo->answers[$key] = ($memo->usagesOf)($url) !== [];
        }

        return $memo->answers[$key];
    }

    /**
     * `usage=unused`: the files nothing on the site shows, for a cleanup — the
     * search a delete asks first, so every file it lists deletes without a
     * 409. Any other value filters nothing.
     */
    public static function unusedFilter(array $record, mixed $raw, array $ctx): bool
    {
        if (Js::string(is_array($raw) ? ($raw[0] ?? null) : $raw) !== 'unused') {
            return true;
        }

        return ! self::isUsed($ctx['store'], $record['url'] ?? null);
    }

    /**
     * Refuses a delete that would strand a picture somebody is still showing,
     * unless `?force=true` says to go ahead.
     *
     * @throws ApiException 409 carrying `usedIn`
     */
    public static function guardDelete(array $record, array $ctx): void
    {
        if (Filters::bool($ctx['query']->get('force')) === true) {
            ApiLog::info('media', "Delete of #{$record['id']} forced");

            return;
        }
        $usedIn = self::of($ctx['store'], $record['url'] ?? null);
        if ($usedIn === []) {
            return;
        }
        ApiLog::info('media', "Delete of #{$record['id']} refused: still in use", ['usedIn' => count($usedIn)]);

        throw ApiException::conflict('This file is still in use.', ['id' => [Usage::describe($usedIn)]], ['usedIn' => $usedIn, 'usedBy' => $usedIn]);
    }

    /**
     * A bulk delete is all or nothing: one 409 naming every selected file
     * still in use, and nothing removed — unless `?force=true`. It used to
     * ask file by file between the removals, and stopped at the first one in
     * use with the files before it already gone.
     *
     * @throws ApiException 409 carrying `usedIn` and `refused`
     */
    public static function guardBulkDelete(string $action, array $targets, array $ctx): void
    {
        if ($action !== 'delete' || Filters::bool($ctx['query']->get('force')) === true) {
            return;
        }

        $usagesOf = (new Usage($ctx['store']))->mediaIndex();
        $refused = [];
        foreach ($targets as $record) {
            $usedBy = $usagesOf($record['url'] ?? null);
            if ($usedBy !== []) {
                $refused[] = ['id' => $record['id'], 'label' => self::labelOf($record), 'reason' => Usage::describe($usedBy), 'usedBy' => $usedBy];
            }
        }
        if ($refused === []) {
            return;
        }

        $usedIn = [];
        foreach ($refused as $entry) {
            foreach ($entry['usedBy'] as $usage) {
                $usedIn["{$usage['type']}:{$usage['id']}"] ??= $usage;
            }
        }
        $usedIn = array_values($usedIn);
        ApiLog::info('media', 'Bulk delete refused: '.count($refused).' file(s) still in use', ['ids' => array_column($refused, 'id')]);

        // One file selected is the single delete's answer, word for word.
        if (count($targets) === 1) {
            throw ApiException::conflict('This file is still in use.', ['id' => [$refused[0]['reason']]], ['usedIn' => $usedIn, 'usedBy' => $usedIn, 'refused' => $refused]);
        }

        $verb = count($refused) === 1 ? 'is' : 'are';

        throw ApiException::conflict(
            count($refused)." of the selected files {$verb} still in use, so none was removed.",
            ['id' => array_map(fn (array $entry) => Js::string($entry['label']).": {$entry['reason']}", $refused)],
            ['usedIn' => $usedIn, 'usedBy' => $usedIn, 'refused' => $refused],
        );
    }

    /** What a refusal calls a file: its title, its alt text, else its address. */
    private static function labelOf(array $record): mixed
    {
        foreach (['title', 'alt'] as $field) {
            if (! in_array($record[$field] ?? null, [null, ''], true)) {
                return $record[$field];
            }
        }

        return $record['url'] ?? null;
    }
}
