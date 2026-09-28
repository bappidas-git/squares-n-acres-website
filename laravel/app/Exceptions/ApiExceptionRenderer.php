<?php

namespace App\Exceptions;

use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Every failure of the API in the contract's error envelope (§5.3):
 *
 *   { "message": "…", "errors"?: { "field": ["…"] }, "data"?: { … } }
 *
 * Known failures answer with their own status; anything else is a bug, so
 * the client gets a bare 500 — the stack goes to the log and the Debugbar,
 * never into the body.
 */
final class ApiExceptionRenderer
{
    public function __invoke(Throwable $exception, Request $request): ?Response
    {
        if (! self::isApi($request)) {
            return null;
        }

        $response = match (true) {
            // An answer built ahead of time goes out as it is: a rate
            // limiter's 429 (AppServiceProvider) arrives this way. Laravel
            // would pass it through itself, but only after these callbacks.
            $exception instanceof HttpResponseException => $exception->getResponse(),
            $exception instanceof ApiException => self::envelope(
                $exception->status,
                $exception->getMessage(),
                $exception->errors,
                $exception->data,
                $exception->headers,
            ),
            $exception instanceof ValidationException => self::envelope(
                422,
                'The given data was invalid.',
                $exception->errors(),
            ),
            $exception instanceof AuthenticationException => self::envelope(401, 'Unauthenticated.'),
            $exception instanceof ThrottleRequestsException => self::envelope(
                429,
                $exception->getMessage() !== '' && $exception->getMessage() !== 'Too Many Attempts.'
                    ? $exception->getMessage()
                    : ApiException::TOO_MANY,
                headers: $exception->getHeaders(),
            ),
            // An unknown path — or a known path with a method it does not
            // answer — is the same 404 the mock's catch-all gives.
            $exception instanceof NotFoundHttpException,
            $exception instanceof MethodNotAllowedHttpException => self::envelope(404, 'Not found'),
            $exception instanceof HttpExceptionInterface => self::envelope(
                $exception->getStatusCode(),
                $exception->getMessage() !== '' ? $exception->getMessage() : 'Error',
                headers: $exception->getHeaders(),
            ),
            default => null,
        };

        if ($response !== null) {
            return $response;
        }

        ApiLog::exception($exception);
        ApiLog::error('exception', $exception::class.': '.$exception->getMessage(), [
            'file' => $exception->getFile().':'.$exception->getLine(),
            'sql' => $exception instanceof QueryException ? $exception->getSql() : null,
        ]);

        $body = ['message' => 'Internal server error'];
        if (config('app.debug')) {
            // Local only (APP_DEBUG=false in production): what broke, without the stack.
            $body['debug'] = ['exception' => $exception::class, 'message' => $exception->getMessage()];
        }

        return Envelope::json($body, 500);
    }

    public static function isApi(Request $request): bool
    {
        return $request->is('api', 'api/*')
            || preg_match('~^(sitemap(-[a-z0-9-]+)?\.xml|robots\.txt|rss\.xml|llms\.txt)$~', $request->path()) === 1;
    }

    private static function envelope(int $status, string $message, ?array $errors = null, ?array $data = null, array $headers = []): JsonResponse
    {
        $body = ['message' => $message];
        if ($errors !== null && $errors !== []) {
            $body['errors'] = $errors;
        }
        if ($data !== null && $data !== []) {
            $body['data'] = $data;
        }

        return Envelope::json($body, $status, $headers);
    }
}
