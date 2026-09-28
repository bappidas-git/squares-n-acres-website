<?php

namespace App\Providers;

use App\Crud\Resources;
use App\Http\Middleware\LogApiTraffic;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // One document store per request: what it loaded is what the request sees.
        $this->app->scoped(DocumentStore::class);
        $this->app->scoped(Resources::class);
    }

    public function boot(): void
    {
        $this->configureRateLimiting();

        // Every API request and its response are logged — to the Debugbar and
        // the `api` channel — as a global middleware, so a 404 is logged too.
        // Pushed here, after the Debugbar's own middleware registered itself
        // (package providers boot first), so the log runs inside the
        // Debugbar's request and its entries land in the stored data.
        $this->app->make(HttpKernel::class)->pushMiddleware(LogApiTraffic::class);
    }

    /**
     * 01_API_CONTRACT.md → "Rate limiting". Over a limit the answer is 429 in
     * the §5.3 envelope with `Retry-After`; the wording is part of the
     * contract, because the site shows it in a toast.
     */
    private function configureRateLimiting(): void
    {
        // Read per request, so a limit changed at run time (a test) applies.
        $perMinute = fn (string $name) => Limit::perMinute((int) config("sna.rate_limits.{$name}"));
        $tooMany = fn (string $message = ApiException::TOO_MANY) => function (Request $request, array $headers) use ($message) {
            ApiLog::warning('throttle', "429 {$request->method()} /{$request->path()}", ['retryAfter' => $headers['Retry-After'] ?? null]);

            return Envelope::json(['message' => $message], 429, $headers);
        };

        // The three anonymous writes: ten a minute per IP, per form.
        RateLimiter::for('public-forms', fn (Request $request) => $perMinute('public_forms_per_minute')
            ->by('form:'.$request->route()?->uri().'|'.$request->ip())
            ->response($tooMany()));

        // Signing in: five a minute, keyed on the address plus the IP.
        RateLimiter::for('login', function (Request $request) use ($perMinute, $tooMany) {
            $email = Js::get($request->attributes->get('jsonBody'), 'email');
            $email = is_string($email) ? Js::lower(Js::trim($email)) : '';

            return $perMinute('login_per_minute')
                ->by('login:'.$email.'|'.$request->ip())
                ->response($tooMany());
        });

        // Changing the password takes the current one: five tries a minute per account.
        RateLimiter::for('password', fn (Request $request) => $perMinute('password_per_minute')
            ->by('password:'.$request->user()?->getKey())
            ->response($tooMany('Too many attempts to change the password. Try again in a minute.')));

        // Signed-in routes are throttled by user, not by IP (an office shares one address).
        RateLimiter::for('admin', fn (Request $request) => $perMinute('admin_per_minute')
            ->by('admin:'.($request->user()?->getKey() ?? $request->ip()))
            ->response($tooMany()));

        RateLimiter::for('redirect-hits', fn (Request $request) => $perMinute('redirect_hits_per_minute')
            ->by('hit:'.$request->ip())
            ->response($tooMany()));

        RateLimiter::for('not-found-reports', fn (Request $request) => $perMinute('not_found_per_minute')
            ->by('404:'.$request->ip())
            ->response($tooMany()));
    }
}
