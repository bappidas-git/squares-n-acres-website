<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\HandleCors as FrameworkHandleCors;

/**
 * Laravel's CORS middleware, reading `cors.paths` as the plain list it is.
 *
 * The framework also accepts paths keyed by host and looks the request's
 * `Host` up in the config first: a `Host: 1` header named the list's second
 * entry, a string, and the request failed with a 500 before it reached a
 * route. The mock answers such a request normally, and so does this.
 */
final class HandleCors extends FrameworkHandleCors
{
    /** @return array<int, string> */
    protected function getPathsByHost(string $host)
    {
        return array_values(array_filter(
            (array) $this->container['config']->get('cors.paths', []),
            fn (mixed $path) => is_string($path),
        ));
    }
}
