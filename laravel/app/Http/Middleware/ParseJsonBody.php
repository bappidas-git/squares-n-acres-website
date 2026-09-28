<?php

namespace App\Http\Middleware;

use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Json\JsonValue;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Reads a request's JSON body the way the contract means it.
 *
 * Laravel's own `$request->json()` decodes `{}` and `[]` alike to `[]`, and
 * the difference is part of the contract (a block's `data`, a settings group).
 * This decodes the raw body with App\Support\Json\JsonValue and keeps the
 * result on the request for App\Http\Controllers\Controller::body().
 *
 * Also answers every API request as JSON — errors included — whatever the
 * client's `Accept` header says, and refuses what cannot be read:
 *
 *   malformed JSON                → 400 "Malformed JSON body."
 *   more than 5 MB                → 400 "Request body is too large."
 */
final class ParseJsonBody
{
    /** The mock's `express.json({ limit: '5mb' })`. */
    public const MAX_BYTES = 5 * 1024 * 1024;

    public const ATTRIBUTE = 'jsonBody';

    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        $raw = (string) $request->getContent();
        $body = null;
        if ($raw !== '' && ! $request->isMethod('GET') && ! $request->isMethod('HEAD')) {
            if (strlen($raw) > self::MAX_BYTES) {
                throw ApiException::badRequest('Request body is too large.');
            }
            if ($this->isJson($request, $raw)) {
                $body = JsonValue::decode($raw);
                // Only an object or an array is a body (`express.json` is strict).
                if ($body === null || ! (is_array($body) || $body instanceof \stdClass)) {
                    ApiLog::warning('request', 'Malformed JSON body', ['body' => ApiLog::truncate($raw, 500)]);

                    throw ApiException::badRequest('Malformed JSON body.');
                }
            }
        }

        $request->attributes->set(self::ATTRIBUTE, $body);

        return $next($request);
    }

    private function isJson(Request $request, string $raw): bool
    {
        $type = strtolower((string) $request->headers->get('Content-Type', ''));
        if (str_contains($type, 'json')) {
            return true;
        }

        // A body without a type that starts like JSON is read as JSON.
        return $type === '' && preg_match('/^\s*[\[{]/', $raw) === 1;
    }
}
