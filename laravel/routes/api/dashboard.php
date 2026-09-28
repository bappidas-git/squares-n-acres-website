<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

/*
| The admin dashboard — 05_BUSINESS_RULES.md → "Dashboard". `dashboard.view`
| is every role's; a sales user's lead figures are scoped by the builder.
*/

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'show']);
});
