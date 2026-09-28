<?php

use App\Domain\Seo\SitemapBuilder;
use App\Http\Controllers\SeoFileController;
use Illuminate\Support\Facades\Route;

/*
| Root mirrors of the crawler documents (01_API_CONTRACT.md §5.13, D21):
| `/sitemap.xml`, `/robots.txt`… where the web server proxies them onto the
| site's own host and where Search Console looks. Loaded by bootstrap/app.php
| with the `api` middleware, answered by the same actions as routes/api/sitemap.php;
| an index read here names its children here too.
*/

Route::get('sitemap.xml', [SeoFileController::class, 'index']);
Route::get('sitemap-{name}.xml', [SeoFileController::class, 'urlSet'])->whereIn('name', SitemapBuilder::CHILD_SITEMAPS);
Route::get('robots.txt', [SeoFileController::class, 'robots']);
Route::get('rss.xml', [SeoFileController::class, 'rss']);
Route::get('llms.txt', [SeoFileController::class, 'llms']);
