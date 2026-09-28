<?php

namespace App\Support\Debug;

use Closure;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Request/response and decision logging through the Laravel Debugbar.
 *
 * Every message goes to two places:
 *
 *  - the **Debugbar** (barryvdh/laravel-debugbar), when it is installed and
 *    enabled — its Messages tab, labelled (`request`, `response`, `leads`,
 *    `properties`…), next to the queries, the route and the timeline of the
 *    same request. API requests are stored under storage/debugbar and can be
 *    browsed at /_debugbar/open (localhost), or with the Clockwork browser
 *    extension when DEBUGBAR_CLOCKWORK=true;
 *  - the **`api` log channel** (storage/logs/api-YYYY-MM-DD.log), always, so
 *    production — where the Debugbar is a dev dependency and switched off —
 *    still keeps the trail.
 *
 * The Debugbar is `require-dev`: nothing here may assume it exists.
 */
final class ApiLog
{
    /** The Debugbar, when it is installed and switched on for this request. */
    public static function debugbar(): ?object
    {
        try {
            if (! app()->bound('debugbar')) {
                return null;
            }
            $debugbar = app('debugbar');

            return method_exists($debugbar, 'isEnabled') && $debugbar->isEnabled() ? $debugbar : null;
        } catch (Throwable) {
            return null;
        }
    }

    public static function debug(string $label, string $message, array $context = []): void
    {
        self::write('debug', $label, $message, $context);
    }

    public static function info(string $label, string $message, array $context = []): void
    {
        self::write('info', $label, $message, $context);
    }

    public static function warning(string $label, string $message, array $context = []): void
    {
        self::write('warning', $label, $message, $context);
    }

    public static function error(string $label, string $message, array $context = []): void
    {
        self::write('error', $label, $message, $context);
    }

    /**
     * Times a unit of work on the Debugbar's timeline.
     *
     * @template T
     *
     * @param  Closure(): T  $work
     * @return T
     */
    public static function measure(string $label, Closure $work): mixed
    {
        $debugbar = self::debugbar();
        if ($debugbar === null) {
            return $work();
        }

        $name = $label.'#'.spl_object_id($work);
        $debugbar->startMeasure($name, $label);
        try {
            return $work();
        } finally {
            try {
                $debugbar->stopMeasure($name);
            } catch (Throwable) {
                // A measure that never started is not worth failing the request over.
            }
        }
    }

    /** Records an exception on the Debugbar's Exceptions tab. */
    public static function exception(Throwable $exception): void
    {
        $debugbar = self::debugbar();
        if ($debugbar !== null && method_exists($debugbar, 'addThrowable')) {
            $debugbar->addThrowable($exception);
        }
    }

    /**
     * The value with every secret replaced — a password, a token, the
     * honeypot — at any depth.
     */
    public static function redact(mixed $value): mixed
    {
        $secrets = array_map('strtolower', (array) config('sna.logging.redact', []));

        if (is_object($value)) {
            $value = get_object_vars($value);
        }
        if (! is_array($value)) {
            return $value;
        }

        $clean = [];
        foreach ($value as $key => $entry) {
            $clean[$key] = in_array(strtolower((string) $key), $secrets, true) && $entry !== null && $entry !== ''
                ? '********'
                : self::redact($entry);
        }

        return $clean;
    }

    /** A body cut to what a log line should carry. */
    public static function truncate(string $text, ?int $limit = null): string
    {
        $limit ??= (int) config('sna.logging.max_body_length', 4000);

        return mb_strlen($text) > $limit ? mb_substr($text, 0, $limit).'… ('.mb_strlen($text).' chars)' : $text;
    }

    private static function write(string $level, string $label, string $message, array $context): void
    {
        $debugbar = self::debugbar();
        if ($debugbar !== null) {
            try {
                $debugbar->addMessage($context === [] ? $message : ['message' => $message, 'context' => $context], $label);
            } catch (Throwable) {
                // Logging must never break the request it describes.
            }
        }

        try {
            Log::channel('api')->log($level, "[{$label}] {$message}", $context);
        } catch (Throwable) {
            // Same rule for the log file: a full disk is not the visitor's problem.
        }
    }
}
