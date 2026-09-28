<?php

/*
|--------------------------------------------------------------------------
| Squares N Acres — API settings
|--------------------------------------------------------------------------
|
| Everything the contract makes configurable, in one place. The values are
| the ones the mock server uses, so a local run answers like `npm run mock`.
|
*/

return [

    'auth' => [
        // 02_AUTH_AND_RBAC.md → "Token lifetime": 24 hours, like the mock.
        'token_ttl_minutes' => (int) env('SANCTUM_TOKEN_TTL_MINUTES', 1440),
        'token_name' => 'admin-panel',
    ],

    /*
    | What the sitemaps, RSS and llms.txt build absolute URLs from when
    | seoSettings.siteUrl is empty (07_DEPLOYMENT.md → "Environment variables").
    */
    'site_url' => env('SITE_URL', 'https://www.squaresnacres.com'),

    /*
    | The API's own origin — allowed, beside seoSettings.siteUrl and localhost,
    | as the host the sitemap index and robots.txt name their children on
    | (06_SEO_SITEMAP_ROBOTS.md → "The host the index names").
    */
    'api_url' => env('APP_URL'),

    /*
    | Staging blocks crawlers by environment, not by data (07_DEPLOYMENT.md →
    | "Cloudways specifics that bite").
    */
    'seo_force_noindex' => (bool) env('SEO_FORCE_NOINDEX', false),

    'pagination' => [
        'public_per_page' => 12,
        'admin_per_page' => 20,
        'max_per_page' => 100,
    ],

    'rate_limits' => [
        // 01_API_CONTRACT.md → "Rate limiting".
        'public_forms_per_minute' => (int) env('RATE_LIMIT_PUBLIC_FORMS', 10),
        'login_per_minute' => (int) env('RATE_LIMIT_LOGIN', 5),
        'password_per_minute' => (int) env('RATE_LIMIT_PASSWORD', 5),
        'admin_per_minute' => (int) env('RATE_LIMIT_ADMIN', 120),
        'redirect_hits_per_minute' => (int) env('RATE_LIMIT_REDIRECT_HITS', 60),
        'not_found_per_minute' => (int) env('RATE_LIMIT_NOT_FOUND', 30),
    ],

    // Share links, article/page previews and gated-file access (05_BUSINESS_RULES.md).
    'preview_token_ttl_minutes' => 1440,
    'file_access_ttl_minutes' => 1440,

    // POST /properties/:id/view counts one view per IP per listing per hour.
    'view_debounce_minutes' => 60,

    // Sitemaps, robots.txt, rss.xml and llms.txt are cached this long.
    'seo_file_cache_minutes' => (int) env('SEO_FILE_CACHE_MINUTES', 60),

    // The 404 log keeps at most this many rows (06_SEO_SITEMAP_ROBOTS.md → "The 404 log").
    'not_found_log_max_rows' => 500,

    'logging' => [
        // App\Http\Middleware\LogApiTraffic: how much of a body is written out.
        'max_body_length' => (int) env('API_LOG_MAX_BODY', 4000),
        // Keys whose values never reach a log or the Debugbar.
        'redact' => ['password', 'currentPassword', 'newPassword', 'token', 'authorization', 'website'],
    ],

];
