<?php

use App\Http\Controllers\RedirectController;
use Illuminate\Support\Facades\Route;

/*
| Redirects — 05_BUSINESS_RULES.md → "Redirects". The public list and the admin
| CRUD are the CRUD engine's (App\Crud\Definitions\Redirects); a followed rule
| is reported anonymously, throttled per address.
*/

Route::get('redirects/resolve', [RedirectController::class, 'resolve']);
Route::post('redirects/{id}/hit', [RedirectController::class, 'hit'])->whereNumber('id')->middleware('throttle:redirect-hits');

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('redirects/export', [RedirectController::class, 'export']);
    Route::post('redirects/import', [RedirectController::class, 'import']);
});
