<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| The website (Layout A of 07_DEPLOYMENT.md)
|--------------------------------------------------------------------------
|
| When the React build is deployed into public/ beside the API, every path
| that is not a file, an /api route or a crawler document is the single-page
| app. The prerender writes the bare shell to index.spa.html and the rendered
| home page to index.html, so deep links fall back to the shell. With no build
| deployed (Layout B, the API on its own host) these answer 404.
|
| The crawler documents (/sitemap.xml, /robots.txt, …) are registered in
| routes/seo-root.php; an unknown /api path stays a JSON 404.
*/

$page = function (string $file) {
    return response()->file(public_path($file), [
        'Content-Type' => 'text/html; charset=utf-8',
        'Cache-Control' => 'no-cache',
    ]);
};

Route::get('/', function () use ($page) {
    abort_unless(is_file(public_path('index.html')), 404);

    return $page('index.html');
});

Route::fallback(function (Request $request) use ($page) {
    abort_if($request->is('api', 'api/*'), 404);
    $shell = is_file(public_path('index.spa.html')) ? 'index.spa.html' : 'index.html';
    abort_unless(is_file(public_path($shell)), 404);

    return $page($shell);
});
