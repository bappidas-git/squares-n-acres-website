<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\AdminPermission;
use App\Http\Middleware\AuthenticateToken;
use App\Http\Middleware\ForceNoindex;
use App\Http\Middleware\HandleCors;
use App\Http\Middleware\Honeypot;
use App\Http\Middleware\ParseJsonBody;
use App\Http\Middleware\SecurityHeaders;
use App\Support\Api\ApiException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors as FrameworkHandleCors;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // The crawler documents answer at the root as well as under /api
            // (01_API_CONTRACT.md §5.13), from the same controller, with the
            // API's middleware rather than the web group's sessions and CSRF.
            Route::middleware('api')->group(base_path('routes/seo-root.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // TLS ends at the platform's proxy: trust its X-Forwarded-* headers …
        $middleware->trustProxies(at: '*');
        // … and answer only for the site's own hosts (config/sna.php → trusted_hosts).
        $middleware->trustHosts(at: fn () => array_map(
            fn (string $host) => '^'.preg_quote($host).'$',
            config('sna.trusted_hosts'),
        ), subdomains: false);

        // CORS paths are one list for every host (see the class).
        $middleware->replace(FrameworkHandleCors::class, HandleCors::class);

        // The API's JSON body, read the way the contract means it; and on
        // staging (SEO_FORCE_NOINDEX) every public read says noindex.
        $middleware->group('api', [
            ParseJsonBody::class,
            ForceNoindex::class,
            SubstituteBindings::class,
        ]);

        $middleware->alias([
            'auth.token' => AuthenticateToken::class,
            'permission' => AdminPermission::class,
            'honeypot' => Honeypot::class,
        ]);

        // Every /api/admin route: a bearer token, the role matrix, 120 a minute per user.
        $middleware->group('admin', [
            AuthenticateToken::class,
            AdminPermission::class,
            'throttle:admin',
        ]);

        $middleware->append(SecurityHeaders::class);

        // The API trims per field where the contract says so (TrimStrings is
        // the mock's `trimStrings` option); an empty string stays a string.
        $middleware->trimStrings(except: [fn (Request $request) => $request->is('api/*')]);
        $middleware->convertEmptyStringsToNull(except: [fn (Request $request) => $request->is('api/*')]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Known failures are answers, not errors worth a stack trace in the log.
        $exceptions->dontReport([ApiException::class]);
        $exceptions->render(new ApiExceptionRenderer);
    })->create();
