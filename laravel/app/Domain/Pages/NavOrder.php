<?php

namespace App\Domain\Pages;

use App\Support\Js;
use Collator;

/**
 * The order the site's navigation reads in (05_BUSINESS_RULES.md → "Header
 * menus", "Ordering"): by `order`, then by the label a visitor reads — a
 * page's title, a menu's name — compared the way the browser's plain
 * `localeCompare` does (case and accents count, digits are text), which is
 * not the admin tables' collation.
 */
final class NavOrder
{
    private static ?Collator $collator = null;

    /**
     * @param  array<int, array>  $items
     * @return array<int, array>
     */
    public static function sort(array $items, string $label): array
    {
        $items = array_values($items);
        usort($items, fn (array $left, array $right) => (($left['order'] ?? 0) <=> ($right['order'] ?? 0))
            ?: (self::collator()->compare(Js::string($left[$label] ?? ''), Js::string($right[$label] ?? '')) <=> 0));

        return $items;
    }

    private static function collator(): Collator
    {
        return self::$collator ??= new Collator('en');
    }
}
