<?php

use Illuminate\Support\Facades\Route;

// The contract's routes are registered in the following commits; until then the
// API answers its health check only.
Route::get('/health', fn () => response()->json(['data' => ['status' => 'ok']]));
