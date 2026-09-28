<?php

namespace App\Http\Controllers;

use App\Support\Api\Envelope;
use App\Support\Time\Clock;
use Illuminate\Http\JsonResponse;

/**
 * `GET /health` — is the API up, what time does it think it is, which
 * version answered. The smoke test's first request.
 */
class HealthController extends Controller
{
    public function show(): JsonResponse
    {
        return Envelope::ok([
            'status' => 'ok',
            'time' => Clock::nowIso(),
            'version' => config('app.version', '1.0.0'),
        ]);
    }
}
