<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
| Admin users — 05_BUSINESS_RULES.md → "Admin users". Reading the directory is
| `users.list` (admin and manager: naming an assignee); everything else is
| admin only (App\Support\Auth\RoutePermissions).
*/

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('users', [UserController::class, 'index']);
    Route::post('users/bulk', [UserController::class, 'bulk']);
    Route::post('users', [UserController::class, 'store']);
    Route::get('users/{id}', [UserController::class, 'show'])->whereNumber('id');
    Route::put('users/{id}', [UserController::class, 'update'])->whereNumber('id');
    Route::patch('users/{id}', [UserController::class, 'patch'])->whereNumber('id');
    Route::delete('users/{id}', [UserController::class, 'destroy'])->whereNumber('id');
});
