<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Not used: the admin panel authenticates with a bearer token, never with
    | Sanctum's cookie mode (02_AUTH_AND_RBAC.md → "Token flow").
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', '')),

    'guard' => [],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | Deliberately null. Sanctum would otherwise also expire a token a fixed
    | time after its `created_at`, whatever its `expires_at` says — and
    | `POST /auth/refresh` extends the *same* token by moving its `expires_at`
    | a full lifetime from now. Every token is created with its own
    | `expires_at` instead (config('sna.auth.token_ttl_minutes'), 24 hours by
    | default, from SANCTUM_TOKEN_TTL_MINUTES).
    |
    */

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
