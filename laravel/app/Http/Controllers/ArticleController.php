<?php

namespace App\Http\Controllers;

use App\Crud\CrudResource;
use App\Crud\Resources;
use App\Domain\Articles\ArticleReads;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Articles (01_API_CONTRACT.md §5.14):
 *
 *   GET /articles                           published and due; filters, `newest` | `popular`
 *   GET /articles/trending                  the six most read
 *   GET /articles/{id}/adjacent             the pieces published either side
 *   GET /articles/slug/{slug}               counts a view; `?preview=` opens a draft
 *   GET /admin/articles                     the admin list      ┐ settled, then the
 *   GET /admin/articles/check-slug          is a slug free?     │ CRUD engine's handlers
 *   GET /admin/articles/{id}                one article         ┘
 *   GET /admin/articles/{id}/preview-token  a 24-hour preview link
 *
 * The writes are the CRUD engine's (App\Crud\Definitions\Articles).
 */
class ArticleController extends Controller
{
    public function __construct(DocumentStore $store, private Resources $resources)
    {
        parent::__construct($store);
    }

    public function index(Request $request): JsonResponse
    {
        [$rows, $meta] = $this->reads()->list($this->query($request));

        return Envelope::list($rows, $meta);
    }

    public function trending(Request $request): JsonResponse
    {
        [$rows, $meta] = $this->reads()->trending($this->query($request));

        return Envelope::list($rows, $meta);
    }

    public function adjacent(Request $request, string $id): JsonResponse
    {
        return Envelope::ok($this->reads()->adjacent($id, $this->query($request)));
    }

    public function showBySlug(Request $request, string $slug): JsonResponse
    {
        return Envelope::ok($this->reads()->bySlug($slug, $this->query($request)->first('preview'), $request->ip()));
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $this->reads()->settle();

        return $this->resource()->handleAdminList($this->query($request));
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $this->reads()->settle();

        return $this->resource()->handleCheckSlug($this->query($request));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->reads()->settle();

        return $this->resource()->handleGet($id, $this->query($request));
    }

    public function previewToken(string $id): JsonResponse
    {
        $article = $this->store->find('articles', $id) ?? throw ApiException::notFound();

        return Envelope::ok($this->reads()->previewToken($article));
    }

    private function reads(): ArticleReads
    {
        return new ArticleReads($this->store);
    }

    private function resource(): CrudResource
    {
        return $this->resources->get('articles');
    }
}
