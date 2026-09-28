<?php

namespace App\Domain\Tokens;

use App\Support\Debug\ApiLog;
use App\Support\Time\Clock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Access tokens for a listing's gated files (05_BUSINESS_RULES.md → "Gated files").
 *
 * A gated document, the brochure behind `brochureLeadGated` and every floor
 * plan are offered to a visitor only after they have told the desk who they
 * are: a public read carries no address for them, and
 * `POST /properties/:id/documents/access` hands the addresses over to whoever
 * presents one of these tokens. `POST /leads` issues one with every lead
 * about an active listing. Bound to one listing and one lead, 24 hours, kept
 * in the cache.
 */
final class FileAccess
{
    /** @return array{token: string, expiresAt: string} */
    public static function issue(int|string $propertyId, int|string $leadId): array
    {
        $token = Str::random(32);
        $expires = Clock::now()->addMinutes((int) config('sna.file_access_ttl_minutes', 1440));
        Cache::put("file-access:{$token}", [
            'propertyId' => (string) $propertyId,
            'leadId' => (string) $leadId,
            'expiresAt' => Clock::iso($expires),
        ], $expires);
        ApiLog::info('file-access', "Access to the files of property #{$propertyId} granted to lead #{$leadId}");

        return ['token' => $token, 'expiresAt' => Clock::iso($expires)];
    }

    /**
     * The grant a token carries for one listing, or null.
     *
     * @return array{propertyId: string, leadId: string, expiresAt: string}|null
     */
    public static function verify(mixed $token, int|string $propertyId): ?array
    {
        if (! is_string($token) || $token === '' || strlen($token) > 200) {
            return null;
        }
        $grant = Cache::get("file-access:{$token}");

        return is_array($grant) && $grant['propertyId'] === (string) $propertyId ? $grant : null;
    }
}
