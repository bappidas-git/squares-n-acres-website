<?php

use App\Http\Controllers\NewsletterController;
use Illuminate\Support\Facades\Route;

/*
| The newsletter — 05_BUSINESS_RULES.md → "Newsletter and spam". Subscribing
| is a public form: the honeypot answers a bot before the throttle counts it.
| The admin list and delete are the CRUD engine's
| (App\Crud\Definitions\Newsletter); the export is registered before any
| `{id}` route so it is never read as one.
*/

Route::post('newsletter/subscribe', [NewsletterController::class, 'subscribe'])->middleware(['honeypot', 'throttle:public-forms']);

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::get('newsletter-subscribers/export', [NewsletterController::class, 'export']);
    Route::patch('newsletter-subscribers/{id}', [NewsletterController::class, 'updateStatus'])->whereNumber('id');
});
