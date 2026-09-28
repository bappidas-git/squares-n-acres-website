<?php

namespace App\Routing;

use App\Crud\Resources;
use App\Http\Controllers\CrudController;
use Illuminate\Support\Facades\Route;

/**
 * Registers the generic routes of a CRUD resource (App\Http\Controllers\CrudController).
 *
 * Call `publicRoutes()` inside the public group and `adminRoutes()` inside
 * the `/admin` group of routes/api.php; a module that adds routes of its own
 * to the same path registers them first, so a hand-written route wins over the
 * generic one — `{id}` only matches digits, so `/admin/properties/slug/…`
 * never reads as an id.
 */
final class CrudRoutes
{
    /** The public list and slug lookup of one resource. */
    public static function publicRoutes(string $key, ?string $controller = null): void
    {
        $options = Resources::options($key);
        $controller ??= CrudController::class;
        $publicPath = array_key_exists('publicPath', $options) ? $options['publicPath'] : ($options['basePath'] ?? $key);
        if ($publicPath === false) {
            return;
        }
        $has = fn (string $route) => ! isset($options['routes']) || in_array($route, $options['routes'], true);
        $slugged = $options['slugged'] ?? ! empty(\App\Contract\Contract::model($options['collection'])['slugField']);

        if ($has('list')) {
            Route::get($publicPath, [$controller, 'index'])->defaults('resource', $key);
        }
        if ($slugged && $has('bySlug')) {
            Route::get("{$publicPath}/slug/{slug}", [$controller, 'showBySlug'])->defaults('resource', $key);
        }
    }

    /** The admin routes of one resource. */
    public static function adminRoutes(string $key, ?string $controller = null): void
    {
        $options = Resources::options($key);
        $controller ??= CrudController::class;
        $base = $options['basePath'] ?? $key;
        $has = fn (string $route) => ! isset($options['routes']) || in_array($route, $options['routes'], true);
        $slugged = $options['slugged'] ?? ! empty(\App\Contract\Contract::model($options['collection'])['slugField']);

        if ($has('adminList')) {
            Route::get($base, [$controller, 'adminIndex'])->defaults('resource', $key);
        }
        if ($slugged && $has('checkSlug')) {
            Route::get("{$base}/check-slug", [$controller, 'checkSlug'])->defaults('resource', $key);
        }
        if ($has('bulk')) {
            Route::post("{$base}/bulk", [$controller, 'bulk'])->defaults('resource', $key);
        }
        if ($has('create')) {
            Route::post($base, [$controller, 'store'])->defaults('resource', $key);
        }
        if ($has('get')) {
            Route::get("{$base}/{id}", [$controller, 'show'])->defaults('resource', $key)->whereNumber('id');
        }
        if ($has('update')) {
            Route::put("{$base}/{id}", [$controller, 'update'])->defaults('resource', $key)->whereNumber('id');
        }
        if ($has('patch')) {
            Route::patch("{$base}/{id}", [$controller, 'patch'])->defaults('resource', $key)->whereNumber('id');
        }
        if ($has('remove')) {
            Route::delete("{$base}/{id}", [$controller, 'destroy'])->defaults('resource', $key)->whereNumber('id');
        }
    }
}
