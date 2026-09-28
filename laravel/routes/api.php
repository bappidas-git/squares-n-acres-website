<?php

use App\Crud\Resources;
use App\Http\Controllers\HealthController;
use App\Routing\CrudRoutes;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| The API — every endpoint of backend_developer_guidelines/03_ENDPOINTS.md
|--------------------------------------------------------------------------
|
| Prefixed with /api and wrapped in the `api` middleware group (the JSON body
| reader); every request is logged to the Debugbar and the `api` channel by
| App\Http\Middleware\LogApiTraffic. Each module keeps its routes in
| routes/api/<module>.php, hand-written routes before the generic CRUD ones
| of the same path. `/admin/*` routes sit in the `admin` group: a bearer
| token, the role matrix (App\Support\Auth\RoutePermissions), and a
| per-user throttle.
|
*/

Route::get('health', [HealthController::class, 'show']);

foreach (glob(__DIR__.'/api/*.php') as $module) {
    require $module;
}

// The generic CRUD routes of every resource the engine serves.
foreach (Resources::keys() as $key) {
    CrudRoutes::publicRoutes($key);
}
Route::prefix('admin')->middleware('admin')->group(function () {
    foreach (Resources::keys() as $key) {
        CrudRoutes::adminRoutes($key);
    }
});
