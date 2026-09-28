<?php

use App\Http\Controllers\NotFoundLogController;
use App\Http\Controllers\SeoDeskController;
use App\Http\Controllers\SeoSettingsController;
use Illuminate\Support\Facades\Route;

/*
| SEO settings, the SEO desk and the 404 log — 05_BUSINESS_RULES.md →
| "Settings", "SEO overview"; 06_SEO_SITEMAP_ROBOTS.md → "The 404 log".
| The site's 404 page reports anonymously, throttled per address.
*/

Route::get('seo/settings', [SeoSettingsController::class, 'show']);
Route::post('not-found', [NotFoundLogController::class, 'report'])->middleware('throttle:not-found-reports');

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('seo/settings', [SeoSettingsController::class, 'show']);
    Route::put('seo/settings', [SeoSettingsController::class, 'update']);
    Route::get('seo/overview', [SeoDeskController::class, 'overview']);
    Route::get('seo/llms-preview', [SeoDeskController::class, 'llmsPreview']);
    Route::get('seo/not-found', [NotFoundLogController::class, 'index']);
    Route::delete('seo/not-found/{id}', [NotFoundLogController::class, 'destroy'])->whereNumber('id');
});
