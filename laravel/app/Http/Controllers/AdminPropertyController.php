<?php

namespace App\Http\Controllers;

use App\Domain\Properties\PropertyBulk;
use App\Domain\Properties\PropertyFilters;
use App\Domain\Properties\PropertyReads;
use App\Domain\Properties\PropertyWriter;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Text\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The listings desk (01_API_CONTRACT.md §5.8, §5.9, §5.14; 05_BUSINESS_RULES.md →
 * "Property writes", "Bulk actions", "Duplicating a property", "Preview tokens"):
 *
 *   GET    /admin/properties                      every listing, the §5.7 filters, facets
 *   POST   /admin/properties                      create — 201
 *   GET    /admin/properties/check-slug           is a slug free?
 *   POST   /admin/properties/bulk                 flags, delete, and the payload actions
 *   GET    /admin/properties/slug/{slug}          the admin preview, any state
 *   GET    /admin/properties/{id}
 *   PUT    /admin/properties/{id}                 replace — 409 when made from an older version
 *   PATCH  /admin/properties/{id}
 *   DELETE /admin/properties/{id}
 *   POST   /admin/properties/{id}/preview-token   a 24-hour share link
 *   POST   /admin/properties/{id}/duplicate       a draft copy — 201
 *
 * Admin reads answer the record as stored, with `updatedByName`. The role
 * matrix is applied by the `admin` middleware group: a sales user reaches the
 * list (`properties.view`) and never the writes.
 */
class AdminPropertyController extends Controller
{
    public function __construct(
        DocumentStore $store,
        private PropertyReads $reads,
        private PropertyWriter $writer,
        private PropertyBulk $bulk,
    ) {
        parent::__construct($store);
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        [$rows, $meta] = $this->reads->listPage(PropertyFilters::apply($this->reads->rows(), $query, $this->store, true), $query, true);

        return Envelope::list($rows, $meta);
    }

    public function store(Request $request): JsonResponse
    {
        $record = $this->writer->create($this->body($request), $this->userDocument($request));

        return Envelope::created($this->reads->present($record, true));
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $query = $this->query($request);

        return Envelope::ok(Slug::check($this->reads->rows(), $query->first('slug') ?? '', $query->first('excludeId')));
    }

    public function bulk(Request $request): JsonResponse
    {
        [$message, $data] = $this->bulk->apply($this->body($request), $this->userDocument($request));

        return Envelope::message($message, $data);
    }

    public function showBySlug(string $slug): JsonResponse
    {
        $property = $this->reads->findBySlug($slug) ?? throw ApiException::notFound();

        return Envelope::ok($this->reads->present($property, true));
    }

    public function show(string $id): JsonResponse
    {
        return Envelope::ok($this->reads->present($this->listing($id), true));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $record = $this->writer->replace($this->listing($id), $this->body($request), $this->userDocument($request));

        return Envelope::ok($this->reads->present($record, true));
    }

    public function patch(Request $request, string $id): JsonResponse
    {
        $record = $this->writer->patch($this->listing($id), $this->body($request), $this->userDocument($request));

        return Envelope::ok($this->reads->present($record, true));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->writer->remove($this->listing($id));

        return Envelope::message('Deleted');
    }

    public function previewToken(string $id): JsonResponse
    {
        return Envelope::ok($this->writer->previewToken($this->listing($id)));
    }

    public function duplicate(Request $request, string $id): JsonResponse
    {
        $copy = $this->writer->duplicate($this->listing($id), $this->userDocument($request));

        return Envelope::created($this->reads->present($copy, true));
    }

    /**
     * Listings are served here and nowhere else: an unknown sub-path is a 404
     * after the token and the role matrix, rather than anybody's generic answer.
     */
    public function missing(): never
    {
        throw ApiException::notFound();
    }

    private function listing(string $id): array
    {
        return $this->reads->find($id) ?? throw ApiException::notFound();
    }
}
