<?php

namespace App\Domain\Leads;

use App\Support\Js;
use App\Support\Time\Clock;

/**
 * Lead phone numbers and the duplicate flag (05_BUSINESS_RULES.md → "Leads":
 * "Phone numbers", "`isPossibleDuplicate`"), a port of the phone half of
 * `mock-server/lib/leadFilters.js`.
 *
 * The forms send `+91 98765 43210`, `09876543210` and `9876543210`, and a CRM
 * that stores all three cannot tell that they are one person — so an Indian
 * mobile is stored as `+91` and its ten digits, and every comparison between
 * two leads goes through the same key.
 */
final class LeadPhone
{
    /** How far apart two enquiries from one number may be and still be "the same". */
    private const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

    /**
     * The ten digits of an Indian mobile number, however it was typed, or null.
     *
     * The country code is taken off only when it **is** one — twelve digits
     * starting 91 — and the trunk zero only from eleven: stripping a leading
     * `91` from any number mangled every ten-digit mobile of the 91xxx series.
     */
    public static function localDigits(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $digits = (string) preg_replace('/^\+/', '', (string) preg_replace('/['.Js::SPACE.'()-]/u', '', $value));
        if (Js::length($digits) === 12 && str_starts_with($digits, '91')) {
            $digits = substr($digits, 2);
        } elseif (Js::length($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return preg_match('/^[6-9]\d{9}$/D', $digits) === 1 ? $digits : null;
    }

    /** An Indian mobile number in one shape, `+919876543210`, or null when it is not one. */
    public static function normalise(mixed $value): ?string
    {
        $local = self::localDigits($value);

        return $local === null ? null : "+91{$local}";
    }

    /**
     * The key two leads are compared on. A number the Indian rule does not
     * recognise — a landline, a number from abroad — still identifies a
     * person, so it is compared on its digits rather than dropped; `''` when
     * there is nothing to compare.
     */
    public static function key(mixed $value): string
    {
        $canonical = self::normalise($value);
        if ($canonical !== null) {
            return $canonical;
        }

        return is_string($value) ? (string) preg_replace('/\D/', '', $value) : '';
    }

    /**
     * Every lead by its phone key, so the flag costs one pass over the
     * collection rather than one scan per row. Built from **all** leads, not
     * the ones in scope: whether a caller has enquired before is a fact about
     * the caller, and a sales user who cannot see the other enquiry is exactly
     * who needs telling that it exists.
     *
     * @return array<string, array<int, array{id: mixed, at: ?int}>>
     */
    public static function duplicateIndex(array $leads): array
    {
        $index = [];
        foreach ($leads as $lead) {
            $key = self::key($lead['phone'] ?? null);
            if ($key !== '') {
                $index[$key][] = ['id' => $lead['id'] ?? null, 'at' => Clock::ms($lead['createdAt'] ?? null)];
            }
        }

        return $index;
    }

    /**
     * Whether another lead carries the same number within thirty days of this
     * one — measured between the two leads rather than from today, so the
     * answer for a pair never changes as the calendar moves on.
     */
    public static function isPossibleDuplicate(array $lead, array $index): bool
    {
        $key = self::key($lead['phone'] ?? null);
        $bucket = $key === '' ? [] : ($index[$key] ?? []);
        $at = Clock::ms($lead['createdAt'] ?? null);
        if (count($bucket) < 2 || $at === null) {
            return false;
        }

        foreach ($bucket as $entry) {
            if (Js::string($entry['id']) !== Js::string($lead['id'] ?? null)
                && $entry['at'] !== null
                && abs($entry['at'] - $at) <= self::DUPLICATE_WINDOW_MS) {
                return true;
            }
        }

        return false;
    }
}
