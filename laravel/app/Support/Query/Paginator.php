<?php

namespace App\Support\Query;

use App\Support\Js;

/**
 * Pagination (§5.2, §5.6). Every list carries `meta`, including the ones that
 * are not paginated: those report `page: 1`, `perPage: total`,
 * `totalPages: 1`. `totalPages` is 0 for an empty paginated list.
 */
final class Paginator
{
    public const DEFAULT_PER_PAGE_PUBLIC = 12;

    public const DEFAULT_PER_PAGE_ADMIN = 20;

    public const MAX_PER_PAGE = 100;

    /** A positive integer from a query value, or the fallback. */
    public static function positiveInt(mixed $value, ?int $fallback): ?int
    {
        $parsed = Js::parseInt($value);

        return $parsed !== null && $parsed > 0 ? $parsed : $fallback;
    }

    /**
     * @return array{page: int, perPage: int, total: int, totalPages: int}
     */
    public static function meta(int $total, ?int $perPage = null, int $page = 1): array
    {
        if ($perPage === null) {
            return ['page' => 1, 'perPage' => $total, 'total' => $total, 'totalPages' => 1];
        }

        return [
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'totalPages' => $total === 0 ? 0 : (int) ceil($total / $perPage),
        ];
    }

    /**
     * Slices every row the filters matched and describes the slice. A null
     * `perPage` (or `'all'`) answers every row.
     *
     * @return array{0: array, 1: array}
     */
    public static function paginate(array $items, mixed $page = null, mixed $perPage = null): array
    {
        $items = array_values($items);
        $total = count($items);
        if ($perPage === null || $perPage === 'all') {
            return [$items, self::meta($total)];
        }

        $size = min(self::positiveInt($perPage, self::DEFAULT_PER_PAGE_PUBLIC), self::MAX_PER_PAGE);
        $current = self::positiveInt($page, 1);

        return [array_slice($items, ($current - 1) * $size, $size), self::meta($total, $size, $current)];
    }

    /**
     * The page size a list asks for: `perPage=all` only on the admin routes,
     * the admin default 20, the public default 12.
     */
    public static function pageSize(QueryParams $query, bool $admin, ?int $publicDefault = null): ?int
    {
        if ($admin && $query->first('perPage') === 'all') {
            return null;
        }

        return self::positiveInt(
            $query->first('perPage'),
            $admin ? self::DEFAULT_PER_PAGE_ADMIN : ($publicDefault ?? self::DEFAULT_PER_PAGE_PUBLIC),
        );
    }
}
