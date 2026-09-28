<?php

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
|
| The API authenticates with Laravel Sanctum personal access tokens
| (backend_developer_guidelines/02_AUTH_AND_RBAC.md) — a bearer token in the
| Authorization header, never the SPA cookie mode. The accounts live in
| `admin_users`, the only people who sign in; the public site is anonymous.
|
*/

return [

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'sanctum'),
        'passwords' => 'admin_users',
    ],

    'guards' => [
        // `auth:sanctum` — every /api/admin/* route and the private /api/auth/*.
        'sanctum' => [
            'driver' => 'sanctum',
            'provider' => 'admin_users',
        ],
    ],

    'providers' => [
        'admin_users' => [
            'driver' => 'eloquent',
            'model' => App\Models\AdminUser::class,
        ],
    ],

    // Laravel's own broker, kept for the planned self-service reset
    // (09_MEDIA_AND_EMAIL.md → "Password reset (planned addition)").
    'passwords' => [
        'admin_users' => [
            'provider' => 'admin_users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
