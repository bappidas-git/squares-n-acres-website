<?php

use App\Http\Controllers\AdminLeadController;
use App\Http\Controllers\LeadController;
use Illuminate\Support\Facades\Route;

/*
| Leads — 05_BUSINESS_RULES.md → "Leads". The public form is the busiest write
| of the API: the honeypot answers a bot before the throttle counts it, then
| ten a minute per IP. Every admin route is `leads.*` of the role matrix
| (App\Support\Auth\RoutePermissions): all three roles work leads, bulk and
| delete are admin and manager only; the sales scope is the controller's.
| The test alert is the lead notification's, so it lives here too
| (`settings.edit`: admin only).
*/

Route::post('leads', [LeadController::class, 'store'])->middleware(['honeypot', 'throttle:public-forms']);

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('leads', [AdminLeadController::class, 'index']);
    Route::post('leads', [AdminLeadController::class, 'store']);
    Route::get('leads/export', [AdminLeadController::class, 'export']);
    Route::post('leads/bulk', [AdminLeadController::class, 'bulk']);
    Route::get('leads/{id}', [AdminLeadController::class, 'show'])->whereNumber('id');
    Route::patch('leads/{id}', [AdminLeadController::class, 'update'])->whereNumber('id');
    Route::delete('leads/{id}', [AdminLeadController::class, 'destroy'])->whereNumber('id');
    Route::post('leads/{id}/claim', [AdminLeadController::class, 'claim'])->whereNumber('id');
    Route::post('leads/{id}/notes', [AdminLeadController::class, 'addNote'])->whereNumber('id');
    Route::delete('leads/{id}/notes/{noteId}', [AdminLeadController::class, 'removeNote'])->whereNumber(['id', 'noteId']);
    Route::post('leads/{id}/activities', [AdminLeadController::class, 'logActivity'])->whereNumber('id');

    Route::post('settings/test-lead-alert', [AdminLeadController::class, 'testAlert']);
});
