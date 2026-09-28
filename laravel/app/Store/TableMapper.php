<?php

namespace App\Store;

use App\Contract\Contract;
use App\Support\Js;
use App\Support\Json\JsonValue;
use App\Support\Time\Clock;
use InvalidArgumentException;
use stdClass;

/**
 * One collection's mapping between the API's JSON document and its tables
 * (04_DATA_MODELS.md → "How a document store becomes a schema").
 *
 * The column ↔ path pairs come from resources/contract/tables.php — the
 * comments of `schema.sql` name them (`address` ↔ `location.address`,
 * `featured_image_url` ↔ `featuredImage.url`), every other column is its
 * field in snake_case. Nested arrays live in child tables (with the item's
 * own `id` in `local_id` and its place in `position`), id lists in pivots,
 * and everything else nested in JSON columns, kept exactly as sent.
 *
 * A document is built in the order the model descriptor lists its fields, so
 * a record reads the same from this API as from the mock.
 */
final class TableMapper
{
    /** @var array<string, self> */
    private static array $instances = [];

    public readonly array $model;

    public readonly array $main;

    /** @var array<string, array> field → child table */
    public readonly array $children;

    /** @var array<string, array> field → pivot table */
    public readonly array $pivots;

    /** The parent key of the child tables and pivots (`property_id`). */
    public readonly ?string $parentKey;

    public readonly bool $softDeletes;

    /** @var array<int, array> the document's layout, in field order */
    private array $layout;

    private function __construct(public readonly string $collection)
    {
        $this->model = Contract::model($collection);

        $main = null;
        $children = [];
        $pivots = [];
        foreach (Contract::tablesOf($collection) as $table) {
            match ($table['kind']) {
                'table' => $main = $table,
                'child' => $children[$table['field']] = $table,
                'pivot' => $pivots[$table['field']] = $table,
                default => null,
            };
        }
        if ($main === null) {
            throw new InvalidArgumentException("Collection [{$collection}] has no table.");
        }

        $this->main = $main;
        $this->children = $children;
        $this->pivots = $pivots;
        $this->softDeletes = self::column($main, 'deleted_at') !== null;
        $parentKey = null;
        foreach ([...$children, ...$pivots] as $table) {
            foreach ($table['columns'] as $column) {
                if (($column['role'] ?? null) === 'parent') {
                    $parentKey = $column['name'];
                }
            }
        }
        $this->parentKey = $parentKey;
        $this->layout = $this->buildLayout($this->model['fields'], $main['columns'], '');
    }

    public static function for(string $collection): self
    {
        return self::$instances[$collection] ??= new self($collection);
    }

    public function table(): string
    {
        return $this->main['name'];
    }

    public function isSingleton(): bool
    {
        return (bool) ($this->model['singleton'] ?? false);
    }

    /* ------------------------------------------------------------------ *
     * Rows → document
     * ------------------------------------------------------------------ */

    /**
     * @param  array<string, mixed>  $row  the main table's raw row
     * @param  array<string, array<int, array>>  $childRows  field → raw child rows, in position order
     * @param  array<string, array<int, int>>  $pivotIds  field → related ids, in position order
     */
    public function toDocument(array $row, array $childRows = [], array $pivotIds = []): array
    {
        return $this->build($this->layout, $row, $childRows, $pivotIds);
    }

    private function build(array $layout, array $row, array $childRows, array $pivotIds): array
    {
        $document = [];
        foreach ($layout as $entry) {
            $field = $entry['field'];
            switch ($entry['type']) {
                case 'column':
                    $document[$field] = self::inContractOrder(
                        self::fromColumn($entry['column'], $row[$entry['column']['name']] ?? null),
                        $entry['descriptor'] ?? null,
                    );
                    break;
                case 'object':
                    $document[$field] = $this->build($entry['layout'], $row, [], []);
                    break;
                case 'child':
                    $document[$field] = array_map(
                        fn (array $child) => $this->childDocument($entry['table'], $entry['shape'], $child),
                        $childRows[$field] ?? [],
                    );
                    break;
                case 'pivot':
                    $document[$field] = array_values(array_map('intval', $pivotIds[$field] ?? []));
                    break;
            }
        }

        return $document;
    }

    /** @var array<string, array<string, array>> child table → path → column */
    private array $childColumns = [];

    private function childDocument(array $table, array $shape, array $row): array
    {
        $byPath = $this->childColumns[$table['name']] ??= array_column(
            array_filter($table['columns'], fn (array $column) => isset($column['path'])),
            null,
            'path',
        );
        $item = [];
        foreach ($shape as $field => $descriptor) {
            if ($field === 'id') {
                $item['id'] = (int) ($row['local_id'] ?? 0);

                continue;
            }
            if (isset($byPath[$field])) {
                $item[$field] = self::inContractOrder(
                    self::fromColumn($byPath[$field], $row[$byPath[$field]['name']] ?? null),
                    is_array($descriptor) ? $descriptor : null,
                );
            }
        }

        return $item;
    }

    /**
     * A JSON column's value with its keys in the order the contract lists
     * them. MySQL's JSON type keeps an object's keys sorted, so a `utm` written
     * as `source, medium, campaign, term, content` would read back starting
     * with `term`; the mock answers in the order it was written, which is the
     * contract's. Keys the contract does not name follow, as stored.
     */
    private static function inContractOrder(mixed $value, ?array $descriptor): mixed
    {
        if ($descriptor === null || ! is_array($value) || $value === []) {
            return $value;
        }
        if (array_is_list($value)) {
            $items = is_array($descriptor['items'] ?? null) ? $descriptor['items'] : null;

            return $items === null ? $value : array_map(fn (mixed $item) => self::inContractOrder($item, $items), $value);
        }
        if (! is_array($descriptor['shape'] ?? null)) {
            return $value;
        }

        $ordered = [];
        foreach ($descriptor['shape'] as $key => $child) {
            if (array_key_exists($key, $value)) {
                $ordered[$key] = self::inContractOrder($value[$key], is_array($child) ? $child : null);
            }
        }

        return $ordered + $value;
    }

    /** A raw column value as the document holds it. */
    public static function fromColumn(array $column, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($column['kind']) {
            'bool' => (bool) $value,
            'int' => (int) $value,
            'number' => Js::normaliseNumber($value),
            'date' => substr((string) $value, 0, 10),
            'datetime' => Clock::fromStorage((string) $value),
            'json' => JsonValue::decode((string) $value),
            default => ($column['docType'] ?? null) === 'int' && is_numeric($value) ? (int) $value : (string) $value,
        };
    }

    /* ------------------------------------------------------------------ *
     * Document → rows
     * ------------------------------------------------------------------ */

    /**
     * The main table's columns for a document (the id, the soft-delete marker
     * and the secret columns excluded).
     *
     * @return array<string, mixed>
     */
    public function toRow(array $document): array
    {
        $row = [];
        foreach ($this->main['columns'] as $column) {
            $name = $column['name'];
            if (in_array($name, ['id', 'deleted_at'], true) || ($column['role'] ?? null) === 'secret') {
                continue;
            }
            if (($column['role'] ?? null) === 'timestamp') {
                $row[$name] = Clock::now()->format(Clock::STORAGE_FORMAT);

                continue;
            }
            if (! isset($column['path'])) {
                continue;
            }
            $row[$name] = self::toColumn($column, self::pathValue($document, $column['path']));
        }

        return $row;
    }

    /** @return array<int, array<string, mixed>> */
    public function toChildRows(string $field, array $document, int $parentId): array
    {
        $table = $this->children[$field];
        $rows = [];
        foreach (array_values((array) ($document[$field] ?? [])) as $position => $item) {
            $item = Js::entries($item);
            $row = [];
            foreach ($table['columns'] as $column) {
                $name = $column['name'];
                $role = $column['role'] ?? null;
                if ($name === 'id') {
                    continue;
                }
                $row[$name] = match (true) {
                    $role === 'parent' => $parentId,
                    $name === 'local_id' => Js::isInteger($item['id'] ?? null) ? (int) $item['id'] : $position + 1,
                    $name === 'position', $role === 'position-alias' => $position,
                    $role === 'timestamp' => Clock::now()->format(Clock::STORAGE_FORMAT),
                    isset($column['path']) => self::toColumn($column, $item[$column['path']] ?? null),
                    default => null,
                };
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /** @return array<int, array<string, mixed>> */
    public function toPivotRows(string $field, array $document, int $parentId): array
    {
        $table = $this->pivots[$field];
        $parent = null;
        $related = null;
        foreach ($table['columns'] as $column) {
            if (($column['role'] ?? null) === 'parent') {
                $parent = $column['name'];
            } elseif (($column['role'] ?? null) === 'related') {
                $related = $column['name'];
            }
        }

        $rows = [];
        $seen = [];
        foreach (array_values((array) ($document[$field] ?? [])) as $position => $id) {
            if (! Js::isInteger($id) && ! (is_string($id) && ctype_digit($id))) {
                continue;
            }
            $id = (int) $id;
            // A pivot's key is the pair: the same id twice is stored once.
            if (isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $rows[] = [$parent => $parentId, $related => $id, 'position' => $position];
        }

        return $rows;
    }

    /** The related-id column of a pivot (`amenity_id`). */
    public function pivotRelatedKey(string $field): string
    {
        foreach ($this->pivots[$field]['columns'] as $column) {
            if (($column['role'] ?? null) === 'related') {
                return $column['name'];
            }
        }

        throw new InvalidArgumentException("Pivot [{$field}] has no related column.");
    }

    /** A document value as its column stores it. */
    public static function toColumn(array $column, mixed $value): mixed
    {
        $nullable = (bool) $column['nullable'];
        $fallback = fn () => $nullable ? null : ($column['hasDefault'] ? $column['default'] : match ($column['kind']) {
            'bool', 'int', 'number' => 0,
            'json' => 'null',
            default => '',
        });

        if ($value === null) {
            return $fallback();
        }

        return match ($column['kind']) {
            'bool' => $value ? 1 : 0,
            'int' => Js::isNumber($value) || (is_string($value) && is_numeric($value)) ? (int) $value : $fallback(),
            'number' => Js::isNumber($value) || (is_string($value) && is_numeric($value)) ? $value + 0 : $fallback(),
            'date' => is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}/', $value) ? substr($value, 0, 10) : $fallback(),
            'datetime' => Clock::storage($value) ?? $fallback(),
            'json' => JsonValue::encode($value),
            default => is_scalar($value) ? Js::string($value) : JsonValue::encode($value),
        };
    }

    /** A dotted path off a document; null when absent. */
    public static function pathValue(array|stdClass $document, string $path): mixed
    {
        $value = $document;
        foreach (explode('.', $path) as $key) {
            $value = Js::get($value, $key);
            if ($value === null) {
                return null;
            }
        }

        return $value;
    }

    /* ------------------------------------------------------------------ *
     * Layout
     * ------------------------------------------------------------------ */

    private function buildLayout(array $fields, array $columns, string $prefix): array
    {
        $byPath = [];
        foreach ($columns as $column) {
            // A secret (the password hash) is stored, and never part of a document.
            if (isset($column['path']) && ($column['role'] ?? null) !== 'secret') {
                $byPath[$column['path']] = $column;
            }
        }

        $layout = [];
        foreach ($fields as $field => $descriptor) {
            $path = $prefix === '' ? $field : "{$prefix}.{$field}";

            if ($prefix === '' && $field === 'id') {
                $layout[] = ['field' => 'id', 'type' => 'column', 'column' => self::column($this->main, 'id')];

                continue;
            }
            if ($prefix === '' && $field === 'createdAt' && ($column = self::column($this->main, 'created_at')) && ! isset($column['role'])) {
                $layout[] = ['field' => 'createdAt', 'type' => 'column', 'column' => $column];

                continue;
            }
            if ($prefix === '' && $field === 'updatedAt' && ($column = self::column($this->main, 'updated_at')) && ! isset($column['role'])) {
                $layout[] = ['field' => 'updatedAt', 'type' => 'column', 'column' => $column];

                continue;
            }
            if (isset($byPath[$path])) {
                $layout[] = ['field' => $field, 'type' => 'column', 'column' => $byPath[$path], 'descriptor' => is_array($descriptor) ? $descriptor : null];

                continue;
            }
            if ($prefix === '' && isset($this->children[$field])) {
                $layout[] = [
                    'field' => $field,
                    'type' => 'child',
                    'table' => $this->children[$field],
                    'shape' => $descriptor['items']['shape'] ?? [],
                ];

                continue;
            }
            if ($prefix === '' && isset($this->pivots[$field])) {
                $layout[] = ['field' => $field, 'type' => 'pivot', 'table' => $this->pivots[$field]];

                continue;
            }
            if (($descriptor['type'] ?? null) === 'object' && is_array($descriptor['shape'] ?? null)) {
                $nested = $this->buildLayout($descriptor['shape'], $columns, $path);
                if ($nested !== []) {
                    $layout[] = ['field' => $field, 'type' => 'object', 'layout' => $nested];
                }
            }
            // Anything else is computed on read (`read: true`) and has no column.
        }

        return $layout;
    }

    private static function column(array $table, string $name): ?array
    {
        foreach ($table['columns'] as $column) {
            if ($column['name'] === $name) {
                return $column;
            }
        }

        return null;
    }
}
