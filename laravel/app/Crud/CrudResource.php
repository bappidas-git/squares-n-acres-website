<?php

namespace App\Crud;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\QueryParams;
use App\Support\Query\Sorter;
use App\Support\Text\Html;
use App\Support\Text\Slug;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;
use App\Support\Validation\SchemaValidator;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * The CRUD engine (01_API_CONTRACT.md §5.6, §5.8, §5.9, §5.14).
 *
 * Twenty of the contract's resources are the same endpoint eight times over:
 * a public list and slug lookup, an admin list with `isActive` and
 * `perPage=all`, `POST`, `GET /:id`, `PUT`, `PATCH`, `DELETE`, `bulk` and
 * `check-slug`. They are written once, here, and configured per resource in
 * App\Crud\Resources — which filters a resource accepts, what it embeds, what
 * a save derives (`beforeSave`) and what stops a delete (`deleteGuard`).
 * Everything else — the write semantics, the slug rules, the envelope, the
 * 404s, the order settling — comes from this class, so every resource gets
 * it the same.
 *
 * Every hook is a closure; `ctx` carries the store, the query, the signed-in
 * user's document and, for a write, the stored record and the method.
 */
final class CrudResource
{
    public readonly string $collection;

    public readonly array $model;

    private array $o;

    /** @var array<string, mixed> the bulk actions this resource takes */
    private array $actions;

    public function __construct(array $options, private DocumentStore $store)
    {
        $this->collection = $options['collection'];
        $this->model = Contract::model($this->collection);
        $this->o = $options + [
            'basePath' => $this->collection,
            'schema' => null,
            'slugged' => null,
            'afterRead' => null,
            'decoratePage' => null,
            'listMeta' => null,
            'publicTransform' => null,
            'listShape' => null,
            'publicFilters' => [],
            'adminFilters' => [],
            'sorts' => [],
            'defaultSort' => null,
            'publicDefaultSort' => null,
            'beforeValidate' => null,
            'beforeSave' => null,
            'afterSave' => null,
            'beforeDelete' => null,
            'beforeBulk' => null,
            'deleteGuard' => false,
            'protect' => null,
            'bulkActions' => [],
            'noun' => ['one' => 'record', 'many' => 'records'],
            'pathSlug' => false,
            'publicScoped' => null,
            'settleOrder' => false,
            'trimStrings' => false,
            'staleGuard' => false,
            'routes' => null,
        ];
        $this->o['publicPath'] = array_key_exists('publicPath', $options) ? $options['publicPath'] : $this->o['basePath'];
        $this->o['slugged'] ??= ! empty($this->model['slugField']);
        $this->o['publicScoped'] ??= ! empty($this->model['publicScope']);

        $this->actions = [
            ...($this->hasField('isActive') ? ['activate' => ['isActive' => true], 'deactivate' => ['isActive' => false]] : []),
            ...($this->hasField('isFeatured') ? ['feature' => ['isFeatured' => true], 'unfeature' => ['isFeatured' => false]] : []),
            'delete' => null,
            ...$this->o['bulkActions'],
        ];
    }

    public function option(string $name): mixed
    {
        return $this->o[$name] ?? null;
    }

    /** Whether this resource declares a route (`list`, `bySlug`, `adminList`, `create`…). */
    public function has(string $route): bool
    {
        return $this->o['routes'] === null || in_array($route, $this->o['routes'], true);
    }

    public function hasField(string $field): bool
    {
        return array_key_exists($field, $this->model['fields']);
    }

    public function slugged(): bool
    {
        return (bool) $this->o['slugged'];
    }

    public function slugField(): string
    {
        return (string) ($this->model['slugField'] ?? 'slug');
    }

    /** Every stored record, in id order. */
    public function rows(): array
    {
        return $this->store->all($this->collection);
    }

    public function find(mixed $id): ?array
    {
        return $this->store->find($this->collection, $id);
    }

    /* ------------------------------------------------------------------ *
     * Reading
     * ------------------------------------------------------------------ */

    /** Whether a public reader may see this record (§5.10). */
    public function inPublicScope(array $record): bool
    {
        if (! $this->o['publicScoped'] || empty($this->model['publicScope'])) {
            return true;
        }
        foreach ($this->model['publicScope'] as $field => $value) {
            if (($record[$field] ?? null) !== $value) {
                return false;
            }
        }

        return true;
    }

    /** A record with its embeds and counters, and on an admin read the name of who saved it last. */
    public function decorate(array $record, array $ctx): array
    {
        $read = $this->o['afterRead'] ? ($this->o['afterRead'])($record, $ctx) : $record;
        if (($ctx['admin'] ?? false) && $this->hasField('updatedBy')) {
            $read = Editors::withName($read, $this->store);
        }

        return $read;
    }

    /** A record as a response returns it: embeds, then the public stripping, then the list trim. */
    public function scope(array $record, bool $admin, bool $list): array
    {
        if ($admin) {
            return $list && $this->o['listShape'] ? ($this->o['listShape'])($record, ['admin' => true]) : $record;
        }
        $output = array_diff_key($record, array_flip($this->model['publicOmit'] ?? []));
        if ($this->o['publicTransform']) {
            $output = ($this->o['publicTransform'])($output);
        }

        return $list && $this->o['listShape'] ? ($this->o['listShape'])($output, ['admin' => false]) : $output;
    }

    /** One record as a response returns it. */
    public function present(array $record, bool $admin, ?QueryParams $query = null, bool $list = false, array $extra = []): array
    {
        $ctx = $this->context($admin, $query ?? new QueryParams([]), $list) + $extra;

        return $this->scope($this->decorate($record, $ctx), $admin, $list);
    }

    public function context(bool $admin, QueryParams $query, bool $list = false): array
    {
        return ['admin' => $admin, 'query' => $query, 'list' => $list, 'store' => $this->store, 'resource' => $this];
    }

    /** Every row a request may see, decorated so the counters can be filtered and sorted. */
    public function decoratedRows(bool $admin, QueryParams $query, ?array $rows = null): array
    {
        $visible = $rows ?? $this->rows();
        if (! $admin) {
            $visible = array_values(array_filter($visible, fn (array $record) => $this->inPublicScope($record)));
        }
        $ctx = $this->context($admin, $query, true);

        return array_map(fn (array $record) => $this->decorate($record, $ctx), $visible);
    }

    /** The filters, `q` and `ids`, in the order §5.6 applies them. */
    public function applyFilters(array $items, QueryParams $query, bool $admin): array
    {
        $descriptors = $admin ? [...$this->o['publicFilters'], ...$this->o['adminFilters']] : $this->o['publicFilters'];
        $ctx = $this->context($admin, $query, true);

        foreach ($descriptors as $param => $descriptor) {
            $raw = $query->get($param);
            if ($raw === null || $raw === '') {
                continue;
            }
            $items = array_values(array_filter($items, fn (array $record) => self::matchesFilter($record, $descriptor, $raw, $ctx)));
        }

        if ($admin && $this->hasField('isActive')) {
            $wanted = Filters::bool($query->get('isActive'));
            if ($wanted !== null) {
                $items = array_values(array_filter($items, fn (array $record) => (bool) ($record['isActive'] ?? false) === $wanted));
            }
        }

        $q = $query->first('q');
        if ($q !== null && $q !== '') {
            $searchable = $this->model['searchable'] ?? [];
            $items = array_values(array_filter($items, fn (array $record) => Filters::matchesQ($this->searchView($record), $searchable, $q)));
        }

        $ids = Filters::csv($query->get('ids'));
        if ($ids !== []) {
            // `ids` asks for those records, in that order (§5.7).
            $found = [];
            foreach ($ids as $id) {
                foreach ($items as $record) {
                    if (Usage::sameId($record['id'] ?? null, $id)) {
                        $found[] = $record;
                        break;
                    }
                }
            }

            return $found;
        }

        return $items;
    }

    /** A record as `q` reads it: an HTML field by its text. */
    private function searchView(array $record): array
    {
        foreach ($this->model['searchable'] ?? [] as $field) {
            if (($this->model['fields'][$field]['type'] ?? null) === 'html' && isset($record[$field])) {
                $record[$field] = Html::strip($record[$field]);
            }
        }

        return $record;
    }

    /**
     * One declarative filter: `['field' => 'x', 'type' => 'string|int|bool|csv|csvArray']`,
     * or a closure `(record, raw, ctx) => bool`.
     */
    public static function matchesFilter(array $record, array|Closure $descriptor, mixed $raw, array $ctx): bool
    {
        if ($descriptor instanceof Closure) {
            return (bool) $descriptor($record, $raw, $ctx);
        }
        $value = Sorter::path($record, $descriptor['field']);
        $type = $descriptor['type'] ?? 'string';

        if ($type === 'bool') {
            $wanted = Filters::bool($raw);

            return $wanted === null || (bool) $value === $wanted;
        }
        if ($type === 'csv') {
            $wanted = Filters::csv($raw);

            return $wanted === [] || in_array(Js::string($value), $wanted, true);
        }
        if ($type === 'csvArray') {
            $wanted = Filters::csv($raw);
            if ($wanted === []) {
                return true;
            }
            foreach ((array) $value as $entry) {
                if (in_array(Js::string($entry), $wanted, true)) {
                    return true;
                }
            }

            return false;
        }

        $first = is_array($raw) ? ($raw[0] ?? '') : $raw;

        return ($value === null ? '' : Js::string($value)) === Js::string($first);
    }

    /** The §5.6 sort, falling back to the resource's documented default. */
    public function applySort(array $items, QueryParams $query, bool $admin): array
    {
        if (Filters::csv($query->get('ids')) !== []) {
            return $items;
        }
        $sorts = $this->o['sorts'];
        $fallback = $admin ? $this->o['defaultSort'] : ($this->o['publicDefaultSort'] ?? $this->o['defaultSort']);
        $requested = (string) ($query->first('sort') ?? '');
        $key = array_key_exists($requested, $sorts) ? $requested : $fallback;
        if (! $key || ! isset($sorts[$key])) {
            return $items;
        }

        ['spec' => $spec, 'order' => $order, 'rank' => $rank] = self::parseSortEntry($sorts[$key]);
        $wanted = strtolower((string) ($query->first('order') ?? ''));
        $direction = in_array($wanted, ['asc', 'desc'], true) ? $wanted : $order;
        if ($rank === null) {
            return Sorter::sort($items, $spec, $direction);
        }

        // A field sorted by its place in a list: read with the place, handed back unchanged.
        $views = array_map(function (array $item) use ($rank) {
            $view = $item;
            foreach ($rank as $field => $values) {
                $at = array_search(Sorter::path($item, $field), $values, true);
                $view[$field] = $at === false ? count($values) : $at;
            }
            $view["\0original"] = $item;

            return $view;
        }, $items);

        return array_map(fn (array $view) => $view["\0original"], Sorter::sort($views, $spec, $direction));
    }

    /**
     * `'order,name'` sorts ascending by both; `'-propertyCount'` defaults to
     * descending; the array form may rank a field by its place in a list.
     *
     * @return array{spec: string, order: string, rank: ?array}
     */
    public static function parseSortEntry(string|array $entry): array
    {
        if (is_array($entry)) {
            return [
                'spec' => $entry['spec'],
                'order' => ($entry['order'] ?? 'asc') === 'desc' ? 'desc' : 'asc',
                'rank' => isset($entry['rank']) && is_array($entry['rank']) ? $entry['rank'] : null,
            ];
        }

        return str_starts_with($entry, '-')
            ? ['spec' => substr($entry, 1), 'order' => 'desc', 'rank' => null]
            : ['spec' => $entry, 'order' => 'asc', 'rank' => null];
    }

    /** The fields after `order` in the resource's own `order` sort: what orders a tie. */
    public function tieBreak(): array
    {
        $entry = $this->o['sorts']['order'] ?? null;
        if ($entry === null) {
            return [];
        }

        return array_values(array_filter(
            array_map('trim', explode(',', self::parseSortEntry($entry)['spec'])),
            fn (string $field) => $field !== '' && $field !== 'order',
        ));
    }

    /** `{ data, meta }` of a list. */
    public function listResponse(QueryParams $query, bool $admin): JsonResponse
    {
        $visible = $this->decoratedRows($admin, $query);
        $filtered = $this->applyFilters($visible, $query, $admin);
        $sorted = $this->applySort($filtered, $query, $admin);
        [$page, $meta] = Paginator::paginate($sorted, $query->first('page'), Paginator::pageSize($query, $admin));

        if ($this->o['decoratePage']) {
            $page = ($this->o['decoratePage'])($page, $this->context($admin, $query, true));
        }
        if ($this->o['listMeta']) {
            // The rows every filter but the named ones lets through: what those filters may offer.
            $facet = fn (string|array $params) => $this->applyFilters(
                $visible,
                $query->with(array_fill_keys((array) $params, null)),
                $admin,
            );
            $meta = [...$meta, ...($this->o['listMeta'])(['rows' => $visible, 'facet' => $facet, 'admin' => $admin, 'query' => $query])];
        }

        ApiLog::debug($this->collection, 'Listed', ['admin' => $admin, 'total' => $meta['total'], 'page' => $meta['page']]);

        return Envelope::list(array_map(fn (array $record) => $this->scope($record, $admin, true), $page), $meta);
    }

    /* ------------------------------------------------------------------ *
     * Route handlers
     * ------------------------------------------------------------------ */

    public function handleList(QueryParams $query): JsonResponse
    {
        return $this->listResponse($query, false);
    }

    public function handleAdminList(QueryParams $query): JsonResponse
    {
        return $this->listResponse($query, true);
    }

    public function handleBySlug(string $slug, QueryParams $query): JsonResponse
    {
        foreach ($this->rows() as $record) {
            if (($record[$this->slugField()] ?? null) === $slug && $this->inPublicScope($record)) {
                return Envelope::ok($this->present($record, false, $query));
            }
        }

        throw ApiException::notFound();
    }

    public function handleCheckSlug(QueryParams $query): JsonResponse
    {
        return Envelope::ok(Slug::check(
            $this->rows(),
            (string) ($query->first('slug') ?? ''),
            $query->first('excludeId'),
            $this->slugField(),
            (bool) $this->o['pathSlug'],
        ));
    }

    public function handleGet(mixed $id, QueryParams $query): JsonResponse
    {
        $record = $this->find($id) ?? throw ApiException::notFound();

        return Envelope::ok([...$this->present($record, true, $query), ...$this->usageOf($record, $query)]);
    }

    public function handleCreate(array $body, ?array $user, QueryParams $query): JsonResponse
    {
        $record = DB::transaction(function () use ($body, $user) {
            $body = $this->prepare($body, ['method' => 'POST', 'user' => $user]);
            SchemaValidator::validate($this->schema('create'), $body, [
                'fillDefaults' => true,
                'collection' => $this->rows(),
                'lookup' => $this->lookup(),
            ]);

            $record = $this->buildRecord($body, null, 'POST', $user);
            $slug = $this->slugged() ? $this->resolveSlug($body, null) : null;
            if ($slug !== null) {
                $record = $this->applySlug($record, $slug);
            }

            $stored = $this->store->insert($this->collection, $record);
            if ($this->slugged() && $slug === null) {
                // A name with no usable character: `locality-21`.
                $stored = $this->store->update($this->collection, $this->applySlug($stored, $this->fallbackSlug((int) $stored['id'], null)), $stored);
            }
            // The new record takes the position it names, and nothing shares it.
            if ($this->o['settleOrder'] && $this->hasField('order')) {
                $this->writeOrders(Ordering::place($this->rows(), $stored['id'], $this->tieBreak()));
                $stored = $this->find($stored['id']) ?? $stored;
            }
            if ($this->o['afterSave']) {
                ($this->o['afterSave'])($stored, $this->writeContext('POST', $user, null, $body));
                $stored = $this->find($stored['id']) ?? $stored;
            }

            return $stored;
        });

        ApiLog::info($this->collection, "Created #{$record['id']}", ['by' => $user['id'] ?? null]);

        return Envelope::created($this->present($record, true, $query));
    }

    public function handleUpdate(mixed $id, array $body, ?array $user, QueryParams $query): JsonResponse
    {
        $response = DB::transaction(function () use ($id, $body, $user, $query) {
            $existing = $this->find($id) ?? throw ApiException::notFound();
            if ($this->o['staleGuard']) {
                StaleGuard::refuse($existing, $body, $this->store, $this->o['staleGuard']);
            }

            $body = $this->prepare($body, ['existing' => $existing, 'method' => 'PUT', 'user' => $user]);
            SchemaValidator::validate($this->schema('update'), $body, [
                'collection' => $this->rows(),
                'excludeId' => $existing['id'],
                'lookup' => $this->lookup(),
            ]);

            $record = $this->buildRecord($body, $existing, 'PUT', $user);
            if ($this->slugged()) {
                $record = $this->applySlug($record, $this->resolveSlug($body, $existing) ?? $this->fallbackSlug((int) $existing['id'], $existing));
            }

            if (Documents::unchanged($existing, $record)) {
                ApiLog::debug($this->collection, "PUT #{$existing['id']} changes nothing — not written");

                return Envelope::ok($this->present($existing, true, $query));
            }

            $moved = $this->hasField('order') && Js::toNumber($record['order'] ?? null) != Js::toNumber($existing['order'] ?? null);
            $stored = $this->store->update($this->collection, $record, $existing);
            // A form that changes the number is moving the record to that position.
            if ($this->o['settleOrder'] && $moved) {
                $this->writeOrders(Ordering::place($this->rows(), $stored['id'], $this->tieBreak()));
                $stored = $this->find($stored['id']) ?? $stored;
            }
            if ($this->o['afterSave']) {
                ($this->o['afterSave'])($stored, $this->writeContext('PUT', $user, $existing, $body));
                $stored = $this->find($stored['id']) ?? $stored;
            }
            ApiLog::info($this->collection, "Replaced #{$stored['id']}", ['by' => $user['id'] ?? null]);

            return Envelope::ok($this->present($stored, true, $query));
        });

        return $response;
    }

    public function handlePatch(mixed $id, array $body, ?array $user, QueryParams $query): JsonResponse
    {
        return DB::transaction(function () use ($id, $body, $user, $query) {
            $existing = $this->find($id) ?? throw ApiException::notFound();

            $body = $this->prepare($body, ['existing' => $existing, 'method' => 'PATCH', 'user' => $user]);
            SchemaValidator::validate($this->schema('patch'), $body, [
                'partial' => true,
                'collection' => $this->rows(),
                'excludeId' => $existing['id'],
                'lookup' => $this->lookup(),
            ]);

            // A reorder that names the row it was dropped next to is placed by that row.
            $anchor = $this->hasField('order') ? $this->anchorOf($body, $existing) : null;
            $densified = false;
            if ($anchor !== null) {
                $densified = $this->writeOrders(Ordering::renumber($this->rows(), null, $this->tieBreak()));
                $existing = $this->find($existing['id']) ?? $existing;
                $anchorRecord = $this->find($anchor['record']['id']) ?? $anchor['record'];
                $body['order'] = (int) Js::toNumber($anchorRecord['order'] ?? 0) + ($anchor['after'] ? 1 : 0);
            }

            $record = $this->buildRecord($body, $existing, 'PATCH', $user);

            // A PATCH re-slugs only when it says so: a rename must not move a public URL.
            $slugField = $this->slugField();
            if ($this->slugged() && array_key_exists($slugField, $body)) {
                $record = $this->applySlug(
                    $record,
                    $this->resolveSlug([$slugField => $body[$slugField]], $existing) ?? $this->fallbackSlug((int) $existing['id'], $existing),
                );
            }

            $ordering = $this->hasField('order') && array_key_exists('order', $body);

            if (Documents::unchanged($existing, $record)) {
                // A position that is already the record's own still settles a tie.
                if ($ordering) {
                    $this->writeOrders(Ordering::renumber($this->rows(), $existing['id'], $this->tieBreak()));
                }
                ApiLog::debug($this->collection, "PATCH #{$existing['id']} changes nothing — not written", ['densified' => $densified]);
                $existing = $this->find($existing['id']) ?? $existing;

                return Envelope::ok($this->present($existing, true, $query));
            }

            $stored = $this->store->update($this->collection, $record, $existing);

            // Moving one record moves the collection: a PATCH { order } is a position.
            if ($ordering) {
                $this->writeOrders(Ordering::renumber($this->rows(), $stored['id'], $this->tieBreak()));
                $stored = $this->find($stored['id']) ?? $stored;
            }
            if ($this->o['afterSave']) {
                ($this->o['afterSave'])($stored, $this->writeContext('PATCH', $user, $existing, $body));
                $stored = $this->find($stored['id']) ?? $stored;
            }
            ApiLog::info($this->collection, "Patched #{$stored['id']}", ['fields' => array_keys($body), 'by' => $user['id'] ?? null]);

            return Envelope::ok($this->present($stored, true, $query));
        });
    }

    public function handleRemove(mixed $id, ?array $user, QueryParams $query): JsonResponse
    {
        DB::transaction(function () use ($id, $user, $query) {
            $existing = $this->find($id) ?? throw ApiException::notFound();

            $this->guardDelete($existing);
            if ($this->o['beforeDelete']) {
                ($this->o['beforeDelete'])($existing, $this->writeContext('DELETE', $user, $existing, []) + ['query' => $query]);
            }

            $this->deleteRecord($existing);
            $this->closeGap();
        });
        ApiLog::info($this->collection, "Deleted #{$id}", ['by' => $user['id'] ?? null]);

        return Envelope::message('Deleted');
    }

    public function handleBulk(array $body, ?array $user, QueryParams $query): JsonResponse
    {
        return DB::transaction(function () use ($body, $user, $query) {
            SchemaValidator::validate([
                ...Contract::schema('bulk'),
                'action' => ['type' => 'enum', 'enum' => array_keys($this->actions), 'required' => true],
            ], $body);

            $ids = array_map(fn ($id) => Js::string($id), $body['ids']);
            $targets = array_values(array_filter($this->rows(), fn (array $record) => in_array(Js::string($record['id']), $ids, true)));
            $ctx = $this->writeContext('BULK', $user, null, $body) + ['query' => $query];

            if ($this->o['beforeBulk']) {
                ($this->o['beforeBulk'])($body['action'], $targets, $ctx);
            }

            // An action that reads its payload works out its changes once, before
            // any record is touched, and refuses a payload it cannot use whole.
            $action = $this->actions[$body['action']];
            $reads = $action instanceof Closure;
            $changes = $reads ? $action($body['payload'] ?? null, $ctx) : $action;

            $affected = 0;
            if ($body['action'] === 'delete') {
                // All or nothing: one list of everything that is in the way.
                $this->guardBulkDelete($targets);
                if ($this->o['beforeDelete']) {
                    foreach ($targets as $record) {
                        ($this->o['beforeDelete'])($record, $ctx);
                    }
                }
                foreach ($targets as $record) {
                    $this->deleteRecord($record);
                }
                $affected = count($targets);
                $this->closeGap();
            } else {
                $now = Clock::nowIso();
                foreach ($targets as $record) {
                    // `affected` counts the records that changed; the rest keep their `updatedAt`.
                    $differs = false;
                    foreach ($changes as $field => $value) {
                        if (($record[$field] ?? null) !== $value) {
                            $differs = true;
                        }
                    }
                    if (! $differs) {
                        continue;
                    }
                    $updated = [...$record, ...$changes, 'updatedAt' => $now];
                    $stored = $this->store->update($this->collection, $updated, $record);
                    if ($this->o['afterSave']) {
                        ($this->o['afterSave'])($stored, $this->writeContext('BULK', $user, $record, $body) + ['action' => $body['action']]);
                    }
                    $affected++;
                }
            }

            $label = $affected === 1 ? $this->o['noun']['one'] : $this->o['noun']['many'];
            $data = ['affected' => $affected];
            if ($reads) {
                // Which ids matched no record, so a screen can say which had gone.
                $data['missing'] = array_values(array_filter(
                    $body['ids'],
                    fn ($id) => ! array_filter($targets, fn (array $record) => Usage::sameId($record['id'], $id)),
                ));
            }
            ApiLog::info($this->collection, "Bulk {$body['action']}: {$affected} affected", ['ids' => $body['ids']]);

            return Envelope::message("{$affected} {$label} ".($body['action'] === 'delete' ? 'deleted' : 'updated').'.', $data);
        });
    }

    /* ------------------------------------------------------------------ *
     * Write helpers
     * ------------------------------------------------------------------ */

    public function schema(string $action): ?array
    {
        return $this->o['schema'] === null ? null : Contract::schema("{$this->o['schema']}.{$action}");
    }

    /** `exists` rules read another collection through this. */
    public function lookup(): Closure
    {
        return fn (string $collection) => $this->store->all($collection);
    }

    public function writeContext(string $method, ?array $user, ?array $existing, array $body): array
    {
        return [
            'method' => $method,
            'user' => $user,
            'existing' => $existing,
            'body' => $body,
            'store' => $this->store,
            'resource' => $this,
        ];
    }

    /** The body a write starts from: trimmed where the shape says text, then the resource's own pass. */
    public function prepare(array $body, array $ctx): array
    {
        if ($this->o['trimStrings']) {
            $body = Documents::trimText($body, $this->schema('create'));
        }

        return $this->o['beforeValidate']
            ? ($this->o['beforeValidate'])($body, $ctx + ['store' => $this->store, 'resource' => $this])
            : $body;
    }

    /**
     * A body as a stored record (§5.8): POST from the defaults, PUT from the
     * defaults plus the server-managed values, PATCH from the record itself.
     */
    public function buildRecord(array $body, ?array $existing, string $method, ?array $user): array
    {
        $fields = $this->model['fields'];
        $clean = Documents::sanitize($body, $fields);
        $now = Clock::nowIso();
        $audit = $this->hasField('createdBy') ? ['updatedBy' => $user['id'] ?? null] : [];

        if ($method === 'POST') {
            $record = [
                ...Documents::mergeDefaults(Documents::defaults($fields), $clean),
                ...($this->hasField('createdBy') ? ['createdBy' => $user['id'] ?? null] : []),
                ...$audit,
                'id' => null,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];
        } elseif ($method === 'PUT') {
            $record = [
                ...Documents::mergeDefaults(
                    [...Documents::defaults($fields), ...Documents::serverManagedValues($existing, $fields)],
                    $clean,
                ),
                ...($this->hasField('createdBy') ? ['createdBy' => $existing['createdBy'] ?? null] : []),
                ...$audit,
                'id' => $existing['id'],
                'createdAt' => $existing['createdAt'] ?? $now,
                'updatedAt' => $now,
            ];
        } else {
            $record = [...$existing, ...Documents::deepPatch($existing, $clean), ...$audit, 'updatedAt' => $now];
        }

        return $this->o['beforeSave']
            ? ($this->o['beforeSave'])($record, $this->writeContext($method, $user, $existing, $body))
            : $record;
    }

    /**
     * The slug of a write: the one the client chose (a taken one is a 409),
     * or one made from the name; null when neither yields one and the record
     * has none to keep — the caller then names it after its kind and id.
     */
    public function resolveSlug(array $body, ?array $existing): ?string
    {
        $path = (bool) $this->o['pathSlug'];
        $field = $this->slugField();
        $requested = $path ? Slug::makePath((string) Js::string($body[$field] ?? '')) : Slug::make(Js::string($body[$field] ?? ''));
        if (($body[$field] ?? null) === null) {
            $requested = '';
        }
        $excludeId = $existing['id'] ?? null;

        if ($requested !== '') {
            $check = Slug::check($this->rows(), $requested, $excludeId, $field, $path);
            if (! $check['available']) {
                ApiLog::info($this->collection, "Slug {$requested} is taken — 409");

                throw ApiException::conflict('The slug has already been taken.', ['slug' => ['The slug has already been taken.']]);
            }

            return $requested;
        }

        $fallback = $body['name'] ?? $body['title'] ?? $existing['name'] ?? $existing['title'] ?? '';
        $derived = Slug::unique($this->rows(), Js::string($fallback), $excludeId, $field, $path);
        if ($derived !== '') {
            return $derived;
        }

        $kept = $existing[$field] ?? null;

        return is_string($kept) && $kept !== '' ? $kept : null;
    }

    /** `locality-21` — the slug of a record whose name makes none. */
    public function fallbackSlug(int $id, ?array $existing): string
    {
        return Slug::unique($this->rows(), "{$this->o['noun']['one']}-{$id}", $existing['id'] ?? $id, $this->slugField(), (bool) $this->o['pathSlug']);
    }

    /** The entity slug and `seo.slug` are always the same string (§5.9). */
    public function applySlug(array $record, string $slug): array
    {
        if (! $this->slugged()) {
            return $record;
        }
        $record[$this->slugField()] = $slug;
        if ($this->hasField('seo')) {
            $seo = Js::entries($record['seo'] ?? []);
            $seo['slug'] = $slug;
            $record['seo'] = $seo;
        }

        return $record;
    }

    /** `?withUsage=true` on a single read: what a delete would refuse over. */
    private function usageOf(array $record, QueryParams $query): array
    {
        if (! $this->o['deleteGuard'] || Filters::bool($query->first('withUsage')) !== true) {
            return [];
        }

        return ['usedBy' => (new Usage($this->store))->find($this->o['deleteGuard'], $record['id'])];
    }

    /** The 409 of a delete that is still referenced, or of a record the resource never lets go of. */
    private function guardDelete(array $record): void
    {
        $reason = $this->o['protect'] ? ($this->o['protect'])($record) : null;
        if ($reason) {
            throw ApiException::conflict($reason, ['id' => [$reason]], ['usedBy' => []]);
        }
        if (! $this->o['deleteGuard']) {
            return;
        }
        $usedBy = (new Usage($this->store))->find($this->o['deleteGuard'], $record['id']);
        if ($usedBy === []) {
            return;
        }
        ApiLog::info($this->collection, "Delete of #{$record['id']} refused: in use", ['usedBy' => count($usedBy)]);

        throw ApiException::conflict('This item is in use.', ['id' => [Usage::describe($usedBy)]], ['usedBy' => $usedBy]);
    }

    /** The 409 of a bulk delete, naming every selected record that is in the way. */
    private function guardBulkDelete(array $targets): void
    {
        $usage = new Usage($this->store);
        $refused = [];
        foreach ($targets as $record) {
            $reason = $this->o['protect'] ? ($this->o['protect'])($record) : null;
            $usedBy = ! $reason && $this->o['deleteGuard'] ? $usage->find($this->o['deleteGuard'], $record['id']) : [];
            if ($reason || $usedBy !== []) {
                $refused[] = [
                    'id' => $record['id'],
                    'label' => self::labelOf($record),
                    'reason' => $reason ?: Usage::describe($usedBy),
                    'usedBy' => $usedBy,
                ];
            }
        }
        if ($refused === []) {
            return;
        }

        $usedBy = [];
        $seen = [];
        foreach ($refused as $entry) {
            foreach ($entry['usedBy'] as $item) {
                $key = "{$item['type']}:{$item['id']}";
                if (! isset($seen[$key])) {
                    $seen[$key] = true;
                    $usedBy[] = $item;
                }
            }
        }

        if (count($targets) === 1) {
            $protected = $this->o['protect'] ? ($this->o['protect'])($targets[0]) : null;

            throw ApiException::conflict($protected ?: 'This item is in use.', ['id' => [$refused[0]['reason']]], ['usedBy' => $usedBy, 'refused' => $refused]);
        }

        $inUse = array_filter($refused, fn (array $entry) => $entry['usedBy'] === []) === [];
        $verb = count($refused) === 1 ? 'is' : 'are';
        $why = $inUse ? "{$verb} still in use" : 'cannot be deleted';

        throw ApiException::conflict(
            count($refused)." of the selected {$this->o['noun']['many']} {$why}, so none was deleted.",
            ['id' => array_map(fn (array $entry) => "{$entry['label']}: {$entry['reason']}", $refused)],
            ['usedBy' => $usedBy, 'refused' => $refused],
        );
    }

    public static function labelOf(array $record): string
    {
        return Js::string($record['name'] ?? $record['title'] ?? $record['question'] ?? $record['email'] ?? '#'.Js::string($record['id'] ?? ''));
    }

    /**
     * Deletes one record. A foreign key the API does not know about (a
     * soft-deleted listing still naming a locality) answers 409 rather than 500.
     */
    private function deleteRecord(array $record): void
    {
        try {
            $this->store->delete($this->collection, $record['id']);
        } catch (\Illuminate\Database\QueryException $exception) {
            if (($exception->errorInfo[1] ?? null) === 1451) {
                $reason = 'This item is still referenced by records that were deleted earlier, so it cannot be removed.';

                throw ApiException::conflict($reason, ['id' => [$reason]], ['usedBy' => []]);
            }

            throw $exception;
        }
    }

    /** Renumbers what a delete leaves behind `1..n`. */
    private function closeGap(): void
    {
        if (! $this->o['settleOrder'] || ! $this->hasField('order')) {
            return;
        }
        $this->writeOrders(Ordering::renumber($this->rows(), null, $this->tieBreak()));
    }

    /** Writes the orders that changed; whether any did. */
    public function writeOrders(array $orders): bool
    {
        $changes = Ordering::changes($this->rows(), $orders);
        $this->store->setOrders($this->collection, $changes);

        return $changes !== [];
    }

    /** `{ before: id }` / `{ after: id }` beside the `order` of a reorder PATCH. */
    private function anchorOf(array $body, array $existing): ?array
    {
        $after = array_key_exists('after', $body) && $body['after'] !== null && $body['after'] !== '';
        $raw = $after ? $body['after'] : ($body['before'] ?? null);
        if ($raw === null || $raw === '') {
            return null;
        }
        $record = $this->find($raw);
        if ($record === null || Usage::sameId($record['id'], $existing['id'])) {
            return null;
        }

        return ['record' => $record, 'after' => $after];
    }

    /** A value for a JSON object that stays an object when empty. */
    public static function object(array $entries): array|stdClass
    {
        return $entries === [] ? new stdClass : $entries;
    }
}
