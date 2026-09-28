<?php

namespace App\Crud;

use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;

/**
 * "Somebody else saved this after you opened it" (05_BUSINESS_RULES.md).
 *
 * A PUT sends the whole record, so a form opened before somebody else's save
 * would write every field back as it had read it. The form sends the
 * `updatedAt` it read; when the record has been saved since, the replace is
 * refused with 409 and the answer says who saved it and when:
 *
 *   { "message": "Priya saved this locality after you opened it.",
 *     "data": { "conflict": "stale",
 *               "current": { "updatedAt": "…", "updatedBy": { "id": 2, "name": "Priya" },
 *                            "updatedByName": "Priya" } } }
 *
 * A body without `updatedAt` replaces as before — which is also how a form's
 * "Save mine anyway" goes through, naming the newer version.
 */
final class StaleGuard
{
    public static function refuse(array $existing, array $body, DocumentStore $store, string $noun = 'record'): void
    {
        $expected = is_string($body['updatedAt'] ?? null) ? $body['updatedAt'] : null;
        $stored = $existing['updatedAt'] ?? null;
        // An empty value names no version (`!expected` in the mock): the replace goes through.
        if ($expected === null || $expected === '' || $stored === null || $stored === '' || $expected === $stored) {
            return;
        }

        $editor = ($existing['updatedBy'] ?? null) === null ? null : $store->find('adminUsers', $existing['updatedBy']);
        $name = $editor['name'] ?? null;
        ApiLog::info('stale-guard', "Refused a replace of a {$noun} saved since it was opened", [
            'expected' => $expected,
            'current' => $stored,
        ]);

        throw ApiException::conflict(
            $name ? "{$name} saved this {$noun} after you opened it." : "This {$noun} was saved by somebody else after you opened it.",
            null,
            [
                'conflict' => 'stale',
                'current' => [
                    'updatedAt' => $stored,
                    'updatedBy' => $editor ? ['id' => $editor['id'], 'name' => $editor['name']] : null,
                    'updatedByName' => $name,
                ],
            ],
        );
    }
}
