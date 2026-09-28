<?php

namespace App\Domain\Properties;

use App\Support\Time\Clock;
use Illuminate\Support\Facades\Cache;

/**
 * View-count debouncing (05_BUSINESS_RULES.md → "View counting").
 *
 * `POST /properties/:id/view` is called by the detail page on every mount, so
 * one visitor reloading a listing must not inflate `viewCount`: one counted
 * view per IP per listing per hour. The mock keeps the window in memory; here
 * it is the cache — shared across workers, kept over a restart — and
 * `Cache::add` writes only when the key is absent, so two simultaneous
 * requests cannot both count.
 */
final class ViewCounter
{
    /** Whether this view counts, remembering it when it does. */
    public static function count(string $ip, int|string $propertyId): bool
    {
        $window = (int) config('sna.view_debounce_minutes', 60);

        return Cache::add("view:{$ip}:{$propertyId}", true, Clock::now()->addMinutes($window));
    }
}
