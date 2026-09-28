<?php

namespace App\Domain\Seo;

use App\Contract\Contract;
use App\Domain\Articles\ArticleVisibility;
use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Query\Sorter;
use App\Support\Time\Clock;
use Carbon\CarbonImmutable;

/**
 * Sitemaps, RSS, robots.txt and llms.txt (06_SEO_SITEMAP_ROBOTS.md; the
 * mock's `lib/sitemapBuilder.js`).
 *
 * Everything here answers one question — *what is the public URL of this
 * record?* — and wraps the answer in the document a crawler expects. The URL
 * map (publicPathOf) is the single place the API states that a property lives
 * at `/properties/<slug>` and a builder at `/builders/<slug>`, so the SEO desk
 * (`GET /admin/seo/overview`) and the crawler never disagree about where a
 * page is.
 *
 * Three settings shape the output: `seoSettings.siteUrl` makes the URLs
 * absolute, `seoSettings.sitemap` supplies the defaults and `excludeUrls`, and
 * a record's own `seo.sitemap` overrides its `priority` and `changefreq` or
 * drops it from the file.
 *
 * The builders are pure functions of `$data` — the collections plus
 * `seoSettings` and `siteSettings`, as data() gathers them — so a caller can
 * render a document without serving it (the SEO screen's llms.txt preview).
 */
final class SitemapBuilder
{
    /** The sitemap namespaces (sitemaps.org 0.9 and Google's image extension). */
    public const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

    public const IMAGE_NS = 'http://www.google.com/schemas/sitemap-image/1.1';

    /** At most this many images per URL. */
    public const IMAGES_PER_URL = 5;

    /** How many articles the RSS feed carries. */
    public const RSS_LIMIT = 20;

    /** How many entries each generated llms.txt section lists. */
    public const LLMS_LIMIT = 10;

    /** The routes that exist without a record behind them. */
    public const STATIC_ROUTES = [
        '/',
        '/properties',
        '/buy',
        '/rent',
        '/lease',
        '/commercial',
        '/plots',
        '/buy/pre-launch',
        '/buy/under-construction',
        '/buy/ready-to-move',
        '/buy/resale',
        '/localities',
        '/builders',
        '/insights/articles',
        '/insights/faqs',
    ];

    /** The five child sitemaps of the index, in the order it lists them. */
    public const CHILD_SITEMAPS = ['properties', 'localities', 'developers', 'articles', 'pages'];

    /**
     * The collections each document reads (the index reads them all), so
     * robots.txt does not load every listing with its gallery.
     */
    public const SOURCES = [
        'properties' => ['properties'],
        'localities' => ['localities'],
        'developers' => ['developers'],
        'articles' => ['articles', 'articleCategories', 'articleTags', 'authors'],
        'pages' => ['pages', 'propertyTypes', 'segments'],
        'rss' => ['articles', 'articleCategories', 'authors'],
        'llms' => ['localities', 'propertyTypes', 'segments', 'properties', 'articles'],
        'robots' => [],
    ];

    /** The template of a page the site generates itself (src/config/pages.js). */
    private const SYSTEM_TEMPLATE = 'system';

    /**
     * What a document is built from, read fresh for each request: the
     * collections `$document` needs (every one when null) and both settings
     * singletons. Before the SEO settings are first saved there is no
     * `siteUrl`; the configured SITE_URL stands in, so no URL is relative.
     */
    public static function data(DocumentStore $store, ?string $document = null): array
    {
        $sources = $document === null
            ? array_values(array_unique(array_merge(...array_values(self::SOURCES))))
            : self::SOURCES[$document];

        $data = [];
        foreach ($sources as $collection) {
            $data[$collection] = $store->all($collection);
        }
        $seo = $store->singleton('seoSettings') ?? [];
        if (! is_string($seo['siteUrl'] ?? null) || Js::trim($seo['siteUrl']) === '') {
            $seo['siteUrl'] = (string) config('sna.site_url');
        }

        return $data + ['seoSettings' => $seo, 'siteSettings' => $store->singleton('siteSettings') ?? []];
    }

    /* ------------------------------------------------------------------ *
     * The URL map
     * ------------------------------------------------------------------ */

    /**
     * The public path of one record, or null for a type with no page.
     *
     * `page` special-cases `home`, the site root; a property type lives under
     * the listing route of its segment's **kind** (D25, QA-52) — a type in an
     * "Industrial" segment of the commercial kind is under `/commercial` too —
     * read from `$context['segments']`.
     */
    public static function publicPathOf(string $type, ?array $entity, array $context = []): ?string
    {
        if ($entity === null) {
            return null;
        }
        $slug = array_key_exists('slug', $entity) ? Js::string($entity['slug']) : 'undefined';

        return match ($type) {
            'property' => "/properties/{$slug}",
            'locality' => "/localities/{$slug}",
            'developer' => "/builders/{$slug}",
            'article' => "/insights/articles/{$slug}",
            'articleCategory' => "/insights/articles/category/{$slug}",
            'articleTag' => "/insights/articles/tag/{$slug}",
            'author' => "/insights/authors/{$slug}",
            'page' => ($entity['slug'] ?? null) === 'home' ? '/' : "/{$slug}",
            'propertyType' => self::segmentKind($entity['segment'] ?? null, $context['segments'] ?? []) === 'commercial'
                ? "/commercial/{$slug}"
                : "/buy/{$slug}",
            default => null,
        };
    }

    /** `<siteUrl><path>`, with exactly one slash between them and none at the end. */
    public static function absoluteUrl(mixed $siteUrl, mixed $path): string
    {
        $base = (string) preg_replace('~/+\z~', '', $siteUrl === null ? '' : Js::string($siteUrl));
        $suffix = $path === null ? '' : Js::string($path);
        if ($suffix === '/' || $suffix === '') {
            return $base !== '' ? $base : '/';
        }

        return $base.(str_starts_with($suffix, '/') ? '' : '/').$suffix;
    }

    /**
     * What a segment behaves as (src/config/segments.js): a built-in one is
     * its own kind; another is its record's `kind`, or null when unknown.
     */
    public static function segmentKind(mixed $slug, array $segments): ?string
    {
        $kinds = Contract::enumValues('SEGMENTS');
        if (in_array($slug, $kinds, true)) {
            return $slug;
        }
        if (! self::truthy($slug)) {
            return null;
        }
        foreach ($segments as $segment) {
            if (($segment['slug'] ?? null) === $slug) {
                $kind = $segment['kind'] ?? null;

                return in_array($kind, $kinds, true) ? $kind : null;
            }
        }

        return null;
    }

    /** The `seoSettings.sitemap` branch, with the defaults filled in. */
    public static function sitemapSettings(mixed $seoSettings): array
    {
        $sitemap = Js::get($seoSettings, 'sitemap') ?? [];
        $excludeUrls = Js::get($sitemap, 'excludeUrls');

        return [
            'enabled' => Js::get($sitemap, 'enabled') !== false,
            'includeProperties' => Js::get($sitemap, 'includeProperties') !== false,
            'includeLocalities' => Js::get($sitemap, 'includeLocalities') !== false,
            'includeDevelopers' => Js::get($sitemap, 'includeDevelopers') !== false,
            'includeArticles' => Js::get($sitemap, 'includeArticles') !== false,
            'includePages' => Js::get($sitemap, 'includePages') !== false,
            'changefreq' => Js::entries(Js::get($sitemap, 'changefreq')),
            'priority' => Js::entries(Js::get($sitemap, 'priority')),
            'excludeUrls' => Js::isList($excludeUrls) ? $excludeUrls : [],
        ];
    }

    /* ------------------------------------------------------------------ *
     * Sitemaps
     * ------------------------------------------------------------------ */

    /**
     * The five `<url>` sets of the sitemap family, keyed by CHILD_SITEMAPS.
     *
     * @return array<string, array<int, array>>
     */
    public static function sitemapSets(array $data, ?int $nowMs = null): array
    {
        $settings = self::sitemapSettings($data['seoSettings'] ?? null);
        $siteUrl = Sorter::path($data, 'seoSettings.siteUrl') ?? '';
        $rows = fn (string $name) => Js::isList($data[$name] ?? null) ? $data[$name] : [];
        $active = fn (string $name) => array_values(array_filter($rows($name), fn ($row) => self::truthy($row['isActive'] ?? null)));

        $build = function (string $type, array $records, ?callable $extra = null, array $options = []) use ($siteUrl, $settings): array {
            $entries = [];
            foreach ($records as $entity) {
                $entry = self::urlEntry($type, $entity, $siteUrl, $options['settings'] ?? $settings, $extra ? $extra($entity) : [], $options['context'] ?? []);
                if ($entry !== null) {
                    $entries[] = $entry;
                }
            }

            return $entries;
        };

        if (! $settings['enabled']) {
            return array_fill_keys(self::CHILD_SITEMAPS, []);
        }

        $published = ArticleVisibility::live($rows('articles'), $nowMs ?? Clock::ms(Clock::now()));

        $properties = $settings['includeProperties']
            ? $build('property', $active('properties'), fn (array $property) => [
                'images' => array_values(array_map(
                    fn ($image) => ['loc' => Js::get($image, 'url'), 'title' => Js::get($image, 'alt') ?? ($property['title'] ?? null)],
                    array_filter((array) ($property['images'] ?? []), fn ($image) => self::truthy(Js::get($image, 'url'))),
                )),
            ])
            : [];

        $localities = $settings['includeLocalities'] ? $build('locality', $active('localities')) : [];
        $developers = $settings['includeDevelopers'] ? $build('developer', $active('developers')) : [];

        // An article index lists the taxonomy pages too: they are where a
        // crawler finds the articles not linked from the blog's first page.
        $articles = $settings['includeArticles']
            ? [
                ...$build('article', $published),
                ...$build('articleCategory', $active('articleCategories')),
                ...$build('articleTag', $rows('articleTags')),
                ...$build('author', $active('authors')),
            ]
            : [];

        // A built-in page (template `system`, QA-56) is a route the site
        // answers itself — listed with the static routes, or, like
        // `/shortlist`, no page for a crawler. Its record names it in menus.
        $cmsPages = array_values(array_filter(
            $rows('pages'),
            fn ($page) => ($page['status'] ?? null) === 'published' && ($page['template'] ?? null) !== self::SYSTEM_TEMPLATE,
        ));

        // A property-type landing page (`/buy/apartments`, D25) is a listing
        // route like `/buy/ready-to-move`: it takes the `page` defaults when
        // `seoSettings.sitemap` names none of its own.
        $typeSettings = [
            ...$settings,
            'changefreq' => [...$settings['changefreq'], 'propertyType' => $settings['changefreq']['propertyType'] ?? $settings['changefreq']['page'] ?? null],
            'priority' => [...$settings['priority'], 'propertyType' => $settings['priority']['propertyType'] ?? $settings['priority']['page'] ?? null],
        ];
        $propertyTypes = $build('propertyType', $active('propertyTypes'), null, [
            'settings' => $typeSettings,
            'context' => ['segments' => $rows('segments')],
        ]);

        $pages = [];
        if ($settings['includePages']) {
            $cmsEntries = $build('page', $cmsPages);
            $lastmod = self::latest($cmsEntries);
            foreach (self::STATIC_ROUTES as $path) {
                $entry = self::staticEntry($path, $siteUrl, $settings, $lastmod);
                if ($entry !== null) {
                    $pages[] = $entry;
                }
            }
            $home = self::absoluteUrl($siteUrl, '/');
            $pages = [
                ...$pages,
                ...$propertyTypes,
                ...array_filter($cmsEntries, fn (array $entry) => $entry['loc'] !== $home),
            ];
        }

        return [
            'properties' => $properties,
            'localities' => $localities,
            'developers' => $developers,
            'articles' => $articles,
            'pages' => array_values($pages),
        ];
    }

    /** A `<urlset>` document. */
    public static function renderUrlSet(array $entries): string
    {
        $hasImages = false;
        $urls = [];
        foreach ($entries as $entry) {
            $images = $entry['images'] ?? [];
            $hasImages = $hasImages || $images !== [];
            $priority = $entry['priority'] ?? null;
            $urls[] = Xml::element('url', [
                Xml::element('loc', $entry['loc']),
                ...(self::truthy($entry['lastmod'] ?? null) ? [Xml::element('lastmod', $entry['lastmod'])] : []),
                ...(self::truthy($entry['changefreq'] ?? null) ? [Xml::element('changefreq', $entry['changefreq'])] : []),
                ...($priority === null ? [] : [Xml::element('priority', self::toFixed1($priority))]),
                ...array_map([self::class, 'imageElement'], $images),
            ]);
        }

        return Xml::document(Xml::element('urlset', $urls, [
            'xmlns' => self::SITEMAP_NS,
            ...($hasImages ? ['xmlns:image' => self::IMAGE_NS] : []),
        ]));
    }

    /**
     * The index's children, named on `$base` (SitemapHost::base()), each
     * with the newest `<lastmod>` of its set.
     *
     * @return array<int, array{name: string, loc: string, lastmod: ?string}>
     */
    public static function sitemapIndexChildren(array $data, ?int $nowMs = null, ?string $base = null): array
    {
        $sets = self::sitemapSets($data, $nowMs);
        $siteUrl = $base ?? Sorter::path($data, 'seoSettings.siteUrl') ?? '';

        return array_map(fn (string $name) => [
            'name' => $name,
            'loc' => self::absoluteUrl($siteUrl, "/sitemap-{$name}.xml"),
            'lastmod' => self::latest($sets[$name] ?? []),
        ], self::CHILD_SITEMAPS);
    }

    /** The `<sitemapindex>` document. */
    public static function renderSitemapIndex(array $children): string
    {
        return Xml::document(Xml::element(
            'sitemapindex',
            array_map(fn (array $child) => Xml::element('sitemap', [
                Xml::element('loc', $child['loc']),
                ...(self::truthy($child['lastmod'] ?? null) ? [Xml::element('lastmod', $child['lastmod'])] : []),
            ]), $children),
            ['xmlns' => self::SITEMAP_NS],
        ));
    }

    /* ------------------------------------------------------------------ *
     * RSS, robots.txt, llms.txt
     * ------------------------------------------------------------------ */

    /**
     * The RSS 2.0 feed of the latest published articles. `pubDate` and
     * `lastBuildDate` are RFC 822 — the one place a date is not ISO — and the
     * description is the article's plain-text excerpt.
     */
    public static function renderRss(array $data, ?CarbonImmutable $now = null): string
    {
        $now ??= Clock::now();
        $siteUrl = Sorter::path($data, 'seoSettings.siteUrl') ?? '';
        $siteName = Js::string(Sorter::path($data, 'siteSettings.general.siteName') ?? 'Squares N Acres');
        $categories = Js::isList($data['articleCategories'] ?? null) ? $data['articleCategories'] : [];
        $authors = Js::isList($data['authors'] ?? null) ? $data['authors'] : [];

        $articles = self::newestFirst(ArticleVisibility::live(Js::isList($data['articles'] ?? null) ? $data['articles'] : [], Clock::ms($now)));

        $items = [];
        foreach (array_slice($articles, 0, self::RSS_LIMIT) as $article) {
            $link = self::absoluteUrl($siteUrl, self::publicPathOf('article', $article));
            $category = self::byStrictId($categories, $article['categoryId'] ?? null);
            $author = self::byStrictId($authors, $article['authorId'] ?? null);
            $published = self::truthy($article['publishedAt'] ?? null) ? Clock::parse($article['publishedAt']) : null;

            $items[] = Xml::element('item', [
                Xml::element('title', $article['title'] ?? null),
                Xml::element('link', $link),
                Xml::element('guid', $link, ['isPermaLink' => 'true']),
                ...($published ? [Xml::element('pubDate', self::rfc822($published))] : []),
                Xml::element('description', $article['excerpt'] ?? ''),
                ...($category ? [Xml::element('category', $category['name'] ?? null)] : []),
                ...($author ? [Xml::element('author', $author['name'] ?? null)] : []),
            ]);
        }

        return Xml::document(Xml::element('rss', [
            Xml::element('channel', [
                Xml::element('title', "{$siteName} — Insights"),
                Xml::element('link', self::absoluteUrl($siteUrl, '/insights/articles')),
                Xml::element('description', Sorter::path($data, 'seoSettings.defaults.metaDescription') ?? "Articles from {$siteName}."),
                Xml::element('language', 'en-IN'),
                Xml::element('lastBuildDate', self::rfc822($now)),
                Xml::element('atom:link', null, [
                    'href' => self::absoluteUrl($siteUrl, '/rss.xml'),
                    'rel' => 'self',
                    'type' => 'application/rss+xml',
                ]),
                ...$items,
            ]),
        ], ['version' => '2.0', 'xmlns:atom' => 'http://www.w3.org/2005/Atom']));
    }

    /**
     * robots.txt: the stored document with `%siteurl%` resolved and one
     * `Sitemap:` line per child sitemap it does not already declare — named
     * on `$base`, the address the request came in on when it is an allowed
     * one (SitemapHost), `seoSettings.siteUrl` otherwise.
     */
    public static function renderRobots(array $data, ?string $base = null): string
    {
        $siteUrl = (string) preg_replace('~/+\z~', '', Js::string(Sorter::path($data, 'seoSettings.siteUrl') ?? ''));
        $stored = str_ireplace('%siteurl%', $siteUrl, Js::string(Sorter::path($data, 'seoSettings.robotsTxt') ?? ''));
        $childBase = $base ?? $siteUrl;

        $declared = [];
        foreach (explode("\n", $stored) as $line) {
            if (preg_match('/^sitemap:/i', Js::trim($line))) {
                $declared[Js::trim(implode(':', array_slice(explode(':', $line), 1)))] = true;
            }
        }

        $lines = [(string) preg_replace('/['.Js::SPACE.']+\z/u', '', $stored)];
        foreach (self::CHILD_SITEMAPS as $name) {
            $url = self::absoluteUrl($childBase, "/sitemap-{$name}.xml");
            if (! isset($declared[$url])) {
                $lines[] = "Sitemap: {$url}";
            }
        }

        return implode("\n", $lines)."\n";
    }

    /**
     * The robots.txt of a host that must not be indexed (`SEO_FORCE_NOINDEX`,
     * 07_DEPLOYMENT.md → "Cloudways specifics that bite"): the four-line
     * blanket disallow, whatever the database says. It still names the index,
     * so the deploy's smoke walk reads a `Sitemap:` line on staging too.
     */
    public static function blanketDisallow(string $base): string
    {
        return "User-agent: *\nDisallow: /\n\nSitemap: ".self::absoluteUrl($base, '/sitemap.xml')."\n";
    }

    /**
     * The generated llms.txt: what the site is, and the links an answer
     * engine needs to cite it — localities and property types in the editor's
     * order, the featured listings by priority, the newest guides, and how to
     * get in touch. Every link is absolute.
     */
    public static function generateLlms(array $data, ?int $nowMs = null): string
    {
        $siteUrl = Sorter::path($data, 'seoSettings.siteUrl') ?? '';
        $general = Js::get($data['siteSettings'] ?? null, 'general') ?? [];
        $siteName = Js::string(Js::get($general, 'siteName') ?? 'Squares N Acres');
        $link = fn (?string $path, string $label) => "- [{$label}](".self::absoluteUrl($siteUrl, $path).')';
        $label = fn (array $record, string $field) => array_key_exists($field, $record) ? Js::string($record[$field]) : 'undefined';

        $rows = fn (string $name) => Js::isList($data[$name] ?? null) ? $data[$name] : [];
        $active = fn (string $name) => array_values(array_filter($rows($name), fn ($row) => self::truthy($row['isActive'] ?? null)));
        $byOrder = function (array $records): array {
            usort($records, fn (array $left, array $right) => ($left['order'] ?? 0) <=> ($right['order'] ?? 0));

            return $records;
        };

        $localities = array_map(
            fn (array $locality) => $link(self::publicPathOf('locality', $locality), $label($locality, 'name')),
            $byOrder($active('localities')),
        );

        $segments = $rows('segments');
        $propertyTypes = array_map(
            fn (array $type) => $link(self::publicPathOf('propertyType', $type, ['segments' => $segments]), $label($type, 'name')),
            $byOrder($active('propertyTypes')),
        );

        $featured = array_values(array_filter($active('properties'), fn (array $property) => self::truthy($property['isFeatured'] ?? null)));
        usort($featured, fn (array $left, array $right) => ($right['priorityOrder'] ?? 0) <=> ($left['priorityOrder'] ?? 0));
        $featured = array_map(
            fn (array $property) => $link(self::publicPathOf('property', $property), $label($property, 'title')),
            array_slice($featured, 0, self::LLMS_LIMIT),
        );

        $guides = array_map(
            fn (array $article) => $link(self::publicPathOf('article', $article), $label($article, 'title')),
            array_slice(self::newestFirst(ArticleVisibility::live($rows('articles'), $nowMs ?? Clock::ms(Clock::now()))), 0, self::LLMS_LIMIT),
        );

        $summary = Sorter::path($data, 'seoSettings.defaults.metaDescription')
            ?? Js::get($general, 'tagline')
            ?? "{$siteName} is a property advisory in Bengaluru, Karnataka, India.";

        $email = Js::get($general, 'contactEmail');
        $phone = Js::get($general, 'contactPhone');
        $contact = [
            ...(self::truthy($email) ? ['- Email: '.Js::string($email)] : []),
            ...(self::truthy($phone) ? ['- Phone: '.Js::string($phone)] : []),
            '- Website: '.self::absoluteUrl($siteUrl, '/'),
            $link('/contact', 'Contact page'),
        ];

        $section = fn (string $title, array $entries) => $entries === [] ? [] : ["## {$title}", '', ...$entries, ''];

        $text = implode("\n", [
            "# {$siteName}",
            '',
            Js::string($summary),
            '',
            ...$section('Localities', $localities),
            ...$section('Property types', $propertyTypes),
            ...$section('Featured properties', $featured),
            ...$section('Guides', $guides),
            ...$section('Contact', $contact),
        ]);

        return (string) preg_replace('/\n{3,}/', "\n\n", $text);
    }

    /** llms.txt as served: the stored document when an editor wrote one, the generated one otherwise. */
    public static function renderLlms(array $data, ?int $nowMs = null): string
    {
        $stored = Sorter::path($data, 'seoSettings.llmsTxt');
        $text = is_string($stored) && Js::trim($stored) !== '' ? $stored : self::generateLlms($data, $nowMs);

        return str_ends_with($text, "\n") ? $text : "{$text}\n";
    }

    /* ------------------------------------------------------------------ */

    /** One `<url>` entry, or null when the record opted out or is excluded. */
    private static function urlEntry(string $type, array $entity, mixed $siteUrl, array $settings, array $extra = [], array $context = []): ?array
    {
        $overrides = Sorter::path($entity, 'seo.sitemap') ?? [];
        if (Js::get($overrides, 'include') === false) {
            return null;
        }
        $path = self::publicPathOf($type, $entity, $context);
        if ($path === null || $path === '') {
            return null;
        }
        $loc = self::absoluteUrl($siteUrl, $path);
        if (in_array($path, $settings['excludeUrls'], true) || in_array($loc, $settings['excludeUrls'], true)) {
            return null;
        }

        return [
            'loc' => $loc,
            'lastmod' => $entity['updatedAt'] ?? $entity['publishedAt'] ?? null,
            'changefreq' => Js::get($overrides, 'changefreq') ?? $settings['changefreq'][$type] ?? null,
            'priority' => Js::get($overrides, 'priority') ?? $settings['priority'][$type] ?? null,
            'images' => array_slice($extra['images'] ?? [], 0, self::IMAGES_PER_URL),
        ];
    }

    /** A static route as a `<url>` entry; the home page is priority 1. */
    private static function staticEntry(string $path, mixed $siteUrl, array $settings, ?string $lastmod): ?array
    {
        $loc = self::absoluteUrl($siteUrl, $path);
        if (in_array($path, $settings['excludeUrls'], true) || in_array($loc, $settings['excludeUrls'], true)) {
            return null;
        }

        return [
            'loc' => $loc,
            'lastmod' => $lastmod,
            'changefreq' => $settings['changefreq']['page'] ?? null,
            'priority' => $path === '/' ? 1 : ($settings['priority']['page'] ?? null),
            'images' => [],
        ];
    }

    /** One `<image:image>`; a picture without a title carries none. */
    private static function imageElement(array $image): string
    {
        return Xml::element('image:image', [
            Xml::element('image:loc', $image['loc'] ?? null),
            ...(self::truthy($image['title'] ?? null) ? [Xml::element('image:title', $image['title'])] : []),
        ]);
    }

    /** The newest `lastmod` of a set of entries — the index's `<lastmod>` for it. */
    private static function latest(array $entries): ?string
    {
        $moments = [];
        foreach ($entries as $entry) {
            $moment = self::truthy($entry['lastmod'] ?? null) ? Clock::ms($entry['lastmod']) : null;
            if ($moment !== null) {
                $moments[] = $moment;
            }
        }

        return $moments === [] ? null : Clock::iso(max($moments));
    }

    /** Live articles, newest `publishedAt` first; a tie keeps the stored order. */
    private static function newestFirst(array $articles): array
    {
        usort($articles, fn (array $left, array $right) => (Clock::ms($right['publishedAt'] ?? null) ?? 0) <=> (Clock::ms($left['publishedAt'] ?? null) ?? 0));

        return $articles;
    }

    /** The record whose id is strictly the one named (`find(row => row.id === id)`). */
    private static function byStrictId(array $records, mixed $id): ?array
    {
        foreach ($records as $record) {
            if (($record['id'] ?? null) === $id) {
                return $record;
            }
        }

        return null;
    }

    /** RFC 822 in GMT, as `Date.prototype.toUTCString()` prints it: `Sun, 23 Aug 2026 06:30:00 GMT`. */
    private static function rfc822(CarbonImmutable $moment): string
    {
        return $moment->setTimezone('UTC')->format('D, d M Y H:i:s').' GMT';
    }

    /**
     * `Number(value).toFixed(1)`: correctly rounded from the binary value,
     * except that an exact tie (0.25, 0.75…) rounds away from zero.
     */
    private static function toFixed1(mixed $value): string
    {
        $number = Js::toNumber($value);
        if ($number === null || is_nan((float) $number)) {
            return 'NaN';
        }
        $number = (float) $number;
        if (is_infinite($number) || abs($number) >= 1e21) {
            return Js::string($number);
        }
        $quarters = $number * 4;
        if (floor($quarters) === $quarters && fmod(abs($quarters), 2.0) === 1.0) {
            $tenths = (int) (abs($quarters) * 2.5 + 0.5);

            return ($number < 0 ? '-' : '').intdiv($tenths, 10).'.'.($tenths % 10);
        }

        return $number == 0 ? '0.0' : sprintf('%.1f', $number);
    }

    /** JavaScript truthiness: `'0'` and `[]` are values; `''`, `0`, null and false are not. */
    private static function truthy(mixed $value): bool
    {
        return ! ($value === null || $value === false || $value === '' || $value === 0 || (is_float($value) && ($value == 0 || is_nan($value))));
    }
}
