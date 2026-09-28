<?php

namespace App\Domain\Auth;

use App\Models\AdminUser;
use App\Support\Debug\ApiLog;
use App\Support\Time\Clock;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Bearer tokens (02_AUTH_AND_RBAC.md → "Token flow", "Token lifetime").
 *
 * Sanctum personal access tokens, each with its own `expires_at` —
 * `SANCTUM_TOKEN_TTL_MINUTES`, 24 hours by default — so that
 * `POST /auth/refresh` can give the token the client already holds a full
 * lifetime again rather than issuing a new one (every request on its way and
 * every other tab would be holding a revoked one).
 */
final class Tokens
{
    public static function ttlMinutes(): int
    {
        return max(1, (int) config('sna.auth.token_ttl_minutes', 1440));
    }

    /**
     * Issues a token.
     *
     * @return array{token: string, expiresAt: string}
     */
    public static function issue(AdminUser $user): array
    {
        $expires = Clock::now()->addMinutes(self::ttlMinutes());
        $issued = $user->createToken(config('sna.auth.token_name', 'admin-panel'), ['*'], $expires);
        ApiLog::info('auth', "Token issued for #{$user->getKey()}", ['tokenId' => $issued->accessToken->getKey()]);

        return ['token' => $issued->plainTextToken, 'expiresAt' => Clock::iso($expires)];
    }

    /** Gives a live token a full lifetime again, from now; its expiry, or null when it is not live. */
    public static function extend(?PersonalAccessToken $token): ?string
    {
        if ($token === null || ($token->expires_at !== null && $token->expires_at->isPast())) {
            return null;
        }
        $expires = Clock::now()->addMinutes(self::ttlMinutes());
        $token->forceFill(['expires_at' => $expires])->save();

        return Clock::iso($expires);
    }

    public static function revoke(?PersonalAccessToken $token): void
    {
        $token?->delete();
    }

    /** Revokes every token of a user — a password change, a deactivation, a delete — but one. */
    public static function revokeUser(int $userId, ?int $exceptTokenId = null): int
    {
        $query = PersonalAccessToken::query()
            ->where('tokenable_type', (new AdminUser)->getMorphClass())
            ->where('tokenable_id', $userId);
        if ($exceptTokenId !== null) {
            $query->whereKeyNot($exceptTokenId);
        }
        $count = $query->delete();
        if ($count > 0) {
            ApiLog::info('auth', "Revoked {$count} token(s) of #{$userId}");
        }

        return $count;
    }

    /** Deletes every expired token — on each login, the one moment the table grows. */
    public static function purgeExpired(): int
    {
        return PersonalAccessToken::query()->where('expires_at', '<=', Clock::now())->delete();
    }
}
