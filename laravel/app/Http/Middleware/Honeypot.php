<?php

namespace App\Http\Middleware;

use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The honeypot of the three public forms — `POST /leads`,
 * `POST /newsletter/subscribe`, `POST /jobs/:id/apply` (01_API_CONTRACT.md →
 * "Rate limiting"): a `website` field no human can see. Anything in it is a
 * bot, which is answered exactly like a success — 200
 * `{ "data": null, "message": "ok" }` — with nothing stored.
 *
 * It runs before the throttle, so a caught bot does not spend the budget of
 * the humans behind the same address.
 */
final class Honeypot
{
    public function handle(Request $request, Closure $next): Response
    {
        $body = $request->attributes->get(ParseJsonBody::ATTRIBUTE);
        $website = Js::get($body, 'website');

        if (is_string($website) && Js::trim($website) !== '') {
            ApiLog::warning('spam', 'Honeypot filled — answered ok, stored nothing', ['path' => $request->path()]);

            return Envelope::message('ok');
        }

        return $next($request);
    }
}
