<?php

namespace App\Support\Api;

use RuntimeException;

/**
 * An HTTP failure in the contract's error envelope (01_API_CONTRACT.md §5.3):
 *
 *   { "message": "…", "errors": { "field": ["…"] }, "data": { … } }
 *
 * `errors` is present for per-field failures (422, and the 409 of a taken
 * slug), `data` for the few failures that carry more — the `usedBy` list of a
 * master-data delete, the `notReady` list of a refused publish, the `current`
 * version of a stale replace. Rendered by App\Exceptions\ApiExceptionRenderer.
 */
class ApiException extends RuntimeException
{
    public const FORBIDDEN = 'You do not have permission to perform this action.';

    public const TOO_MANY = 'Too many requests. Please try again in a minute.';

    /**
     * @param  array<string, array<int, string>>|null  $errors
     * @param  array<string, mixed>|null  $data
     */
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly ?array $errors = null,
        public readonly ?array $data = null,
        public readonly array $headers = [],
    ) {
        parent::__construct($message);
    }

    public static function badRequest(string $message = 'Bad request', ?array $errors = null): self
    {
        return new self(400, $message, $errors);
    }

    public static function unauthorized(string $message = 'Unauthenticated.'): self
    {
        return new self(401, $message);
    }

    public static function forbidden(string $message = self::FORBIDDEN): self
    {
        return new self(403, $message);
    }

    public static function notFound(string $message = 'Not found'): self
    {
        return new self(404, $message);
    }

    public static function conflict(string $message, ?array $errors = null, ?array $data = null): self
    {
        return new self(409, $message, $errors, $data);
    }

    /**
     * A 422 in Laravel's shape; keys are camelCase and nested keys dotted.
     *
     * @param  array<string, array<int, string>|string>  $errors
     */
    public static function validation(array $errors, string $message = 'The given data was invalid.', ?array $data = null): self
    {
        $normalised = [];
        foreach ($errors as $key => $messages) {
            $normalised[$key] = array_values((array) $messages);
        }

        return new self(422, $message, $normalised, $data);
    }

    public static function tooManyRequests(string $message = self::TOO_MANY, array $headers = []): self
    {
        return new self(429, $message, null, null, $headers);
    }

    public static function badGateway(string $message): self
    {
        return new self(502, $message);
    }
}
