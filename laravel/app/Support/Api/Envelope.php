<?php

namespace App\Support\Api;

use App\Support\Json\JsonValue;
use Illuminate\Http\JsonResponse;

/**
 * The three success shapes of the contract (01_API_CONTRACT.md §5.2) — never a
 * bare array or a bare object:
 *
 *   single  → { "data": { … } }
 *   list    → { "data": [ … ], "meta": { page, perPage, total, totalPages } }
 *   action  → { "data": null, "message": "…" }
 */
final class Envelope
{
    /** One resource; `$meta` is added when given, `null` included (GET /properties/counts). */
    public static function ok(mixed $data, mixed $meta = self::class, int $status = 200, array $headers = []): JsonResponse
    {
        $payload = ['data' => $data];
        if ($meta !== self::class) {
            $payload['meta'] = $meta;
        }

        return self::json($payload, $status, $headers);
    }

    /** A list with its pagination meta. */
    public static function list(array $rows, array $meta, array $headers = []): JsonResponse
    {
        return self::json(['data' => array_values($rows), 'meta' => $meta], 200, $headers);
    }

    /** A freshly created record: 201 and the whole record. */
    public static function created(mixed $data, array $headers = []): JsonResponse
    {
        return self::json(['data' => $data], 201, $headers);
    }

    /** An action that produced no resource — or, as some do, a small result beside the message. */
    public static function message(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        return self::json(['data' => $data, 'message' => $message], $status);
    }

    /** The one encoder every JSON answer goes through. */
    public static function json(array $payload, int $status = 200, array $headers = []): JsonResponse
    {
        return new JsonResponse($payload, $status, $headers, JsonValue::ENCODE_FLAGS);
    }
}
