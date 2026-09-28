<?php

namespace App\Http\Controllers;

use App\Domain\Redirects\RedirectImport;
use App\Domain\Redirects\RedirectRules;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Csv;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * The redirect endpoints beside the CRUD engine's (App\Crud\Definitions\Redirects):
 *
 *   GET  /redirects/resolve?path=      one lookup, and a `hits` increment
 *   POST /redirects/{id}/hit           a rule the site followed — 204, throttled per address
 *   GET  /admin/redirects/export       CSV, with the list's `isActive` and `q`
 *   POST /admin/redirects/import       an upsert keyed on `fromPath` (RedirectImportSummary)
 *
 * `hits` moves when the site follows a rule and says so (prompt 51 — the
 * column read 0 for every rule a visitor had followed) and when `resolve`
 * answers, which is what a server-side 404 handler calls. It is incremented
 * in the database, so two visitors at once both count.
 */
class RedirectController extends Controller
{
    public function resolve(Request $request): JsonResponse
    {
        $path = RedirectRules::normalizePath($this->query($request)->first('path'));
        foreach ($this->store->all('redirects') as $rule) {
            if (! empty($rule['isActive']) && RedirectRules::normalizePath($rule['fromPath'] ?? null) === $path) {
                $this->countHit($rule);

                return Envelope::ok(['fromPath' => $rule['fromPath'], 'toPath' => $rule['toPath'], 'statusCode' => $rule['statusCode']]);
            }
        }

        throw ApiException::notFound();
    }

    /** Fire-and-forget from the site's redirect handler: 404 for an unknown or inactive rule. */
    public function hit(string $id): Response
    {
        foreach ($this->store->all('redirects') as $rule) {
            if (! empty($rule['isActive']) && Js::string($rule['id']) === $id) {
                $this->countHit($rule);

                return response()->noContent();
            }
        }

        throw ApiException::notFound();
    }

    public function export(Request $request): Response
    {
        $query = $this->query($request);
        $rows = RedirectRules::exportRows(
            $this->store->all('redirects'),
            $query->first('isActive'),
            Js::lower(Js::trim((string) ($query->first('q') ?? ''))),
        );
        ApiLog::info('redirects', 'Exported '.count($rows).' rule(s)');

        return Csv::download(Csv::render($rows, RedirectRules::CSV_COLUMNS), 'redirects-'.substr(Clock::nowIso(), 0, 10).'.csv');
    }

    public function import(Request $request): JsonResponse
    {
        return Envelope::ok((new RedirectImport($this->store))->run($this->body($request)['rows'] ?? null));
    }

    private function countHit(array $rule): void
    {
        $this->store->setColumns('redirects', $rule['id'], ['hits' => DB::raw('`hits` + 1')]);
        ApiLog::info('redirects', "Hit counted on #{$rule['id']}", ['fromPath' => $rule['fromPath'], 'toPath' => $rule['toPath']]);
    }
}
