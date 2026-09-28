<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\HeaderMenuController;
use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

/*
| Articles, pages and header menus — 05_BUSINESS_RULES.md → "Scheduled
| publishing", "Preview tokens", "Article writes", "Pages", "Header menus".
| The admin writes (and the page and menu admin reads) are the CRUD engine's
| generic routes: App\Crud\Definitions\{Articles,Pages,HeaderMenus}.
*/

Route::get('articles', [ArticleController::class, 'index']);
Route::get('articles/trending', [ArticleController::class, 'trending']);
Route::get('articles/slug/{slug}', [ArticleController::class, 'showBySlug']);
Route::get('articles/{id}/adjacent', [ArticleController::class, 'adjacent'])->whereNumber('id');

Route::get('pages', [PageController::class, 'index']);
// A page's slug is a URL path (`buyer-assistance/home-loan`): the parameter takes the rest of the path.
Route::get('pages/slug/{slug}', [PageController::class, 'showBySlug'])->where('slug', '.*');

Route::get('header-menus', [HeaderMenuController::class, 'index']);

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('articles', [ArticleController::class, 'adminIndex']);
    Route::get('articles/check-slug', [ArticleController::class, 'checkSlug']);
    Route::get('articles/{id}/preview-token', [ArticleController::class, 'previewToken'])->whereNumber('id');
    Route::get('articles/{id}', [ArticleController::class, 'show'])->whereNumber('id');
    Route::get('pages/{id}/preview-token', [PageController::class, 'previewToken'])->whereNumber('id');
});
