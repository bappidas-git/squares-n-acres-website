<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Support\Debug\ApiLog;
use App\Support\Time\Clock;
use Illuminate\Console\Command;

/**
 * Flips every scheduled article whose moment has come to `published`
 * (05_BUSINESS_RULES.md → "Scheduled publishing"), so the admin list tells
 * the truth. The public site never waits for it: every public article query
 * already treats a due scheduled article as live.
 */
class PublishScheduledArticles extends Command
{
    protected $signature = 'articles:publish-scheduled';

    protected $description = 'Publish the scheduled articles whose publication time has passed';

    public function handle(): int
    {
        $count = Article::query()
            ->where('status', 'scheduled')
            ->where('published_at', '<=', Clock::now()->format(Clock::STORAGE_FORMAT))
            ->toBase()
            ->update(['status' => 'published']);

        if ($count > 0) {
            ApiLog::info('articles', "Published {$count} scheduled article(s)");
        }
        $this->info("{$count} article(s) published.");

        return self::SUCCESS;
    }
}
