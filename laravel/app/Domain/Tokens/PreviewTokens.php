<?php

namespace App\Domain\Tokens;

use App\Support\Debug\ApiLog;
use App\Support\Time\Clock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Draft preview tokens (05_BUSINESS_RULES.md → "Preview tokens").
 *
 * An editor asks for a token for one unpublished article, page or listing and
 * gets a link with `?preview=<token>` (`?previewToken=` for a listing) that
 * shows it to somebody who is not signed in. A token is bound to one record,
 * lives 24 hours and is kept in the cache — it survives a restart and is
 * shared across workers. Asking twice hands out one link, not two: the
 * record's previous token stops working.
 */
final class PreviewTokens
{
    public static function ttlMinutes(): int
    {
        return (int) config('sna.preview_token_ttl_minutes', 1440);
    }

    /**
     * @param  string  $type  `article` | `page` | `property`
     * @return array{token: string, expiresAt: string}
     */
    public static function issue(string $type, int|string $id): array
    {
        $indexKey = "preview:of:{$type}:{$id}";
        $previous = Cache::get($indexKey);
        if (is_string($previous)) {
            Cache::forget("preview:{$previous}");
        }

        $token = Str::random(32);
        $expires = Clock::now()->addMinutes(self::ttlMinutes());
        $grant = ['type' => $type, 'id' => (string) $id, 'expiresAt' => Clock::iso($expires)];
        Cache::put("preview:{$token}", $grant, $expires);
        Cache::put($indexKey, $token, $expires);
        ApiLog::info('preview', "Preview token issued for {$type} #{$id}");

        return ['token' => $token, 'expiresAt' => $grant['expiresAt']];
    }

    /** Whether a token opens one record. */
    public static function verify(?string $token, string $type, int|string $id): bool
    {
        $grant = self::read($token, $type);

        return $grant !== null && $grant['id'] === (string) $id;
    }

    /**
     * The record a token opens, when it is a live token of that type — the
     * public routes find a record by slug before they have its id.
     *
     * @return array{type: string, id: string}|null
     */
    public static function read(?string $token, string $type): ?array
    {
        if (! is_string($token) || $token === '' || strlen($token) > 200) {
            return null;
        }
        $grant = Cache::get("preview:{$token}");
        if (! is_array($grant) || ($grant['type'] ?? null) !== $type) {
            return null;
        }

        return ['type' => $grant['type'], 'id' => $grant['id']];
    }
}
