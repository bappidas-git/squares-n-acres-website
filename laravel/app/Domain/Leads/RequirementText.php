<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Js;

/**
 * A lead's requirement as one readable line — "Buy · Apartments · 3 BHK ·
 * Whitefield · ₹1.1 Cr – ₹1.4 Cr · 1–3 months" — in the words the lead's own
 * page prints rather than the stored values (05_BUSINESS_RULES.md → "CSV
 * export"). The CSV export's Requirement column and the lead alert e-mail
 * both print it.
 *
 * The money is formatted as `src/utils/format.js` does it: lakh and crore,
 * two decimals with the trailing zeros trimmed, the unit chosen **after**
 * rounding (₹99,99,999 is ₹1 Cr, not ₹100 L), and JavaScript's rounding —
 * the exact binary value, half up — so a cell reads the same from both APIs.
 */
final class RequirementText
{
    private const CRORE = 10000000;

    private const LAKH = 100000;

    /** What a formatter prints when it has nothing to print. */
    private const EMPTY = '—';

    public function __construct(private DocumentStore $store) {}

    /** The requirement's line; `''` when nothing was captured. */
    public function describe(mixed $requirement): string
    {
        $wanted = Js::entries($requirement);
        $listingType = $wanted['listingType'] ?? null;
        $budget = self::truthy($wanted['budgetMin'] ?? null) || self::truthy($wanted['budgetMax'] ?? null)
            ? self::priceRange($wanted['budgetMin'] ?? null, $wanted['budgetMax'] ?? null, $listingType)
            : null;

        $parts = [
            Contract::enumLabel('LISTING_TYPES', $listingType),
            $this->nameIn('propertyTypes', $wanted['propertyTypeId'] ?? null),
            Js::isNumber($wanted['bedrooms'] ?? null) ? self::bhk($wanted['bedrooms']) : null,
            $this->nameIn('localities', $wanted['localityId'] ?? null),
            $budget,
            Contract::enumLabel('REQUIREMENT_TIMELINES', $wanted['timeline'] ?? null),
        ];

        return implode(' · ', array_filter($parts, fn (?string $part) => $part !== null && $part !== ''));
    }

    /** `₹85 L – ₹1.2 Cr`; one value when only one end is known or both are equal. */
    public static function priceRange(mixed $min, mixed $max, ?string $listingType = null): string
    {
        $low = self::number($min);
        $high = self::number($max);
        if ($low === null || $high === null || $low == $high) {
            $single = $low ?? $high;

            return $single === null ? self::EMPTY : self::price($single, $listingType);
        }

        return self::price($low, $listingType).' – '.self::price($high, $listingType);
    }

    /** `₹1.42 Cr`, `₹85.5 L`, `₹45,000`; `/month` for a rent or a lease. */
    public static function price(int|float $value, ?string $listingType = null): string
    {
        $suffix = in_array($listingType, ['rent', 'lease'], true) ? '/month' : '';
        $abs = abs($value);
        $unit = match (true) {
            $abs >= self::CRORE => [self::CRORE, ' Cr'],
            $abs < self::LAKH => null,
            (float) self::toFixed($abs / self::LAKH, 2) >= 100 => [self::CRORE, ' Cr'],
            default => [self::LAKH, ' L'],
        };
        if ($unit !== null) {
            return '₹'.preg_replace('/\.?0+$/D', '', self::toFixed($value / $unit[0], 2)).$unit[1].$suffix;
        }

        return '₹'.self::grouped($value).$suffix;
    }

    /** `3 BHK`, `5+ BHK` above the highest bucket, `Studio` for 0. */
    public static function bhk(int|float $bedrooms): string
    {
        return match (true) {
            $bedrooms <= 0 => 'Studio',
            $bedrooms >= 5 => '5+ BHK',
            default => Js::number($bedrooms).' BHK',
        };
    }

    private function nameIn(string $collection, mixed $id): ?string
    {
        return $id === null ? null : ($this->store->find($collection, $id)['name'] ?? null);
    }

    /** The number a value stands for — a number, or a string that says one — else null. */
    private static function number(mixed $value): int|float|null
    {
        if (Js::isNumber($value)) {
            return $value;
        }
        if (! is_string($value) || Js::trim($value) === '') {
            return null;
        }
        $number = Js::toNumber($value);

        return $number !== null && is_finite((float) $number) ? $number : null;
    }

    /** JavaScript truthiness of a stored value. */
    private static function truthy(mixed $value): bool
    {
        return ! in_array($value, [null, false, '', 0, 0.0], true) && ! (is_float($value) && is_nan($value));
    }

    /** `toLocaleString('en-IN')` of an amount below a lakh: grouped digits, at most three decimals. */
    private static function grouped(int|float $value): string
    {
        [$whole, $fraction] = explode('.', self::toFixed(abs($value), 3));
        $fraction = rtrim($fraction, '0');
        // Indian grouping: the last three digits, then pairs.
        $head = substr($whole, 0, -3);
        $grouped = $head === '' ? $whole : strrev(rtrim(chunk_split(strrev($head), 2, ','), ',')).','.substr($whole, -3);
        $sign = $value < 0 && ($whole !== '0' || $fraction !== '') ? '-' : '';

        return $sign.$grouped.($fraction === '' ? '' : ".{$fraction}");
    }

    /**
     * `Number.prototype.toFixed`: the exact binary value rounded half up,
     * which neither `round()` (it pre-rounds: 1.005 → 1.01) nor `sprintf()`
     * (half even: 1.125 → 1.12) reproduces.
     */
    private static function toFixed(int|float $value, int $digits): string
    {
        if (abs($value) >= 1e21) {
            return Js::string($value);
        }
        [$whole, $fraction] = explode('.', sprintf('%.53F', abs((float) $value)));
        $kept = $whole.substr($fraction, 0, $digits);
        if (($fraction[$digits] ?? '0') >= '5') {
            for ($i = strlen($kept) - 1; $i >= 0 && $kept[$i] === '9'; $i--) {
                $kept[$i] = '0';
            }
            $kept = $i < 0 ? '1'.$kept : substr_replace($kept, (string) ((int) $kept[$i] + 1), $i, 1);
        }
        $integer = substr($kept, 0, strlen($kept) - $digits);

        return ($value < 0 ? '-' : '').($integer === '' ? '0' : $integer).($digits > 0 ? '.'.substr($kept, -$digits) : '');
    }
}
