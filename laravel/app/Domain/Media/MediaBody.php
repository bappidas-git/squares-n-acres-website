<?php

namespace App\Domain\Media;

use App\Support\Js;

/**
 * What a media write passes through before it is checked (05_BUSINESS_RULES.md
 * → "Media library").
 *
 * The API stores metadata only: an upload goes straight from the browser to
 * Cloudinary (D12) and the API is told about the result afterwards. The one
 * thing an upload widget always knows is the address, so `provider` is
 * inferred from its host and `type`/`format` from its extension when the
 * client leaves them out — on a `POST` or a `PUT`. A `PATCH` infers nothing
 * (QA-63): a patch of the address alone used to re-infer the type, and an
 * extension-less photograph turned into a "document".
 */
final class MediaBody
{
    /** Extensions that decide `type` when the client does not send one. */
    private const EXTENSION_TYPES = [
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
        'video' => ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
    ];

    /** The host that means the asset is ours to transform. */
    private const CLOUDINARY_HOST = 'res.cloudinary.com';

    /** The default port of each scheme, which a URL's `host` leaves out. */
    private const DEFAULT_PORTS = ['http' => 80, 'https' => 443, 'ws' => 80, 'wss' => 443, 'ftp' => 21];

    /** The inferred fields on a create or a replace; the tags and the folder always. */
    public static function prepare(array $body, string $method): array
    {
        return MediaFolders::normaliseBody(self::normaliseTags($method === 'PATCH' ? $body : self::inferFromUrl($body)));
    }

    /** Fills in `provider`, `type` and `format` when the client left them out. */
    public static function inferFromUrl(array $body): array
    {
        $url = is_string($body['url'] ?? null) ? $body['url'] : '';
        if ($url === '') {
            return $body;
        }
        if (self::blank($body, 'provider')) {
            $body['provider'] = self::host($url) === self::CLOUDINARY_HOST ? 'cloudinary' : 'external';
        }

        $extension = self::extensionOf($url);
        if (self::blank($body, 'type')) {
            $body['type'] = 'document';
            foreach (self::EXTENSION_TYPES as $type => $extensions) {
                if (in_array($extension, $extensions, true)) {
                    $body['type'] = $type;
                    break;
                }
            }
        }
        if ($extension !== '' && self::blank($body, 'format')) {
            $body['format'] = $extension;
        }

        return $body;
    }

    /**
     * The tags a write keeps: trimmed, without the blank ones, each once
     * whatever its case, the first spelling winning (QA-63) —
     * `[" Aerial ", "aerial", "  ", "dusk"]` is `["Aerial", "dusk"]`. Anything
     * that is not a list of strings is left for the validator to refuse.
     */
    public static function normaliseTags(array $body): array
    {
        $tags = $body['tags'] ?? null;
        if (! Js::isList($tags) || array_filter($tags, fn ($tag) => ! is_string($tag)) !== []) {
            return $body;
        }

        $seen = [];
        $kept = [];
        foreach ($tags as $tag) {
            $tag = Js::trim($tag);
            $key = Js::lower($tag);
            if ($tag === '' || array_key_exists($key, $seen)) {
                continue;
            }
            $seen[$key] = true;
            $kept[] = $tag;
        }
        $body['tags'] = $kept;

        return $body;
    }

    /** The file extension of an address — of its path, lowercase and without the dot; `''` for none. */
    public static function extensionOf(string $url): string
    {
        $path = self::parts($url)['path'] ?? $url;

        return preg_match('/\.([a-z0-9]+)\z/i', $path, $match) ? strtolower($match[1]) : '';
    }

    /** A URL's `host` (`new URL(url).host`): lowercase, with a port only when it is not the scheme's own. */
    private static function host(string $url): string
    {
        $parts = self::parts($url);
        if ($parts === null || ! isset($parts['host'])) {
            return '';
        }
        $scheme = strtolower($parts['scheme']);
        $port = isset($parts['port']) && $parts['port'] !== (self::DEFAULT_PORTS[$scheme] ?? null) ? ":{$parts['port']}" : '';

        return strtolower($parts['host']).$port;
    }

    /**
     * An absolute URL's parts, `path` always set; null for what a URL parser
     * refuses (no scheme — a relative address has no base to resolve against).
     */
    private static function parts(string $url): ?array
    {
        if (! preg_match('~^[a-z][a-z0-9+.\-]*:~i', $url)) {
            return null;
        }
        $parts = parse_url($url);

        return is_array($parts) && isset($parts['scheme']) ? $parts + ['path' => ''] : null;
    }

    /** `undefined`, `null` and `''` all mean "not sent". */
    private static function blank(array $body, string $field): bool
    {
        return ($body[$field] ?? null) === null || $body[$field] === '';
    }
}
