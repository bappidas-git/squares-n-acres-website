<?php

namespace App\Support\Time;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use DateTimeZone;
use Throwable;

/**
 * Instants as the contract writes them (01_API_CONTRACT.md §5.5): UTC,
 * ISO-8601 with milliseconds — `2026-01-15T09:30:00.000Z` — exactly what
 * JavaScript's `Date.prototype.toISOString()` prints.
 *
 * Storage is `DATETIME(3)` in UTC (`Y-m-d H:i:s.v`); the conversion between
 * the two happens here and nowhere else.
 */
final class Clock
{
    public const STORAGE_FORMAT = 'Y-m-d H:i:s.v';

    public const ISO_FORMAT = 'Y-m-d\TH:i:s.v\Z';

    private static ?CarbonImmutable $frozen = null;

    public static function now(): CarbonImmutable
    {
        return self::$frozen ?? CarbonImmutable::now('UTC');
    }

    /** `new Date().toISOString()`. */
    public static function nowIso(): string
    {
        return self::iso(self::now());
    }

    /** Freezes the clock (tests); `null` releases it. */
    public static function freeze(?CarbonImmutable $at): void
    {
        self::$frozen = $at?->setTimezone('UTC');
    }

    /**
     * `Date.parse(value)` as an instant, or null when it cannot be read.
     * A number is milliseconds since the epoch.
     */
    public static function parse(mixed $value): ?CarbonImmutable
    {
        if ($value instanceof DateTimeInterface) {
            return CarbonImmutable::instance($value)->setTimezone('UTC');
        }
        if (is_int($value) || is_float($value)) {
            return is_finite((float) $value) ? CarbonImmutable::createFromTimestampMs((int) $value, 'UTC') : null;
        }
        if (! is_string($value)) {
            return null;
        }
        $text = trim($value);
        if ($text === '' || ! preg_match('/\d/', $text)) {
            return null;
        }
        try {
            // A date alone is midnight UTC, as it is for Date.parse.
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $text)) {
                $date = CarbonImmutable::createFromFormat('!Y-m-d', $text, new DateTimeZone('UTC'));

                return $date && $date->format('Y-m-d') === $text ? $date : null;
            }

            return CarbonImmutable::parse($text, 'UTC')->setTimezone('UTC');
        } catch (Throwable) {
            return null;
        }
    }

    /** Whether `Date.parse(value)` is a number. */
    public static function isValid(mixed $value): bool
    {
        return self::parse($value) !== null;
    }

    /**
     * Whether a `DATETIME(3)` column can hold the instant. `Date.parse` reads
     * years far beyond MySQL's 0000–9999 (`+010000-01-01T00:00:00Z`), and
     * such a value would fail the write.
     */
    public static function isStorable(mixed $value): bool
    {
        $year = self::parse($value)?->year;

        return $year !== null && $year >= 0 && $year <= 9999;
    }

    /** An instant as the contract writes it; null stays null. */
    public static function iso(mixed $value): ?string
    {
        $instant = self::parse($value);

        return $instant?->setTimezone('UTC')->format(self::ISO_FORMAT);
    }

    /** An instant as a `DATETIME(3)` column stores it. */
    public static function storage(mixed $value): ?string
    {
        return self::parse($value)?->format(self::STORAGE_FORMAT);
    }

    /** A `DATETIME(3)` value (UTC) as the contract writes it. */
    public static function fromStorage(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            return CarbonImmutable::parse($value, 'UTC')->format(self::ISO_FORMAT);
        } catch (Throwable) {
            return null;
        }
    }

    /** Milliseconds since the epoch, or null. */
    public static function ms(mixed $value): ?int
    {
        $instant = self::parse($value);

        return $instant === null ? null : (int) $instant->getTimestampMs();
    }
}
