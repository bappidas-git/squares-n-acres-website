<?php

namespace App\Support\Time;

use Carbon\CarbonImmutable;

/**
 * India Standard Time, for everything the API answers in calendar terms: the
 * lead date filters, the dashboard's days, "today" of the follow-up worklist,
 * a job's closing day, the 404 log's days, the sentences of a lead's timeline.
 *
 * IST is UTC+05:30 all year, so a fixed offset is the whole timezone; nothing
 * here depends on the machine's timezone database.
 */
final class Ist
{
    public const OFFSET_SECONDS = 19800;

    private const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /** The instant moved on by the offset, so that its UTC fields read the IST wall clock. */
    public static function clock(mixed $value): ?CarbonImmutable
    {
        return Clock::parse($value)?->addSeconds(self::OFFSET_SECONDS);
    }

    /** `2026-09-14` — the IST calendar day of an instant. */
    public static function day(mixed $value): ?string
    {
        return self::clock($value)?->format('Y-m-d');
    }

    /** `2026-09-14 01:30` — the IST date and time, as a spreadsheet reads it. */
    public static function dateTime(mixed $value): ?string
    {
        return self::clock($value)?->format('Y-m-d H:i');
    }

    /** `14 Sep 2026`. */
    public static function formatDate(mixed $value): string
    {
        $clock = self::clock($value);
        if ($clock === null) {
            return '';
        }

        return sprintf('%02d %s %d', $clock->day, self::MONTHS[$clock->month - 1], $clock->year);
    }

    /** `14 Sep 2026, 01:30 am`. */
    public static function formatDateTime(mixed $value): string
    {
        $clock = self::clock($value);
        if ($clock === null) {
            return '';
        }
        $hours = $clock->hour;
        $hour12 = $hours % 12 === 0 ? 12 : $hours % 12;

        return sprintf('%s, %02d:%02d %s', self::formatDate($value), $hour12, $clock->minute, $hours < 12 ? 'am' : 'pm');
    }

    /** Today's IST day. */
    public static function today(): string
    {
        return (string) self::day(Clock::now());
    }

    /**
     * The UTC instant an IST day starts at: `2026-09-14` → `2026-09-13T18:30:00.000Z`.
     */
    public static function startOfDay(string $day): ?CarbonImmutable
    {
        $start = Clock::parse($day);

        return $start?->subSeconds(self::OFFSET_SECONDS);
    }

    /** `day + n` days, as a day. */
    public static function addDays(string $day, int $days): string
    {
        return (string) Clock::parse($day)?->addDays($days)->format('Y-m-d');
    }
}
