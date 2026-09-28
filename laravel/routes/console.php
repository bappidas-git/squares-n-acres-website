<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| The schedule — `* * * * * php artisan schedule:run` (07_DEPLOYMENT.md → "Cron")
|--------------------------------------------------------------------------
*/

// A scheduled article flips to `published` when its moment comes, so the admin
// list tells the truth (the public site does not wait for it).
Schedule::command('articles:publish-scheduled')->everyMinute()->withoutOverlapping();

// Expired bearer tokens (02_AUTH_AND_RBAC.md → "Token lifetime").
Schedule::command('sanctum:prune-expired --hours=48')->daily();

// Listing views beyond 90 days, and the 404 log beyond its 500 most recent rows.
Schedule::command('sna:prune')->hourly();
