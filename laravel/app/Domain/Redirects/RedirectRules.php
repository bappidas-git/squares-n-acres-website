<?php

namespace App\Domain\Redirects;

use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;

/**
 * The redirect table's rules (05_BUSINESS_RULES.md → "Redirects";
 * 06_SEO_SITEMAP_ROBOTS.md → "Redirects").
 *
 * On a single-page application a redirect is a client-side `<Navigate
 * replace>` (D30): the site loads the public list once and matches paths in
 * the browser. Four rules keep the table from looping a browser, and all four
 * answer 422 rather than storing something that would:
 *
 *  - `fromPath` starts with `/` and is unique;
 *  - `toPath` is not empty;
 *  - a rule may not point at itself;
 *  - a rule may not point at the `fromPath` of another **active** rule — the
 *    chain a crawler reports as a redirect loop.
 */
final class RedirectRules
{
    /** The public row: what the site matches on, and the id it reports a followed rule by. */
    public const PUBLIC_FIELDS = ['id', 'fromPath', 'toPath', 'statusCode'];

    /** The columns of `GET /admin/redirects/export`, in order. */
    public const CSV_COLUMNS = [
        ['key' => 'fromPath', 'label' => 'From'],
        ['key' => 'toPath', 'label' => 'To'],
        ['key' => 'statusCode', 'label' => 'Status'],
        ['key' => 'isActive', 'label' => 'Active'],
        ['key' => 'hits', 'label' => 'Hits'],
        ['key' => 'note', 'label' => 'Note'],
    ];

    /** A path compares without its query string and without a trailing slash. */
    public static function normalizePath(mixed $value): string
    {
        $text = Js::trim($value === null ? '' : Js::string($value));
        if ($text === '') {
            return '';
        }
        $path = explode('#', explode('?', $text, 2)[0], 2)[0];

        return strlen($path) > 1 ? (string) preg_replace('~/+\z~', '', $path) : $path;
    }

    /**
     * A write's body before the schema checks: both paths normalised, then
     * the four rules checked against the table the write would produce.
     */
    public static function prepare(array $body, array $rows, ?array $existing): array
    {
        foreach (['fromPath', 'toPath'] as $field) {
            if (is_string($body[$field] ?? null)) {
                $body[$field] = self::normalizePath($body[$field]);
            }
        }
        self::validate($body, $rows, $existing);

        return $body;
    }

    /**
     * The four rules; a path the body leaves out is the stored rule's. A
     * target that is another rule's source is only a chain while that rule is
     * active.
     *
     * @param  array<int, array>  $rows  the stored redirects
     * @param  array|null  $existing  the rule being updated
     *
     * @throws ApiException 422
     */
    public static function validate(array $body, array $rows, ?array $existing): void
    {
        $errors = [];
        $other = fn (array $row) => $existing === null || Js::string($row['id'] ?? null) !== Js::string($existing['id']);
        $fromPath = array_key_exists('fromPath', $body) ? self::normalizePath($body['fromPath']) : ($existing['fromPath'] ?? null);
        $toPath = array_key_exists('toPath', $body) ? self::normalizePath($body['toPath']) : ($existing['toPath'] ?? null);

        if ($fromPath !== null) {
            if (! str_starts_with($fromPath, '/')) {
                $errors['fromPath'] = 'The from path must start with a slash.';
            } elseif (array_filter($rows, fn (array $row) => $other($row) && self::normalizePath($row['fromPath'] ?? null) === $fromPath) !== []) {
                $errors['fromPath'] = 'A redirect for this path already exists.';
            }
        }

        if ($toPath === '') {
            $errors['toPath'] = 'The to path field is required.';
        }
        if (! in_array($fromPath, [null, ''], true) && ! in_array($toPath, [null, ''], true) && $fromPath === $toPath) {
            $errors['toPath'] = 'A redirect cannot point at itself.';
        }

        if (! isset($errors['toPath']) && ! in_array($toPath, [null, ''], true)) {
            foreach ($rows as $row) {
                if (($row['isActive'] ?? null) !== false && $other($row) && self::normalizePath($row['fromPath'] ?? null) === $toPath) {
                    $errors['toPath'] = 'This target is itself redirected to '.Js::string($row['toPath'] ?? null).'.';
                    break;
                }
            }
        }

        if ($errors !== []) {
            ApiLog::info('redirects', 'Refused with 422', ['errors' => $errors]);

            throw ApiException::validation($errors);
        }
    }

    /**
     * The export's rows (prompt 51): the list's own `isActive` (`true` or
     * `false`) and `q` over `fromPath`, `toPath` and `note`, so an export
     * pressed over "Inactive" or a search carries what the screen shows.
     */
    public static function exportRows(array $rows, ?string $isActive, string $q): array
    {
        return array_values(array_filter($rows, function (array $row) use ($isActive, $q) {
            $active = (bool) ($row['isActive'] ?? false);
            if (($isActive === 'true' && ! $active) || ($isActive === 'false' && $active)) {
                return false;
            }
            if ($q === '') {
                return true;
            }
            foreach (['fromPath', 'toPath', 'note'] as $field) {
                $value = $row[$field] ?? null;
                if (str_contains(Js::lower($value === null ? '' : Js::string($value)), $q)) {
                    return true;
                }
            }

            return false;
        }));
    }
}
