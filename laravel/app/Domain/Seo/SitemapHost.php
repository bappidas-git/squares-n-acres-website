<?php

namespace App\Domain\Seo;

use App\Support\Js;
use Illuminate\Http\Request;

/**
 * Where the sitemap index and robots.txt name their child sitemaps
 * (06_SEO_SITEMAP_ROBOTS.md → "The host the index names"; the mock's
 * `lib/sitemapHost.js`).
 *
 * On the origin and prefix the document was fetched from — `/api/sitemap.xml`
 * on the API host names `/api/sitemap-properties.xml` there — but only when
 * that origin is one the site answers on: the origin of `seoSettings.siteUrl`,
 * the API's own (`APP_URL`) and a local one. Any other `Host` or
 * `X-Forwarded-Host` falls back to `seoSettings.siteUrl`: a forged header must
 * never put another site's address into a document a crawler caches. The
 * forwarded headers only propose the origin; the list decides.
 *
 * The pages inside the child sitemaps are not affected: they always carry
 * `seoSettings.siteUrl`.
 */
final class SitemapHost
{
    /** Hosts that are this machine, on any port. */
    private const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

    /**
     * The base the child sitemaps are named on: `<origin><prefix>` for a
     * request on an allowed origin, `seoSettings.siteUrl` for any other.
     * `$prefix` is the path the documents were fetched under (`/api`, or
     * nothing at the root).
     */
    public static function base(Request $request, string $siteUrl, ?string $apiUrl, string $prefix): string
    {
        $origin = self::requestOrigin($request);
        if (self::isAllowedOrigin($origin, $siteUrl, $apiUrl)) {
            return $origin.$prefix;
        }

        return (string) preg_replace('~/+\z~', '', $siteUrl);
    }

    /**
     * The origin a request proposes: the forwarded scheme and host when a
     * proxy set them, the connection's own otherwise — read from the headers
     * as they came, so the list below is the only judge.
     */
    public static function requestOrigin(Request $request): ?string
    {
        $https = (string) $request->server('HTTPS', '');
        $proto = self::firstOf($request->headers->get('X-Forwarded-Proto'));
        if ($proto === '') {
            $proto = $https !== '' && strtolower($https) !== 'off' ? 'https' : 'http';
        }
        $host = self::firstOf($request->headers->get('X-Forwarded-Host'));
        if ($host === '') {
            $host = (string) $request->headers->get('Host', '');
        }
        if ($host === '' || ! preg_match('/^https?$/i', $proto)) {
            return null;
        }

        return self::originOf(strtolower($proto).'://'.$host);
    }

    /** Whether the index may name its children on an origin. */
    public static function isAllowedOrigin(?string $origin, string $siteUrl, ?string $apiUrl): bool
    {
        $parsed = self::parse($origin);
        if ($parsed === null) {
            return false;
        }
        if (in_array($parsed['host'], self::LOCAL_HOSTS, true)) {
            return true;
        }

        return in_array($origin, array_filter([self::originOf($siteUrl), self::originOf($apiUrl)]), true);
    }

    /** `https://www.example.com` for any http(s) address of that origin, or null. */
    public static function originOf(mixed $url): ?string
    {
        return self::parse($url)['origin'] ?? null;
    }

    /**
     * An http(s) address as the URL standard reads its origin: scheme and host
     * lower-cased, the default port dropped, the user info and path ignored.
     * A host the standard would refuse is no origin at all.
     *
     * @return array{origin: string, host: string}|null
     */
    private static function parse(mixed $url): ?array
    {
        if (! is_string($url) || $url === '') {
            return null;
        }
        $parts = parse_url(trim($url, "\x00..\x20"));
        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }
        $scheme = strtolower($parts['scheme']);
        $host = strtolower($parts['host']);
        $valid = str_starts_with($host, '[')
            ? preg_match('/^\[[0-9a-f:.]+\]$/', $host)
            : preg_match('~^[^\x00-\x20#%/:<>?@\[\\\\\]^|\x7f]+$~', $host);
        if (($scheme !== 'http' && $scheme !== 'https') || ! $valid) {
            return null;
        }
        $port = $parts['port'] ?? null;
        $default = $scheme === 'https' ? 443 : 80;

        return [
            'origin' => "{$scheme}://{$host}".($port !== null && $port !== $default ? ":{$port}" : ''),
            'host' => $host,
        ];
    }

    /** The first value of a header a chain of proxies may have appended to. */
    private static function firstOf(?string $value): string
    {
        return Js::trim(explode(',', (string) $value)[0]);
    }
}
