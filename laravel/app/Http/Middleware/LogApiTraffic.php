<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiExceptionRenderer;
use App\Support\Debug\ApiLog;
use App\Support\Json\JsonValue;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Logs every API request and its response — to the Laravel Debugbar and to
 * the `api` log channel (App\Support\Debug\ApiLog).
 *
 * On the Debugbar, each request shows two labelled messages — `request`
 * (method, path, query, the body with its secrets masked, the client) and
 * `response` (status, time, the signed-in user, the body) — and a timeline
 * measure for the handler, beside the queries it ran. The Debugbar stores
 * every API request (storage/debugbar): open `/_debugbar/open` on localhost,
 * or follow the `phpdebugbar-id` header of a response.
 *
 * Every request carries an id — the client's `X-Request-Id`, or a new UUID —
 * which is returned in `X-Request-Id`, added to the log context of every line
 * written while the request runs, and printed in the Debugbar messages, so a
 * line of storage/logs/api.log leads back to the request that wrote it.
 */
final class LogApiTraffic
{
    public function handle(Request $request, Closure $next): Response
    {
        // The API and the crawler documents; not the Debugbar's own requests.
        if (! ApiExceptionRenderer::isApi($request)) {
            return $next($request);
        }

        $requestId = $this->requestId($request);
        Context::add('requestId', $requestId);
        $request->attributes->set('requestId', $requestId);

        $started = microtime(true);
        $label = $request->method().' /'.ltrim($request->path(), '/');

        ApiLog::info('request', $label, array_filter([
            'requestId' => $requestId,
            'query' => $request->query() === [] ? null : ApiLog::redact($request->query()),
            'body' => $this->requestBody($request),
            'ip' => $request->ip(),
            'userAgent' => Str::limit((string) $request->userAgent(), 200),
        ], fn ($value) => $value !== null));

        $debugbar = ApiLog::debugbar();
        $debugbar?->startMeasure('api-handler', "Handler: {$label}");

        try {
            $response = $next($request);
        } finally {
            try {
                $debugbar?->stopMeasure('api-handler');
            } catch (\Throwable) {
                // A measure that never started is not worth failing the request over.
            }
        }

        $response->headers->set('X-Request-Id', $requestId);

        $status = $response->getStatusCode();
        $user = $request->user();
        $level = $status >= 500 ? 'error' : ($status >= 400 ? 'warning' : 'info');
        $durationMs = (int) round((microtime(true) - $started) * 1000);

        ApiLog::{$level}('response', "{$status} {$label} ({$durationMs}ms)", array_filter([
            'requestId' => $requestId,
            'status' => $status,
            'durationMs' => $durationMs,
            'user' => $user ? ['id' => $user->getKey(), 'role' => $user->role ?? null] : null,
            'contentType' => $response->headers->get('Content-Type'),
            'body' => $this->responseBody($response),
        ], fn ($value) => $value !== null));

        return $response;
    }

    private function requestId(Request $request): string
    {
        $given = (string) $request->headers->get('X-Request-Id', '');

        return preg_match('/^[A-Za-z0-9._-]{8,100}$/', $given) ? $given : (string) Str::uuid();
    }

    /** The request body as it will be read, secrets masked, cut to a log line. */
    private function requestBody(Request $request): mixed
    {
        $raw = (string) $request->getContent();
        if ($raw === '') {
            return null;
        }
        $decoded = JsonValue::decode($raw);
        if ($decoded === null) {
            return ApiLog::truncate($raw);
        }

        return ApiLog::truncate(JsonValue::encode(ApiLog::redact($decoded)));
    }

    /** The response body for the log: JSON cut to size, anything else by its size. */
    private function responseBody(Response $response): ?string
    {
        if ($response instanceof BinaryFileResponse || $response instanceof StreamedResponse) {
            return '(streamed)';
        }
        $content = $response->getContent();
        if ($content === false || $content === '') {
            return null;
        }
        $type = (string) $response->headers->get('Content-Type');
        if (str_contains($type, 'json')) {
            $decoded = JsonValue::decode($content);
            $masked = $decoded === null ? $content : JsonValue::encode(ApiLog::redact($decoded));

            return ApiLog::truncate($masked);
        }

        return '('.strlen($content).' bytes of '.($type ?: 'unknown type').')';
    }
}
