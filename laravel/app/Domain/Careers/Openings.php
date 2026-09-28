<?php

namespace App\Domain\Careers;

use App\Contract\Contract;
use App\Crud\Usage;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\QueryParams;
use App\Support\Query\Sorter;
use App\Support\Text\Html;
use App\Support\Time\Ist;

/**
 * Job openings as the careers page reads them (01_API_CONTRACT.md §5.14;
 * the mock's `routes/jobs.js`).
 *
 * "Open" is two conditions, not one: the opening is active **and** it has not
 * closed. A role whose `closesAt` has passed disappears from the list and
 * refuses applications with "This opening is closed." — the honest answer to
 * somebody who followed a link from a job board three weeks late — while its
 * page stays readable, saying it is closed rather than answering 404.
 */
final class Openings
{
    /** What a closed opening answers, whichever way it is reached. */
    public const CLOSED_MESSAGE = 'This opening is closed.';

    /** The articles API's sentence for markup that would run (QA-55). */
    public const UNSAFE_DESCRIPTION = 'The text may not carry a script, an inline event handler or a javascript: link.';

    public function __construct(private DocumentStore $store) {}

    /**
     * Whether an opening still takes applications. `closesAt` is a date, and
     * the day it names is the last day the role is open — that day in
     * Bengaluru (D22): Greenwich's day ends at 05:30 IST, and an opening that
     * closed on the 30th took applications until breakfast on the 1st (QA-61).
     */
    public static function isOpen(?array $job, ?string $today = null): bool
    {
        if ($job === null || ! ($job['isActive'] ?? false)) {
            return false;
        }
        $closesAt = $job['closesAt'] ?? null;
        if ($closesAt === null || $closesAt === '' || $closesAt === false) {
            return true;
        }
        $last = substr(Js::string($closesAt), 0, 10);
        if (! preg_match('/^\d{4}-\d{2}-\d{2}\z/', $last)) {
            return true;
        }

        return strcmp($today ?? Ist::today(), $last) <= 0;
    }

    /**
     * The rule of a description the schema cannot state (QA-61): it has words
     * once its markup is stripped — an emptied bullet was stored, and the page
     * printed "About the role" over nothing — and it runs nothing. A `PATCH`
     * is asked only about the fields it sends.
     */
    public static function check(array $record, array $ctx): array
    {
        if ($ctx['method'] === 'PATCH' && ! array_key_exists('description', $ctx['body'] ?? [])) {
            return $record;
        }
        $html = $record['description'] ?? null;
        if (! is_string($html) || Js::trim($html) === '') {
            return $record;
        }
        $refusal = match (true) {
            Html::unsafe($html) => self::UNSAFE_DESCRIPTION,
            Html::strip($html) === '' => 'The description field is required.',
            default => null,
        };
        if ($refusal !== null) {
            ApiLog::info('careers', "Opening description refused: {$refusal}", ['id' => $record['id'] ?? null]);

            throw ApiException::validation(['description' => $refusal]);
        }

        return $record;
    }

    /** How many applications name an opening — the admin list's column. */
    public function applicationCount(mixed $jobId): int
    {
        return count(array_filter(
            $this->store->all('jobApplications'),
            fn (array $application) => Usage::sameId($application['jobId'] ?? null, $jobId),
        ));
    }

    /**
     * `GET /jobs`: the open roles, newest first, filtered by `department`
     * (exact) and `q` (title, department, location); `perPage` up to 100.
     *
     * @return array{0: array, 1: array} the page and its meta
     */
    public function publicList(QueryParams $query): array
    {
        $department = $query->first('department');
        $q = $query->first('q') ?? '';

        $matching = array_values(array_filter(
            $this->store->all('jobOpenings'),
            fn (array $job) => self::isOpen($job)
                && ($department === null || $department === '' || ($job['department'] ?? null) === $department)
                && Filters::matchesQ($job, ['title', 'department', 'location'], $q),
        ));

        [$page, $meta] = Paginator::paginate(
            Sorter::sort($matching, 'postedAt', 'desc'),
            $query->first('page'),
            Paginator::positiveInt($query->first('perPage'), Paginator::DEFAULT_PER_PAGE_PUBLIC),
        );

        return [array_map([self::class, 'publicView'], $page), $meta];
    }

    /**
     * `GET /jobs/slug/{slug}`: an active opening, open or not, with `isOpen`
     * so a bookmarked link can say the role has closed.
     */
    public function bySlug(string $slug): array
    {
        foreach ($this->store->all('jobOpenings') as $job) {
            if (($job['slug'] ?? null) === $slug && ($job['isActive'] ?? false)) {
                return [...self::publicView($job), 'isOpen' => self::isOpen($job)];
            }
        }

        throw ApiException::notFound();
    }

    /** An opening as a visitor reads it: who posted and who edited it stay in the panel. */
    public static function publicView(array $job): array
    {
        return array_diff_key($job, array_flip(Contract::model('jobOpenings')['publicOmit'] ?? []));
    }

    /** The opening an application names, by id as the path spells it; 404 when there is none. */
    public function find(string $id): array
    {
        foreach ($this->store->all('jobOpenings') as $job) {
            if (Usage::sameId($job['id'] ?? null, $id)) {
                return $job;
            }
        }

        throw ApiException::notFound();
    }
}
