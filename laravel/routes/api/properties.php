<?php

use App\Http\Controllers\AdminPropertyController;
use App\Http\Controllers\PropertyController;
use Illuminate\Support\Facades\Route;

/*
| Listings — 01_API_CONTRACT.md §5.7, 05_BUSINESS_RULES.md → "Property search"
| through "Duplicating a property". Hand-written (not the CRUD engine): the
| search, facets, counts, publish rules, gated files and share links are the
| listing's own. Reading the admin list is `properties.view` (sales too);
| every write is admin and manager (App\Support\Auth\RoutePermissions).
*/

Route::get('properties', [PropertyController::class, 'index']);
Route::get('properties/counts', [PropertyController::class, 'counts']);
Route::get('properties/featured', [PropertyController::class, 'featured']);
Route::get('properties/suggestions', [PropertyController::class, 'suggestions']);
Route::get('properties/slug/{slug}', [PropertyController::class, 'showBySlug']);
Route::get('properties/{id}/similar', [PropertyController::class, 'similar'])->whereNumber('id');
Route::post('properties/{id}/view', [PropertyController::class, 'view'])->whereNumber('id');
Route::post('properties/{id}/documents/access', [PropertyController::class, 'documentAccess'])->whereNumber('id');

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('properties', [AdminPropertyController::class, 'index']);
    Route::post('properties', [AdminPropertyController::class, 'store']);
    Route::get('properties/check-slug', [AdminPropertyController::class, 'checkSlug']);
    Route::post('properties/bulk', [AdminPropertyController::class, 'bulk']);
    Route::get('properties/slug/{slug}', [AdminPropertyController::class, 'showBySlug']);
    Route::get('properties/{id}', [AdminPropertyController::class, 'show'])->whereNumber('id');
    Route::put('properties/{id}', [AdminPropertyController::class, 'update'])->whereNumber('id');
    Route::patch('properties/{id}', [AdminPropertyController::class, 'patch'])->whereNumber('id');
    Route::delete('properties/{id}', [AdminPropertyController::class, 'destroy'])->whereNumber('id');
    Route::post('properties/{id}/preview-token', [AdminPropertyController::class, 'previewToken'])->whereNumber('id');
    Route::post('properties/{id}/duplicate', [AdminPropertyController::class, 'duplicate'])->whereNumber('id');
    Route::any('properties/{path}', [AdminPropertyController::class, 'missing'])->where('path', '.*');
});
