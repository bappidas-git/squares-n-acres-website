<?php

use App\Http\Controllers\SiteSettingsController;
use Illuminate\Support\Facades\Route;

/*
| Site settings — 05_BUSINESS_RULES.md → "Settings". The public read leaves
| out `leads`; reading the whole singleton is `settings.view` (admin and
| manager), a write `settings.edit` (admin only).
*/

Route::get('settings', [SiteSettingsController::class, 'show']);

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('settings', [SiteSettingsController::class, 'adminShow']);
    Route::put('settings', [SiteSettingsController::class, 'update']);
});
