<?php

namespace App\Domain\Seo;

use App\Store\DocumentStore;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Time\Ist;
use Illuminate\Support\Facades\DB;

/**
 * The 404 log (06_SEO_SITEMAP_ROBOTS.md → "The 404 log", prompt 51): the
 * addresses visitors reached that answered "not found", reported by the
 * site's 404 page and read by the SEO dashboard's 404s tab, where each can
 * become a redirect.
 *
 * One row per path per Indian day, counted — a busy broken link is one row a
 * day, not a row a visit — and never more than `sna.not_found_log_max_rows`
 * rows: the ones seen longest ago go first, so a crawler walking dead links
 * cannot grow it. The admin reads one line per path.
 */
final class NotFoundLog
{
    /** Where a 404 is not the site's to report: the panel, the API, the build's own files. */
    private const IGNORED_PREFIXES = ['/admin', '/api/', '/static/'];

    /** A missing script, stylesheet, image or feed is a file, not a page a visitor asked for. */
    private const ASSET_PATTERN = '/\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|json|txt|xml)\z/i';

    public function __construct(private DocumentStore $store) {}

    /** A path as the log keys it: no query string, no fragment, no trailing slash. */
    public static function normalizePath(mixed $value): string
    {
        $text = Js::trim($value === null ? '' : Js::string($value));
        $text = explode('?', explode('#', $text, 2)[0], 2)[0];
        if (strlen($text) > 1) {
            $trimmed = (string) preg_replace('~/+\z~', '', $text);

            return $trimmed !== '' ? $trimmed : '/';
        }

        return $text;
    }

    /** Whether a reported path stays out of the log — an address an active redirect answers is no broken link. */
    public static function isIgnored(string $path, array $redirects): bool
    {
        if ($path === '/admin' || preg_match(self::ASSET_PATTERN, $path)) {
            return true;
        }
        foreach (self::IGNORED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }
        foreach ($redirects as $rule) {
            if (($rule['isActive'] ?? null) !== false && self::normalizePath($rule['fromPath'] ?? null) === $path) {
                return true;
            }
        }

        return false;
    }

    /**
     * Counts one visit to a missing address — the day's row of the path, or
     * a new one — and keeps the log to its cap. A report without a referrer
     * keeps the one the row already has.
     */
    public function record(string $path, ?string $referrer): void
    {
        $now = Clock::now();
        $day = Ist::day($now);
        $from = $referrer === null || $referrer === '' ? null : $referrer;

        DB::transaction(function () use ($path, $day, $now, $from) {
            $row = null;
            foreach ($this->store->all('notFoundLog') as $entry) {
                if ($entry['path'] === $path && $entry['day'] === $day) {
                    $row = $entry;
                    break;
                }
            }

            if ($row !== null) {
                $this->store->setColumns('notFoundLog', $row['id'], [
                    'count' => DB::raw('`count` + 1'),
                    'last_seen_at' => Clock::storage($now),
                    ...($from !== null ? ['referrer' => $from] : []),
                ]);
                ApiLog::debug('seo', "404 at {$path} counted again", ['day' => $day]);
            } else {
                $at = Clock::iso($now);
                $row = $this->store->insert('notFoundLog', [
                    'path' => $path,
                    'day' => $day,
                    'count' => 1,
                    'referrer' => $from,
                    'firstSeenAt' => $at,
                    'lastSeenAt' => $at,
                ]);
                ApiLog::info('seo', "404 at {$path} logged", ['day' => $day, 'id' => $row['id']]);
            }

            $this->cap();
        });
    }

    /**
     * One line per path, the most reached first: its visits, the days it was
     * reached on, when first and last, and the latest page that linked to it.
     * `id` is the path's most recent row — what a dismissal names.
     *
     * @return array<int, array{id: int, path: string, count: int, firstSeenAt: string,
     *   lastSeenAt: string, referrer: ?string, days: int}>
     */
    public static function summarize(array $rows): array
    {
        $byPath = [];
        foreach ($rows as $row) {
            $key = Js::string($row['path'] ?? null);
            $count = (int) (Js::toNumber($row['count'] ?? null) ?? 0);
            if (! array_key_exists($key, $byPath)) {
                $byPath[$key] = [
                    'id' => $row['id'],
                    'path' => $row['path'],
                    'count' => $count,
                    'firstSeenAt' => $row['firstSeenAt'] ?? null,
                    'lastSeenAt' => $row['lastSeenAt'] ?? null,
                    'referrer' => $row['referrer'] ?? null,
                    'days' => [Js::string($row['day'] ?? null) => true],
                    'referrerAt' => self::given($row['referrer'] ?? null) ? Js::string($row['lastSeenAt'] ?? null) : '',
                ];

                continue;
            }
            $line = &$byPath[$key];
            $line['count'] += $count;
            $line['days'][Js::string($row['day'] ?? null)] = true;
            if (strcmp(Js::string($row['firstSeenAt'] ?? null), Js::string($line['firstSeenAt'])) < 0) {
                $line['firstSeenAt'] = $row['firstSeenAt'];
            }
            if (strcmp(Js::string($row['lastSeenAt'] ?? null), Js::string($line['lastSeenAt'])) > 0) {
                $line['lastSeenAt'] = $row['lastSeenAt'];
                $line['id'] = $row['id'];
            }
            if (self::given($row['referrer'] ?? null) && strcmp(Js::string($row['lastSeenAt'] ?? null), $line['referrerAt']) > 0) {
                $line['referrer'] = $row['referrer'];
                $line['referrerAt'] = Js::string($row['lastSeenAt'] ?? null);
            }
            unset($line);
        }

        $lines = array_map(function (array $line) {
            $line['days'] = count($line['days']);
            unset($line['referrerAt']);

            return $line;
        }, array_values($byPath));
        usort($lines, fn (array $left, array $right) => ($right['count'] <=> $left['count'])
            ?: strcmp(Js::string($right['lastSeenAt']), Js::string($left['lastSeenAt'])));

        return $lines;
    }

    /** Dismisses a path — every day of it — by one of its rows; null when the id names none. */
    public function dismiss(mixed $id): ?string
    {
        $named = null;
        foreach ($this->store->all('notFoundLog') as $row) {
            if (Js::string($row['id']) === Js::string($id)) {
                $named = $row;
                break;
            }
        }
        if ($named === null) {
            return null;
        }

        DB::transaction(function () use ($named) {
            foreach ($this->store->all('notFoundLog') as $row) {
                if ($row['path'] === $named['path']) {
                    $this->store->delete('notFoundLog', $row['id']);
                }
            }
        });
        ApiLog::info('seo', "404 at {$named['path']} dismissed", ['id' => $named['id']]);

        return $named['path'];
    }

    /** Whether a referrer names a page (a blank one names none). */
    private static function given(mixed $referrer): bool
    {
        return $referrer !== null && $referrer !== '';
    }

    /** Removes the rows seen longest ago beyond the cap. */
    private function cap(): void
    {
        $rows = $this->store->all('notFoundLog');
        $excess = count($rows) - (int) config('sna.not_found_log_max_rows', 500);
        if ($excess <= 0) {
            return;
        }
        usort($rows, fn (array $left, array $right) => strcmp(Js::string($left['lastSeenAt'] ?? null), Js::string($right['lastSeenAt'] ?? null)));
        foreach (array_slice($rows, 0, $excess) as $stale) {
            $this->store->delete('notFoundLog', $stale['id']);
        }
        ApiLog::info('seo', "404 log capped: {$excess} oldest row(s) removed");
    }
}
