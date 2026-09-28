<?php

namespace App\Http\Controllers;

use App\Contract\Contract;
use App\Domain\Seo\NotFoundLog;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Paginator;
use App\Support\Validation\SchemaValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The 404 log (06_SEO_SITEMAP_ROBOTS.md → "The 404 log", prompt 51).
 *
 *   POST   /not-found                  the site's 404 page, once a visit — 204
 *   GET    /admin/seo/not-found        one line per path (NotFoundPathList), `q`
 *   DELETE /admin/seo/not-found/{id}   a path dismissed from the list
 *
 * The report is throttled per address (`throttle:not-found-reports`): a
 * crawler walking dead links meets the limit before it fills anything.
 */
class NotFoundLogController extends Controller
{
    public function report(Request $request): Response
    {
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('notFound.report'), $body);

        $path = NotFoundLog::normalizePath($body['path']);
        if (! str_starts_with($path, '/')) {
            throw ApiException::validation(['path' => 'The path must start with a slash.']);
        }

        if (NotFoundLog::isIgnored($path, $this->store->all('redirects'))) {
            ApiLog::debug('seo', "404 at {$path} not logged: ignored path or redirected");
        } else {
            (new NotFoundLog($this->store))->record($path, $body['referrer'] ?? null);
        }

        return response()->noContent();
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $q = Js::lower(Js::trim((string) ($query->first('q') ?? '')));

        // A path a redirect now answers says where it goes: fixed, and dismissable.
        $redirected = [];
        foreach ($this->store->all('redirects') as $rule) {
            if (($rule['isActive'] ?? null) !== false) {
                $redirected[NotFoundLog::normalizePath($rule['fromPath'] ?? null)] = $rule['toPath'] ?? null;
            }
        }

        $lines = [];
        foreach (NotFoundLog::summarize($this->store->all('notFoundLog')) as $line) {
            if ($q === '' || str_contains(Js::lower(Js::string($line['path'])), $q)) {
                $lines[] = [...$line, 'redirectedTo' => $redirected[Js::string($line['path'])] ?? null];
            }
        }

        $perPage = $query->first('perPage') === 'all'
            ? null
            : Paginator::positiveInt($query->first('perPage'), Paginator::DEFAULT_PER_PAGE_ADMIN);
        [$page, $meta] = Paginator::paginate($lines, $query->first('page'), $perPage);

        return Envelope::list($page, $meta);
    }

    /** Every day of the path the row names goes; a visitor who reaches it again puts it back. */
    public function destroy(string $id): JsonResponse
    {
        $path = (new NotFoundLog($this->store))->dismiss($id) ?? throw ApiException::notFound();

        return Envelope::message("{$path} was dismissed.");
    }
}
