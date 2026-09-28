<?php

namespace App\Http\Controllers;

use App\Domain\Seo\SitemapBuilder;
use App\Domain\Seo\SitemapHost;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The crawler documents (06_SEO_SITEMAP_ROBOTS.md; the mock's `routes/sitemap.js`):
 *
 *   GET /sitemap.xml                the index of the five below
 *   GET /sitemap-properties.xml     active listings, with their images
 *   GET /sitemap-localities.xml
 *   GET /sitemap-developers.xml
 *   GET /sitemap-articles.xml       live articles, their categories, tags and authors
 *   GET /sitemap-pages.xml          the static routes, property-type pages, published pages
 *   GET /robots.txt
 *   GET /rss.xml                    the latest 20 articles
 *   GET /llms.txt
 *
 * Files, not resources: no envelope, no pagination, no auth — `text/xml` or
 * `text/plain` and an hour of cache. Each answers under `/api` and at the
 * root (routes/seo-root.php) from the same action; the index and robots.txt
 * name the child sitemaps under the path they were fetched from. Built fresh
 * per request, like the mock's, so a published listing is in its sitemap at
 * once and the feed's `lastBuildDate` is the moment it was read.
 */
class SeoFileController extends Controller
{
    public function index(Request $request): Response
    {
        $data = SitemapBuilder::data($this->store);
        $children = ApiLog::measure('build sitemap.xml', fn () => SitemapBuilder::sitemapIndexChildren($data, Clock::ms(Clock::now()), $this->base($request, $data)));

        return $this->send($request, SitemapBuilder::renderSitemapIndex($children), 'text/xml');
    }

    public function urlSet(Request $request, string $name): Response
    {
        $data = SitemapBuilder::data($this->store, $name);
        $entries = ApiLog::measure("build sitemap-{$name}.xml", fn () => SitemapBuilder::sitemapSets($data)[$name] ?? []);
        ApiLog::debug('seo', "sitemap-{$name}.xml: ".count($entries).' URLs');

        return $this->send($request, SitemapBuilder::renderUrlSet($entries), 'text/xml');
    }

    /** On a host that must not be indexed (`SEO_FORCE_NOINDEX`), the blanket disallow whatever the database says. */
    public function robots(Request $request): Response
    {
        $data = SitemapBuilder::data($this->store, 'robots');
        $base = $this->base($request, $data);
        if (config('sna.seo_force_noindex')) {
            ApiLog::info('seo', 'robots.txt: SEO_FORCE_NOINDEX — the blanket disallow');

            return $this->send($request, SitemapBuilder::blanketDisallow($base), 'text/plain');
        }

        return $this->send($request, SitemapBuilder::renderRobots($data, $base), 'text/plain');
    }

    public function rss(Request $request): Response
    {
        $data = SitemapBuilder::data($this->store, 'rss');

        return $this->send($request, ApiLog::measure('build rss.xml', fn () => SitemapBuilder::renderRss($data, Clock::now())), 'text/xml');
    }

    public function llms(Request $request): Response
    {
        $data = SitemapBuilder::data($this->store, 'llms');

        return $this->send($request, ApiLog::measure('build llms.txt', fn () => SitemapBuilder::renderLlms($data, Clock::ms(Clock::now()))), 'text/plain');
    }

    /**
     * Where the child sitemaps are named: the request's origin plus the path
     * the route answers under — `/api`, or nothing at the root — when that
     * origin is allowed, `seoSettings.siteUrl` otherwise (SitemapHost).
     */
    private function base(Request $request, array $data): string
    {
        $prefix = trim((string) $request->route()?->getPrefix(), '/');
        $base = SitemapHost::base(
            $request,
            Js::string($data['seoSettings']['siteUrl'] ?? ''),
            config('sna.api_url'),
            $request->getBaseUrl().($prefix === '' ? '' : "/{$prefix}"),
        );
        ApiLog::debug('seo', "Child sitemaps named on {$base}");

        return $base;
    }

    /**
     * A document with its type, no envelope, and the mock's caching: public
     * for `sna.seo_file_cache_minutes` (an hour), and the weak ETag Express
     * gives it — the same bytes make the same tag — so a crawler's
     * revalidation is answered 304 without the body.
     */
    private function send(Request $request, string $body, string $type): Response
    {
        $response = new Response($body, 200, [
            'Content-Type' => "{$type}; charset=utf-8",
            'Cache-Control' => 'public, max-age='.(60 * (int) config('sna.seo_file_cache_minutes', 60)),
        ]);
        $response->setEtag(dechex(strlen($body)).'-'.substr(base64_encode(sha1($body, true)), 0, 27), true);
        if ($response->isNotModified($request)) {
            ApiLog::debug('seo', "{$request->path()} not modified — 304");
        }

        return $response;
    }
}
