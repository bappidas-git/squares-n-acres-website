<?php

use App\Http\Controllers\JobController;
use Illuminate\Support\Facades\Route;

/*
| Careers — 01_API_CONTRACT.md §5.14. The open roles and a role by slug are
| public; an application is a public form, so the honeypot answers a bot
| before the throttle counts it, then ten a minute per IP. Any id reaches the
| handler, as it does the mock's: an opening is found by its id as the path
| spells it. The admin CRUD of openings and the triage of applications are
| the CRUD engine's (App\Crud\Definitions\Jobs).
*/

Route::get('jobs', [JobController::class, 'index']);
Route::get('jobs/slug/{slug}', [JobController::class, 'showBySlug']);
Route::post('jobs/{id}/apply', [JobController::class, 'apply'])->middleware(['honeypot', 'throttle:public-forms']);
