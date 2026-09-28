<?php

namespace App\Console\Commands;

use App\Models\NotFoundLog;
use App\Models\PropertyView;
use App\Support\Debug\ApiLog;
use App\Support\Time\Clock;
use Illuminate\Console\Command;

/**
 * Keeps the two tables the public site writes to from growing without bound:
 *
 *  - `property_views` beyond 90 days — the dashboard reads 30 at most
 *    (05_BUSINESS_RULES.md → "View counting");
 *  - the 404 log beyond its 500 rows seen most recently, so a crawler walking
 *    dead links cannot grow it (06_SEO_SITEMAP_ROBOTS.md → "The 404 log").
 */
class PruneData extends Command
{
    protected $signature = 'sna:prune {--days=90 : Keep this many days of listing views}';

    protected $description = 'Prune old listing views and cap the 404 log';

    public function handle(): int
    {
        $cutoff = Clock::now()->subDays((int) $this->option('days'))->format(Clock::STORAGE_FORMAT);
        $views = PropertyView::query()->where('viewed_at', '<', $cutoff)->toBase()->delete();

        $cap = (int) config('sna.not_found_log_max_rows', 500);
        $keep = NotFoundLog::query()->orderByDesc('last_seen_at')->orderByDesc('id')->limit($cap)->pluck('id');
        $paths = $keep->isEmpty() ? 0 : NotFoundLog::query()->whereNotIn('id', $keep)->toBase()->delete();

        ApiLog::info('prune', "Pruned {$views} listing view(s) and {$paths} 404 row(s)");
        $this->info("{$views} listing view(s) and {$paths} 404 row(s) pruned.");

        return self::SUCCESS;
    }
}
