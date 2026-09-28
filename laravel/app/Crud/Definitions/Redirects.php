<?php

namespace App\Crud\Definitions;

use App\Domain\Redirects\RedirectRules;

/**
 * Redirects (05_BUSINESS_RULES.md → "Redirects"; 06_SEO_SITEMAP_ROBOTS.md → "Redirects").
 *
 *   GET  /redirects          the active rules, as the site loads them: `id`, `fromPath`,
 *                            `toPath`, `statusCode` — deliberately tiny
 *   GET, POST /admin/redirects, GET/PUT/PATCH/DELETE /admin/redirects/{id}, bulk
 *
 * Both paths are normalised before the checks, and the four rules of
 * App\Domain\Redirects\RedirectRules are asked before the schema's. `resolve`,
 * `hit`, `import` and `export` are App\Http\Controllers\RedirectController.
 */
final class Redirects
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'redirects' => [
                'collection' => 'redirects',
                'basePath' => 'redirects',
                'schema' => 'redirect',
                'slugged' => false,
                'listShape' => fn (array $record, array $ctx) => $ctx['admin']
                    ? $record
                    : array_combine(RedirectRules::PUBLIC_FIELDS, array_map(fn (string $field) => $record[$field] ?? null, RedirectRules::PUBLIC_FIELDS)),
                'beforeValidate' => fn (array $body, array $ctx) => RedirectRules::prepare($body, $ctx['store']->all('redirects'), $ctx['existing'] ?? null),
                'sorts' => ['fromPath' => 'fromPath', 'hits' => '-hits', 'createdAt' => '-createdAt'],
                'defaultSort' => 'fromPath',
                'noun' => ['one' => 'redirect', 'many' => 'redirects'],
            ],
        ];
    }
}
