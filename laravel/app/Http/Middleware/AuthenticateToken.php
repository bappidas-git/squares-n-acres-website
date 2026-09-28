<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bearer-token authentication (02_AUTH_AND_RBAC.md → "Token flow").
 *
 * Reads `Authorization: Bearer <token>`, resolves it with Sanctum and puts
 * the user on the request:
 *
 *   no header / wrong scheme / unknown / expired  → 401 "Unauthenticated."
 *   the user has since been deactivated           → 401 "Account is inactive."
 *
 * A 401 never says which of the first four happened. The deactivated account
 * is the exception, because the token's owner is the one reading it. Every
 * token carries its own `expires_at` (config/sna.php → auth.token_ttl_minutes)
 * so that `POST /auth/refresh` can extend the one the client holds; an
 * expired token is deleted when it is presented.
 */
final class AuthenticateToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = self::bearer($request);
        if ($plain === null) {
            ApiLog::info('auth', 'No bearer token');

            throw ApiException::unauthorized();
        }

        $token = PersonalAccessToken::findToken($plain);
        if ($token === null) {
            ApiLog::info('auth', 'Unknown token');

            throw ApiException::unauthorized();
        }
        if ($token->expires_at !== null && $token->expires_at->isPast()) {
            ApiLog::info('auth', 'Expired token, deleted', ['tokenId' => $token->getKey()]);
            $token->delete();

            throw ApiException::unauthorized();
        }

        $user = $token->tokenable;
        if (! $user instanceof AdminUser) {
            $token->delete();

            throw ApiException::unauthorized();
        }
        if (! $user->is_active) {
            ApiLog::info('auth', 'Token of a deactivated account', ['userId' => $user->getKey()]);

            throw ApiException::unauthorized('Account is inactive.');
        }

        $user->withAccessToken($token);
        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);
        $request->attributes->set('plainToken', $plain);

        ApiLog::debug('auth', "Signed in as #{$user->getKey()} ({$user->role})");

        return $next($request);
    }

    /** The bearer token of a request, tolerating the casing and spacing clients send. */
    public static function bearer(Request $request): ?string
    {
        $header = trim((string) $request->headers->get('Authorization', ''));

        return preg_match('/^Bearer\s+(\S+)$/i', $header, $match) ? $match[1] : null;
    }
}
