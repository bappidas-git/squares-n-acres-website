<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing
|--------------------------------------------------------------------------
|
| Only needed when the site and the API are on two hosts (07_DEPLOYMENT.md,
| Layout B). CORS_ALLOWED_ORIGINS is an explicit comma-separated list — never
| `*` once the site is live. The three local origins mirror the mock server's
| (01_API_CONTRACT.md → "CORS"). `Content-Disposition` must be exposed: the
| admin's CSV exports read the file name from it.
|
*/

$origins = array_values(array_filter(array_map('trim', explode(',', (string) env(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000'
)))));

return [

    'paths' => ['api/*', 'sitemap*.xml', 'robots.txt', 'rss.xml', 'llms.txt'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => ['Content-Disposition', 'X-Request-Id'],

    'max_age' => 86400,

    // Authentication is a bearer token in a header, never a cookie.
    'supports_credentials' => false,

];
