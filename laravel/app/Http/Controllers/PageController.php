<?php

namespace App\Http\Controllers;

use App\Domain\Pages\PageReads;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CMS pages (01_API_CONTRACT.md §5.14):
 *
 *   GET /pages?showInHeader=&showInFooter=   the navigation list
 *   GET /pages/slug/{slug}                   by path; `?preview=` opens a draft
 *   GET /admin/pages/{id}/preview-token      a 24-hour preview link
 *
 * The admin CRUD is the engine's (App\Crud\Definitions\Pages).
 */
class PageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$rows, $meta] = $this->reads()->navigation($this->query($request));

        return Envelope::list($rows, $meta);
    }

    public function showBySlug(Request $request, string $slug): JsonResponse
    {
        return Envelope::ok($this->reads()->bySlug($slug, $this->query($request)->first('preview')));
    }

    public function previewToken(string $id): JsonResponse
    {
        $reads = $this->reads();
        $page = $reads->find($id) ?? throw ApiException::notFound();

        return Envelope::ok($reads->previewToken($page));
    }

    private function reads(): PageReads
    {
        return new PageReads($this->store);
    }
}
