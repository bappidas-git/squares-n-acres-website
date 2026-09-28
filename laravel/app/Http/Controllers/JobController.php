<?php

namespace App\Http\Controllers;

use App\Domain\Careers\Applications;
use App\Domain\Careers\Openings;
use App\Support\Api\Envelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The careers page (01_API_CONTRACT.md §5.14):
 *
 *   GET  /jobs                 open roles, newest first — `department`, `q`, `page`, `perPage`
 *   GET  /jobs/slug/{slug}     an active role, open or closed, with `isOpen`
 *   POST /jobs/{id}/apply      honeypot, ten a minute per IP, 201
 *
 * The admin CRUD of openings and applications is the CRUD engine's
 * (App\Crud\Definitions\Jobs).
 */
class JobController extends Controller
{
    public function index(Request $request, Openings $openings): JsonResponse
    {
        [$rows, $meta] = $openings->publicList($this->query($request));

        return Envelope::list($rows, $meta);
    }

    public function showBySlug(string $slug, Openings $openings): JsonResponse
    {
        return Envelope::ok($openings->bySlug($slug));
    }

    public function apply(Request $request, string $id, Applications $applications): JsonResponse
    {
        return Envelope::created($applications->apply($id, $this->body($request)));
    }
}
