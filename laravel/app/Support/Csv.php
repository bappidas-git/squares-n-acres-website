<?php

namespace App\Support;

use App\Support\Json\JsonValue;
use App\Support\Query\Sorter;
use Illuminate\Http\Response;

/**
 * CSV exports — leads, newsletter subscribers, redirects
 * (05_BUSINESS_RULES.md → "CSV export").
 *
 * Every document starts with a UTF-8 byte-order mark (Excel reads UTF-8 as
 * the legacy code page without one, and the rupee sign turns to mojibake),
 * lines end CRLF, and a cell a spreadsheet would evaluate — `=HYPERLINK(…)`
 * typed into a lead's message, a `+91…` number — is prefixed with an
 * apostrophe. A plain negative number is left alone.
 */
final class Csv
{
    public const BOM = "\u{FEFF}";

    /** One field: formula-safe, quoted when it must be (RFC 4180). */
    public static function cell(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (Js::isList($value)) {
            $text = implode('; ', array_map(fn ($entry) => $entry === null ? '' : Js::string($entry), $value));
        } elseif (is_array($value) || is_object($value)) {
            $text = JsonValue::encode($value);
        } else {
            $text = Js::string($value);
        }

        if (preg_match('/^[=+@\t\r-]/', $text) && ! preg_match('/^-?(\d+\.?\d*|\.\d+)$/', $text)) {
            $text = "'{$text}";
        }
        if (preg_match('/[",\r\n]/', $text) || $text !== Js::trim($text)) {
            return '"'.str_replace('"', '""', $text).'"';
        }

        return $text;
    }

    /**
     * Rows as a CSV document with a header line.
     *
     * @param  array<int, array{key: string, label?: string}|string>  $columns  dotted keys, in order
     */
    public static function render(array $rows, array $columns): string
    {
        $fields = array_map(
            fn ($column) => is_string($column) ? ['key' => $column, 'label' => $column] : $column + ['label' => $column['key']],
            $columns,
        );

        $lines = [implode(',', array_map(fn (array $field) => self::cell($field['label']), $fields))];
        foreach ($rows as $row) {
            $lines[] = implode(',', array_map(fn (array $field) => self::cell(Sorter::path($row, $field['key'])), $fields));
        }

        return self::BOM.implode("\r\n", $lines)."\r\n";
    }

    /** A CSV download. */
    public static function download(string $csv, string $filename): Response
    {
        return new Response($csv, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
