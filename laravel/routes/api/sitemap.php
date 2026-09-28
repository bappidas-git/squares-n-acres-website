<?php

use App\Domain\Seo\SitemapBuilder;
use App\Http\Controllers\SeoFileController;
use Illuminate\Support\Facades\Route;

/*
| The crawler documents under /api — 06_SEO_SITEMAP_ROBOTS.md. The same
| routes answer at the root (routes/seo-root.php); the index and robots.txt
| name the child sitemaps under whichever path they were fetched from.
*/

Route::get('sitemap.xml', [SeoFileController::class, 'index']);
Route::get('sitemap-{name}.xml', [SeoFileController::class, 'urlSet'])->whereIn('name', SitemapBuilder::CHILD_SITEMAPS);
Route::get('robots.txt', [SeoFileController::class, 'robots']);
Route::get('rss.xml', [SeoFileController::class, 'rss']);
Route::get('llms.txt', [SeoFileController::class, 'llms']);
