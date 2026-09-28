<?php

namespace App\Http\Middleware;

use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Json\JsonValue;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use stdClass;
use Symfony\Component\HttpFoundation\Response;

/**
 * Staging blocks crawlers by environment, not by data (07_DEPLOYMENT.md →
 * "Cloudways specifics that bite").
 *
 * With `SEO_FORCE_NOINDEX=true`, every public read answers `seo.robots` and
 * `seoSettings.defaults.robots` as `index: false, follow: false`, whatever the
 * database says: a staging database is copied to production sooner or later,
 * and a "block crawlers" switch stored in it would go live with it. The
 * `X-Robots-Tag` header and robots.txt are handled by SecurityHeaders and the
 * robots.txt builder. Production leaves the variable unset, and this does
 * nothing.
 */
final class ForceNoindex
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! config('sna.seo_force_noindex')
            || ! $request->isMethod('GET')
            || $request->is('api/admin', 'api/admin/*')
            || ! $response instanceof JsonResponse) {
            return $response;
        }

        $body = JsonValue::decode((string) $response->getContent());
        if ($body === null) {
            return $response;
        }
        $response->setContent(JsonValue::encode(self::noindex($body)));
        ApiLog::debug('seo', 'SEO_FORCE_NOINDEX: robots directives rewritten to noindex');

        return $response;
    }

    /** Every `robots: { index, follow, … }` object, at any depth, set to noindex, nofollow. */
    private static function noindex(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            foreach (get_object_vars($value) as $key => $entry) {
                $value->{$key} = self::noindex($entry);
            }

            return $value;
        }
        if (! is_array($value)) {
            return $value;
        }
        foreach ($value as $key => $entry) {
            if ($key === 'robots' && Js::isPlainObject($entry) && Js::has($entry, 'index')) {
                $value[$key] = [...Js::entries($entry), 'index' => false, 'follow' => false];

                continue;
            }
            $value[$key] = self::noindex($entry);
        }

        return $value;
    }
}
