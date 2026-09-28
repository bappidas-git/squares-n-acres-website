<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\QueryParams;
use App\Support\Time\Clock;
use App\Support\Time\Ist;

/**
 * The CRM list's filters, follow-up worklist and sorting (05_BUSINESS_RULES.md
 * → "Leads": "The follow-up worklist", "Sorting and searching the CRM",
 * "Dates are Indian days"), a port of `mock-server/lib/leadFilters.js`.
 *
 * The list and its CSV export both call these, after the sales scope
 * (App\Domain\Leads\LeadScope), so the file a user downloads holds exactly
 * the rows on their screen. `from`/`to` compare the **IST** day of
 * `createdAt`: a lead that arrived at 01:30 on the 14th is found by "created
 * on the 14th".
 */
final class LeadFilters
{
    /** The statuses a follow-up can no longer be late for. */
    public const CLOSED_STATUSES = ['converted', 'lost'];

    /** The columns the lead table sorts by. */
    public const SORTABLE = ['createdAt', 'updatedAt', 'followUpAt', 'status', 'priority'];

    private const DAY_MS = 24 * 60 * 60 * 1000;

    /** How far ahead "due in the next 7 days" looks. */
    private const NEXT_DAYS = 7;

    /** The fields `q` is looked for in, as typed. */
    private const SEARCH_FIELDS = ['name', 'email', 'phone', 'message'];

    /** The shortest run of digits worth comparing as part of a number. */
    private const PHONE_QUERY_MIN_DIGITS = 4;

    /** Whether a lead is still being worked: not converted and not lost. */
    public static function isOpen(array $lead): bool
    {
        return ! in_array($lead['status'] ?? null, self::CLOSED_STATUSES, true);
    }

    /** "Now" as the filters count it, in milliseconds. */
    public static function now(): int
    {
        return (int) Clock::ms(Clock::now());
    }

    /**
     * Which follow-up bucket an open lead is in, as of `now`: `overdue` (the
     * time has passed), `today` (due later today, IST), `next7` (due within
     * seven days, today's included) and `none` (no next step at all). A
     * closed lead is in none of them; `overdue`, `today` and `none` never
     * overlap, which is what lets the worklist chips add up.
     */
    public static function matchesFollowUp(array $lead, string $bucket, int $now): bool
    {
        if (! self::isOpen($lead)) {
            return false;
        }
        $due = Clock::ms($lead['followUpAt'] ?? null);

        return match (true) {
            $bucket === 'none' => $due === null,
            $due === null => false,
            $bucket === 'overdue' => $due < $now,
            $bucket === 'today' => $due >= $now && Ist::day($due) === Ist::day($now),
            $bucket === 'next7' => $due >= $now && $due <= $now + self::NEXT_DAYS * self::DAY_MS,
            default => true,
        };
    }

    /**
     * `meta.followUp` of the lead list: how many open leads of the view are in
     * each bucket, in the order of `LEAD_FOLLOW_UP`.
     *
     * @return array<string, int>
     */
    public static function followUpCounts(array $leads, int $now): array
    {
        $counts = [];
        foreach (Contract::enumValues('LEAD_FOLLOW_UP') as $bucket) {
            $counts[$bucket] = count(array_filter($leads, fn (array $lead) => self::matchesFollowUp($lead, $bucket, $now)));
        }

        return $counts;
    }

    /** Whether an open lead has gone `days` days without a change. */
    public static function isIdleFor(array $lead, int $days, int $now): bool
    {
        if (! self::isOpen($lead)) {
            return false;
        }
        $touched = Clock::ms($lead['updatedAt'] ?? $lead['createdAt'] ?? null);

        return $touched !== null && $now - $touched >= $days * self::DAY_MS;
    }

    /**
     * Every filter of the admin lead list: `followUp`, `idleDays`, `status`,
     * `source`, `priority`, `propertyId` (comma lists), `assignedTo` (an id,
     * `me` or `unassigned`), `consent`, `from`/`to` and `q`. An unknown
     * follow-up bucket filters nothing, as an unknown parameter does.
     *
     * @param  array  $leads  the leads in scope
     * @param  array|null  $user  the signed-in user, for `assignedTo=me`
     */
    public static function apply(array $leads, QueryParams $query, ?array $user, ?int $now = null): array
    {
        $now ??= self::now();
        $lists = [];
        foreach (['status', 'source', 'priority', 'propertyId'] as $name) {
            $lists[$name] = Filters::csv($query->get($name));
        }
        $from = self::filled($query->first('from')) ? mb_substr($query->first('from'), 0, 10) : null;
        $to = self::filled($query->first('to')) ? mb_substr($query->first('to'), 0, 10) : null;
        $q = $query->first('q');
        $followUp = in_array((string) $query->first('followUp'), Contract::enumValues('LEAD_FOLLOW_UP'), true)
            ? (string) $query->first('followUp')
            : null;
        $idle = Js::parseInt($query->first('idleDays'));
        $idleDays = $idle !== null && $idle > 0 ? $idle : null;
        $assignee = $query->first('assignedTo');
        $consent = Filters::bool($query->get('consent'));

        return array_values(array_filter($leads, function (array $lead) use ($lists, $from, $to, $q, $followUp, $idleDays, $assignee, $consent, $user, $now) {
            if ($followUp !== null && ! self::matchesFollowUp($lead, $followUp, $now)) {
                return false;
            }
            if ($idleDays !== null && ! self::isIdleFor($lead, $idleDays, $now)) {
                return false;
            }
            foreach ($lists as $field => $wanted) {
                if ($wanted !== [] && ! in_array(Js::string($lead[$field] ?? null), $wanted, true)) {
                    return false;
                }
            }
            if (self::filled($assignee) && ! self::matchesAssignee($lead, $assignee, $user)) {
                return false;
            }
            if ($consent !== null && (bool) ($lead['consent'] ?? false) !== $consent) {
                return false;
            }
            if ($from !== null || $to !== null) {
                $created = Ist::day($lead['createdAt'] ?? null);
                if ($created === null || ($from !== null && strcmp($created, $from) < 0) || ($to !== null && strcmp($created, $to) > 0)) {
                    return false;
                }
            }

            return ! self::filled($q) || self::matchesQuery($lead, $q);
        }));
    }

    /**
     * Sorts the lead list; the default is newest first. A status sorts along
     * the funnel and a priority from low to high — the enum's order, never the
     * words'. Rows that tie stay newest first, then the higher id, so a page
     * boundary falls in the same place on every request.
     */
    public static function sort(array $leads, ?string $sort, ?string $order): array
    {
        $field = in_array((string) $sort, self::SORTABLE, true) ? (string) $sort : 'createdAt';
        $requested = Js::lower((string) $order);
        // Only an explicit `order` overrides the default direction of the column.
        $direction = in_array($requested, ['asc', 'desc'], true) ? $requested : 'desc';

        usort($leads, function (array $a, array $b) use ($field, $direction) {
            $left = self::sortValue($a, $field);
            $right = self::sortValue($b, $field);
            if ($left === null || $right === null) {
                return $left === $right ? self::newestFirst($a, $b) : ($left === null ? 1 : -1);
            }

            return ($direction === 'desc' ? $right <=> $left : $left <=> $right) ?: self::newestFirst($a, $b);
        });

        return $leads;
    }

    /** The value a lead sorts by, as a number: its rank in the enum, or the moment; null sorts last. */
    private static function sortValue(array $lead, string $field): ?int
    {
        if ($field === 'status' || $field === 'priority') {
            $rank = array_search($lead[$field] ?? null, Contract::enumValues($field === 'status' ? 'LEAD_STATUS' : 'LEAD_PRIORITY'), true);

            return $rank === false ? null : $rank;
        }

        return Clock::ms($lead[$field] ?? null);
    }

    /** Newest first, then the higher id: the order two equal rows keep. */
    private static function newestFirst(array $a, array $b): int
    {
        return (Clock::ms($b['createdAt'] ?? null) ?? 0) <=> (Clock::ms($a['createdAt'] ?? null) ?? 0)
            ?: (int) (Js::toNumber($b['id'] ?? null) ?? 0) <=> (int) (Js::toNumber($a['id'] ?? null) ?? 0);
    }

    /** `assignedTo` takes an id or one of the two words of the table's quick tabs. */
    private static function matchesAssignee(array $lead, string $wanted, ?array $user): bool
    {
        return match ($wanted) {
            'unassigned' => ($lead['assignedTo'] ?? null) === null,
            'me' => Js::string($lead['assignedTo'] ?? null) === Js::string($user['id'] ?? null),
            default => Js::string($lead['assignedTo'] ?? null) === $wanted,
        };
    }

    /**
     * Whether `q` finds the lead: the text match first — name, e-mail, phone
     * and message, as typed — then, for a query that is a phone number, the
     * digits alone: the desk types `98765 43210`, `+91 98765 43210` or
     * `098765 43210`, and the record holds `9876543210` or `+919876543210`,
     * none of which is a substring of the other.
     */
    private static function matchesQuery(array $lead, string $q): bool
    {
        if (Filters::matchesQ($lead, self::SEARCH_FIELDS, $q)) {
            return true;
        }
        $text = Js::trim($q);
        if (preg_match('/^[\d'.Js::SPACE.'()+.-]+$/uD', $text) !== 1) {
            return false;
        }
        $wanted = LeadPhone::localDigits($text) ?? (string) preg_replace('/\D/', '', $text);
        if (strlen($wanted) < self::PHONE_QUERY_MIN_DIGITS) {
            return false;
        }
        $stored = is_string($lead['phone'] ?? null) ? $lead['phone'] : '';
        $have = LeadPhone::localDigits($stored) ?? (string) preg_replace('/\D/', '', $stored);

        return str_contains($have, $wanted);
    }

    private static function filled(?string $value): bool
    {
        return $value !== null && $value !== '';
    }
}
