<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

/*
| Authentication — 02_AUTH_AND_RBAC.md → "Token flow". Only `login` is public;
| it is throttled per e-mail address and IP, and a password change per account.
*/

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth.token')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/refresh', [AuthController::class, 'refresh']);
    Route::get('auth/profile', [AuthController::class, 'profile']);
    Route::put('auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('auth/password', [AuthController::class, 'updatePassword'])->middleware('throttle:password');
});
