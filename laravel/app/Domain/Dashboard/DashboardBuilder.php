<?php

namespace App\Domain\Dashboard;

use App\Contract\Contract;
use App\Domain\Articles\ArticleVisibility;
use App\Domain\Embed;
use App\Domain\Leads\LeadScope;
use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Time\Ist;

/**
 * `GET /admin/dashboard` (05_BUSINESS_RULES.md → "Dashboard"), a port of
 * `mock-server/lib/dashboard.js`.
 *
 * One request answers the whole landing page: the counters, four trend
 * series, the ten newest leads, the five best-performing listings, the site's
 * SEO health and the follow-ups that are due. Computing it in one place means
 * the dashboard cannot disagree with itself — the "leads this month" tile and
 * the bars of `leadsByDay` are the same arithmetic.
 *
 * **Scope.** For a sales user every lead figure covers the leads assigned to
 * them and the ones nobody has taken; property, article and SEO figures are
 * the whole site's. Dates are compared as **IST calendar days**, the rule of
 * the lead list's `from`/`to`, so a tile and a filtered list agree.
 */
final class DashboardBuilder
{
    /** How many days the two series cover by default, and what `?range=` may ask for. */
    private const TREND_DAYS = 30;

    private const TREND_RANGES = [7, 30, 90];

    /** How many rows each list carries. */
    private const RECENT_LEADS = 10;

    private const TOP_PROPERTIES = 5;

    private const FOLLOW_UPS = 10;

    /** How far ahead `upcomingFollowUps` looks, in days. */
    private const FOLLOW_UP_DAYS = 14;

    /** An enquiry is worth five views when ranking a listing. */
    private const ENQUIRY_WEIGHT = 5;

    /** The collections whose `seo` object the health summary reads. */
    private const SEO_COLLECTIONS = ['properties', 'articles', 'pages', 'localities', 'developers'];

    /** The lead statuses a follow-up reminder is pointless for. */
    private const CLOSED_STATUSES = ['lost', 'converted'];

    private const DAY_MS = 24 * 60 * 60 * 1000;

    public function __construct(private DocumentStore $store) {}

    /**
     * The whole payload.
     *
     * @param  array|null  $user  the signed-in user, whose scope the lead figures cover
     * @param  mixed  $range  the days the two series cover — 7, 30 or 90; anything else is 30
     */
    public function build(?array $user, mixed $range, ?int $now = null): array
    {
        $now ??= (int) Clock::ms(Clock::now());
        $days = self::trendDays($range);
        $properties = $this->store->all('properties');
        $articles = $this->store->all('articles');
        $views = $this->store->all('propertyViews');
        // Everything below that says "lead" means "lead this user may see".
        $leads = LeadScope::visible($this->store->all('leads'), $user);

        $today = Ist::day($now);
        $thisMonth = substr((string) $today, 0, 7);
        $lastMonth = Ist::clock($now)->startOfMonth()->subMonths(1)->format('Y-m');
        $leadsThisMonth = self::inMonth($leads, 'createdAt', $thisMonth);
        $count = fn (array $records, callable $test) => count(array_filter($records, $test));
        $converted = $count($leads, fn (array $lead) => $lead['status'] === 'converted');

        $stats = [
            'propertiesTotal' => count($properties),
            'propertiesActive' => $count($properties, fn (array $property) => (bool) $property['isActive']),
            'propertiesFeatured' => $count($properties, fn (array $property) => (bool) $property['isFeatured']),
            'propertiesInactive' => $count($properties, fn (array $property) => ! $property['isActive']),
            'leadsTotal' => count($leads),
            'leadsNew' => $count($leads, fn (array $lead) => $lead['status'] === 'new'),
            'leadsToday' => $count($leads, fn (array $lead) => Ist::day($lead['createdAt']) === $today),
            'leadsThisMonth' => count($leadsThisMonth),
            'leadsLastMonth' => count(self::inMonth($leads, 'createdAt', $lastMonth)),
            'conversionRate' => self::percentage($converted, count($leads)),
            'articlesPublished' => $count($articles, fn (array $article) => ArticleVisibility::isLive($article, $now)),
            'articlesDraft' => $count($articles, fn (array $article) => $article['status'] === 'draft'),
            'viewsThisMonth' => count(self::inMonth($views, 'viewedAt', $thisMonth)),
            // An enquiry is a lead that names a listing: the other sources are
            // assistance requests, which belong to the funnel but not to a property.
            'enquiriesThisMonth' => $count($leadsThisMonth, fn (array $lead) => $lead['propertyId'] !== null),
            'subscribers' => $count($this->store->all('newsletterSubscribers'), fn (array $row) => $row['status'] === 'subscribed'),
        ];

        $trends = [
            'leadsByDay' => self::seriesByDay($leads, 'createdAt', $now, $days),
            'leadsBySource' => self::countBy($leads, 'source'),
            // Every status of the pipeline appears, including the ones nobody
            // is in: a funnel chart with a missing rung is a chart that lies.
            'leadsByStatus' => array_map(
                fn (string $status) => ['status' => $status, 'count' => $count($leads, fn (array $lead) => $lead['status'] === $status)],
                Contract::enumValues('LEAD_STATUS'),
            ),
            'viewsByDay' => self::seriesByDay($views, 'viewedAt', $now, $days),
        ];

        [$followUps, $overdueCount] = $this->followUps($leads, $now);

        return [
            'stats' => $stats,
            'trends' => $trends,
            'recentLeads' => $this->recentLeads($leads),
            'topProperties' => self::topProperties($properties),
            'seoHealth' => $this->seoHealth(),
            'upcomingFollowUps' => $followUps,
            'overdueCount' => $overdueCount,
        ];
    }

    /** The ten newest leads; a deleted listing is still named, from the lead's snapshot. */
    private function recentLeads(array $leads): array
    {
        $embed = new Embed($this->store);
        usort($leads, fn (array $left, array $right) => Clock::ms($right['createdAt']) <=> Clock::ms($left['createdAt']));

        return array_map(fn (array $lead) => [
            'id' => $lead['id'],
            'name' => $lead['name'],
            'phone' => $lead['phone'],
            'source' => $lead['source'],
            'status' => $lead['status'],
            'propertyId' => $lead['propertyId'],
            'property' => $embed->leadProperty($lead),
            'createdAt' => $lead['createdAt'],
            'assignedTo' => $lead['assignedTo'],
        ], array_slice($leads, 0, self::RECENT_LEADS));
    }

    /**
     * The five listings with the most views, an enquiry counting as five.
     * `isActive` says whether the public page exists: the card links an
     * inactive listing to its form rather than to a 404.
     */
    private static function topProperties(array $properties): array
    {
        $score = fn (array $property) => ($property['viewCount'] ?? 0) + ($property['enquiryCount'] ?? 0) * self::ENQUIRY_WEIGHT;
        usort($properties, fn (array $left, array $right) => $score($right) <=> $score($left));

        return array_map(fn (array $property) => [
            'id' => $property['id'],
            'title' => $property['title'],
            'slug' => $property['slug'],
            'isActive' => $property['isActive'] === true,
            'viewCount' => $property['viewCount'] ?? 0,
            'enquiryCount' => $property['enquiryCount'] ?? 0,
        ], array_slice($properties, 0, self::TOP_PROPERTIES));
    }

    /**
     * The follow-ups that are due: every overdue one first, the longest
     * overdue at the top, then what falls due in the next two weeks — and how
     * many are overdue in all.
     *
     * @return array{0: array, 1: int}
     */
    private function followUps(array $leads, int $now): array
    {
        $horizon = $now + self::FOLLOW_UP_DAYS * self::DAY_MS;
        $dated = [];
        foreach ($leads as $lead) {
            $due = Clock::ms($lead['followUpAt']);
            if ($due !== null && ! in_array($lead['status'], self::CLOSED_STATUSES, true)) {
                $dated[] = ['lead' => $lead, 'due' => $due];
            }
        }
        $byDue = fn (array $left, array $right) => $left['due'] <=> $right['due'];
        $overdue = array_values(array_filter($dated, fn (array $entry) => $entry['due'] < $now));
        $upcoming = array_values(array_filter($dated, fn (array $entry) => $entry['due'] >= $now && $entry['due'] <= $horizon));
        usort($overdue, $byDue);
        usort($upcoming, $byDue);

        $rows = array_map(fn (array $entry) => [
            'id' => $entry['lead']['id'],
            'name' => $entry['lead']['name'],
            'followUpAt' => $entry['lead']['followUpAt'],
            'isOverdue' => $entry['due'] < $now,
            'status' => $entry['lead']['status'],
            'assignedTo' => $entry['lead']['assignedTo'],
            'assignedUser' => $entry['lead']['assignedTo'] === null ? null : ($this->store->find('adminUsers', $entry['lead']['assignedTo'])['name'] ?? null),
        ], array_slice([...$overdue, ...$upcoming], 0, self::FOLLOW_UPS));

        return [$rows, count($overdue)];
    }

    /**
     * How much of the site has been analysed, and how the analysed part
     * scored. A built-in page's head comes from the page-type templates, not
     * from its record, so it has no SEO of its own to count.
     */
    private function seoHealth(): array
    {
        $records = [];
        foreach (self::SEO_COLLECTIONS as $collection) {
            foreach ($this->store->all($collection) as $record) {
                if (($record['template'] ?? null) !== 'system') {
                    $records[] = Js::get($record, 'seo');
                }
            }
        }
        $scores = array_values(array_filter(array_map(fn (mixed $seo) => Js::get($seo, 'score'), $records), [Js::class, 'isNumber']));
        $band = fn (string $name) => count(array_filter($records, fn (mixed $seo) => (Js::get($seo, 'scoreBand') ?? 'none') === $name));
        $missing = fn (string $field) => count(array_filter($records, function (mixed $seo) use ($field) {
            $value = Js::get($seo, $field);

            return ! is_string($value) || Js::trim($value) === '';
        }));

        return [
            'averageScore' => $scores === [] ? 0 : Js::normaliseNumber(round(array_sum($scores) / count($scores) * 10) / 10),
            'good' => $band('good'),
            'ok' => $band('ok'),
            'poor' => $band('poor'),
            'missingFocusKeyword' => $missing('focusKeyword'),
            'missingMetaDescription' => $missing('description'),
        ];
    }

    /** The series window a `?range=` asks for, or the default when it names none. */
    private static function trendDays(mixed $range): int
    {
        $days = Js::toNumber($range ?? 'NaN');

        return $days !== null && in_array($days, self::TREND_RANGES) ? (int) $days : self::TREND_DAYS;
    }

    /**
     * `[{ date, count }]` over the last `days` IST days, oldest first and
     * ending today — a day with nothing is there with 0, or the chart draws a
     * straight line across it.
     */
    private static function seriesByDay(array $records, string $field, int $now, int $days): array
    {
        $counts = [];
        foreach ($records as $record) {
            $day = Ist::day($record[$field] ?? null);
            if ($day !== null) {
                $counts[$day] = ($counts[$day] ?? 0) + 1;
            }
        }
        $end = Ist::clock($now)->startOfDay();
        $series = [];
        for ($back = $days - 1; $back >= 0; $back--) {
            $date = $end->subDays($back)->format('Y-m-d');
            $series[] = ['date' => $date, 'count' => $counts[$date] ?? 0];
        }

        return $series;
    }

    /** `[{ source, count }]` — one entry per value that occurs, biggest first, ties in the order they came. */
    private static function countBy(array $records, string $field): array
    {
        $counts = [];
        foreach ($records as $record) {
            $value = $record[$field] ?? null;
            if ($value !== null) {
                $key = Js::string($value);
                $counts[$key] ??= [$field => $value, 'count' => 0];
                $counts[$key]['count']++;
            }
        }
        $rows = array_values($counts);
        usort($rows, fn (array $left, array $right) => $right['count'] <=> $left['count']);

        return $rows;
    }

    /** The records whose `field` falls in an IST month (`yyyy-mm`). */
    private static function inMonth(array $records, string $field, string $month): array
    {
        return array_values(array_filter($records, fn (array $record) => substr((string) Ist::day($record[$field] ?? null), 0, 7) === $month));
    }

    /** A percentage with one decimal, and 0 rather than NaN for an empty set. */
    private static function percentage(int $part, int $whole): int|float
    {
        return $whole === 0 ? 0 : Js::normaliseNumber(round($part / $whole * 1000) / 10);
    }
}
