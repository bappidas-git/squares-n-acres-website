<?php

namespace App\Http\Controllers;

use App\Crud\CrudResource;
use App\Crud\Resources;
use App\Store\DocumentStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The generic endpoints of a CRUD resource (01_API_CONTRACT.md §5.14):
 *
 *   GET    /<resource>                    public list
 *   GET    /<resource>/slug/{slug}        public read by slug
 *   GET    /admin/<resource>              admin list (`isActive`, `perPage=all`)
 *   GET    /admin/<resource>/check-slug   is a slug free?
 *   POST   /admin/<resource>/bulk         activate, deactivate, feature, delete…
 *   POST   /admin/<resource>              create — 201
 *   GET    /admin/<resource>/{id}         read (`?withUsage=true`)
 *   PUT    /admin/<resource>/{id}         replace
 *   PATCH  /admin/<resource>/{id}         partial update
 *   DELETE /admin/<resource>/{id}         delete — 409 while in use
 *
 * Which resource a route serves is its `resource` default (App\Routing\CrudRoutes);
 * the behaviour lives in App\Crud\CrudResource and the resource's definition.
 */
class CrudController extends Controller
{
    public function __construct(DocumentStore $store, private Resources $resources)
    {
        parent::__construct($store);
    }

    protected function resource(Request $request): CrudResource
    {
        return $this->resources->get((string) $request->route('resource'));
    }

    public function index(Request $request): JsonResponse
    {
        return $this->resource($request)->handleList($this->query($request));
    }

    public function showBySlug(Request $request, string $slug): JsonResponse
    {
        return $this->resource($request)->handleBySlug($slug, $this->query($request));
    }

    public function adminIndex(Request $request): JsonResponse
    {
        return $this->resource($request)->handleAdminList($this->query($request));
    }

    public function checkSlug(Request $request): JsonResponse
    {
        return $this->resource($request)->handleCheckSlug($this->query($request));
    }

    public function bulk(Request $request): JsonResponse
    {
        return $this->resource($request)->handleBulk($this->body($request), $this->userDocument($request), $this->query($request));
    }

    public function store(Request $request): JsonResponse
    {
        return $this->resource($request)->handleCreate($this->body($request), $this->userDocument($request), $this->query($request));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return $this->resource($request)->handleGet($id, $this->query($request));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->resource($request)->handleUpdate($id, $this->body($request), $this->userDocument($request), $this->query($request));
    }

    public function patch(Request $request, string $id): JsonResponse
    {
        return $this->resource($request)->handlePatch($id, $this->body($request), $this->userDocument($request), $this->query($request));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        return $this->resource($request)->handleRemove($id, $this->userDocument($request), $this->query($request));
    }
}
